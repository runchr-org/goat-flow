/**
 * Integration tests for `goat-flow audit --check-drift`.
 *
 * Builds a tmpdir that looks like goat-flow itself (templateRoot) plus a
 * project layout (.claude/skills, .agents/skills, .goat-flow/) and runs
 * checkDrift against it. Mirrors the preflight skill-parity check but with
 * normalized frontmatter/body comparison.
 *
 * Also runs checkDrift against this repo's own root to confirm the live
 * state stays pass.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { assertExists } from "../helpers/assert-exists.ts";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { checkDrift } from "../../src/cli/audit/check-drift.js";
import { createFS } from "../../src/cli/facts/fs.js";
import { SKILL_NAMES } from "../../src/cli/constants.js";
import {
  getInstalledSkillRoots,
  getSkillFiles,
} from "../../src/cli/manifest/manifest.js";

export const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
export const INSTALL_FIXTURE_SKILL = "skill-with-references";
export const INSTALL_FIXTURE_FILES = [
  "SKILL.md",
  "references/sample.md",
] as const;

export const SKILL_STUB = (name: string): string =>
  `---\nname: ${name}\ndescription: stub for drift test\n---\n# ${name}\nbody\n`;

export const SHARED_STUB = "# shared\nbody\n";
export const HOOK_STUB = "#!/usr/bin/env bash\n# deny hook stub\n";
export const COPILOT_HOOK_CONFIG_STUB =
  '{\n  "version": 1,\n  "hooks": { "preToolUse": [] }\n}\n';
export const COPILOT_GRUFF_HOOK_ENTRY = {
  type: "command",
  bash: ".github/hooks/gruff-code-quality.sh",
  powershell:
    'if (Get-Command bash -ErrorAction SilentlyContinue) { bash .github/hooks/gruff-code-quality.sh } else { Write-Output \'{"permissionDecision":"deny","permissionDecisionReason":"Bash, Git Bash, or WSL is required to run .github/hooks/gruff-code-quality.sh on Windows."}\' }',
  timeoutSec: 30,
};

/** Captured subprocess result used by install-roundtrip drift assertions. */
export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  output: string;
}

/** Writes canonical skill stubs into a template or installed mirror root. */
export function writeSkillFiles(
  root: string,
  baseDir: string,
  name: string,
): void {
  for (const relativeFile of getSkillFiles(name)) {
    const fullPath = join(root, baseDir, name, relativeFile);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(
      fullPath,
      relativeFile === "SKILL.md" ? SKILL_STUB(name) : SHARED_STUB,
    );
  }
}

/** Writes a complete filesystem drift fixture with workflow templates and installed copies. */
export function setupFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "goat-flow-drift-"));
  // Template: meta references stay under workflow/skills/reference/
  mkdirSync(join(root, "workflow", "skills", "reference"), { recursive: true });
  writeFileSync(
    join(root, "workflow", "skills", "reference", "README.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "reference", "skill-preamble.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "reference", "skill-conventions.md"),
    SHARED_STUB,
  );
  // Template: standalone playbooks live under workflow/skills/playbooks/
  mkdirSync(join(root, "workflow", "skills", "playbooks"), { recursive: true });
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "README.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "browser-use.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "code-comments.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "gruff-code-quality.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "observability.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "changelog.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "page-capture.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "release-notes.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, "workflow", "skills", "playbooks", "skill-quality-testing.md"),
    SHARED_STUB,
  );
  mkdirSync(
    join(root, "workflow", "skills", "playbooks", "skill-quality-testing"),
    { recursive: true },
  );
  for (const topical of [
    "tdd-iteration",
    "adversarial-framing",
    "deployment",
  ]) {
    writeFileSync(
      join(
        root,
        "workflow",
        "skills",
        "playbooks",
        "skill-quality-testing",
        `${topical}.md`,
      ),
      SHARED_STUB,
    );
  }
  for (const name of SKILL_NAMES) {
    writeSkillFiles(root, join("workflow", "skills"), name);
  }
  // Project installed copies of skill files
  for (const agentDir of getInstalledSkillRoots()) {
    for (const name of SKILL_NAMES) {
      writeSkillFiles(root, agentDir, name);
    }
  }
  // Installed: meta references under .goat-flow/skill-reference/
  mkdirSync(join(root, ".goat-flow", "skill-reference"), { recursive: true });
  writeFileSync(
    join(root, ".goat-flow", "skill-reference", "README.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-reference", "skill-preamble.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-reference", "skill-conventions.md"),
    SHARED_STUB,
  );
  // Installed: standalone playbooks under .goat-flow/skill-playbooks/
  mkdirSync(join(root, ".goat-flow", "skill-playbooks"), { recursive: true });
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "README.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "browser-use.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "code-comments.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "gruff-code-quality.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "observability.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "changelog.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "page-capture.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "release-notes.md"),
    SHARED_STUB,
  );
  writeFileSync(
    join(root, ".goat-flow", "skill-playbooks", "skill-quality-testing.md"),
    SHARED_STUB,
  );
  mkdirSync(
    join(root, ".goat-flow", "skill-playbooks", "skill-quality-testing"),
    { recursive: true },
  );
  for (const topical of [
    "tdd-iteration",
    "adversarial-framing",
    "deployment",
  ]) {
    writeFileSync(
      join(
        root,
        ".goat-flow",
        "skill-playbooks",
        "skill-quality-testing",
        `${topical}.md`,
      ),
      SHARED_STUB,
    );
  }
  return root;
}

