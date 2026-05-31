import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeTempProject, runInstaller } from "./setup-install.helpers.js";

describe("--update-config-version flag", () => {
  /** Writes config.yaml, then verifies installer migration side effects. */
  it("updates only the version field in existing config.yaml", () => {
    const root = makeTempProject();
    const configDir = join(root, ".goat-flow");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.yaml"),
      'version: "1.4.3"\n\nagents:\n  - claude\n  - codex\n\nskills:\n  install: all\n\ncustom_key: preserve_me\n',
    );

    const result = runInstaller(
      root,
      "--agent",
      "claude",
      "--update-config-version",
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const config = readFileSync(join(configDir, "config.yaml"), "utf-8");
    assert.doesNotMatch(config, /1\.4\.3/, "old version should be replaced");
    assert.doesNotMatch(config, /^agents:/m, "agents list must be removed");
    assert.match(
      config,
      /custom_key: preserve_me/,
      "custom keys must be preserved",
    );
  });

  it("preserves config.yaml version when --update-config-version is not passed", () => {
    const root = makeTempProject();
    const configDir = join(root, ".goat-flow");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.yaml"),
      'version: "1.3.0"\n\nagents:\n  - claude\n',
    );

    const result = runInstaller(root, "--agent", "claude");
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const config = readFileSync(join(configDir, "config.yaml"), "utf-8");
    assert.match(config, /1\.3\.0/, "version should remain unchanged");
    assert.doesNotMatch(config, /^agents:/m, "agents list should be removed");
  });
});

// ── Bug 2: Settings skip warning ────────────────────────────────────────
