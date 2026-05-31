/**
 * composeSetup prompt routing: choosing the right guidance for an audit result - dashboard vs harness scope,
 * audit-pass maintenance vs failed-check remediation with howToFix and setup-step references, full-setup
 * fallback for partial/incomplete installs, and version-specific cleanup paths for v0.9 and outdated installs.
 */
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

const CURRENT_CODEX_CONFIG = `version: "${AUDIT_VERSION}"\nagents:\n  - codex\nskills:\n  install: all\n`;
const MINIMAL_CURRENT_CONFIG = `version: "${AUDIT_VERSION}"\n`;

/** Options for the reusable current-install fixture used by composeSetup tests. */
interface CurrentCodexInstallOptions {
  config?: string;
  includeInstruction?: boolean;
}

/** Rendered composeSetup output with the temp project cleanup contract kept visible. */
interface ComposeSetupFixture {
  root: string;
  output: string;
  cleanup: () => Promise<void>;
}

/** Write the smallest current Codex install that composeSetup treats as structurally complete. */
async function writeCurrentCodexInstall(
  root: string,
  options: CurrentCodexInstallOptions = {},
): Promise<void> {
  const { config = MINIMAL_CURRENT_CONFIG, includeInstruction = true } =
    options;
  await writeProjectFile(root, ".goat-flow/config.yaml", config);
  if (includeInstruction) {
    await writeProjectFile(root, "AGENTS.md", "# Codex\n");
  }
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
}

/** Build the default Codex facts used when the test only cares about prompt routing. */
function makeDefaultCodexFacts(
  root: string,
): ReturnType<typeof makeProjectFacts> {
  return makeProjectFacts(root, [stubAgentFacts({ agent: PROFILES.codex })]);
}

/** Build Codex facts for the healthy-install branch with every skill and hook present. */
function makeHealthyCodexFacts(
  root: string,
): ReturnType<typeof makeProjectFacts> {
  return makeProjectFacts(root, [
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
}

/** Create a temp project, render composeSetup, and clean up if rendering throws. */
async function renderComposeSetup(
  init: (root: string) => Promise<void>,
  reportFor: (root: string) => Parameters<typeof composeSetup>[0],
  factsFor: (
    root: string,
  ) => Parameters<typeof composeSetup>[1] = makeDefaultCodexFacts,
  options?: Parameters<typeof composeSetup>[3],
): Promise<ComposeSetupFixture> {
  const project = await makeTempProject(init);
  try {
    const output = composeSetup(
      reportFor(project.root),
      factsFor(project.root),
      "codex",
      options,
    );
    return { ...project, output };
  } catch (error) {
    await project.cleanup();
    throw error;
  }
}

/** Render a harness-card prompt where setup failures are intentionally out of scope. */
function renderHarnessCardPromptWithSetupFailure(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    (root) => writeCurrentCodexInstall(root, { config: CURRENT_CODEX_CONFIG }),
    (root) =>
      makeAuditReport(
        root,
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
    makeDefaultCodexFacts,
    { promptScope: "harness-card" },
  );
}

/** Render dashboard setup text from static hook evidence so wording stays scoped. */
function renderStaticDashboardEvidencePrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    writeCurrentCodexInstall,
    (root) =>
      makeAuditReport(
        root,
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
    makeHealthyCodexFacts,
    { denyMechanismEvidenceLevel: "static" },
  );
}

/** Render a full-scope failure prompt where metric-only harness failures must not count. */
function renderFailurePromptWithMetricHarnessFailure(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(writeCurrentCodexInstall, (root) =>
    makeAuditReport(
      root,
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
  );
}

/** Render setup guidance for a target that only has an instruction file. */
function renderPartialInstallSetupGuide(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    (root) => writeProjectFile(root, "AGENTS.md", "# Codex\n"),
    (root) => makeAuditReport(root, "fail"),
  );
}

/** Render harness-card remediation for a failing harness check. */
function renderHarnessCardFailurePrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    (root) => writeCurrentCodexInstall(root, { config: CURRENT_CODEX_CONFIG }),
    (root) =>
      makeAuditReport(
        root,
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
    makeDefaultCodexFacts,
    { promptScope: "harness-card" },
  );
}

/** Render the maintenance prompt for a healthy current Codex install. */
function renderHealthyCurrentInstallPrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    writeCurrentCodexInstall,
    (root) => makeAuditReport(root, "pass"),
    makeHealthyCodexFacts,
  );
}

