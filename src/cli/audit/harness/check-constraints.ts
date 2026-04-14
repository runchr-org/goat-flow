/**
 * Constraints concern: Do deterministic rules catch failures before the LLM runs?
 * Consolidated from 6 → 5 checks (ask-first-boundaries + ask-first-structural-sync → ask-first).
 */
import type { AuditContext, QualityCheck } from "../types.js";
import { pass, partial, fail } from "./helpers.js";

const denyCoversSecrets: QualityCheck = {
  id: "deny-covers-secrets",
  concern: "constraints",
  weight: 3,
  run: (ctx) => {
    const covered: string[] = [];
    const uncovered: string[] = [];
    for (const af of ctx.agents) {
      if (af.hooks.readDenyCoversSecrets) {
        covered.push(af.agent.id);
      } else {
        uncovered.push(af.agent.id);
      }
    }
    if (covered.length === 0) {
      return partial(
        30,
        ["Deny patterns do not cover secret file reads"],
        ["Add deny patterns for .env, credentials, and key files"],
        [
          "Add deny patterns for .env, .credentials, *.key, and *.pem files in the agent's deny configuration.",
        ],
      );
    }
    if (uncovered.length > 0) {
      return partial(
        60,
        [
          `${covered.join(", ")}: deny patterns cover secrets`,
          `${uncovered.join(", ")}: deny patterns missing secret file coverage`,
        ],
        [
          `Add deny patterns for .env, credentials, and key files to ${uncovered.join(", ")}`,
        ],
        [
          `Add deny patterns for .env, .credentials, *.key, and *.pem files to ${uncovered.join(", ")} agent configuration.`,
        ],
      );
    }
    return pass([`${covered.join(", ")}: deny patterns cover secrets`]);
  },
};

const denyBlocksDangerous: QualityCheck = {
  id: "deny-blocks-dangerous",
  concern: "constraints",
  weight: 3,
  run: (ctx) => {
    if (ctx.agents.length === 0) {
      return fail(["No agents to check"], ["Configure at least one agent"]);
    }
    const findings: string[] = [];
    const recs: string[] = [];
    const fixes: string[] = [];
    let allPass = true;
    for (const af of ctx.agents) {
      const { denyBlocksRmRf, denyBlocksForcePush, denyBlocksChmod } = af.hooks;
      if (denyBlocksRmRf && denyBlocksForcePush && denyBlocksChmod) {
        findings.push(`${af.agent.id}: deny blocks rm -rf, force-push, chmod`);
      } else {
        allPass = false;
        const missing: string[] = [];
        if (!denyBlocksRmRf) missing.push("rm -rf");
        if (!denyBlocksForcePush) missing.push("force-push");
        if (!denyBlocksChmod) missing.push("chmod");
        findings.push(
          `${af.agent.id}: deny missing coverage for ${missing.join(", ")}`,
        );
        recs.push(
          `Add deny patterns for ${missing.join(", ")} to ${af.agent.id}`,
        );
        fixes.push(
          `Add deny patterns for ${missing.join(", ")} in ${af.agent.id} agent configuration.`,
        );
      }
    }
    if (allPass) return pass(findings);
    return partial(50, findings, recs, fixes);
  },
};

const denyBlocksPipeToShell: QualityCheck = {
  id: "deny-blocks-pipe-to-shell",
  concern: "constraints",
  weight: 2,
  run: (ctx) => {
    const covered: string[] = [];
    const uncovered: string[] = [];
    for (const af of ctx.agents) {
      if (af.hooks.denyBlocksPipeToShell) {
        covered.push(af.agent.id);
      } else {
        uncovered.push(af.agent.id);
      }
    }
    if (uncovered.length === 0) {
      return pass([
        `${covered.join(", ")}: deny blocks pipe-to-shell (curl | bash)`,
      ]);
    }
    if (covered.length === 0) {
      return partial(
        30,
        ["No agents block pipe-to-shell pattern (curl | bash)"],
        ["Add deny pattern for pipe-to-shell commands"],
        [
          "Add a deny pattern matching curl|bash and wget|sh in agent deny configuration.",
        ],
      );
    }
    return partial(
      60,
      [`${uncovered.join(", ")}: pipe-to-shell not blocked`],
      [`Add pipe-to-shell deny pattern to ${uncovered.join(", ")}`],
      [
        `Add deny patterns for curl|bash and wget|sh to ${uncovered.join(", ")} agent configuration.`,
      ],
    );
  },
};

