/**
 * Shared render utilities used by both text and markdown renderers.
 */
import type { CheckResult, AgentReport, AntiPatternResult } from '../types.js';

/** Severity level assigned to a check for display grouping */
type CheckSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Map a rubric tier to the severity used in output. */
function checkSeverityFromTier(tier: string): CheckSeverity {
  if (tier === 'foundation') return 'critical';
  if (tier === 'standard') return 'high';
  return 'medium';
}

/** Derive the display severity for a failed or partial check. */
export function getCheckSeverity(check: CheckResult): CheckSeverity {
  if (check.status === 'partial' && check.tier === 'full') return 'low';
  return checkSeverityFromTier(check.tier);
}

/** Summarize pass/fail counts and severity totals for an agent's checks. */
export function collectCheckFailureSummary(checks: AgentReport['checks']): {
  fail: number;
  partial: number;
  pass: number;
  severityCounts: Record<CheckSeverity, number>;
} {
  const summary = {
    fail: 0,
    partial: 0,
    pass: 0,
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 } as Record<
      CheckSeverity,
      number
    >,
  };

  for (const check of checks) {
    if (check.status === 'fail') {
      summary.fail += 1;
      summary.severityCounts[getCheckSeverity(check)] += 1;
      continue;
    }
    if (check.status === 'partial') {
      summary.partial += 1;
      summary.severityCounts[getCheckSeverity(check)] += 1;
      continue;
    }
    if (check.status === 'pass') summary.pass += 1;
  }

  return summary;
}

/** Keep only the anti-patterns that were actually triggered. */
export function getTriggeredAntiPatterns(
  antiPatterns: AntiPatternResult[],
): AntiPatternResult[] {
  return antiPatterns.filter((ap) => ap.triggered);
}

/** A single recoverable-points entry used to rank highest-impact fixes */
interface DiagnosticImpact {
  label: string;
  points: number;
  priority: string;
}

/** Rank fixes by recoverable points — checks first, then triggered anti-patterns. */
export function collectDiagnosticImpacts(
  agent: AgentReport,
): DiagnosticImpact[] {
  const impacts: DiagnosticImpact[] = [];

  for (const recommendation of agent.recommendations) {
    const check = agent.checks.find(
      (candidate) => candidate.id === recommendation.checkId,
    );
    const recoverable = check ? check.maxPoints - check.points : 0;
    if (recoverable > 0) {
      impacts.push({
        label: `${recommendation.checkId}: ${recommendation.action}`,
        points: recoverable,
        priority: recommendation.priority,
      });
    }
  }

  for (const antiPattern of getTriggeredAntiPatterns(agent.antiPatterns)) {
    impacts.push({
      label: `${antiPattern.id}: ${antiPattern.name}`,
      points: Math.abs(antiPattern.deduction),
      priority: 'critical',
    });
  }

  impacts.sort((a, b) => b.points - a.points);
  return impacts;
}
