/**
 * Integration tests for deterministic setup/install scaffolding.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const disposables: string[] = [];

after(() => {
  for (const dir of disposables) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "goat-flow-setup-install-"));
  disposables.push(root);
  return root;
}

describe("setup --apply installer", () => {
  it("scaffolds config.yaml for only the requested agent", () => {
    const root = makeTempProject();
    const result = spawnSync(
      "bash",
      [join(PROJECT_ROOT, "workflow", "install-goat-flow.sh"), root, "--agent", "codex"],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        timeout: 30000,
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const config = readFileSync(join(root, ".goat-flow", "config.yaml"), "utf-8");
    assert.match(config, /agents:\n  - codex\n/);
    assert.doesNotMatch(config, /  - claude\n/);
    assert.doesNotMatch(config, /  - gemini\n/);
    assert.doesNotMatch(config, /  - copilot\n/);
    assert.equal(
      existsSync(join(root, ".agents", "skills", "goat", "SKILL.md")),
      true,
    );
    assert.equal(
      existsSync(join(root, ".codex", "hooks", "deny-dangerous.sh")),
      true,
    );
  });
});
