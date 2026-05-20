/**
 * Canonical per-agent profiles used by setup, fact extraction, and prompt rendering.
 */
import type { AgentProfile, AgentId } from "../types.js";
import { getAgentProfileMap } from "../agents/registry.js";

/** Configuration profiles for all supported AI coding agents. */
export const PROFILES: Record<AgentId, AgentProfile> = getAgentProfileMap();
