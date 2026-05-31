import { describe, it, assert, composeQuality } from "./helpers.js";

describe("quality produces prompt output", () => {
  it("generates non-empty prompt text without scores", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.equal(result.command, "quality");
    assert.equal(result.agent, "claude");
    assert.ok(result.prompt.length > 100, "Prompt should be substantial");
    assert.ok(
      result.prompt.includes("# GOAT Flow Quality Assessment - Claude Code"),
      "Should have title with agent name",
    );
    // Must NOT contain percentage scores or grades
    assert.ok(
      !result.prompt.includes("Score: ") && !result.prompt.includes("Grade: "),
      "Prompt should not present itself as a score or verdict",
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3: Generated prompt contains skill testing section and ratings request
// ---------------------------------------------------------------------------
