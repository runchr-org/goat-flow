/**
 * Reference (playbook) scoring: browser-use.md and page-capture.md score as reference-playbook, browser-use.md
 * gets availability-check credit, shared references score without preamble composition, and meta references
 * stay reference-playbook without promotion notes.
 */
import {
  describe,
  it,
  assert,
  join,
  findArtifact,
  scoreArtifact,
  PROJECT_ROOT,
} from "./helpers.js";

describe("reference scoring", () => {
  it("scores browser-use.md as reference-playbook", () => {
    const artifact = findArtifact(PROJECT_ROOT, "reference:browser-use")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);

    assert.equal(report.artifact.kind, "shared-reference");
    assert.equal(report.recommendation, "reference-playbook");
  });

  it("scores page-capture.md as reference-playbook", () => {
    const artifact = findArtifact(PROJECT_ROOT, "reference:page-capture")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);

    assert.equal(report.artifact.kind, "shared-reference");
    assert.equal(report.recommendation, "reference-playbook");
  });

  it("browser-use.md has availability check credit", () => {
    const artifact = findArtifact(PROJECT_ROOT, "reference:browser-use")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const trigger = report.metrics.find((m) => m.metric === "trigger-clarity")!;
    assert.ok(
      trigger.score >= 10,
      `expected trigger score >= 10 for browser-use, got ${trigger.score}`,
    );
  });

  it("scores shared references without preamble composition", () => {
    const artifact = findArtifact(PROJECT_ROOT, "reference:browser-use")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.deepEqual(report.composedFrom, ["browser-use.md"]);
  });

  it("keeps meta references as reference-playbook without promotion notes", () => {
    for (const id of [
      "reference:skill-preamble",
      "reference:skill-conventions",
      "reference:skill-quality-testing",
    ]) {
      const artifact = findArtifact(PROJECT_ROOT, id)!;
      const report = scoreArtifact(PROJECT_ROOT, artifact);
      assert.equal(report.recommendation, "reference-playbook", id);
      assert.ok(!report.fitNotes.join("\n").includes("promoting"), id);
    }
  });
});
