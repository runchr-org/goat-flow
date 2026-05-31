import {
  describe,
  it,
  assert,
  join,
  evaluateContent,
  PROJECT_ROOT,
  FULL_TRIGGER_CLARITY_SCORE,
  getRepoScoredArtifacts,
} from "./helpers.js";

describe("workflow-summary description detection", () => {
  /** Build a minimal skill around the description under scorer test. */
  function buildSkillMd(description: string): string {
    return [
      "---",
      "name: t",
      `description: "${description}"`,
      "goat-flow-skill-version: 1.6.0",
      "---",
      "# /t",
      "",
      "**NOT this skill:** other.",
      "",
      "## Step 0",
      "",
      "## Phase 1",
      "",
      "## Phase 2",
      "",
      "## Verification",
    ].join("\n");
  }

  it("flags a workflow-summary description as a yellow signal", () => {
    // The "between tasks" + "dispatches" pair is the canonical bad shape:
    // a description that narrates workflow instead of stating triggering
    // conditions. See `descriptionSummarizesWorkflow` in
    // `src/cli/quality/skill-quality.ts` for the scorer rule.
    const result = evaluateContent(PROJECT_ROOT, {
      content: buildSkillMd(
        "Use when executing plans - dispatches subagent per task with code review between tasks",
      ),
      suggestedName: "t",
      kind: "skill",
    });
    const tc = result.metrics.find((m) => m.metric === "trigger-clarity");
    assert.ok(tc, "trigger-clarity metric must exist");
    assert.match(tc.detail, /summarizes workflow/);
    const tip = result.tips.find((t) => /Workflow summaries/.test(t.message));
    assert.ok(tip, "workflow-summary improvement tip must fire");
  });

  it("does not deduct score from a fully-structured skill (yellow signal only)", () => {
    const result = evaluateContent(PROJECT_ROOT, {
      content: buildSkillMd(
        "Use when executing plans - dispatches subagent per task with code review between tasks",
      ),
      suggestedName: "t",
      kind: "skill",
    });
    const tc = result.metrics.find((m) => m.metric === "trigger-clarity");
    assert.ok(tc);
    assert.equal(
      tc.score,
      FULL_TRIGGER_CLARITY_SCORE,
      "trigger-clarity should remain at full score",
    );
    assert.equal(tc.severity, "ok", "severity should remain ok");
  });

  it("does not flag well-formed trigger-only descriptions", () => {
    const goodDescriptions = [
      "Use when starting a non-trivial implementation that needs structured task breakdown with progress tracking.",
      "Use when diagnosing a bug, unexpected behaviour, or system failure that needs structured investigation.",
      "Use when assessing security implications of code changes, architecture decisions, or new features.",
      "Use when a decision or analysis needs multi-lens critique to surface blind spots before shipping.",
    ];
    for (const desc of goodDescriptions) {
      const result = evaluateContent(PROJECT_ROOT, {
        content: buildSkillMd(desc),
        suggestedName: "t",
        kind: "skill",
      });
      const tc = result.metrics.find((m) => m.metric === "trigger-clarity");
      assert.ok(tc);
      assert.doesNotMatch(
        tc.detail,
        /summarizes workflow/,
        `false positive for: ${desc}`,
      );
    }
  });

  it("FP rate stays under 10% on the in-tree .claude/skills corpus", () => {
    const reports = getRepoScoredArtifacts();
    const installedSkills = reports.filter(
      (r) => r.artifact.kind === "skill" && r.artifact.source === "installed",
    );
    assert.ok(
      installedSkills.length > 0,
      "expected at least one installed skill in the corpus",
    );
    let flagged = 0;
    for (const r of installedSkills) {
      const tc = r.metrics.find((m) => m.metric === "trigger-clarity");
      if (tc && /summarizes workflow/.test(tc.detail)) flagged += 1;
    }
    const pct = (flagged / installedSkills.length) * 100;
    assert.ok(
      pct < 10,
      `workflow-summary detector FP rate ${pct.toFixed(1)}% breaches the 10% budget on .claude/skills`,
    );
  });
});
