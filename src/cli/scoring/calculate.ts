/**
 * Score engine for rubric and anti-pattern results.
 * It executes checks, aggregates tier totals, applies deductions, and assigns the final grade.
 */
import type {
  CheckResult,
  AntiPatternResult,
  ScoreSummary,
  TierScore,
  Grade,
  FactContext,
  CheckDef,
  AntiPatternDef,
} from '../types.js';
import { evaluateCheck } from '../scanner/evaluate-check.js';

/** Percentage thresholds mapped to letter grades (legacy, kept for reference) */
// const GRADE_THRESHOLDS: [number, Grade][] = [
//   [90, 'A'], [75, 'B'], [60, 'C'], [40, 'D'], [0, 'F'],
// ];

/** Floor for total anti-pattern deductions to prevent runaway penalties */
const MAX_DEDUCTION = -15;
/** Minimum ratio of applicable checks before grading; below this yields insufficient-data */
const INFLATION_THRESHOLD = 0.1;

/** Execute all check definitions against the fact context and return results */
export function runChecks(checks: CheckDef[], ctx: FactContext): CheckResult[] {
  return checks.map((check) => {
    // Short-circuit checks whose explicit applicability guard says they do not apply.
    if (check.na && check.na(ctx)) {
      return {
        id: check.id,
        name: check.name,
        tier: check.tier,
        category: check.category,
        status: 'na' as const,
        points: 0,
        maxPoints: 0,
        confidence: check.confidence,
        message: 'Not applicable',
        recommendationKey: check.recommendationKey,
        hidden: check.hidden,
      };
    }

    try {
      /** Evaluation result from running the check's detect function */
      const result = evaluateCheck(
        check.id,
        check.name,
        check.tier,
        check.category,
        check.pts,
        check.partialPts,
        check.detect,
        check.confidence,
        ctx,
      );
      result.recommendationKey = check.recommendationKey;
      result.hidden = check.hidden;
      return result;
    } catch (err) {
      return {
        id: check.id,
        name: check.name,
        tier: check.tier,
        category: check.category,
        status: 'fail' as const,
        points: 0,
        maxPoints: check.pts,
        confidence: check.confidence,
        message: `Check crashed: ${err instanceof Error ? err.message : String(err)}`,
        recommendationKey: check.recommendationKey,
        hidden: check.hidden,
      };
    }
  });
}

