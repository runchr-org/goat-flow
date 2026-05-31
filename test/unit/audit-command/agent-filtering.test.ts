import {
  BUILD_CHECKS,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  stubAgentFacts,
  stubFS,
} from "./helpers.js";

describe("--agent filtering", () => {
  it("agent-skills check validates skills for the selected agent", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-skills")!;
    const codexProfile: AgentProfile = {
      id: "codex",
      name: "Codex",
      instructionFile: "AGENTS.md",
      settingsFile: ".codex/config.toml",
      hookConfigFile: ".codex/hooks.json",
      skillsDir: ".agents/skills",
      hooksDir: ".codex/hooks",
      denyMechanism: {
        type: "deny-script",
        path: ".codex/hooks/deny-dangerous.sh",
      },
      denyHookFile: ".codex/hooks/deny-dangerous.sh",
      localPattern: ".github/instructions/*.md",
      hookEvents: { preTool: "", postTurn: "stop" },
    };
    const codexFacts = stubAgentFacts({ agent: codexProfile });

    // FS where claude skills exist but codex skills don't
    const fsWithMissingCodexSkills = stubFS({
      exists: (path: string) => !path.startsWith(".agents/skills/"),
    });

    // With codex in ctx.agents, check fails (codex skill files missing from disk)
    const ctxWithCodex = makeCtx({
      agentFilter: "codex",
      agents: [stubAgentFacts(), codexFacts],
      fs: fsWithMissingCodexSkills,
    });
    const resultWithCodex = check.run(ctxWithCodex);
    assertExists(resultWithCodex, "Should fail when codex skill files missing");
    assert.ok(
      resultWithCodex.message.includes("codex:"),
      "Failure should mention codex",
    );

    // With only claude in ctx.agents (--agent filter applied upstream), check passes
    const ctxClaudeOnly = makeCtx({
      agentFilter: "claude",
      agents: [stubAgentFacts()],
      fs: fsWithMissingCodexSkills,
    });
    const resultClaudeOnly = check.run(ctxClaudeOnly);
    assert.equal(
      resultClaudeOnly,
      null,
      "Should pass when only selected agent (claude) is checked",
    );
  });
});
