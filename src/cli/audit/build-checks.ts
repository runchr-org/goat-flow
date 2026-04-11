/**
 * Build checks for `goat-flow audit`.
 * Each check returns null on pass or an AuditFailure on fail.
 * Checks are grouped by scope: setup, project, integration.
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { BuildCheck } from "./types.js";
import { RUBRIC_VERSION } from "../rubric/version.js";

// === Setup scope checks ===

const requiredFilesExist: BuildCheck = {
  id: "required-files",
  scope: "setup",
  run: (ctx) => {
    const missing = ctx.structure.required_files.filter(
      (f) => !ctx.fs.exists(f),
    );
    if (missing.length === 0) return null;
    return {
      check: "Required files",
      message: `Missing: ${missing.join(", ")}`,
      evidence: missing[0],
    };
  },
};

const requiredDirsExist: BuildCheck = {
  id: "required-dirs",
  scope: "setup",
  run: (ctx) => {
    const missing = ctx.structure.required_dirs.filter((d) => {
      const trimmed = d.endsWith("/") ? d.slice(0, -1) : d;
      return ctx.fs.listDir(trimmed).length === 0 && !ctx.fs.exists(trimmed);
    });
    if (missing.length === 0) return null;
    return {
      check: "Required directories",
      message: `Missing: ${missing.join(", ")}`,
      evidence: missing[0],
    };
  },
};

const configExistsAndParses: BuildCheck = {
  id: "config-parses",
  scope: "setup",
  run: (ctx) => {
    if (!ctx.config.exists) {
      return {
        check: "Config file",
        message: ".goat-flow/config.yaml does not exist",
      };
    }
    if (ctx.config.parseError) {
      return {
        check: "Config file",
        message: `Parse error: ${ctx.config.parseError}`,
        evidence: ".goat-flow/config.yaml",
      };
    }
    return null;
  },
};

const configVersionCurrent: BuildCheck = {
  id: "config-version",
  scope: "setup",
  run: (ctx) => {
    if (!ctx.config.exists) return null;
    const version = ctx.config.config.version;
    if (!version) {
      return {
        check: "Config version",
        message: "version field missing from config.yaml",
      };
    }
    if (version !== RUBRIC_VERSION) {
      return {
        check: "Config version",
        message: `Config version ${version} does not match current ${RUBRIC_VERSION}`,
      };
    }
    return null;
  },
};

const agentsSupportedValues: BuildCheck = {
  id: "agents-supported",
  scope: "setup",
  run: (ctx) => {
    const configAgents = ctx.config.config.agents;
    if (!configAgents) return null;
    const known = new Set(["claude", "codex", "gemini"]);
    const unknown = configAgents.filter((a) => !known.has(a));
    if (unknown.length === 0) return null;
    return {
      check: "Configured agents",
      message: `Unsupported agent values: ${unknown.join(", ")}`,
    };
  },
};

const canonicalSkillsExist: BuildCheck = {
  id: "canonical-skills",
  scope: "setup",
  run: (ctx) => {
    const canonical = ctx.structure.skills.canonical;
    const missingByAgent: string[] = [];
    for (const af of ctx.agents) {
      const skillsDir = af.agent.skillsDir;
      for (const skill of canonical) {
        const skillPath = `${skillsDir}/${skill}/SKILL.md`;
        if (!ctx.fs.exists(skillPath)) {
          missingByAgent.push(`${af.agent.id}:${skill}`);
        }
      }
    }
    if (missingByAgent.length === 0) return null;
    return {
      check: "Canonical skills",
      message: `Missing skill files: ${missingByAgent.join(", ")}`,
      evidence: missingByAgent[0],
    };
  },
};

const skillVersionsPresent: BuildCheck = {
  id: "skill-versions",
  scope: "setup",
  run: (ctx) => {
    const noVersion: string[] = [];
    for (const af of ctx.agents) {
      for (const [name, version] of Object.entries(af.skills.versions)) {
        if (version === null) {
          noVersion.push(`${af.agent.id}:${name}`);
        }
      }
    }
    if (noVersion.length === 0) return null;
    return {
      check: "Skill versions",
      message: `Missing goat-flow-skill-version: ${noVersion.join(", ")}`,
      evidence: noVersion[0],
    };
  },
};

const instructionFilesExist: BuildCheck = {
  id: "instruction-files",
  scope: "setup",
  run: (ctx) => {
    const missing: string[] = [];
    for (const af of ctx.agents) {
      if (!af.instruction.exists) {
        missing.push(
          `${af.agent.id} (${af.agent.instructionFile})`,
        );
      }
    }
    if (missing.length === 0) return null;
    return {
      check: "Instruction files",
      message: `Missing: ${missing.join(", ")}`,
    };
  },
};

const noStaleSkillDirs: BuildCheck = {
  id: "stale-skill-dirs",
  scope: "setup",
  run: (ctx) => {
    const staleNames = new Set([
      ...ctx.structure.skills.stale_names,
      ...ctx.structure.skills.stale_generic,
    ]);
    const staleFound: string[] = [];
    for (const af of ctx.agents) {
      for (const dir of af.skills.installedDirs) {
        const name = dir.split("/").pop() ?? "";
        if (staleNames.has(name)) {
          staleFound.push(`${af.agent.id}:${name}`);
        }
      }
    }
    if (staleFound.length === 0) return null;
    return {
      check: "Stale skill directories",
      message: `Found stale directories: ${staleFound.join(", ")}`,
      evidence: staleFound[0],
    };
  },
};

const noWorkflowPathLeaks: BuildCheck = {
  id: "workflow-path-leaks",
  scope: "setup",
  run: (ctx) => {
    const leaks: string[] = [];
    for (const af of ctx.agents) {
      const skillsDir = af.agent.skillsDir;
      for (const skill of af.skills.found) {
        const skillFile = `${skillsDir}/${skill}/SKILL.md`;
        const content = ctx.fs.readFile(skillFile);
        if (content && /workflow\//.test(content)) {
          leaks.push(`${af.agent.id}:${skill}`);
        }
      }
    }
    if (leaks.length === 0) return null;
    return {
      check: "Path integrity",
      message: `Skills containing workflow/ paths: ${leaks.join(", ")}`,
      evidence: leaks[0],
    };
  },
};

// === Project scope checks ===

const toolchainPresent: BuildCheck = {
  id: "toolchain-commands",
  scope: "project",
  run: (ctx) => {
    const tc = ctx.config.config.toolchain;
    const missing: string[] = [];
    if (tc.test.length === 0) missing.push("test");
    if (tc.lint.length === 0) missing.push("lint");
    if (tc.build.length === 0) missing.push("build");
    if (missing.length === 0) return null;
    return {
      check: "Toolchain commands",
      message: `Missing toolchain commands: ${missing.join(", ")}`,
    };
  },
};

const agentSettingsParse: BuildCheck = {
  id: "agent-settings-parse",
  scope: "project",
  run: (ctx) => {
    const invalid: string[] = [];
    for (const af of ctx.agents) {
      if (af.settings.exists && !af.settings.valid) {
        invalid.push(af.agent.id);
      }
    }
    if (invalid.length === 0) return null;
    return {
      check: "Agent settings",
      message: `Invalid settings for: ${invalid.join(", ")}`,
    };
  },
};

// === Integration scope checks ===

const hookFilesExist: BuildCheck = {
  id: "hook-files-exist",
  scope: "integration",
  run: (ctx) => {
    const missing: string[] = [];
    for (const af of ctx.agents) {
      if (!af.hooks.denyExists && !af.hooks.denyIsConfigBased) {
        missing.push(`${af.agent.id}:deny`);
      }
    }
    if (missing.length === 0) return null;
    return {
      check: "Hook files",
      message: `Missing hook files: ${missing.join(", ")}`,
    };
  },
};

const hookScriptsSyntaxValid: BuildCheck = {
  id: "hook-syntax",
  scope: "integration",
  run: (ctx) => {
    const failures: string[] = [];
    for (const af of ctx.agents) {
      if (!af.agent.hooksDir) continue;
      const hooksDir = af.agent.hooksDir;
      let files: string[];
      try {
        files = ctx.fs.listDir(hooksDir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!file.endsWith(".sh")) continue;
        const fullPath = join(ctx.projectPath, hooksDir, file);
        try {
          execSync(`bash -n "${fullPath}"`, {
            stdio: "pipe",
            timeout: 5000,
          });
        } catch {
          failures.push(`${hooksDir}/${file}`);
        }
      }
    }
    if (failures.length === 0) return null;
    return {
      check: "Hook syntax",
      message: `bash -n failed: ${failures.join(", ")}`,
      evidence: failures[0],
    };
  },
};

const denyPatternsRegistered: BuildCheck = {
  id: "deny-patterns",
  scope: "integration",
  run: (ctx) => {
    const noDeny: string[] = [];
    for (const af of ctx.agents) {
      if (!af.settings.hasDenyPatterns && !af.hooks.denyExists) {
        noDeny.push(af.agent.id);
      }
    }
    if (noDeny.length === 0) return null;
    return {
      check: "Deny patterns",
      message: `No deny patterns registered for: ${noDeny.join(", ")}`,
    };
  },
};

/** All build checks in scope order */
export const BUILD_CHECKS: BuildCheck[] = [
  // setup
  requiredFilesExist,
  requiredDirsExist,
  configExistsAndParses,
  configVersionCurrent,
  agentsSupportedValues,
  canonicalSkillsExist,
  skillVersionsPresent,
  instructionFilesExist,
  noStaleSkillDirs,
  noWorkflowPathLeaks,
  // project
  toolchainPresent,
  agentSettingsParse,
  // integration
  hookFilesExist,
  hookScriptsSyntaxValid,
  denyPatternsRegistered,
];
