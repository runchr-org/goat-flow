import {
  describe,
  it,
  assert,
  join,
  evaluateUploadedBundle,
  findArtifact,
  scoreArtifact,
  cloneQualityConfig,
  DEFAULT_QUALITY_CONFIG,
  PROJECT_ROOT,
  FULL_DISPATCHER_WORKFLOW_SCORE,
  ARTIFACT_TRUNCATION_BYTES,
  makeTempProject,
  writeText,
  writeSkill,
} from "./helpers.js";

describe("skill scoring", () => {
  it("scores goat-plan with a keep-skill recommendation and per-dimension thresholds", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);

    assert.equal(report.artifact.id, "skill:goat-plan");
    assert.equal(report.recommendation, "keep-skill");
    assert.ok(report.totalScore > 0, "expected a positive total score");
    assert.ok(report.maxTotalScore > 0, "expected a positive max total score");
    const trigger = report.metrics.find((m) => m.metric === "trigger-clarity")!;
    const workflow = report.metrics.find(
      (m) => m.metric === "workflow-completeness",
    )!;
    const fit = report.metrics.find((m) => m.metric === "skill-reference-fit")!;
    assert.ok(
      trigger.score >= 10,
      `expected trigger score >= 10, got ${trigger.score}`,
    );
    assert.ok(
      workflow.score >= 10,
      `expected workflow score >= 10, got ${workflow.score}`,
    );
    assert.ok(fit.score >= 7, `expected fit score >= 7, got ${fit.score}`);
  });

  it("composes inherited skill references for composed metrics only", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.deepEqual(report.composedFrom, [
      "skill-preamble.md",
      "skill-conventions.md",
      "SKILL.md",
      "references/milestone-examples.md",
      "references/issue-format.md",
    ]);
    const evidence = report.metrics.find(
      (m) => m.metric === "evidence-testability",
    )!;
    assert.equal(evidence.score, evidence.maxScore);
  });

  it("skips missing skill-local references during composition", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "missing-ref",
      [
        "---",
        "name: missing-ref",
        'description: "Skill with a missing reference."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /missing-ref",
        "See references/missing.md.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:missing-ref")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.deepEqual(report.composedFrom, ["SKILL.md"]);
  });

  it("does not compose skill-local references outside the references directory", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "escaped-ref",
      [
        "---",
        "name: escaped-ref",
        'description: "Skill with an escaped reference."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /escaped-ref",
        "See references/../../leak.md.",
      ].join("\n"),
    );
    writeText(
      join(projectRoot, ".claude/skills/leak.md"),
      "# Leaked\n\n## Availability Check\ncommand -v leaked-tool\n",
    );
    const artifact = findArtifact(projectRoot, "skill:escaped-ref")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.deepEqual(report.composedFrom, ["SKILL.md"]);
  });

  it("surfaces composition truncation when inherited context exceeds 32KB", () => {
    const projectRoot = makeTempProject();
    writeText(
      join(projectRoot, ".goat-flow/skill-reference/skill-preamble.md"),
      `# Preamble\n${"Proof Gate evidence.\n".repeat(2500)}`,
    );
    writeSkill(
      projectRoot,
      "huge-compose",
      [
        "---",
        "name: huge-compose",
        'description: "Skill with huge inherited context."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /huge-compose",
        "## When to Use",
        "Use when testing composition caps.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:huge-compose")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.ok(report.fitNotes.includes("composition truncated at 32KB"));
  });

  it("enforces composed content caps by UTF-8 byte length", () => {
    const projectRoot = makeTempProject();
    const config = cloneQualityConfig(DEFAULT_QUALITY_CONFIG);
    config.composition.maxComposedBytes = 1024;
    config.composition.skillPreamblePath = null;
    config.composition.skillConventionsPath = null;
    const content = [
      "---",
      "name: utf8-compose",
      'description: "Skill with multibyte composed content."',
      'goat-flow-skill-version: "1.6.0"',
      "---",
      "# /utf8-compose",
      "## When to Use",
      "Use when testing byte caps.",
      "語".repeat(400),
    ].join("\n");
    assert.ok(content.length < config.composition.maxComposedBytes);
    assert.ok(
      Buffer.byteLength(content, "utf-8") > config.composition.maxComposedBytes,
    );
    writeSkill(projectRoot, "utf8-compose", content);

    const artifact = findArtifact(projectRoot, "skill:utf8-compose", config)!;
    const report = scoreArtifact(projectRoot, artifact, config);
    assert.ok(report.fitNotes.includes("composition truncated at 1KB"));
  });

  it("enforces uploaded bundle composition caps by UTF-8 byte length", () => {
    const projectRoot = makeTempProject();
    const config = cloneQualityConfig(DEFAULT_QUALITY_CONFIG);
    config.composition.maxComposedBytes = 1024;
    config.composition.skillPreamblePath = null;
    config.composition.skillConventionsPath = null;
    const siblingContent = "語".repeat(400);
    assert.ok(siblingContent.length < config.composition.maxComposedBytes);
    assert.ok(
      Buffer.byteLength(siblingContent, "utf-8") >
        config.composition.maxComposedBytes,
    );

    const report = evaluateUploadedBundle(
      projectRoot,
      {
        files: [
          {
            name: "SKILL.md",
            content: [
              "---",
              "name: utf8-upload",
              'description: "Uploaded skill."',
              'goat-flow-skill-version: "1.6.0"',
              "---",
              "# /utf8-upload",
              "## When to Use",
              "Use when testing byte caps.",
            ].join("\n"),
          },
          { name: "notes.md", content: siblingContent },
        ],
      },
      config,
    );
    assert.ok(report.fitNotes.includes("composition truncated at 1KB"));
  });

  it("caps oversized artifact content and surfaces a fit note", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "oversized",
      [
        "---",
        "name: oversized",
        'description: "Oversized skill."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /oversized",
        "## When to Use",
        "Use when testing artifact caps.",
        "## Step 0",
        "Read context.",
        "## Phase 1",
        "Proof Gate evidence.",
        "## Phase 2",
        "CHECKPOINT before acting.",
        "## Verification",
        "- [ ] pass/fail evidence required.",
        "x".repeat(300 * 1024),
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:oversized")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.ok(
      report.fitNotes.includes(
        `artifact truncated at ${ARTIFACT_TRUNCATION_BYTES} bytes`,
      ),
      report.fitNotes.join("\n"),
    );
  });

  it("does not let preamble composition give raw workflow credit", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const workflow = report.metrics.find(
      (m) => m.metric === "workflow-completeness",
    )!;
    assert.equal(report.subtype, "dispatcher");
    assert.equal(workflow.maxScore, FULL_DISPATCHER_WORKFLOW_SCORE);
    assert.equal(workflow.score, FULL_DISPATCHER_WORKFLOW_SCORE);
  });

  it("detects artifact subtypes and profile maxes", () => {
    const cases = [
      ["skill:goat", "dispatcher", 70],
      ["skill:goat-plan", "workflow", 100],
      ["skill:goat-security", "report", 85],
      ["reference:browser-use", "playbook", 80],
      ["reference:skill-preamble", "meta", 50],
      ["reference:skill-quality-testing", "index", 60],
    ] as const;
    for (const [id, subtype, profileMax] of cases) {
      const artifact = findArtifact(PROJECT_ROOT, id)!;
      const report = scoreArtifact(PROJECT_ROOT, artifact);
      assert.equal(report.subtype, subtype, id);
      assert.equal(report.profileMax, profileMax, id);
      assert.equal(report.maxTotalScore, profileMax, id);
    }
  });
});
