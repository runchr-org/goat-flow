import type {
  ArtifactKind,
  ArtifactSource,
  ArtifactSubtype,
  MetricName,
  QualityConfig,
} from "./quality-config.js";

export type Recommendation =
  | "keep-skill"
  | "consider-revision"
  | "consider-reclassifying"
  | "reference-playbook"
  | "retire"
  | "needs-human-review";
export type MetricSeverity = "ok" | "warn" | "fail" | "n/a";

/**
 * Lower-ranked subtype match shown to reviewers when classification is ambiguous.
 */
interface ClassificationAlternative {
  subtype: ArtifactSubtype;
  score: number;
}

/**
 * Applied scoring profile plus the evidence explaining why that subtype won.
 */
export interface ClassificationResult {
  detectedSubtype: ArtifactSubtype;
  /** 0-1 - how strongly the top subtype dominates alternatives. */
  confidence: number;
  alternatives: ClassificationAlternative[];
  reasoning: string[];
}

/**
 * Semantic shape detected independently from the scoring profile to catch misfiled artifacts.
 */
export interface ShapeDetectionResult {
  detectedShape: ArtifactSubtype;
  confidence: number;
  alternatives: ClassificationAlternative[];
  reasoning: string[];
}

/**
 * Inventory record surfaced by the CLI and dashboard; paths stay project-relative.
 */
export interface ArtifactEntry {
  id: string;
  name: string;
  path: string;
  kind: ArtifactKind;
  source: ArtifactSource;
  mirrorPaths?: string[];
  missingMirrors?: string[];
}

/**
 * Recommendation hints emitted by fit metrics without altering the numeric score.
 */
export interface MetricSignals {
  promote?: boolean;
  demote?: boolean;
  meta?: boolean;
}

/**
 * One rubric row after subtype-specific max-score capping has been applied.
 */
export interface MetricResult {
  metric: MetricName;
  label: string;
  score: number;
  maxScore: number;
  severity: MetricSeverity;
  detail: string;
  signals?: MetricSignals;
}

/**
 * Stable public report schema consumed by CLI JSON, dashboard routes, and prompts.
 */
export interface SkillQualityReport {
  artifact: ArtifactEntry;
  totalScore: number;
  maxTotalScore: number;
  profileMax: number;
  /** Applied scoring profile. Keep stable for existing consumers. */
  subtype: ArtifactSubtype;
  /** Semantic content shape detected independently from the scoring profile. */
  detectedShape: ArtifactSubtype;
  shapeConfidence: number;
  shapeMismatch: boolean;
  classification: ClassificationResult;
  recommendation: Recommendation;
  metrics: MetricResult[];
  composedFrom: string[];
  fitNotes: string[];
}

/**
 * Shared scorer input that carries both raw artifact text and composed context.
 */
export interface MetricInput {
  rawContent: string;
  composedContent: string;
  artifact: ArtifactEntry;
  subtype: ArtifactSubtype;
  profileMax: number;
  projectRoot: string;
  config: QualityConfig;
}

/**
 * Read result with truncation notes kept separate from content so scoring remains deterministic.
 */
export interface ReadContentResult {
  content: string;
  notes: string[];
}

/**
 * Composed scoring surface plus provenance shown in `composedFrom`.
 */
export interface ComposeResult {
  raw: string;
  composed: string;
  sources: string[];
  notes: string[];
}

// When false, disk-side reference resolution and the sibling-walk are skipped.
// Used for uploaded artifacts so a user-supplied name colliding with an
// installed skill cannot silently leak on-disk content into the score.
export interface ComposeOptions {
  scanDisk?: boolean;
}

export type MetricScorer = (input: MetricInput) => MetricResult;

const METRIC_LABELS: Record<MetricName, string> = {
  "trigger-clarity": "Trigger Clarity",
  "workflow-completeness": "Workflow Completeness",
  "gate-quality": "Gate Quality",
  "evidence-testability": "Evidence & Testability",
  "cold-start": "Cold-Start Executability",
  "token-cost": "Token / Load Cost",
  "tool-deps": "Tool Dependency Handling",
  "write-risk": "Write Risk",
  "skill-reference-fit": "Skill vs Reference Fit",
};

/**
 * Convert subtype-capped scores into the severity bands shown in the dashboard.
 */
function metricSeverity(score: number, maxScore: number): MetricSeverity {
  if (maxScore === 0) return "n/a";
  const pct = score / maxScore;
  if (pct >= 0.75) return "ok";
  if (pct >= 0.4) return "warn";
  return "fail";
}

export function finalizeMetric(
  input: MetricInput,
  metric: MetricName,
  score: number,
  detail: string,
  signals?: MetricSignals,
): MetricResult {
  const maxScore = input.config.subtypes[input.subtype].profile[metric];
  if (maxScore === 0) {
    return {
      metric,
      label: METRIC_LABELS[metric],
      score: 0,
      maxScore,
      severity: "n/a",
      detail: `n/a for subtype=${input.subtype}`,
      signals,
    };
  }
  const cappedScore = Math.max(0, Math.min(score, maxScore));
  return {
    metric,
    label: METRIC_LABELS[metric],
    score: cappedScore,
    maxScore,
    severity: metricSeverity(cappedScore, maxScore),
    detail,
    signals,
  };
}
