import {
  BUILD_CHECKS,
  STUB_STRUCTURE,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  stubAgentFacts,
  stubFS,
} from "./helpers.js";

describe("audit fails on stale skill directory", () => {
  it("agent-skills check fails when deprecated skill dir is present", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-skills")!;
    const ctx = makeCtx({
      agentFilter: "claude",
      agents: [
        stubAgentFacts({
          skills: {
            ...stubAgentFacts().skills,
            installedDirs: [".claude/skills/goat", ".claude/skills/goat-audit"],
          },
        }),
      ],
    });
    const result = check.run(ctx);
    assertExists(result, "Should fail when stale skill dir exists");
    assert.ok(
      result.message.includes("goat-audit"),
      `Failure should mention stale dir: ${result.message}`,
    );
  });

  it("agent-skills check fails when stale skill reference files are present", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-skills")!;
    const structure: ProjectStructure = {
      ...STUB_STRUCTURE,
      skills: {
        ...STUB_STRUCTURE.skills,
        references: {
          "goat-security": [
            "references/common-threats.md",
            "references/identity-and-data.md",
            "references/file-upload-and-paths.md",
            "references/supply-chain-and-cicd.md",
            "references/project-policy-template.md",
          ],
        },
      },
    };
    const ctx = makeCtx({
      agentFilter: "claude",
      structure,
      fs: stubFS({
        glob: (pattern) =>
          pattern === ".claude/skills/goat-security/references/**/*.md"
            ? [
                ".claude/skills/goat-security/references/common-threats.md",
                ".claude/skills/goat-security/references/auth-authz.md",
              ]
            : [],
      }),
    });

    const result = check.run(ctx);

    assertExists(result);
    assert.match(result.message, /Unexpected stale skill reference files/);
    assert.match(result.message, /auth-authz\.md/);
    assert.match(result.howToFix ?? "", /goat-flow install \. --agent <id>/);
  });
});

// ---------------------------------------------------------------------------
// Test 5: audit --harness produces concerns without affecting exit code
// ---------------------------------------------------------------------------
