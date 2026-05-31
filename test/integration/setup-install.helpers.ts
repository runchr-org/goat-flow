/**
 * Integration tests for deterministic setup/install scaffolding.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
export const disposables: string[] = [];
export const gitAvailable =
  spawnSync("git", ["--version"], {
    encoding: "utf-8",
  }).status === 0;

after(() => {
  for (const dir of disposables) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Create an isolated target project for installer side-effect assertions. */
export function makeTempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "goat-flow-setup-install-"));
  disposables.push(root);
  return root;
}

/** Spawns the shell installer exactly as users invoke setup --apply. */
export function runInstaller(root: string, ...extraArgs: string[]) {
  return spawnSync(
    "bash",
    [
      join(PROJECT_ROOT, "workflow", "install-goat-flow.sh"),
      root,
      ...extraArgs,
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      timeout: 30000,
    },
  );
}

/** Spawns the TypeScript CLI installer path against a temp project fixture. */
export function runCliInstaller(root: string, ...extraArgs: string[]) {
  return spawnSync(
    "node",
    [
      "--import",
      "tsx",
      join(PROJECT_ROOT, "src", "cli", "cli.ts"),
      "install",
      root,
      ...extraArgs,
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      timeout: 30000,
    },
  );
}

/** Spawns git in a fixture repo with deterministic author metadata. */
export function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf-8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "GOAT Test",
      GIT_AUTHOR_EMAIL: "goat@example.test",
      GIT_COMMITTER_NAME: "GOAT Test",
      GIT_COMMITTER_EMAIL: "goat@example.test",
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

/** Writes a fixture history entry and commits it for upgrade-path tests. */
export function addCommit(root: string, subject: string): void {
  writeFileSync(join(root, "history.txt"), `${subject}\n`, { flag: "a" });
  git(root, ["add", "history.txt"]);
  git(root, ["commit", "-m", subject]);
}

export {
  after,
  describe,
  it,
  assert,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  tmpdir,
  join,
  resolve,
  spawnSync,
};
