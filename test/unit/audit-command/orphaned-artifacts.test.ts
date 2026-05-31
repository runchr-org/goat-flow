import {
  BUILD_CHECKS,
  STUB_STRUCTURE,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  stubAgentFacts,
  stubConfig,
  stubFS,
} from "./helpers.js";

describe("orphaned artifact detection refinement", () => {
  it("does not flag bare .claude/ dir as orphaned when no goat-flow skills are installed", () => {
    // To reach checkOrphanedArtifacts, earlier checks must pass:
    // - checkAnyAgentConfigured needs agents.length > 0
    // - checkConfiguredInstructionFilesPresent needs all agents to have instruction files
    // So we provide a codex agent with instruction present, and put claude only
    // in structure.agents with CLAUDE.md missing and bare .claude/ artifacts.
    const check = BUILD_CHECKS.find((c) => c.id === "agent-instruction")!;
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
    const result = check.run(
      makeCtx({
        agentFilter: null,
        agents: [stubAgentFacts({ agent: codexProfile })],
        config: stubConfig(),
        structure: {
          ...STUB_STRUCTURE,
          agents: {
            codex: {
              instruction_file: "AGENTS.md",
              skills_dir: ".agents/skills",
              hooks_dir: ".codex/hooks",
              settings: ".codex/config.toml",
            },
            claude: {
              instruction_file: "CLAUDE.md",
              skills_dir: ".claude/skills",
              hooks_dir: ".claude/hooks",
              settings: ".claude/settings.json",
            },
          },
        },
        fs: stubFS({
          exists: (path: string) => {
            if (path === "AGENTS.md") return true;
            if (path === "CLAUDE.md") return false;
            if (path === ".claude/settings.json") return true;
            if (path === ".claude/hooks") return true;
            if (path === ".claude/hooks/deny-dangerous.sh") return false;
            if (path === ".claude/hooks/guard-repository-writes.sh")
              return false;
            return true;
          },
          listDir: () => [],
        }),
      }),
    );

    // checkOrphanedArtifacts should reach agentArtifactsExist for claude,
    // find no goat-flow skills or deny hook, and return null for claude.
    // The overall result should be null (no orphaned artifacts).
    assert.equal(
      result,
      null,
      "bare .claude/ with settings.json but no goat-flow skills should not be flagged as orphaned",
    );
  });
});

describe("orphaned artifact detection refinement", () => {
  it("flags genuine orphan when goat-flow deny hook exists but instruction file is missing", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-instruction")!;
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
    const result = check.run(
      makeCtx({
        agentFilter: null,
        agents: [stubAgentFacts({ agent: codexProfile })],
        config: stubConfig(),
        structure: {
          ...STUB_STRUCTURE,
          agents: {
            codex: {
              instruction_file: "AGENTS.md",
              skills_dir: ".agents/skills",
              hooks_dir: ".codex/hooks",
              settings: ".codex/config.toml",
            },
            claude: {
              instruction_file: "CLAUDE.md",
              skills_dir: ".claude/skills",
              hooks_dir: ".claude/hooks",
              settings: ".claude/settings.json",
            },
          },
        },
        fs: stubFS({
          exists: (path: string) => {
            if (path === "AGENTS.md") return true;
            if (path === "CLAUDE.md") return false;
            if (path === ".claude/hooks/deny-dangerous.sh") return true;
            return true;
          },
          listDir: () => [],
        }),
      }),
    );

    assertExists(result, "should report orphaned artifacts");
    assert.match(result.message, /artifacts exist/i);
    assert.match(result.message, /claude/i);
  });
});