/** Consolidated: ask-first-boundaries + ask-first-structural-sync */
const askFirst: QualityCheck = {
  id: "ask-first",
  concern: "constraints",
  weight: 2,
  run: (ctx) => {
    const boundaries = ctx.config.config.askFirst;

    // No boundaries at all
    if (boundaries.length === 0) {
      return partial(
        40,
        ["No ask_first boundaries configured"],
        ["Add ask_first entries in config.yaml for high-risk paths"],
        [
          "Add ask_first entries in .goat-flow/config.yaml for high-risk paths like deployment configs and security files.",
        ],
      );
    }

    // Check structural sync with instruction files
    const configPaths = boundaries.map((b) => b.path);
    const normalizePath = (p: string) =>
      p.replace(/\/\*\*$/, "").replace(/\/$/, "");

    const findings: string[] = [];
    const recs: string[] = [];
    let allSynced = true;

    for (const af of ctx.agents) {
      if (!af.instruction.exists || !af.instruction.content) {
        findings.push(`${af.agent.id}: no instruction file to check`);
        allSynced = false;
        continue;
      }
      const lower = af.instruction.content.toLowerCase();
      const notMentioned = configPaths.filter(
        (p) => !lower.includes(normalizePath(p).toLowerCase()),
      );
      if (notMentioned.length === 0) {
        findings.push(
          `${af.agent.id}: all ${configPaths.length} ask_first paths mentioned`,
        );
      } else {
        findings.push(
          `${af.agent.id}: ${notMentioned.length} ask_first paths not in instruction file`,
        );
        recs.push(
          `Sync ask_first boundaries in ${af.agent.instructionFile} to match config.yaml`,
        );
        allSynced = false;
      }
    }

    if (allSynced) {
      return pass([
        `${boundaries.length} ask_first boundaries configured`,
        ...findings,
      ]);
    }
    return partial(40, findings, recs, [
      "Add missing ask_first paths from config.yaml to the Ask First / Autonomy Tiers section of the instruction file.",
    ]);
  },
};

/** Resolve lint commands to a searchable string, expanding wrapper scripts. */
function resolveLintCommands(
  ctx: AuditContext,
  lintCommands: string[],
): string {
  const joined = lintCommands.join(" ").toLowerCase();
  let resolved = joined;
  for (const cmd of lintCommands) {
    const scriptMatch = cmd.match(
      /bash\s+(\S+\.sh)|sh\s+(\S+\.sh)|\.\/(\S+\.sh)/,
    );
    const scriptPath = scriptMatch?.[1] ?? scriptMatch?.[2] ?? scriptMatch?.[3];
    if (scriptPath) {
      const content = ctx.fs.readFile(`${ctx.projectPath}/${scriptPath}`);
      if (content) resolved += " " + content.toLowerCase();
    }
  }
  return resolved;
}

const linterRegistered: QualityCheck = {
  id: "linter-registered",
  concern: "constraints",
  weight: 2,
  run: (ctx) => {
    const detected = ctx.facts.stack.signals.staticAnalysis;
    const lintCommands = ctx.config.config.toolchain.lint;

    if (detected.length === 0) {
      return partial(
        50,
        ["No static analysis tools detected in project manifests"],
        [
          "Install a linter (eslint, phpstan, ruff, etc.) and register it in config.yaml toolchain.lint",
        ],
        [
          "Install a linter for your project and add it to toolchain.lint in .goat-flow/config.yaml.",
        ],
      );
    }
    if (lintCommands.length === 0) {
      return fail(
        [
          `${detected.map((t) => t.tool).join(", ")} detected but no lint command configured`,
        ],
        ["Register detected linters in config.yaml toolchain.lint"],
        [
          `Add toolchain.lint entries to .goat-flow/config.yaml for: ${detected.map((t) => t.tool).join(", ")}.`,
        ],
      );
    }
    const resolvedJoined = resolveLintCommands(ctx, lintCommands);
    const registered: string[] = [];
    const unregistered: string[] = [];
    for (const tool of detected) {
      if (resolvedJoined.includes(tool.tool.toLowerCase())) {
        registered.push(tool.tool);
      } else {
        unregistered.push(tool.tool);
      }
    }
    if (unregistered.length === 0) {
      return pass([
        `${registered.join(", ")} detected and registered in toolchain.lint`,
      ]);
    }
    const score = Math.round((registered.length / detected.length) * 100);
    return partial(
      Math.max(score, 30),
      [`${unregistered.join(", ")} installed but not in toolchain.lint`],
      [`Add ${unregistered.join(", ")} to toolchain.lint in config.yaml`],
      [
        `Add lint commands for ${unregistered.join(", ")} to the toolchain.lint array in .goat-flow/config.yaml.`,
      ],
    );
  },
};

export const CONSTRAINTS_CHECKS: QualityCheck[] = [
  denyCoversSecrets,
  denyBlocksDangerous,
  denyBlocksPipeToShell,
  askFirst,
  linterRegistered,
];
