/**
 * Hook tests for the stop-lint Stop hook.
 * Advisory mode reports errors and exits 0; enforce mode exits non-zero when
 * GOAT_LINT_ENFORCE=1 and validation finds issues.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK_PATH = join(import.meta.dirname, "../../.claude/hooks/stop-lint.sh");

let tempRoot: string | null = null;

afterEach(() => {
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

/** Create a temp directory with a git repo initialized. */
function createGitRepo(): string {
  tempRoot = mkdtempSync(join(tmpdir(), "goat-flow-stop-lint-"));
  execSync("git init", { cwd: tempRoot, stdio: "pipe" });
  execSync('git config user.email "test@test.com"', {
    cwd: tempRoot,
    stdio: "pipe",
  });
  execSync('git config user.name "Test"', {
    cwd: tempRoot,
    stdio: "pipe",
  });
  // Initial commit so HEAD exists
  writeFileSync(join(tempRoot, "README.md"), "# test\n");
  execSync('git add . && git commit -m "init"', {
    cwd: tempRoot,
    stdio: "pipe",
  });
  return tempRoot;
}

/** Write a file and stage it in the git repo. */
function writeAndStage(root: string, path: string, content: string): void {
  const fullPath = join(root, path);
  mkdirSync(join(root, ...path.split("/").slice(0, -1)), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  if (path.endsWith(".sh")) {
    chmodSync(fullPath, 0o755);
  }
  execSync(`git add "${path}"`, { cwd: root, stdio: "pipe" });
}

/** Run the stop-lint hook in a given working directory. */
function runStopLint(
  cwd: string,
  envOverrides: NodeJS.ProcessEnv = {},
): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync("bash", [HOOK_PATH], {
    cwd,
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, STOP_HOOK_ACTIVE: "", ...envOverrides },
  });
  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("stop-lint.sh hook source integrity", () => {
  it("does NOT use || true to SUPPRESS validation results", () => {
    const hookContent = readFileSync(HOOK_PATH, "utf8");
    // The stop-lint hook MUST exit 0 (non-zero causes infinite loops).
    // Using `|| true` to capture output into a variable is OK:
    //   SC_OUT=$(shellcheck "$f" 2>&1) || true  ← captures output, checks later
    // Using `|| true` to SKIP error handling is NOT OK:
    //   shellcheck "$f" || true  ← swallows the error entirely
    const lines = hookContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#")) continue;
      const isValidationCmd = /shellcheck|eslint|tsc|phpstan/.test(line);
      if (!isValidationCmd) continue;
      // Pattern: bare `command || true` without output capture is bad
      // Pattern: `VAR=$(command) || true` is OK (captures for later check)
      const isBareSwallow = /\|\|\s*true/.test(line) && !/\$\(/.test(line);
      if (isBareSwallow) {
        assert.fail(
          `Line ${i + 1} swallows validation without capturing output: ${line}`,
        );
      }
    }
  });
});

describe("stop-lint.sh hook", () => {
  it("stays advisory by default even when validation finds issues", () => {
    const root = createGitRepo();

    // Write a .sh file with a shellcheck issue (unused variable)
    writeAndStage(
      root,
      "scripts/bad.sh",
      '#!/usr/bin/env bash\nUNUSED_VAR="hello"\necho done\n',
    );

    const result = runStopLint(root);
    assert.equal(result.status, 0, "Stop hook must always exit 0");
  });

  it("reports issues in output when .sh files have syntax errors", () => {
    const root = createGitRepo();

    // Write a .sh file with a syntax error
    writeAndStage(
      root,
      "scripts/broken.sh",
      "#!/usr/bin/env bash\nif [ true\necho done\n",
    );

    const result = runStopLint(root);
    assert.equal(result.status, 0, "Stop hook must always exit 0");
    // The hook reports errors to stderr; check combined output
    const combined = result.stdout + result.stderr;
    const hasErrorReport =
      combined.includes("Syntax error") ||
      combined.includes("shellcheck") ||
      combined.includes("broken.sh") ||
      combined.includes("Stop hook found issues");
    assert.ok(
      hasErrorReport,
      `Expected output to mention broken.sh or syntax error, got stdout: "${result.stdout}", stderr: "${result.stderr}"`,
    );
  });

  it("exits non-zero in enforce mode when validation finds issues", () => {
    const root = createGitRepo();

    writeAndStage(
      root,
      "scripts/broken.sh",
      "#!/usr/bin/env bash\nif [ true\necho done\n",
    );

    const result = runStopLint(root, { GOAT_LINT_ENFORCE: "1" });
    assert.equal(
      result.status,
      1,
      "Enforce mode should fail on validation errors",
    );
    assert.ok(
      (result.stdout + result.stderr).includes("Stop hook found issues"),
      "Expected enforce mode to still report the collected errors",
    );
  });

  it("stays zero in enforce mode when validation finds no issues", () => {
    const root = createGitRepo();

    writeAndStage(
      root,
      "scripts/clean.sh",
      '#!/usr/bin/env bash\nset -euo pipefail\necho "clean"\n',
    );

    const result = runStopLint(root, { GOAT_LINT_ENFORCE: "1" });
    assert.equal(result.status, 0);
  });

  it("produces no errors for clean staged .sh files", () => {
    const root = createGitRepo();

    writeAndStage(
      root,
      "scripts/clean.sh",
      '#!/usr/bin/env bash\nset -euo pipefail\necho "clean"\n',
    );

    const result = runStopLint(root);
    assert.equal(result.status, 0);
    // No "Stop hook found issues" in stderr for a clean file
    assert.ok(
      !result.stderr.includes("Syntax error"),
      `Unexpected syntax error for clean script: ${result.stderr}`,
    );
  });

  it("skips gracefully when not in a git repo", () => {
    const noGitDir = mkdtempSync(join(tmpdir(), "goat-flow-no-git-"));
    const originalTempRoot = tempRoot;
    tempRoot = noGitDir;

    const result = runStopLint(noGitDir);
    assert.equal(result.status, 0, "Should exit 0 when not in a git repo");

    // Restore cleanup target
    rmSync(noGitDir, { recursive: true, force: true });
    tempRoot = originalTempRoot;
  });

  it("respects infinite loop guard", () => {
    const root = createGitRepo();

    // Run with STOP_HOOK_ACTIVE=1 to trigger the guard
    try {
      execSync(`bash "${HOOK_PATH}"`, {
        cwd: root,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
        env: { ...process.env, STOP_HOOK_ACTIVE: "1" },
      });
      // Should exit 0 immediately
    } catch {
      assert.fail("Hook should exit 0 when infinite loop guard is active");
    }
  });
});
