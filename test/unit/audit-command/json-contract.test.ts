/**
 * Audit JSON output contract: the emitted report has the expected shape in build-only mode and in harness mode,
 * so dashboard and tooling consumers can rely on its structure.
 */
import { assert, assertExists, describe, getRepoAudit, it } from "./helpers.js";

type AuditReport = ReturnType<typeof getRepoAudit>;

/**
 * Assert build-only setup and agent scopes keep the JSON consumer contract.
 *
 * @param report - audit report emitted by the repository harness
 */
function assertBuildScopeShape(report: AuditReport): void {
  (["setup", "agent"] as const).forEach((scope) => {
    const scopeReport = report.scopes[scope];
    assert.ok(
      ["pass", "fail"].includes(scopeReport.status),
      `${scope}.status should be pass or fail`,
    );
    assert.ok(
      Array.isArray(scopeReport.failures),
      `${scope}.failures should be an array`,
    );
  });
}

/**
 * Assert harness concerns expose the fields dashboard clients render.
 *
 * @param report - harness-mode audit report with concern details present
 */
function assertHarnessConcernShape(report: AuditReport): void {
  (
    [
      "context",
      "constraints",
      "verification",
      "recovery",
      "feedback_loop",
    ] as const
  ).forEach((key) => {
    assertExists(report.concerns);
    const concern = report.concerns[key];
    assert.ok(
      concern.status === "pass" || concern.status === "fail",
      `${key}.status should be pass or fail`,
    );
    assert.ok(
      Array.isArray(concern.findings),
      `${key}.findings should be an array`,
    );
    assert.ok(
      Array.isArray(concern.limits),
      `${key}.limits should be an array`,
    );
    assert.ok(
      Array.isArray(concern.recommendations),
      `${key}.recommendations should be an array`,
    );
    assert.ok(
      Array.isArray(concern.howToFix),
      `${key}.howToFix should be an array`,
    );
  });
}

describe("audit JSON contract", () => {
  it("has correct shape for build-only mode", () => {
    const report = getRepoAudit({ agentFilter: "claude", harness: false });

    // Top-level keys
    assert.equal(report.command, "audit");
    assert.equal(report.harness, false);
    assert.ok(["pass", "fail"].includes(report.status));

    // Scopes structure
    assertBuildScopeShape(report);

    // Harness scope null in build-only mode
    assert.equal(
      report.scopes.harness,
      null,
      "harness scope should be null without --harness",
    );

    // Concerns null in build-only mode
    assert.equal(
      report.concerns,
      null,
      "concerns should be null without --harness",
    );

    // Overall
    assert.ok(["pass", "fail"].includes(report.overall.status));
  });

  it("has correct shape for harness mode", () => {
    const report = getRepoAudit({ agentFilter: "claude", harness: true });

    assert.equal(report.harness, true);
    assert.notEqual(report.scopes.harness, null);
    assertExists(report.concerns);

    assertHarnessConcernShape(report);

    assert.ok(["pass", "fail"].includes(report.overall.status));
  });
});

// ---------------------------------------------------------------------------
// Test 7: build failure howToFix - footguns check includes actionable fix
// ---------------------------------------------------------------------------