/** Execute all anti-pattern definitions against the fact context and return results */
export function runAntiPatterns(
  patterns: AntiPatternDef[],
  ctx: FactContext,
): AntiPatternResult[] {
  return patterns.map((antiPattern) => {
    if (antiPattern.na && antiPattern.na(ctx)) {
      return {
        id: antiPattern.id,
        name: antiPattern.name,
        triggered: false,
        deduction: 0,
        confidence: antiPattern.confidence,
        message: 'Not applicable',
      };
    }
    try {
      const result = antiPattern.evaluate(ctx);
      // Propagate recommendationKey from definition to result so setup prompts
      // can look up the corresponding fragment for fix instructions
      if (antiPattern.recommendationKey && !result.recommendationKey) {
        result.recommendationKey = antiPattern.recommendationKey;
      }
      return result;
    } catch (err) {
      return {
        id: antiPattern.id,
        name: antiPattern.name,
        triggered: false,
        deduction: 0,
        confidence: antiPattern.confidence,
        message: `Anti-pattern check crashed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  });
}

/** Combine tier totals and anti-pattern deductions into the final score summary. */
export function computeScore(
  checkResults: CheckResult[],
  antiPatternResults: AntiPatternResult[],
  totalCheckCount: number,
  checkDefs?: CheckDef[],
): ScoreSummary {
  /** Foundation tier score */
  const foundation = scoreTier(checkResults, 'foundation');
  /** Standard tier score */
  const standard = scoreTier(checkResults, 'standard');
  /** Full tier score */
  const full = scoreTier(checkResults, 'full');

  /** Total earned points across all tiers */
  const earned = foundation.earned + standard.earned + full.earned;
  /** Total available points across all tiers */
  const available = foundation.available + standard.available + full.available;

  /** Sum of deductions from all triggered anti-patterns before clamping */
  const rawDeductions = antiPatternResults
    .filter((ap) => ap.triggered)
    .reduce((sum, ap) => sum + ap.deduction, 0);
  /** Clamped deductions, floored at MAX_DEDUCTION */
  const deductions = Math.max(rawDeductions, MAX_DEDUCTION);

  /** Final raw score after applying deductions, floored at zero */
  const raw = Math.max(0, earned + deductions);
  /** Percentage score rounded to the nearest integer */
  const percentage = available > 0 ? Math.round((raw / available) * 100) : 0;

  /** Number of checks that are not N/A */
  const applicableChecks = checkResults.filter((c) => c.status !== 'na').length;
  /** Ratio of applicable checks to total, used for inflation guard */
  const applicableRatio =
    totalCheckCount > 0 ? applicableChecks / totalCheckCount : 0;

  /** Priority-based counters for grade calculation */
  const priorityCounts = countByPriority(checkResults, checkDefs);

  /** Letter grade based on priority thresholds, or insufficient-data if too few checks */
  const grade =
    applicableRatio < INFLATION_THRESHOLD
      ? ('insufficient-data' as Grade)
      : computePriorityGrade(priorityCounts);

  return {
    earned,
    available,
    deductions,
    percentage,
    grade,
    tiers: { foundation, standard, full },
    requiredPassed: priorityCounts.requiredPassed,
    requiredTotal: priorityCounts.requiredTotal,
    recommendedPassed: priorityCounts.recommendedPassed,
    recommendedTotal: priorityCounts.recommendedTotal,
  };
}

/** Calculate earned and available points for a single scoring tier */
function scoreTier(
  results: CheckResult[],
  tier: 'foundation' | 'standard' | 'full',
): TierScore {
  /** Check results that belong to this tier */
  const tierResults = results.filter((r) => r.tier === tier);

  // Sum raw weighted values, round once at the end (not per-check).
  // This ensures 1pt medium checks actually contribute 0.5, not 1.0.
  let rawEarned = 0;
  let rawAvailable = 0;
  // Iterate over each tier result to accumulate weighted points
  for (const r of tierResults) {
    /** Confidence-based weight: medium/low checks count at half value */
    const weight =
      r.confidence === 'medium' || r.confidence === 'low' ? 0.5 : 1.0;
    rawEarned += r.points * weight;
    rawAvailable += r.maxPoints * weight;
  }
  /** Earned points for this tier, rounded from weighted sum */
  const earned = Math.round(rawEarned);
  /** Available points for this tier, rounded from weighted sum */
  const available = Math.round(rawAvailable);

  /** Percentage score for this tier */
  const percentage = available > 0 ? Math.round((earned / available) * 100) : 0;
  return { tier, earned, available, percentage };
}

/** Priority counters for grade calculation */
interface PriorityCounts {
  requiredPassed: number;
  requiredTotal: number;
  recommendedPassed: number;
  recommendedTotal: number;
}

/**
 * Count required and recommended checks that passed vs total applicable.
 * Full tier checks are excluded from grade calculation (bonus-only).
 * N/A checks are excluded from both numerator and denominator.
 */
/** Build a lookup from check ID to priority, falling back to tier-based defaults. */
function buildPriorityMap(checkDefs?: CheckDef[]): Map<string, 'required' | 'recommended' | 'optional'> {
  const map = new Map<string, 'required' | 'recommended' | 'optional'>();
  if (checkDefs) {
    for (const def of checkDefs) map.set(def.id, def.priority);
  }
  return map;
}

/** Resolve the effective priority for a check result. */
function resolvePriority(
  result: CheckResult,
  priorityMap: Map<string, 'required' | 'recommended' | 'optional'>,
): 'required' | 'recommended' | 'optional' {
  return priorityMap.get(result.id) ?? (result.tier === 'foundation' ? 'required' : 'recommended');
}

/** Whether a check result counts as passing (pass or partial). */
function isPassing(result: CheckResult): boolean {
  return result.status === 'pass' || result.status === 'partial';
}

function countByPriority(
  checkResults: CheckResult[],
  checkDefs?: CheckDef[],
): PriorityCounts {
  let requiredPassed = 0;
  let requiredTotal = 0;
  let recommendedPassed = 0;
  let recommendedTotal = 0;

  const priorityMap = buildPriorityMap(checkDefs);
  const gradeable = checkResults.filter(r => r.status !== 'na' && r.tier !== 'full');

  for (const result of gradeable) {
    const priority = resolvePriority(result, priorityMap);
    if (priority === 'required') {
      requiredTotal++;
      if (isPassing(result)) requiredPassed++;
    } else if (priority === 'recommended') {
      recommendedTotal++;
      if (isPassing(result)) recommendedPassed++;
    }
  }

  return { requiredPassed, requiredTotal, recommendedPassed, recommendedTotal };
}

/**
 * Grade based on priority thresholds:
 * - A: all required pass + all recommended pass
 * - B: all required pass + >=80% recommended pass
 * - C: all required pass
 * - D: >=60% required pass
 * - F: <60% required pass
 */
function computePriorityGrade(counts: PriorityCounts): Grade {
  const { requiredPassed, requiredTotal, recommendedPassed, recommendedTotal } = counts;

  // Edge case: no required checks at all (everything optional/recommended)
  const allRequiredPass = requiredTotal === 0 || requiredPassed === requiredTotal;
  const requiredRatio = requiredTotal > 0 ? requiredPassed / requiredTotal : 1;
  const recommendedRatio = recommendedTotal > 0 ? recommendedPassed / recommendedTotal : 1;

  if (allRequiredPass && recommendedRatio >= 1) return 'A';
  if (allRequiredPass && recommendedRatio >= 0.8) return 'B';
  if (allRequiredPass) return 'C';
  if (requiredRatio >= 0.6) return 'D';
  return 'F';
}
