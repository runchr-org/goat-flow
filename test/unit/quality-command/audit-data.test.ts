import {
  describe,
  it,
  assert,
  composeQuality,
  runAudit,
  createFS,
  PROJECT_ROOT,
} from "./helpers.js";

describe("quality with audit data", () => {
  it("includes audit summary in prompt", () => {
    const projectPath = PROJECT_ROOT;
    const fs = createFS(projectPath);
    const auditReport = runAudit(fs, projectPath, {
      agentFilter: "claude",
      harness: true,
    });

    const result = composeQuality({
      agent: "claude",
      projectPath,
      auditReport,
    });

    assert.equal(result.auditStatus, auditReport.status);
    assert.ok(
      result.prompt.includes("## Audit Summary"),
      "Should contain audit summary section",
    );
    assert.ok(result.prompt.includes("Setup"), "Should mention setup scope");
    assert.ok(
      result.prompt.includes("Agent Setup"),
      "Should mention agent setup scope",
    );
    assert.match(result.prompt, /verification: PASS \(75%; metrics=2; limits:/);
    assert.match(
      result.prompt,
      /constraints: PASS \(100%; metrics=0; limits: Constraint score covers verified deny patterns only/,
    );
  });

  it("includes degraded context note when audit is unavailable", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/nonexistent",
      auditReport: null,
    });

    assert.equal(result.auditStatus, "unavailable");
    assert.ok(
      result.prompt.includes("UNAVAILABLE"),
      "Should indicate audit is unavailable",
    );
    assert.ok(
      result.prompt.includes("audit could not complete"),
      "Should include degraded context note",
    );
  });

  it("distinguishes fast cache-only audit misses from audit failures", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/nonexistent",
      auditReport: null,
      auditUnavailableReason: "fast-cache-only",
    });

    assert.equal(result.auditStatus, "unavailable");
    assert.ok(
      result.prompt.includes("Audit: NOT LOADED (FAST CACHE-ONLY MODE)"),
      "Should distinguish cache-only misses from audit execution failures",
    );
    assert.ok(
      result.prompt.includes("does not mean the audit failed"),
      "Should warn agents not to infer audit failure from a cache miss",
    );
    assert.ok(
      !result.prompt.includes("audit could not complete"),
      "Should not claim the audit failed to complete when it was not loaded",
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4b: JSON example in the prompt parses through the strict schema
// (guards against drift between the example and schema.ts - the lesson from
// the 2026-04-20 copilot reports that flagged delta_tag:null as the wrong
// example value when prior history exists)
// ---------------------------------------------------------------------------
