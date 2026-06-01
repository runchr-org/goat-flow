/**
 * checkDrift live-repo guard: runs checkDrift against goat-flow's own root and asserts a pass, so
 * the committed installed skill/hook copies never drift from their workflow templates in this repo.
 */
import {
  assert,
  checkDrift,
  createFS,
  describe,
  it,
  PROJECT_ROOT,
} from "./audit-drift.helpers.ts";

describe("checkDrift: this repo", () => {
  it("reports pass on goat-flow's own root (templates match installed)", () => {
    const report = checkDrift({
      fs: createFS(PROJECT_ROOT),
      projectPath: PROJECT_ROOT,
    });
    assert.equal(
      report.status,
      "pass",
      `goat-flow root should be drift-clean, findings=${JSON.stringify(report.findings)}`,
    );
  });
});
