import type { AgentId } from "./types.js";
import { getKnownAgentIds } from "./agents/registry.js";

let cachedValidAgents: AgentId[] | null = null;

/** Return the cached list of valid agent IDs. */
export function validAgents(): AgentId[] {
  return (cachedValidAgents ??= getKnownAgentIds());
}

/** Return the valid agent IDs as help text, falling back when manifest loading throws. */
export function validAgentList(): string {
  try {
    return validAgents().join(", ");
  } catch {
    return "run `goat-flow manifest` for the current list";
  }
}

/** Return the valid agent flag examples, falling back when manifest loading throws. */
export function validAgentFlags(): string {
  try {
    return validAgents()
      .map((agent) => `--agent ${agent}`)
      .join(", ");
  } catch {
    return "--agent <id> (run `goat-flow manifest` for valid ids)";
  }
}

/** Banner text warning that multi-agent setup output must stay in sync. */
export const MULTI_AGENT_SYNC_BANNER = [
  "**Multi-agent sync:** This prompt generates setup for multiple agents. The execution loop",
  "(READ → SCOPE → ACT → VERIFY), autonomy tiers, and Definition of Done",
  "MUST be identical across all instruction files. Write these sections for the first agent,",
  "then COPY THEM VERBATIM to the other instruction files. Do not rephrase.",
];
