import { describe, it, assert, composeQuality } from "./helpers.js";

describe("quality payload contract", () => {
  it("has required fields", () => {
    const result = composeQuality({
      agent: "codex",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.equal(result.command, "quality");
    assert.equal(result.agent, "codex");
    assert.ok(
      ["pass", "fail", "unavailable"].includes(result.auditStatus),
      "auditStatus should be pass, fail, or unavailable",
    );
    assert.ok(
      typeof result.auditSummary === "string",
      "auditSummary should be string",
    );
    assert.ok(typeof result.prompt === "string", "prompt should be string");
    assert.ok(result.prompt.length > 0, "prompt should not be empty");
  });

  it("describes lean config as valid without requiring line-limits", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.match(result.prompt, /minimal valid config: version and skills/i);
    assert.doesNotMatch(
      result.prompt,
      /should have version, agents, skills, line-limits/i,
    );
  });
});
