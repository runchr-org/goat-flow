import {
  assert,
  assertExists,
  describe,
  getRepoAudit,
  it,
  renderAuditText,
} from "./helpers.js";

describe("audit --harness", () => {
  it("produces concerns with pass/fail status", () => {
    const report = getRepoAudit({ agentFilter: "claude", harness: true });

    // Build scopes should still pass
    assert.equal(
      report.scopes.setup.status,
      "pass",
      `Setup should pass: ${JSON.stringify(report.scopes.setup.failures)}`,
    );
    assert.equal(
      report.scopes.agent.status,
      "pass",
      `Agent should pass: ${JSON.stringify(report.scopes.agent.failures)}`,
    );

    // Harness scope should be populated
    assert.notEqual(
      report.scopes.harness,
      null,
      "harness scope should be populated with --harness",
    );

    // Concerns should be populated with pass/fail statuses
    assertExists(
      report.concerns,
      "concerns should be populated with --harness",
    );
    for (const key of [
      "context",
      "constraints",
      "verification",
      "recovery",
      "feedback_loop",
    ] as const) {
      assert.ok(
        report.concerns[key] !== undefined,
        `${key} concern should exist`,
      );
      assert.ok(
        report.concerns[key].status === "pass" ||
          report.concerns[key].status === "fail",
        `${key} concern should have pass/fail status`,
      );
    }

    // No grade or qualityScore in new contract
    assert.ok(!("grade" in report.overall), "overall should not have grade");
    assert.ok(
      !("qualityScore" in report.overall),
      "overall should not have qualityScore",
    );
  });

  it("exposes advisory enforcement capabilities without changing audit status", () => {
    const report = getRepoAudit({ agentFilter: "claude", harness: true });

    assert.equal(report.status, report.overall.status);
    assert.equal(report.enforcement.length, 1);
    const [claude] = report.enforcement;
    assert.equal(claude?.agent, "claude");
    assert.equal(claude?.advisory, true);
    assert.equal(
      claude?.capabilities.find((item) => item.id === "file-read-restrictions")
        ?.status,
      "unknown",
    );
    assert.equal(
      claude?.capabilities.find((item) => item.id === "hook-self-test")?.status,
      "hard",
    );

    const output = renderAuditText(report);
    assert.match(output, /Agent Enforcement Matrix/);
    assert.match(output, /General file-read restrictions/);
    assert.match(output, /does not affect audit status/);
    assert.match(
      output,
      /Limit: Constraint score covers verified deny patterns only/,
    );
    assert.ok(
      report.concerns?.constraints.limits.some((limit) =>
        limit.includes("Constraint score covers verified deny patterns only"),
      ),
      JSON.stringify(report.concerns?.constraints.limits),
    );
  });
});

// ---------------------------------------------------------------------------
// Test 6: JSON output contract: scopes and concerns keys with correct shape
// ---------------------------------------------------------------------------
