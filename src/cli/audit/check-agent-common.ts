import type { AuditContext, AuditFailure } from "./types.js";
import type { CheckEvidence } from "./provenance-types.js";

const VERIFIED_ON = "2026-04-18";

/** Return the spec provenance. */
export function specProvenance(paths: string[]): CheckEvidence {
  return {
    source_type: "spec",
    source_urls: [],
    verified_on: VERIFIED_ON,
    normative_level: "MUST",
    evidence_paths: paths,
  };
}

/** Return the incident provenance. */
export function incidentProvenance(paths: string[]): CheckEvidence {
  return {
    source_type: "incident",
    source_urls: [],
    verified_on: VERIFIED_ON,
    normative_level: "MUST",
    evidence_paths: paths,
  };
}

/** Deduplicate provenance paths while preserving first-seen order for stable audit output. */
export function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths));
}

export function checkSelectedInstructionAvailable(
  ctx: AuditContext,
  check: string,
): AuditFailure | null {
  if (!ctx.agentFilter) return null;
  const agentFacts = ctx.agents.find(
    (facts) => facts.agent.id === ctx.agentFilter,
  );
  if (agentFacts?.instruction.exists) return null;
  const expected =
    agentFacts?.agent.instructionFile ??
    (ctx.agentFilter === "claude" ? "CLAUDE.md" : "AGENTS.md");
  return {
    check,
    message: `Missing instruction file for ${ctx.agentFilter}: ${expected}`,
    evidence: expected,
    howToFix: `Install goat-flow for ${ctx.agentFilter} or remove --agent ${ctx.agentFilter} from this audit.`,
  };
}
