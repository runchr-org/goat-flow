import {
  describe,
  it,
  assert,
  readFileSync,
  scoreAllArtifacts,
  SNAPSHOT_FIXTURE,
  getRepoScoredArtifacts,
} from "./helpers.js";

describe("scoreAllArtifacts", () => {
  it("scores all discovered artifacts without error", () => {
    const reports = getRepoScoredArtifacts();
    assert.ok(
      reports.length >= 10,
      `expected at least 10 artifacts, got ${reports.length}`,
    );
    for (const report of reports) {
      assert.ok(report.totalScore >= 0);
      assert.ok(report.maxTotalScore > 0);
      assert.ok(report.metrics.length > 0);
      assert.ok(report.recommendation);
    }
  });

  it("matches the committed percentage-band snapshot", () => {
    const fixture = JSON.parse(
      readFileSync(SNAPSHOT_FIXTURE, "utf-8"),
    ) as Record<
      string,
      {
        minPct: number;
        maxPct: number;
        recommendation: string;
        subtype: string;
      }
    >;
    const reportsById = new Map(
      getRepoScoredArtifacts().map((report) => [report.artifact.id, report]),
    );
    for (const [id, expected] of Object.entries(fixture)) {
      const report = reportsById.get(id);
      assert.ok(report, `missing report for ${id}`);
      const pct = Math.round((report.totalScore / report.profileMax) * 100);
      assert.ok(
        pct >= expected.minPct && pct <= expected.maxPct,
        `${id}: expected ${expected.minPct}-${expected.maxPct}%, got ${pct}%`,
      );
      assert.equal(report.recommendation, expected.recommendation, id);
      assert.equal(report.subtype, expected.subtype, id);
      assert.ok(
        report.totalScore <= report.profileMax,
        `${id}: totalScore ${report.totalScore} > profileMax ${report.profileMax}`,
      );
    }
  });
});
