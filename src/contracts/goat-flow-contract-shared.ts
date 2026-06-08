/**
 * Shared review/security result contracts for headless agent artifacts.
 *
 * These types are deliberately plain TypeScript interfaces plus small runtime
 * guards. Agent-written JSON crosses a trust boundary before the dashboard reads
 * it, so fixture validation must reject unresolved placeholders and malformed
 * fields instead of treating structural JSON as enough.
 */

export const REVIEW_CONTRACT_VERSION = "1" as const;

export const PROOF_CLASSES = [
  "RUNTIME",
  "CONTRACT-GREP",
  "STATIC",
  "NOT-REPRODUCED",
] as const;

export const EVIDENCE_QUALITIES = ["OBSERVED", "INFERRED"] as const;

const FINDING_KINDS = ["review", "security"] as const;

const FINDING_SOURCE_TOOLS = [
  "gruff-go",
  "gruff-php",
  "gruff-py",
  "gruff-ts",
  "gruff-rs",
  "agent",
] as const;

/**
 * How strongly a finding is evidenced, narrowest-to-weakest. Drives the
 * proof-class rollups the dashboard renders and the security gate consumes.
 */
export type ProofClass = (typeof PROOF_CLASSES)[number];
type EvidenceQuality = (typeof EVIDENCE_QUALITIES)[number];
type FindingKind = (typeof FINDING_KINDS)[number];
type FindingSourceTool = (typeof FINDING_SOURCE_TOOLS)[number];

/**
 * Discriminated parse outcome for every contract parser in this module: either a
 * validated `artifact` or a human-readable `error`. Callers branch on `ok`
 * rather than throwing so malformed agent JSON degrades to a message.
 */
export type ParseResult<T> =
  | { ok: true; artifact: T }
  | { ok: false; error: string };

/** Inclusive 1-based source line span for a finding; `null` when unanchored. */
export interface FindingLines {
  start: number;
  end: number;
}

/** Provenance of a finding: which scanner (or `agent`) produced it, plus the
 * originating rule/pillar when a tool emitted it. */
export interface FindingSource {
  tool: FindingSourceTool;
  ruleId: string | null;
  pillar: string | null;
}

/** Fields common to every review/security finding, extended per kind below. */
export interface BaseFinding {
  id: string;
  kind: FindingKind;
  file: string;
  anchor: string;
  lines: FindingLines | null;
  title: string;
  body: string;
  severity: string;
  proofClass: ProofClass;
  evidence: EvidenceQuality;
  footgun: string | null;
  source: FindingSource;
}

/** Self-reported run integrity shared by review/security artifacts: how much the
 * agent actually opened/observed, so the dashboard can flag degraded coverage. */
export interface BaseIntegrity {
  filesOpened: {
    opened: number;
    total: number;
    paths: string[];
  };
  observed: number;
  inferred: number;
  degradationFlags: string[];
  conclusion:
    | "confident"
    | "coverage-degraded"
    | "high-inference"
    | "partial"
    | "tool-limited";
}

export function isRecord(
  candidate: unknown,
): candidate is Record<string, unknown> {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  );
}

