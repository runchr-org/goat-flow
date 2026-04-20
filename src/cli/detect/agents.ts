/**
 * Detects which agent runtimes are configured in a project.
 * Also defines the canonical per-agent profiles used by setup, fact extraction, and prompt rendering.
 */
import type { AgentProfile, AgentId, ReadonlyFS } from "../types.js";
import { getAgentProfileMap, getKnownAgentIds } from "../agents/registry.js";

/** Configuration profiles for all supported AI coding agents. */
export const PROFILES: Record<AgentId, AgentProfile> = getAgentProfileMap();

/** Detect which AI coding agents are configured in the project */
export function detectAgents(fs: ReadonlyFS): AgentProfile[] {
  /** Accumulator for agents whose instruction files exist in the project */
  const agents: AgentProfile[] = [];

  // Iterate over each known agent ID to check for its instruction file
  for (const id of getKnownAgentIds()) {
    /** Profile configuration for the current agent */
    const profile = PROFILES[id];
    if (fs.exists(profile.instructionFile)) {
      agents.push(profile);
    }
  }

  return agents;
}
