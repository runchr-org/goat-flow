import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import {
  discoverArtifacts,
  findArtifact,
  scoreArtifact,
  scoreAllArtifacts,
  type ArtifactEntry,
  type SkillQualityReport,
} from "../../src/cli/quality/skill-quality.js";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

describe("artifact discovery", () => {
  it("discovers installed skills from .claude/skills/", () => {
    const artifacts = discoverArtifacts(PROJECT_ROOT);
    const skills = artifacts.filter((a) => a.kind === "skill");
    assert.ok(
      skills.length >= 7,
      `expected at least 7 skills, got ${skills.length}`,
    );
    assert.ok(skills.some((s) => s.id === "skill:goat-plan"));
    assert.ok(skills.some((s) => s.id === "skill:goat-review"));
  });

  it("discovers shared references from .goat-flow/skill-reference/", () => {
    const artifacts = discoverArtifacts(PROJECT_ROOT);
    const refs = artifacts.filter((a) => a.kind === "shared-reference");
    assert.ok(refs.some((r) => r.id === "reference:browser-use"));
    assert.ok(refs.some((r) => r.id === "reference:page-capture"));
    assert.ok(refs.some((r) => r.id === "reference:skill-quality-testing"));
  });

  it("excludes README.md from references", () => {
    const artifacts = discoverArtifacts(PROJECT_ROOT);
    assert.ok(!artifacts.some((a) => a.name === "README"));
  });

  it("finds a specific artifact by id", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan");
    assert.ok(artifact);
    assert.equal(artifact.kind, "skill");
    assert.equal(artifact.name, "goat-plan");
  });

  it("returns null for unknown artifact id", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:nonexistent");
    assert.equal(artifact, null);
  });
});

describe("skill scoring", () => {
  let goatPlanReport: SkillQualityReport;

  it("scores goat-plan with a keep-skill recommendation", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    goatPlanReport = scoreArtifact(PROJECT_ROOT, artifact);

    assert.equal(goatPlanReport.artifact.id, "skill:goat-plan");
    assert.equal(goatPlanReport.recommendation, "keep-skill");
    assert.ok(goatPlanReport.totalScore > 0, "expected a positive total score");
    assert.ok(
      goatPlanReport.maxTotalScore > 0,
      "expected a positive max total score",
    );
  });

  it("goat-plan has high trigger clarity", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const trigger = report.metrics.find((m) => m.metric === "trigger-clarity")!;
    assert.ok(trigger);
    assert.ok(
      trigger.score >= 10,
      `expected trigger score >= 10, got ${trigger.score}`,
    );
  });

  it("goat-plan has complete workflow", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const workflow = report.metrics.find(
      (m) => m.metric === "workflow-completeness",
    )!;
    assert.ok(workflow);
    assert.ok(
      workflow.score >= 10,
      `expected workflow score >= 10, got ${workflow.score}`,
    );
  });

  it("goat-plan has strong skill-reference fit", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const fit = report.metrics.find((m) => m.metric === "skill-reference-fit")!;
    assert.ok(fit);
    assert.ok(fit.score >= 7, `expected fit score >= 7, got ${fit.score}`);
  });
});

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
});

describe("scoreAllArtifacts", () => {
  it("scores all discovered artifacts without error", () => {
    const reports = scoreAllArtifacts(PROJECT_ROOT);
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
});

describe("metric completeness", () => {
  it("every report has exactly 9 metrics", () => {
    const reports = scoreAllArtifacts(PROJECT_ROOT);
    for (const report of reports) {
      assert.equal(
        report.metrics.length,
        9,
        `${report.artifact.id} has ${report.metrics.length} metrics, expected 9`,
      );
    }
  });

  it("metric scores do not exceed their maxScore", () => {
    const reports = scoreAllArtifacts(PROJECT_ROOT);
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
    const reports = scoreAllArtifacts(PROJECT_ROOT);
    for (const report of reports) {
      const sum = report.metrics.reduce((s, m) => s + m.score, 0);
      assert.equal(
        report.totalScore,
        sum,
        `${report.artifact.id}: totalScore ${report.totalScore} != sum ${sum}`,
      );
    }
  });
});
