/**
 * Layer 2 meta-tests: validates that EVERY registered check and anti-pattern
 * produces a valid result when run against the default mock context.
 * This catches: missing fact fields, runtime errors, invalid status values,
 * and checks that crash instead of returning na/fail.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allChecks, allAntiPatterns } from "../../src/cli/rubric/registry.js";
import { runChecks, runAntiPatterns } from "../../src/cli/scoring/calculate.js";
import { createMockContext } from "../helpers/mock-context.js";

const VALID_STATUSES = new Set(["pass", "partial", "fail", "na"]);

describe("All registered checks produce valid results against default mock", () => {
  const ctx = createMockContext();

  for (const check of allChecks) {
    it(`${check.id}: ${check.name}`, () => {
      const results = runChecks([check], ctx);
      assert.equal(results.length, 1, `Expected 1 result for ${check.id}`);
      const result = results[0];

      // Status must be valid
      assert.ok(
        VALID_STATUSES.has(result.status),
        `${check.id} returned invalid status: ${result.status}`,
      );

      // Points must not exceed max
      assert.ok(
        result.points <= result.maxPoints,
        `${check.id}: points (${result.points}) > maxPoints (${result.maxPoints})`,
      );

      // Points must be non-negative
      assert.ok(
        result.points >= 0,
        `${check.id}: negative points (${result.points})`,
      );

      // Message must be a non-empty string
      assert.ok(
        typeof result.message === "string" && result.message.length > 0,
        `${check.id}: empty or missing message`,
      );

      // ID must match the check definition
      assert.equal(
        result.id,
        check.id,
        `Result ID mismatch: ${result.id} vs ${check.id}`,
      );
    });
  }
});

describe("All registered anti-patterns produce valid results against default mock", () => {
  const ctx = createMockContext();

  for (const ap of allAntiPatterns) {
    it(`${ap.id}: ${ap.name}`, () => {
      const results = runAntiPatterns([ap], ctx);
      assert.equal(results.length, 1, `Expected 1 result for ${ap.id}`);
      const result = results[0];

      // triggered must be boolean
      assert.equal(
        typeof result.triggered,
        "boolean",
        `${ap.id}: triggered is not boolean`,
      );

      // deduction must be <= 0
      assert.ok(
        result.deduction <= 0,
        `${ap.id}: positive deduction (${result.deduction})`,
      );

      // If not triggered, deduction must be 0
      if (!result.triggered) {
        assert.equal(
          result.deduction,
          0,
          `${ap.id}: not triggered but deduction is ${result.deduction}`,
        );
      }

      // Message must exist
      assert.ok(
        typeof result.message === "string" && result.message.length > 0,
        `${ap.id}: empty or missing message`,
      );

      // ID must match
      assert.equal(
        result.id,
        ap.id,
        `Result ID mismatch: ${result.id} vs ${ap.id}`,
      );
    });
  }
});

describe("Rubric integrity", () => {
  it("has no duplicate check IDs", () => {
    const ids = allChecks.map((c) => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.equal(dupes.length, 0, `Duplicate IDs: ${dupes.join(", ")}`);
  });

  it("has no duplicate anti-pattern IDs", () => {
    const ids = allAntiPatterns.map((ap) => ap.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.equal(dupes.length, 0, `Duplicate AP IDs: ${dupes.join(", ")}`);
  });

  it("all checks have recommendation text", () => {
    const missing = allChecks.filter(
      (c) => !c.recommendation || c.recommendation.length === 0,
    );
    assert.equal(
      missing.length,
      0,
      `${missing.length} checks missing recommendations: ${missing.map((c) => c.id).join(", ")}`,
    );
  });

  it("all checks have recommendationKey", () => {
    const missing = allChecks.filter((c) => !c.recommendationKey);
    assert.equal(
      missing.length,
      0,
      `${missing.length} checks missing recommendationKey: ${missing.map((c) => c.id).join(", ")}`,
    );
  });

  it("all anti-patterns have recommendation text", () => {
    const missing = allAntiPatterns.filter((ap) => !ap.recommendation);
    assert.equal(
      missing.length,
      0,
      `${missing.length} APs missing recommendations: ${missing.map((ap) => ap.id).join(", ")}`,
    );
  });

  it("default mock passes at least 65% of checks (custom fn checks pass, file_exists/grep checks may not)", () => {
    const ctx = createMockContext();
    const results = runChecks(allChecks, ctx);
    const passing = results.filter(
      (r) => r.status === "pass" || r.status === "na",
    );
    const ratio = passing.length / results.length;
    assert.ok(
      ratio >= 0.65,
      `Default mock only passes ${(ratio * 100).toFixed(0)}% of checks (${passing.length}/${results.length})`,
    );
  });

  it("default mock triggers zero anti-patterns", () => {
    const ctx = createMockContext();
    const results = runAntiPatterns(allAntiPatterns, ctx);
    const triggered = results.filter((r) => r.triggered);
    assert.equal(
      triggered.length,
      0,
      `Default mock triggers ${triggered.length} APs: ${triggered.map((r) => `${r.id} (${r.message})`).join(", ")}`,
    );
  });
});
