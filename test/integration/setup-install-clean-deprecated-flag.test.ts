import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeTempProject, runInstaller } from "./setup-install.helpers.js";

describe("--clean-deprecated flag", () => {
  /** Writes deprecated skill directories and verifies cleanup removes them. */
  it("removes deprecated skill directories when flag is passed", () => {
    const root = makeTempProject();
    // Simulate a v0.9 project with deprecated skills
    const deprecatedDirs = ["goat-audit", "goat-test", "goat-investigate"];
    for (const name of deprecatedDirs) {
      const dir = join(root, ".claude", "skills", name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), `# ${name}`);
    }

    const result = runInstaller(
      root,
      "--agent",
      "claude",
      "--clean-deprecated",
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    for (const name of deprecatedDirs) {
      assert.equal(
        existsSync(join(root, ".claude", "skills", name)),
        false,
        `deprecated skill ${name} should be removed`,
      );
    }
    assert.equal(
      existsSync(join(root, ".claude", "skills", "goat", "SKILL.md")),
      true,
      "canonical skills should still be installed",
    );
  });

  it("does not remove deprecated skills without the flag", () => {
    const root = makeTempProject();
    const deprecatedDir = join(root, ".claude", "skills", "goat-audit");
    mkdirSync(deprecatedDir, { recursive: true });
    writeFileSync(join(deprecatedDir, "SKILL.md"), "# goat-audit");

    const result = runInstaller(root, "--agent", "claude");
    assert.equal(result.status, 0, result.stderr || result.stdout);

    assert.equal(
      existsSync(deprecatedDir),
      true,
      "deprecated skill should be preserved without flag",
    );
  });
});
