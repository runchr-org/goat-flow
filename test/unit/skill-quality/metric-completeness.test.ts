import {
  describe,
  it,
  assert,
  EXPECTED_METRIC_COUNT,
  getRepoScoredArtifacts,
} from "./helpers.js";

describe("metric completeness", () => {
  it("every report has exactly 9 metrics", () => {
    const reports = getRepoScoredArtifacts();
    for (const report of reports) {
      assert.equal(
        report.metrics.length,
        EXPECTED_METRIC_COUNT,
        `${report.artifact.id} has ${report.metrics.length} metrics, expected ${EXPECTED_METRIC_COUNT}`,
      );
    }
  });

  it("metric scores do not exceed their maxScore", () => {
    const reports = getRepoScoredArtifacts();
    for (const report of reports) {
      for (const m of report.metrics) {
        assert.ok(
          m.score <= m.maxScore,
          `${report.artifact.id} metric ${m.metric}: score ${m.score} > maxScore ${m.maxScore}`,
        );
        assert.ok(
          m.score >= 0,
          `${report.artifact.id} metric ${m.metric}: negative score ${m.score}`,
        );
      }
    }
  });

  it("totalScore equals sum of metric scores", () => {
    const reports = getRepoScoredArtifacts();
    for (const report of reports) {
      const sum = report.metrics.reduce((s, m) => s + m.score, 0);
      assert.equal(
        report.totalScore,
        sum,
        `${report.artifact.id}: totalScore ${report.totalScore} != sum ${sum}`,
      );
      assert.equal(
        report.maxTotalScore,
        report.profileMax,
        `${report.artifact.id}: maxTotalScore ${report.maxTotalScore} != profileMax ${report.profileMax}`,
      );
    }
  });
});
