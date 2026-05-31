import {
  describe,
  it,
  assert,
  join,
  readFileSync,
  makeTempProject,
  runCLI,
} from "./helpers.js";

describe("quality CLI output contract", () => {
  it("writes prompt output to --output instead of stdout", () => {
    const root = makeTempProject();
    const outputPath = join(root, ".goat-flow", "quality-prompt.txt");
    const result = runCLI(root, [
      "quality",
      ".",
      "--agent",
      "claude",
      "--output",
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout,
      "",
      "Prompt output should be redirected to file",
    );
    assert.match(result.stderr, /Written to /);
    assert.match(
      readFileSync(outputPath, "utf-8"),
      /# GOAT Flow Quality Assessment - Claude Code/,
    );
  });

  it("writes JSON payload to --output instead of stdout", () => {
    const root = makeTempProject();
    const outputPath = join(root, ".goat-flow", "quality-payload.json");
    const result = runCLI(root, [
      "quality",
      ".",
      "--agent",
      "claude",
      "--format",
      "json",
      "--output",
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "", "JSON output should be redirected to file");
    assert.match(result.stderr, /Written to /);
    const payload = JSON.parse(readFileSync(outputPath, "utf-8")) as {
      command: string;
      agent: string;
      prompt: string;
    };
    assert.equal(payload.command, "quality");
    assert.equal(payload.agent, "claude");
    assert.match(
      payload.prompt,
      /# GOAT Flow Quality Assessment - Claude Code/,
    );
  });

  it("threads --mode through prompt generation", () => {
    const root = makeTempProject();
    const result = runCLI(root, [
      "quality",
      ".",
      "--agent",
      "claude",
      "--mode",
      "harness",
      "--format",
      "json",
    ]);

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout) as {
      prompt: string;
    };
    assert.match(
      payload.prompt,
      /# GOAT Flow Harness Engineering Assessment - Claude Code/,
    );
    assert.match(payload.prompt, /"quality_mode": "harness"/);
  });
});
