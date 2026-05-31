/**
 * Audit rule that a Copilot install references the GitHub commit instructions: agent-instruction provenance
 * follows the selected agent and keeps Copilot bridge evidence, fails when copilot-instructions.md omits the
 * commit-guide reference, skips the bridge when .github is absent, and fails the aggregate on an incomplete install.
 */
import {
  BUILD_CHECKS,
  PROFILES,
  STUB_STRUCTURE,
  assert,
  assertExists,
  describe,
  getRepoAudit,
  it,
  makeCtx,
  stubAgentFacts,
  stubFS,
} from "./helpers.js";

describe("copilot install requires GitHub commit instructions", () => {
  it("agent-instruction provenance follows the selected agent", () => {
    for (const [agent, instructionFile] of [
      ["claude", "CLAUDE.md"],
      ["antigravity", "AGENTS.md"],
    ] as const) {
      const report = getRepoAudit({ agentFilter: agent, harness: false });
      const result = report.scopes.agent.checks.find(
        (check) => check.id === "agent-instruction",
      )!;
      assert.ok(result.provenance.evidence_paths?.includes(instructionFile));
      assert.ok(
        result.provenance.framework_evidence_paths?.includes(
          "workflow/manifest.json",
        ),
      );
      assert.ok(
        result.provenance.target_evidence_paths?.includes(instructionFile),
      );
      assert.ok(
        !result.provenance.evidence_paths?.includes(
          "workflow/setup/agents/copilot.md",
        ),
      );
      assert.ok(
        !result.provenance.evidence_paths?.includes(
          "docs/coding-standards/git-commit.md",
        ),
      );
    }
  });

  it("agent-instruction provenance keeps Copilot bridge evidence for Copilot", () => {
    const report = getRepoAudit({ agentFilter: "copilot", harness: false });
    const result = report.scopes.agent.checks.find(
      (check) => check.id === "agent-instruction",
    )!;
    assert.ok(
      result.provenance.evidence_paths?.includes(
        "workflow/setup/agents/copilot.md",
      ),
    );
    assert.ok(
      result.provenance.evidence_paths?.includes(
        ".github/copilot-instructions.md",
      ),
    );
    assert.ok(
      result.provenance.evidence_paths?.includes(
        "docs/coding-standards/git-commit.md",
      ),
    );
  });

  it("agent-instruction fails when copilot-instructions.md omits the commit-guide reference", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-instruction")!;
    const result = check.run(
      makeCtx({
        agentFilter: "copilot",
        agents: [stubAgentFacts({ agent: PROFILES.copilot })],
        fs: stubFS({
          readFile: () => "# Copilot Instructions\n(no commit reference)\n",
        }),
      }),
    );

    assertExists(result);
    assert.equal(result.check, "Agent instruction file");
    assert.equal(result.evidence, ".github/copilot-instructions.md");
    assert.match(
      result.message,
      /must reference docs\/coding-standards\/git-commit\.md/,
    );
  });

  it("agent-instruction does not require the bridge when .github is absent", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-instruction")!;
    const result = check.run(
      makeCtx({
        agentFilter: "copilot",
        agents: [stubAgentFacts({ agent: PROFILES.copilot })],
        fs: stubFS({
          exists: (path: string) => path !== ".github",
        }),
      }),
    );

    assert.equal(result, null);
  });

  it("aggregate agent-instruction fails for an incomplete Copilot install", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-instruction")!;
    const result = check.run(
      makeCtx({
        agentFilter: null,
        agents: [stubAgentFacts({ agent: PROFILES.copilot })],
        structure: {
          ...STUB_STRUCTURE,
          agents: {
            copilot: {
              instruction_file: ".github/copilot-instructions.md",
              skills_dir: ".github/skills",
            },
          },
        },
        fs: stubFS({
          readFile: () => "# Copilot Instructions\n(no commit reference)\n",
        }),
      }),
    );

    assertExists(result);
    assert.equal(result.evidence, ".github/copilot-instructions.md");
  });
});

// ---------------------------------------------------------------------------
// Phantom agent detection regression.
// ---------------------------------------------------------------------------
