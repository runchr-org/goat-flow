/**
 * Batch fact reuse for multi-agent audits: building isolated aggregate and per-agent fact views from a single
 * source bundle, running full-profile extraction once for the aggregate plus per-agent audits, ignoring legacy
 * config agents, and running dashboard-summary batches without stack detection or stack access.
 */
import {
  PROFILES,
  PROJECT_ROOT,
  assert,
  countSpan,
  createAuditFactsView,
  createFS,
  createSpanRecorder,
  describe,
  extractProjectFacts,
  it,
  makeProjectFacts,
  runAuditBatch,
  stubAgentFacts,
  stubConfig,
} from "./helpers.js";
import { createAuditFactsView as createAuditFactsViewFromAudit } from "../../../src/cli/audit/audit.js";

/**
 * Assert every per-agent audit was built from the shared batch facts.
 *
 * @param batch - batch audit result returned from the helper harness
 */
function assertPerAgentAuditsUseSharedFacts(
  batch: ReturnType<typeof runAuditBatch>,
): void {
  batch.perAgent.forEach((entry) => {
    assert.equal(entry.audit.scopes.agent.checks.length > 0, true);
    assert.equal(entry.audit.target, PROJECT_ROOT);
  });
}

describe("Batch fact reuse", () => {
  it("keeps the audit facade fact-view export aligned with the implementation", () => {
    assert.equal(createAuditFactsViewFromAudit, createAuditFactsView);
  });

  it("creates isolated aggregate and per-agent fact views from one source bundle", () => {
    const sourceFacts = makeProjectFacts(PROJECT_ROOT, [
      stubAgentFacts(),
      stubAgentFacts({ agent: PROFILES.codex }),
    ]);
    sourceFacts.shared.footguns.dirMentions.set("stable", 1);

    const aggregateView = createAuditFactsView(sourceFacts);
    const claudeView = createAuditFactsView(sourceFacts, { agentId: "claude" });
    const codexView = createAuditFactsView(sourceFacts, { agentId: "codex" });

    assert.deepEqual(
      claudeView.agents.map((agentFacts) => agentFacts.agent.id),
      ["claude"],
      "Claude view should contain only Claude facts",
    );
    assert.deepEqual(
      codexView.agents.map((agentFacts) => agentFacts.agent.id),
      ["codex"],
      "Codex view should contain only Codex facts",
    );

    claudeView.shared.footguns.dirMentions.set("mutated", 99);
    claudeView.shared.footguns.staleRefs.push("mutated-ref.md");
    claudeView.stack.languages.push("MutatedLang");
    claudeView.agents[0]?.skills.found.push("mutated-skill");

    assert.equal(
      sourceFacts.shared.footguns.dirMentions.has("mutated"),
      false,
      "Per-agent mutation should not affect source facts",
    );
    assert.equal(
      aggregateView.shared.footguns.dirMentions.has("mutated"),
      false,
      "Per-agent mutation should not affect aggregate facts",
    );
    assert.equal(
      codexView.shared.footguns.dirMentions.has("mutated"),
      false,
      "Per-agent mutation should not affect sibling facts",
    );
    assert.equal(
      aggregateView.shared.footguns.staleRefs.includes("mutated-ref.md"),
      false,
    );
    assert.equal(aggregateView.stack.languages.includes("MutatedLang"), false);
    assert.equal(
      codexView.agents[0]?.skills.found.includes("mutated-skill"),
      false,
    );
  });

  it("runs full-profile batch fact extraction once for aggregate plus per-agent audits", () => {
    const { profile, names } = createSpanRecorder();
    const batch = runAuditBatch(
      createFS(PROJECT_ROOT),
      PROJECT_ROOT,
      {
        agentFilter: null,
        harness: true,
        denyMechanismEvidenceLevel: "present-only",
        profile,
      },
      ["claude", "codex", "copilot"],
    );

    assert.equal(countSpan(names, "aggregate facts"), 1);
    assert.equal(countSpan(names, "detectStack"), 1);
    assert.equal(countSpan(names, "per-agent facts"), 0);
    assert.deepEqual(
      batch.perAgent.map((entry) => entry.id),
      ["claude", "codex", "copilot"],
    );
    assertPerAgentAuditsUseSharedFacts(batch);
  });

  it("ignores legacy config agents when extracting aggregate facts", () => {
    const facts = extractProjectFacts(createFS(PROJECT_ROOT), {
      agentFilter: null,
      projectPath: PROJECT_ROOT,
      configState: stubConfig({
        agents: ["claude", "claude", "codex", "codex"],
      }),
    });

    assert.deepEqual(
      facts.agents.map((agentFacts) => agentFacts.agent.id),
      ["claude", "codex", "antigravity", "copilot"],
    );
  });

  it("runs dashboard-summary batch audits without stack detection or stack access", () => {
    const { profile, names } = createSpanRecorder();
    const batch = runAuditBatch(
      createFS(PROJECT_ROOT),
      PROJECT_ROOT,
      {
        agentFilter: null,
        harness: true,
        denyMechanismEvidenceLevel: "present-only",
        factProfile: "dashboard-summary",
        profile,
      },
      ["claude", "codex", "copilot"],
    );

    assert.equal(countSpan(names, "aggregate facts"), 1);
    assert.equal(countSpan(names, "detectStack"), 0);
    assert.equal(batch.aggregate.target, PROJECT_ROOT);
    assert.deepEqual(
      batch.perAgent.map((entry) => entry.id),
      ["claude", "codex", "copilot"],
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2: audit fails when a named structure check is missing
// ---------------------------------------------------------------------------
