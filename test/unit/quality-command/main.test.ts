import { describe, it, assert, parseCLIArgs } from "./helpers.js";

describe("quality requires --agent", () => {
  it("parses quality command without agent as null agent", () => {
    const parsed = parseCLIArgs(["quality", "."]);
    assert.equal(parsed.command, "quality");
    assert.equal(parsed.agent, null, "agent should be null when not provided");
    // The CLI handler checks for null agent and throws CLIError - tested at integration level
  });
});

// ---------------------------------------------------------------------------
// Test 2: quality --agent claude produces prompt output (not empty, not a score)
// ---------------------------------------------------------------------------