/** Render failed-check guidance that includes howToFix details and setup-step references. */
function renderFailurePromptWithHowToFix(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(writeCurrentCodexInstall, (root) =>
    makeAuditReport(
      root,
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
  );
}

/** Render the workflow fallback for an install that is current but missing the Codex instruction. */
function renderIncompleteCurrentInstallPrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    (root) =>
      writeCurrentCodexInstall(root, {
        config: CURRENT_CODEX_CONFIG,
        includeInstruction: false,
      }),
    (root) =>
      makeAuditReport(
        root,
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
    (root) => makeProjectFacts(root, []),
  );
}

/** Render manual migration guidance for a v0.9-era goat-audit install. */
function renderLegacyAuditSkillMigrationPrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    async (root) => {
      await writeProjectFile(root, "AGENTS.md", "# Codex\n");
      await writeProjectFile(root, ".agents/skills/goat-audit/SKILL.md", "#\n");
    },
    (root) => makeAuditReport(root, "fail"),
  );
}

/** Render upgrade guidance for a current-shape install whose config and skills are outdated. */
function renderOutdatedCurrentInstallPrompt(): Promise<ComposeSetupFixture> {
  return renderComposeSetup(
    (root) => writeCurrentCodexInstall(root, { config: 'version: "1.1.0"\n' }),
    (root) =>
      makeAuditReport(
        root,
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
    (root) =>
      makeProjectFacts(root, [
        stubAgentFacts({
          agent: PROFILES.codex,
          skills: { ...stubAgentFacts().skills, found: [...SKILL_NAMES] },
        }),
      ]),
  );
}

describe("composeSetup routing", () => {
  it("can render dashboard setup prompts from harness-card scope", async () => {
    const { output, cleanup } = await renderHarnessCardPromptWithSetupFailure();

    try {
      assert.ok(output, "composeSetup should return harness-card setup text");
      assert.match(output, /All audit checks pass\./);
      assert.doesNotMatch(output, /Config version mismatch/);
      assert.match(output, /audit .+ --harness --agent codex/);
    } finally {
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("does not claim a full audit pass for static dashboard setup evidence", async () => {
    const { output, cleanup } = await renderStaticDashboardEvidencePrompt();

    try {
      assert.ok(output, "composeSetup should return setup text");
      assert.match(output, /Dashboard setup checks pass\./);
      assert.doesNotMatch(output, /All audit checks pass\./);
      assert.match(output, /runtime deny-hook probes not run/);
      assert.match(output, /Run `goat-flow audit .+ --harness --agent codex`/);
    } finally {
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("excludes informational harness metrics from full-scope failure prompts", async () => {
    const { output, cleanup } =
      await renderFailurePromptWithMetricHarnessFailure();

    try {
      assert.ok(output, "composeSetup should return failure guidance");
      assert.match(output, /1 audit check failed:/);
      assert.match(output, /Config version/);
      assert.doesNotMatch(output, /Post-turn hook integrity/);
      assert.match(
        output,
        /Re-run: `node .* audit .+ --harness --agent codex`/,
      );
    } finally {
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("falls back to the full setup guide for partial installs", async () => {
    const { output, cleanup } = await renderPartialInstallSetupGuide();

    try {
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
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("keeps harness scope in dashboard setup failure remediation", async () => {
    const { output, cleanup } = await renderHarnessCardFailurePrompt();

    try {
      assert.ok(output, "composeSetup should return harness-card failure text");
      assert.match(output, /Decisions directory exists/);
      assert.match(
        output,
        /Re-run: `node .* audit .+ --harness --agent codex`/,
      );
    } finally {
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("renders audit-pass maintenance guidance for a healthy current codex project", async () => {
    const { output, cleanup } = await renderHealthyCurrentInstallPrompt();

    try {
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
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("renders failed checks with howToFix text and setup-step references", async () => {
    const { output, cleanup } = await renderFailurePromptWithHowToFix();

    try {
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
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("routes current-but-incomplete installs to the full setup workflow", async () => {
    const { output, cleanup } = await renderIncompleteCurrentInstallPrompt();

    try {
      assert.ok(output, "composeSetup should return setup guidance");
      assert.match(output, /Create project-specific content/);
      assert.match(output, /workflow\/setup\//);
      assert.doesNotMatch(output, /audit checks failed/);
    } finally {
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("uses manual cleanup guidance for v0.9 installs", async () => {
    const { output, cleanup } = await renderLegacyAuditSkillMigrationPrompt();

    try {
      const retiredMigrationScript = "install-migrate-to-1" + ".1.sh";
      const retiredLegacyGuide = "upgrade-from-0" + ".9.x.md";

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
      await cleanup();
    }
  });
});

describe("composeSetup routing", () => {
  it("uses the current numbered setup flow for outdated installs", async () => {
    const { output, cleanup } = await renderOutdatedCurrentInstallPrompt();

    try {
      const retiredOutdatedGuide = "upgrade-from-1" + ".0.x.md";

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
      await cleanup();
    }
  });
});
