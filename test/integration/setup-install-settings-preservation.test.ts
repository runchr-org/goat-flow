import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeTempProject, runInstaller } from "./setup-install.helpers.js";

describe("settings preservation", () => {
  /** Writes a pre-existing settings file to verify hook registration migration. */
  it("migrates deny hook registration when settings.json already exists", () => {
    const root = makeTempProject();
    const claudeDir = join(root, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.json"), '{"permissions":{}}');

    const result = runInstaller(root, "--agent", "claude");
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const settings = readFileSync(join(claudeDir, "settings.json"), "utf-8");
    assert.match(settings, /deny-dangerous\.sh/);
    assert.doesNotMatch(result.stdout, /may not be registered/);
    assert.match(result.stdout, /migrated deny hook registration/);
    assert.equal(
      existsSync(join(root, ".claude", "hooks", "deny-dangerous.sh")),
      true,
    );
  });
});
