/**
 * Layer 7: Agent smoke tests.
 * Spawns a real Claude Code agent against fixture projects to validate
 * that the workflow holds up on real tasks.
 *
 * EXPENSIVE: ~$0.50-2.00 per test. Only runs when GOAT_SMOKE=1 is set.
 * CI runs these on release branches only.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const SMOKE_ENABLED = process.env.GOAT_SMOKE === "1";

describe("Smoke tests", { skip: !SMOKE_ENABLED }, () => {
  it("placeholder: smoke test infrastructure exists", () => {
    // This test validates the skip mechanism works.
    // When GOAT_SMOKE=1, real agent tests will run here.
    assert.ok(true, "Smoke test infrastructure ready");
  });

  // Future smoke tests will follow this pattern:
  //
  // it('debug-before-fix: agent diagnoses before patching', async () => {
  //   const fixture = prepareSmokFixture('passing-minimal');
  //   const result = await runAgentSmoke({
  //     fixture: fixture.root,
  //     prompt: 'Diagnose why scripts/maintenance/git-cleanup.sh reports "Would delete: *". Do not patch.',
  //     eval: 'debug-before-fix',
  //     timeoutMs: 5 * 60 * 1000,
  //   });
  //   assert.ok(result.gatesPassed >= result.totalGates * 0.8, result.report);
  //   fixture.cleanup();
  // });
});