function expectString(
  value: unknown,
  path: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${path} must be a string` };
  }
  return { ok: true, value };
}

export function expectNonEmptyString(
  value: unknown,
  path: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const parsed = expectString(value, path);
  if (!parsed.ok) return parsed;
  if (parsed.value.trim().length === 0) {
    return { ok: false, error: `${path} must not be empty` };
  }
  if (containsUnresolvedMarker(parsed.value)) {
    return {
      ok: false,
      error: `${path} contains an unresolved placeholder marker`,
    };
  }
  return { ok: true, value: parsed.value };
}

function expectNullableString(
  value: unknown,
  path: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null };
  return expectNonEmptyString(value, path);
}

export function expectStringArray(
  value: unknown,
  path: string,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: `${path} must be an array` };
  }
  const result: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const parsed = expectNonEmptyString(value[index], `${path}[${index}]`);
    if (!parsed.ok) return parsed;
    result.push(parsed.value);
  }
  return { ok: true, value: result };
}

export function expectEnumValue<T extends string>(
  value: unknown,
  path: string,
  values: readonly T[],
): { ok: true; value: T } | { ok: false; error: string } {
  if (typeof value !== "string" || !values.includes(value as T)) {
    return {
      ok: false,
      error: `${path} must be one of: ${values.join(", ")}`,
    };
  }
  return { ok: true, value: value as T };
}

export function expectNonNegativeInteger(
  value: unknown,
  path: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!Number.isInteger(value) || Number(value) < 0) {
    return { ok: false, error: `${path} must be a non-negative integer` };
  }
  return { ok: true, value: Number(value) };
}

function expectPositiveInteger(
  value: unknown,
  path: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    return { ok: false, error: `${path} must be a positive integer` };
  }
  return { ok: true, value: Number(value) };
}

export function parseFindingLines(
  raw: unknown,
  path: string,
): { ok: true; value: FindingLines | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (!isRecord(raw))
    return { ok: false, error: `${path} must be an object or null` };
  const start = expectPositiveInteger(raw.start, `${path}.start`);
  if (!start.ok) return start;
  const end = expectPositiveInteger(raw.end, `${path}.end`);
  if (!end.ok) return end;
  if (end.value < start.value) {
    return {
      ok: false,
      error: `${path}.end must be greater than or equal to start`,
    };
  }
  return { ok: true, value: { start: start.value, end: end.value } };
}

export function parseFindingSource(
  raw: unknown,
  path: string,
): { ok: true; value: FindingSource } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: `${path} must be an object` };
  const tool = expectEnumValue(raw.tool, `${path}.tool`, FINDING_SOURCE_TOOLS);
  if (!tool.ok) return tool;
  const ruleId = expectNullableString(raw.ruleId ?? null, `${path}.ruleId`);
  if (!ruleId.ok) return ruleId;
  const pillar = expectNullableString(raw.pillar ?? null, `${path}.pillar`);
  if (!pillar.ok) return pillar;
  return {
    ok: true,
    value: { tool: tool.value, ruleId: ruleId.value, pillar: pillar.value },
  };
}

export function parseBaseIntegrity(
  raw: unknown,
  path: string,
): { ok: true; value: BaseIntegrity } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: `${path} must be an object` };
  if (!isRecord(raw.filesOpened)) {
    return { ok: false, error: `${path}.filesOpened must be an object` };
  }
  const opened = expectNonNegativeInteger(
    raw.filesOpened.opened,
    `${path}.filesOpened.opened`,
  );
  if (!opened.ok) return opened;
  const total = expectNonNegativeInteger(
    raw.filesOpened.total,
    `${path}.filesOpened.total`,
  );
  if (!total.ok) return total;
  const paths = expectStringArray(
    raw.filesOpened.paths,
    `${path}.filesOpened.paths`,
  );
  if (!paths.ok) return paths;
  if (opened.value > total.value) {
    return {
      ok: false,
      error: `${path}.filesOpened.opened must be less than or equal to total`,
    };
  }
  const observed = expectNonNegativeInteger(raw.observed, `${path}.observed`);
  if (!observed.ok) return observed;
  const inferred = expectNonNegativeInteger(raw.inferred, `${path}.inferred`);
  if (!inferred.ok) return inferred;
  const degradationFlags = expectStringArray(
    raw.degradationFlags,
    `${path}.degradationFlags`,
  );
  if (!degradationFlags.ok) return degradationFlags;
  const conclusion = expectEnumValue(raw.conclusion, `${path}.conclusion`, [
    "confident",
    "coverage-degraded",
    "high-inference",
    "partial",
    "tool-limited",
  ] as const);
  if (!conclusion.ok) return conclusion;
  return {
    ok: true,
    value: {
      filesOpened: {
        opened: opened.value,
        total: total.value,
        paths: paths.value,
      },
      observed: observed.value,
      inferred: inferred.value,
      degradationFlags: degradationFlags.value,
      conclusion: conclusion.value,
    },
  };
}

/**
 * Detect leftover placeholder markers (TBD/TODO/FIXME/PLACEHOLDER, `<...>`
 * angle stubs, `???`) so the parsers reject agent text that was never filled in.
 *
 * @param value - Candidate string field from an agent-written artifact.
 * @returns `true` when an unresolved-placeholder marker is present.
 */
function containsUnresolvedMarker(value: string): boolean {
  return /(?:\b(?:TBD|TODO|FIXME|PLACEHOLDER)\b|<\s*(?:TODO|TBD|FIXME|PLACEHOLDER|UNKNOWN)[^>\n]*>|\?\?\?)/iu.test(
    value,
  );
}
