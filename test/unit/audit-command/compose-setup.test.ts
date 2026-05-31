import {
  AUDIT_VERSION,
  PROFILES,
  SKILL_NAMES,
  assert,
  composeSetup,
  describe,
  it,
  makeAuditReport,
  makeProjectFacts,
  makeTempProject,
  stubAgentFacts,
  writeProjectFile,
} from "./helpers.js";

describe("composeSetup routing", () => {
  it("can render dashboard setup prompts from harness-card scope", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - codex\nskills:\n  install: all\n`,
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [
            {
              id: "config-version",
              name: "Config version",
              status: "fail",
              failure: {
                check: "Config version",
                message: "Config version mismatch",
              },
            },
          ],
          [],
          [
            {
              id: "decisions-tracked",
              name: "Decisions directory exists",
              status: "pass",
            },
          ],
        ),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
        { promptScope: "harness-card" },
      );

      assert.ok(output, "composeSetup should return harness-card setup text");
      assert.match(output, /All audit checks pass\./);
      assert.doesNotMatch(output, /Config version mismatch/);
      assert.match(output, /audit .+ --harness --agent codex/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("does not claim a full audit pass for static dashboard setup evidence", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\n`,
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const facts = makeProjectFacts(project.root, [
        stubAgentFacts({
          agent: PROFILES.codex,
          skills: {
            ...stubAgentFacts().skills,
            found: [...SKILL_NAMES],
          },
          hooks: {
            ...stubAgentFacts().hooks,
            denyExists: true,
            postTurnExists: true,
          },
        }),
      ]);

      const output = composeSetup(
        makeAuditReport(
          project.root,
          "pass",
          [],
          [],
          [
            {
              id: "decisions-tracked",
              name: "Decisions directory exists",
              status: "pass",
            },
          ],
        ),
        facts,
        "codex",
        { denyMechanismEvidenceLevel: "static" },
      );

      assert.ok(output, "composeSetup should return setup text");
      assert.match(output, /Dashboard setup checks pass\./);
      assert.doesNotMatch(output, /All audit checks pass\./);
      assert.match(output, /runtime deny-hook probes not run/);
      assert.match(output, /Run `goat-flow audit .+ --harness --agent codex`/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("excludes informational harness metrics from full-scope failure prompts", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\n`,
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [
            {
              id: "config-version",
              name: "Config version",
              status: "fail",
              failure: {
                check: "Config version",
                message: "Config version mismatch",
              },
            },
          ],
          [],
          [
            {
              id: "post-turn-hook-integrity",
              name: "Post-turn hook integrity",
              status: "fail",
              type: "metric",
              failure: {
                check: "Post-turn hook integrity",
                message: "No post-turn hooks installed",
              },
            },
          ],
        ),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
      );

      assert.ok(output, "composeSetup should return failure guidance");
      assert.match(output, /1 audit check failed:/);
      assert.match(output, /Config version/);
      assert.doesNotMatch(output, /Post-turn hook integrity/);
      assert.match(
        output,
        /Re-run: `node .* audit .+ --harness --agent codex`/,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("falls back to the full setup guide for partial installs", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
    });

    try {
      const output = composeSetup(
        makeAuditReport(project.root, "fail"),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
      );

      assert.ok(output, "composeSetup should return setup guidance");
      assert.match(
        output,
        /This project has setup issues - it needs a full setup pass\./,
      );
      assert.match(
        output,
        /Do NOT copy customization templates \(architecture, footguns, code-map\) verbatim\./,
      );
      assert.match(output, /## Step 1 - Install files/);
      assert.match(
        output,
        /npx @blundergoat\/goat-flow@latest install .* --agent codex/,
      );
      assert.match(output, /does not require an agent/);
      assert.match(output, /## Step 2 - Create project-specific content/);
      assert.match(output, /## Step 3 - Verify/);
      assert.match(output, /Run both required setup gates/);
      assert.match(output, /audit .+ --agent codex`/);
      assert.match(output, /audit .+ --agent codex --harness`/);
      assert.match(output, /re-run both audit gates/);
      assert.match(output, /workflow\/setup\/agents\/codex\.md/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("keeps harness scope in dashboard setup failure remediation", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - codex\nskills:\n  install: all\n`,
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [],
          [],
          [
            {
              id: "decisions-tracked",
              name: "Decisions directory exists",
              status: "fail",
              failure: {
                check: "Decisions directory exists",
                message: "No decisions directory",
              },
            },
          ],
        ),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
        { promptScope: "harness-card" },
      );

      assert.ok(output, "composeSetup should return harness-card failure text");
      assert.match(output, /Decisions directory exists/);
      assert.match(
        output,
        /Re-run: `node .* audit .+ --harness --agent codex`/,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("renders audit-pass maintenance guidance for a healthy current codex project", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\n`,
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const facts = makeProjectFacts(project.root, [
        stubAgentFacts({
          agent: PROFILES.codex,
          skills: {
            ...stubAgentFacts().skills,
            found: [...SKILL_NAMES],
          },
          hooks: {
            ...stubAgentFacts().hooks,
            denyExists: true,
            postTurnExists: true,
          },
        }),
      ]);

      const output = composeSetup(
        makeAuditReport(project.root, "pass"),
        facts,
        "codex",
      );

      assert.ok(output, "composeSetup should return setup text");
      assert.match(output, /# GOAT Flow Setup - Codex/);
      assert.match(output, /All audit checks pass\./);
      assert.match(output, /7\/7 skills installed \(in \.agents\/skills\/\)/);
      assert.match(
        output,
        /2 hook scripts \(deny, post-turn\) in \.codex\/hooks\//,
      );
      assert.match(output, /Run `goat-flow audit .+ --harness --agent codex`/);
      assert.ok(
        !output.includes("scanner"),
        `audit-pass output should not regress to scanner wording: ${output}`,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("renders failed checks with howToFix text and setup-step references", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\n`,
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [
            {
              id: "config-version",
              name: "Config version",
              status: "fail",
              failure: {
                check: "Config version",
                message: "Config version mismatch",
                evidence: '.goat-flow/config.yaml says "1.0.0"',
                howToFix: `Set version to "${AUDIT_VERSION}"`,
              },
            },
          ],
          [
            {
              id: "agent-skills",
              name: "Agent skills",
              status: "fail",
              failure: {
                check: "Agent skills",
                message: "Missing goat-review",
              },
            },
          ],
        ),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
      );

      assert.ok(output, "composeSetup should return failure guidance");
      assert.match(output, /2 audit checks failed:/);
      assert.ok(
        output.includes(
          `Fix: Set version to "${AUDIT_VERSION}" (see Step 05 (config version field))`,
        ),
        output,
      );
      assert.match(
        output,
        /Evidence: \.goat-flow\/config\.yaml says "1\.0\.0"/,
      );
      assert.match(output, /See Step 03 \(install skills\)/);
      assert.match(
        output,
        /Re-run: `node .*dist\/cli\/cli\.js audit .+ --agent codex`/,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("routes current-but-incomplete installs to the full setup workflow", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - codex\nskills:\n  install: all\n`,
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [],
          [
            {
              id: "agent-instruction",
              name: "Agent instruction file",
              status: "fail",
              failure: {
                check: "Agent instruction file",
                message: "Missing: codex (AGENTS.md)",
              },
            },
          ],
        ),
        makeProjectFacts(project.root, []),
        "codex",
      );

      assert.ok(output, "composeSetup should return setup guidance");
      assert.match(output, /Create project-specific content/);
      assert.match(output, /workflow\/setup\//);
      assert.doesNotMatch(output, /audit checks failed/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("uses manual cleanup guidance for v0.9 installs", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      await writeProjectFile(root, ".agents/skills/goat-audit/SKILL.md", "#\n");
    });

    try {
      const retiredMigrationScript = "install-migrate-to-1" + ".1.sh";
      const retiredLegacyGuide = "upgrade-from-0" + ".9.x.md";
      const output = composeSetup(
        makeAuditReport(project.root, "fail"),
        makeProjectFacts(project.root, [
          stubAgentFacts({ agent: PROFILES.codex }),
        ]),
        "codex",
      );

      assert.ok(output, "composeSetup should return migration guidance");
      assert.match(output, /# GOAT Flow Migration - Codex/);
      assert.match(
        output,
        /npx @blundergoat\/goat-flow@latest install .* --agent codex/,
      );
      assert.match(output, /Remove legacy surfaces/);
      assert.match(output, /workflow\/setup\/02-instruction-file\.md/);
      assert.match(output, /Run both required setup gates/);
      assert.match(output, /audit .+ --agent codex`/);
      assert.match(output, /audit .+ --agent codex --harness`/);
      assert.ok(!output.includes(retiredMigrationScript), output);
      assert.ok(!output.includes(retiredLegacyGuide), output);
    } finally {
      await project.cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("uses the current numbered setup flow for outdated installs", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        'version: "1.1.0"\n',
      );
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-preamble.md",
        "# Preamble\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/skill-reference/skill-conventions.md",
        "# Conventions\n",
      );
      for (const skill of SKILL_NAMES) {
        await writeProjectFile(root, `.agents/skills/${skill}/SKILL.md`, "#\n");
      }
    });

    try {
      const retiredOutdatedGuide = "upgrade-from-1" + ".0.x.md";
      const output = composeSetup(
        makeAuditReport(
          project.root,
          "fail",
          [
            {
              id: "config-version",
              name: "Config version",
              status: "fail",
              failure: {
                check: "Config version",
                message: `Config version 1.1.0 does not match current ${AUDIT_VERSION}`,
                evidence: ".goat-flow/config.yaml",
              },
            },
          ],
          [
            {
              id: "agent-skills",
              name: "Agent skills",
              status: "fail",
              failure: {
                check: "Agent skills",
                message: `Skill goat is at v1.1.0; expected v${AUDIT_VERSION}`,
                evidence: ".agents/skills/goat/SKILL.md",
              },
            },
          ],
        ),
        makeProjectFacts(project.root, [
          stubAgentFacts({
            agent: PROFILES.codex,
            skills: { ...stubAgentFacts().skills, found: [...SKILL_NAMES] },
          }),
        ]),
        "codex",
      );

      assert.ok(output, "composeSetup should return upgrade guidance");
      assert.match(output, /# GOAT Flow Upgrade - Codex/);
      assert.match(output, /## Detected install issues/);
      assert.match(
        output,
        new RegExp(
          `Config version 1\\.1\\.0 does not match current ${AUDIT_VERSION.replaceAll(".", "\\.")}`,
        ),
      );
      assert.match(output, /Skill goat is at v1\.1\.0; expected v/);
      assert.match(
        output,
        /npx @blundergoat\/goat-flow@latest install .* --agent codex/,
      );
      assert.match(output, /workflow\/setup\/02-instruction-file\.md/);
      assert.match(output, /Run both required setup gates/);
      assert.match(output, /audit .+ --agent codex`/);
      assert.match(output, /audit .+ --agent codex --harness`/);
      assert.ok(!output.includes(retiredOutdatedGuide), output);
    } finally {
      await project.cleanup();
    }
  });
});
