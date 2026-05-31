import { HARNESS_CHECKS, assert, describe, it, resolve } from "./helpers.js";

describe("Harness check type tagging", () => {
  it("every harness check declares a valid type", () => {
    const valid = new Set(["integrity", "advisory", "metric"]);
    for (const check of HARNESS_CHECKS) {
      assert.ok(
        valid.has(check.type),
        `${check.id} has invalid or missing type: ${check.type}`,
      );
    }
  });

  it("matches the locked distribution (9 integrity, 6 advisory, 2 metric)", () => {
    const byType = { integrity: 0, advisory: 0, metric: 0 } as Record<
      string,
      number
    >;
    for (const check of HARNESS_CHECKS) byType[check.type]!++;
    assert.deepStrictEqual(byType, { integrity: 9, advisory: 6, metric: 2 });
  });

  it("known-integrity ids are tagged integrity", () => {
    const integrityIds = new Set([
      "doc-paths-resolve",
      "deny-covers-secrets",
      "deny-blocks-dangerous",
      "deny-hook-registered",
      "hooks-registered",
      "milestone-tracking",
      "session-logs",
      "feedback-loop-active",
      "decisions-tracked",
    ]);
    for (const check of HARNESS_CHECKS) {
      if (integrityIds.has(check.id)) {
        assert.equal(
          check.type,
          "integrity",
          `${check.id} should be integrity`,
        );
      }
    }
  });

  it("known-metric ids are tagged metric", () => {
    const metricIds = new Set([
      "evidence-before-claims",
      "post-turn-hook-integrity",
    ]);
    for (const check of HARNESS_CHECKS) {
      if (metricIds.has(check.id)) {
        assert.equal(check.type, "metric", `${check.id} should be metric`);
      }
    }
  });
});
