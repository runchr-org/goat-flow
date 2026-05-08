import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildTerminalSpawnSpec } from "../../src/cli/server/terminal.js";

const QUOTED_MULTILINE_PROMPT = [
  "# GOAT Flow Setup - Codex",
  "",
  "No Codex configuration detected - this project needs a full setup.",
  "",
  'Do NOT copy customization templates verbatim. If a template says "[describe X]", describe X for THIS project.',
].join("\n");

describe("buildTerminalSpawnSpec", () => {
  it("keeps multiline prompts out of Windows PowerShell argv and env", () => {
    const spec = buildTerminalSpawnSpec(
      "claude",
      "C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.cmd",
      QUOTED_MULTILINE_PROMPT,
      {},
      "win32",
    );

    assert.equal(spec.shell, "powershell.exe");
    assert.doesNotMatch(spec.args.join("\n"), /GOAT Flow Setup/);
    assert.doesNotMatch(spec.args.join("\n"), /\[describe X\]/);
    assert.equal(spec.env.GOAT_PROMPT, undefined);
    assert.ok(spec.initialInput);
    assert.match(spec.initialInput, /# GOAT Flow Setup - Codex/);
    assert.match(spec.initialInput, /\[describe X\]/);
    assert.ok(spec.initialInput.startsWith("\x1b[200~"));
    assert.ok(spec.initialInput.endsWith("\x1b[201~\r"));
  });

  it("keeps multiline prompts out of POSIX shell argv and env", () => {
    const spec = buildTerminalSpawnSpec(
      "claude",
      "/usr/local/bin/claude",
      QUOTED_MULTILINE_PROMPT,
      { SHELL: "/bin/zsh" },
      "linux",
    );

    assert.equal(spec.shell, "/bin/zsh");
    assert.doesNotMatch(spec.args.join("\n"), /GOAT Flow Setup/);
    assert.equal(spec.env.GOAT_PROMPT, undefined);
    assert.ok(spec.initialInput);
    assert.match(spec.initialInput, /No Codex configuration detected/);
    assert.match(spec.initialInput, /"\[describe X\]"/);
  });

  it("does not inject terminal input for manual sessions", () => {
    const spec = buildTerminalSpawnSpec(
      "claude",
      "/usr/local/bin/claude",
      "",
      { SHELL: "/bin/bash" },
      "linux",
    );

    assert.equal(spec.initialInput, null);
    assert.equal(spec.env.GOAT_PROMPT, undefined);
  });
});