/** Writes deny-dangerous hook fixtures for drift checks that compare hook manifests. */
export function writeHookFixtures(root: string): void {
  mkdirSync(join(root, "workflow", "hooks", "agent-config"), {
    recursive: true,
  });
  mkdirSync(join(root, "workflow", "hooks", "hook-lib"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "workflow", "hooks", "deny-dangerous.sh"),
    HOOK_STUB,
  );
  for (const hookLibFile of [
    "patterns-shell.sh",
    "patterns-paths.sh",
    "patterns-writes.sh",
    "deny-dangerous-self-test.sh",
  ]) {
    writeFileSync(
      join(root, "workflow", "hooks", "hook-lib", hookLibFile),
      HOOK_STUB,
    );
  }
  mkdirSync(join(root, ".goat-flow", "hook-lib"), { recursive: true });
  for (const hookLibFile of [
    "patterns-shell.sh",
    "patterns-paths.sh",
    "patterns-writes.sh",
    "deny-dangerous-self-test.sh",
  ]) {
    writeFileSync(join(root, ".goat-flow", "hook-lib", hookLibFile), HOOK_STUB);
  }
  writeFileSync(
    join(root, "workflow", "hooks", "agent-config", "copilot-hooks.json"),
    COPILOT_HOOK_CONFIG_STUB,
  );
  for (const hooksDir of [".claude/hooks", ".codex/hooks", ".github/hooks"]) {
    mkdirSync(join(root, hooksDir), { recursive: true });
    writeFileSync(join(root, hooksDir, "deny-dangerous.sh"), HOOK_STUB);
  }
  writeFileSync(
    join(root, ".github", "hooks", "hooks.json"),
    COPILOT_HOOK_CONFIG_STUB,
  );
}

/** Clone the repo into a temp fixture; writes a full install target while reusing node_modules for speed. */
export function setupInstallRoundTripFixture(): string {
  const parent = mkdtempSync(join(tmpdir(), "goat-flow-install-roundtrip-"));
  const root = join(parent, "repo");
  cpSync(PROJECT_ROOT, root, {
    recursive: true,
    filter: (src) => {
      const rel = relative(PROJECT_ROOT, src);
      if (rel === "") return true;
      const [topLevel] = rel.split(sep);
      if (topLevel === ".git" || topLevel === "node_modules") return false;
      return rel !== join(".goat-flow", "logs", "sessions");
    },
  });
  symlinkSync(join(PROJECT_ROOT, "node_modules"), join(root, "node_modules"));
  const git = spawnSync("git", ["init", "-q"], {
    cwd: root,
    encoding: "utf-8",
  });
  assert.equal(
    git.status,
    0,
    `temp round-trip repo should initialize git:\n${git.stderr ?? ""}`,
  );
  return root;
}

/** Writes cloned fixture patches so install round-trip tests include a reference skill. */
export function patchInstallRoundTripFixture(root: string): {
  agentIds: string[];
  skillRoots: string[];
} {
  const manifestPath = join(root, "workflow", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    agents: Record<string, { skills_dir: string }>;
    skills: {
      canonical: string[];
      references?: Record<string, string[]>;
    };
  };

  if (!manifest.skills.canonical.includes(INSTALL_FIXTURE_SKILL)) {
    manifest.skills.canonical.push(INSTALL_FIXTURE_SKILL);
  }
  manifest.skills.references = {
    ...(manifest.skills.references ?? {}),
    [INSTALL_FIXTURE_SKILL]: [...INSTALL_FIXTURE_FILES].filter(
      (file) => file !== "SKILL.md",
    ),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const constantsPath = join(root, "src", "cli", "constants.ts");
  const constants = readFileSync(constantsPath, "utf8");
  if (!constants.includes(`"${INSTALL_FIXTURE_SKILL}"`)) {
    writeFileSync(
      constantsPath,
      constants.replace(
        /\] as const;/,
        `  "${INSTALL_FIXTURE_SKILL}",\n] as const;`,
      ),
    );
  }

  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  pkg.scripts = {
    ...(pkg.scripts ?? {}),
    test: 'node -e "console.log(`# tests 1\\n# pass 1\\n# fail 0`)"',
  };
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");

  cpSync(
    join(PROJECT_ROOT, "test", "fixtures", INSTALL_FIXTURE_SKILL),
    join(root, "workflow", "skills", INSTALL_FIXTURE_SKILL),
    { recursive: true },
  );

  return {
    agentIds: Object.keys(manifest.agents),
    skillRoots: [
      ...new Set(
        Object.values(manifest.agents).map((agent) =>
          agent.skills_dir.replace(/\/$/, ""),
        ),
      ),
    ],
  };
}

export function runCommand(
  cwd: string,
  command: "bash" | "node" | "npx",
  args: string[],
  timeout = 60000,
): CommandResult {
  const spawnOptions = {
    cwd,
    encoding: "utf-8",
    timeout,
  } as const;
  const result =
    command === "bash"
      ? spawnSync("bash", args, spawnOptions)
      : command === "node"
        ? spawnSync("node", args, spawnOptions)
        : spawnSync("npx", args, spawnOptions);
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    status: result.status,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
  };
}

export {
  describe,
  it,
  before,
  after,
  assert,
  spawnSync,
  assertExists,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  tmpdir,
  dirname,
  join,
  relative,
  resolve,
  sep,
  checkDrift,
  createFS,
  SKILL_NAMES,
  getInstalledSkillRoots,
  getSkillFiles,
};
