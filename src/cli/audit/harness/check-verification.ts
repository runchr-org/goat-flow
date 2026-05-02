/**
 * Verification concern: Can the agent verify its own work honestly?
 * 4 checks: test-runner-configured, hooks-registered, commit-guidance, post-turn-hook-integrity.
 */
import type { AuditContext, HarnessCheck } from "../types.js";
import type { CheckEvidence } from "../provenance-types.js";
import { pass, fail } from "./helpers.js";

const VERIFIED_ON = "2026-04-18";

/** Return the verification provenance. */
function verificationProvenance(
  type: HarnessCheck["type"],
  paths: string[],
  sourceType: CheckEvidence["source_type"] = "spec",
): CheckEvidence {
  return {
    source_type: sourceType,
    source_urls: [],
    verified_on: VERIFIED_ON,
    normative_level:
      type === "integrity"
        ? "MUST"
        : type === "advisory"
          ? "SHOULD"
          : "BEST_PRACTICE",
    evidence_paths: paths,
  };
}

const VALIDATION_ARTIFACT_DIRS = [
  ".goat-flow/logs/validation",
  ".goat-flow/logs/sessions",
];
const RECENT_VALIDATION_DAYS = 14;

function isRecentDatedArtifact(path: string, now = new Date()): boolean {
  const match = path.match(/(?:^|\/)(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;
  const [, year, month, day] = match;
  if (!year || !month || !day) return false;
  const artifactDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const ageDays = Math.floor(
    (today.getTime() - artifactDate.getTime()) / 86_400_000,
  );
  return ageDays >= 0 && ageDays <= RECENT_VALIDATION_DAYS;
}

function isExplicitValidationArtifact(path: string): boolean {
  return path.startsWith(".goat-flow/logs/validation/");
}

function listValidationArtifacts(ctx: AuditContext): string[] {
  const artifacts: string[] = [];
  for (const dir of VALIDATION_ARTIFACT_DIRS) {
    let entries: string[];
    try {
      entries = ctx.fs.listDir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!/\.(json|md|txt|log)$/i.test(entry)) continue;
      const path = `${dir}/${entry}`;
      if (isExplicitValidationArtifact(path) || isRecentDatedArtifact(path)) {
        artifacts.push(path);
      }
    }
  }
  return artifacts;
}

function artifactProvesCommand(content: string, command: string): boolean {
  if (!content.includes(command)) return false;
  return /(^|\n)\s*(PASS\b|# pass\b|EXIT=0\b|exit[_ -]?code["']?\s*[:=]\s*0\b|status["']?\s*[:=]\s*["']?pass["']?\b)/i.test(
    content,
  );
}

function findRuntimeProof(
  ctx: AuditContext,
  commands: readonly string[],
): string | null {
  for (const artifact of listValidationArtifacts(ctx)) {
    const content = ctx.fs.readFile(artifact);
    if (!content) continue;
    for (const command of commands) {
      if (artifactProvesCommand(content, command)) return artifact;
    }
  }
  return null;
}

function configuredTestCommands(ctx: AuditContext): string[] {
  const commands = [...ctx.config.config.toolchain.test];
  if (
    ctx.factProfile !== "dashboard-summary" &&
    ctx.facts.stack.testCommand &&
    !commands.includes(ctx.facts.stack.testCommand)
  ) {
    commands.push(ctx.facts.stack.testCommand);
  }
  return commands;
}

const testRunnerConfigured: HarnessCheck = {
  id: "test-runner-configured",
  name: "Test runner proof",
  concern: "verification",
  type: "advisory",
  provenance: verificationProvenance("advisory", [
    "docs/harness-audit.md",
    ".goat-flow/config.yaml",
  ]),
  /** Run the Test runner configured check. */
  run: (ctx) => {
    const commands = configuredTestCommands(ctx);
    if (commands.length === 0) {
      return fail(
        [
          "Missing: no structured toolchain.test command or detected project test command",
        ],
        [
          "Declare a useful test command in toolchain.test or document/run the project-local verification command",
        ],
        [
          "Add toolchain.test to .goat-flow/config.yaml when the project has tests, or add an explicit validation artifact under .goat-flow/logs/validation/ after running the project-local command.",
        ],
      );
    }

    const proofPath = findRuntimeProof(ctx, commands);
    if (proofPath) {
      return pass([
        `Runtime-proven: validation artifact ${proofPath} records a passing run for ${commands[0]}`,
      ]);
    }
    return fail(
      [
        `Configured-only: test command declared or detected (${commands[0]}) but no runtime validation artifact proves it ran successfully`,
      ],
      [
        "Run the configured test command and save explicit pass/fail evidence before treating verification as proven",
      ],
      [
        `Run ${commands[0]} and record the command plus a literal pass/fail summary in .goat-flow/logs/validation/ or a session log.`,
      ],
    );
  },
};

const hooksRegistered: HarnessCheck = {
  id: "hooks-registered",
  name: "Hook registrations in sync",
  concern: "verification",
  type: "integrity",
  provenance: verificationProvenance(
    "integrity",
    [
      "docs/harness-audit.md",
      ".goat-flow/footguns/hooks.md",
      ".goat-flow/footguns/auditor.md",
    ],
    "incident",
  ),
  /** Run the Hook registrations in sync check. */
  run: (ctx) => {
    const findings: string[] = [];
    const recs: string[] = [];
    const fixes: string[] = [];
    let anyFail = false;
    for (const af of ctx.agents) {
      if (af.hooks.postTurnRegistered && !af.hooks.postTurnExists) {
        findings.push(
          `${af.agent.id}: post-turn hook registered but file missing`,
        );
        recs.push("Create the registered post-turn hook file");
        fixes.push(
          `Create the post-turn hook file at the path specified in ${af.agent.settingsFile}.`,
        );
        anyFail = true;
      }
      if (af.hooks.postTurnExists && !af.hooks.postTurnRegistered) {
        findings.push(
          `${af.agent.id}: post-turn hook file exists but not registered`,
        );
        recs.push("Register the post-turn hook in agent settings");
        fixes.push(`Register the post-turn hook in ${af.agent.settingsFile}.`);
        anyFail = true;
      }
    }
    if (anyFail) return fail(findings, recs, fixes);
    return pass(["Hook registrations and files are in sync"]);
  },
};

const commitGuidance: HarnessCheck = {
  id: "commit-guidance",
  name: "Commit guidance present",
  concern: "verification",
  type: "advisory",
  provenance: verificationProvenance("advisory", [
    "docs/harness-audit.md",
    ".github/git-commit-instructions.md",
  ]),
  /** Run the Commit guidance present check. */
  run: (ctx) => {
    const guidance = ctx.facts.shared.gitCommitInstructions;
    if (guidance.exists) {
      return pass([`Commit guidance found at ${guidance.path}`]);
    }
    if (guidance.misplacedPaths.length > 0) {
      return fail(
        [
          `Commit guidance belongs at ${guidance.requiredPath} when .github/ exists`,
        ],
        [`Move commit conventions to ${guidance.requiredPath}`],
        [
          `Create ${guidance.requiredPath} and move or copy the content from ${guidance.misplacedPaths.join(", ")}.`,
        ],
      );
    }
    return fail(
      ["No commit guidance detected"],
      [`Add commit conventions to ${guidance.requiredPath}`],
      [`Create ${guidance.requiredPath} with this project's commit rules.`],
    );
  },
};

/** Consolidated: hook validation + honest failure reporting (informational) */
const postTurnHookIntegrity: HarnessCheck = {
  id: "post-turn-hook-integrity",
  name: "Post-turn hook integrity",
  concern: "verification",
  type: "metric",
  provenance: verificationProvenance("metric", [
    "docs/harness-audit.md",
    ".goat-flow/footguns/hooks.md",
  ]),
  /** Run the Post-turn hook integrity check. */
  run: (ctx) => {
    const findings: string[] = [];
    let anyHook = false;

    for (const af of ctx.agents) {
      if (!af.hooks.postTurnExists) continue;
      anyHook = true;

      if (af.hooks.postTurnHasValidation) {
        findings.push(`${af.agent.id}: post-turn hook runs validation`);
      } else {
        findings.push(`${af.agent.id}: post-turn hook has no validation logic`);
      }

      if (af.hooks.postTurnSwallowsFailures) {
        findings.push(
          `${af.agent.id}: post-turn hook always exits 0 (advisory mode)`,
        );
      } else if (af.hooks.postTurnHasValidation) {
        findings.push(
          `${af.agent.id}: post-turn hook reports failures honestly`,
        );
      }
    }

    if (!anyHook) {
      return fail(
        ["No post-turn hooks installed; no hook-based validation evidence"],
        [
          "Install a project-specific post-turn validation hook only if this project needs automatic post-action checks",
        ],
      );
    }
    if (
      findings.some(
        (finding) =>
          finding.includes("no validation logic") ||
          finding.includes("always exits 0"),
      )
    ) {
      return fail(findings, [
        "Make post-turn validation hooks run meaningful checks and report failures honestly, or leave them uninstalled",
      ]);
    }
    return pass(findings);
  },
};

export const VERIFICATION_CHECKS: HarnessCheck[] = [
  testRunnerConfigured,
  hooksRegistered,
  commitGuidance,
  postTurnHookIntegrity,
];
