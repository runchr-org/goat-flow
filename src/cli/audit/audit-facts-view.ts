import type { AgentId, ProjectFacts } from "../types.js";
import type { AuditFactProfile } from "./types.js";

/**
 * Build an isolated facts view for one audit context from a batch fact bundle.
 *
 * @param facts - shared extracted facts reused across aggregate and per-agent audits
 * @param options - optional agent/profile narrowing for the returned facts view
 * @returns facts narrowed to the requested agent/profile without mutating the batch bundle
 */
export function createAuditFactsView(
  facts: ProjectFacts,
  options: { agentId?: AgentId; factProfile?: AuditFactProfile } = {},
): ProjectFacts {
  const selectedAgents = options.agentId
    ? facts.agents.filter(
        (agentFacts) => agentFacts.agent.id === options.agentId,
      )
    : facts.agents;
  return {
    root: facts.root,
    stack:
      options.factProfile === "dashboard-summary"
        ? facts.stack
        : structuredClone(facts.stack),
    shared: structuredClone(facts.shared),
    agents: structuredClone(selectedAgents),
  };
}
