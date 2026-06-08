/**
 * Type contract for the `goat-flow-review-result` artifact a review agent writes.
 * The dashboard reads this JSON across a trust boundary; these interfaces are the
 * shape it relies on. Keep field names/enums in sync with the review skill output
 * and {@link ReviewResult.contractVersion} when the schema changes.
 */
import type {
  BaseFinding,
  BaseIntegrity,
} from "./goat-flow-contract-shared.js";

type ReviewAction =
  | "patch"
  | "needs-decision"
  | "pre-existing"
  | "intent-mismatch"
  | "needs-signal";

type ReviewSeverity = "MUST" | "SHOULD" | "MAY";

type ShipDecision = "SHIP" | "SHIP_WITH_CONDITIONS" | "NO" | "PARTIAL";

/** A single review finding: a base finding plus review-specific severity, the
 * recommended action, and any cross-model overlap tag. */
interface ReviewFinding extends BaseFinding {
  kind: "review";
  severity: ReviewSeverity;
  action: ReviewAction;
  overlapTag: "confirmed-cross-model" | "cross-model-unresolved" | null;
}

/** A spec-drift note: where the diff diverged from the stated intent, tagged
 * either advisory or ready to tick off against the spec. */
interface ReviewSpecDriftEntry {
  tag: "advisory" | "ready-to-tick";
  title: string;
  body: string;
}

/** Outcome of the adversarial refuter pass: whether it ran and how many findings
 * it confirmed, refuted, or left unresolved. */
interface ReviewRefuterSummary {
  ran: boolean;
  confirmed: number;
  refuted: number;
  unresolved: number;
  leadsVerifiedByHost: number;
  model: string | null;
}

/** The overall ship recommendation with confidence, reasoning, and any
 * conditions that must hold for a conditional SHIP. */
interface ShipVerdict {
  decision: ShipDecision;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
  conditions: string[];
}

/** Top-level review artifact: target, integrity, findings, spec drift, refuter
 * summary, and the ship verdict. The dashboard's review view consumes this. */
export interface ReviewResult {
  resultKind: "goat-flow-review-result";
  contractVersion: "1";
  generatedAt: string;
  target: {
    projectPath: string;
    base: string | null;
    head: string | null;
    source: "diff" | "area" | "artifact";
  };
  integrity: BaseIntegrity & {
    refutationsLogged: number;
    size: { files: number; lines: number; chunked: string | null };
  };
  findings: ReviewFinding[];
  specDrift: ReviewSpecDriftEntry[];
  refuter: ReviewRefuterSummary;
  shipVerdict: ShipVerdict;
}
