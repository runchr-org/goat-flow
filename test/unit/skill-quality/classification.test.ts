import {
  describe,
  it,
  assert,
  join,
  evaluateContent,
  evaluateUploadedBundle,
  findArtifact,
  scoreArtifact,
  cloneQualityConfig,
  DEFAULT_QUALITY_CONFIG,
  PROJECT_ROOT,
  FALLBACK_CLASSIFICATION_CONFIDENCE,
  SANITISED_PLAYWRIGHT_SHAPED_SKILL,
  makeTempProject,
  writeSkill,
} from "./helpers.js";

describe("classification", () => {
  it("returns confidence 1.0 for unambiguous goat-flow skills", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.equal(report.classification.detectedSubtype, "workflow");
    assert.equal(report.classification.confidence, 1);
    assert.equal(report.classification.alternatives.length, 0);
    assert.ok(
      report.classification.reasoning.some((reason) =>
        reason.includes("Step 0"),
      ),
      report.classification.reasoning.join("\n"),
    );
    assert.ok(
      !report.classification.reasoning.some((reason) =>
        reason.includes("fallback"),
      ),
      report.classification.reasoning.join("\n"),
    );
  });

  it("does not report fallback-only classification as certain", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "fallback-only",
      [
        "---",
        "name: fallback-only",
        'description: "Skill without workflow shape signals."',
        'goat-flow-skill-version: "1.6.1"',
        "---",
        "# /fallback-only",
        "Some prose only.",
      ].join("\n"),
    );
    const config = cloneQualityConfig(DEFAULT_QUALITY_CONFIG);
    config.subtypes.workflow.detection = {
      kinds: ["skill"],
      namePatterns: [],
      headingPatterns: [],
      mustNotHave: [],
    };
    const artifact = findArtifact(projectRoot, "skill:fallback-only")!;
    const report = scoreArtifact(projectRoot, artifact, config);
    assert.equal(report.classification.detectedSubtype, "workflow");
    assert.equal(
      report.classification.confidence,
      FALLBACK_CLASSIFICATION_CONFIDENCE,
    );
    assert.ok(
      report.classification.reasoning.some((reason) =>
        reason.includes("fallback"),
      ),
      report.classification.reasoning.join("\n"),
    );
  });

  it("surfaces alternatives for the dispatcher skill", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.equal(report.classification.detectedSubtype, "dispatcher");
    assert.ok(report.classification.confidence >= 0.7);
    assert.ok(report.classification.alternatives.length >= 1);
  });

  it("triggers consider-reclassifying when structure is high but confidence < 0.7", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "ambiguous",
      [
        "---",
        "name: ambiguous",
        'description: "Skill with conflicting subtype signals."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /ambiguous",
        "## When to Use",
        "Use when testing classification.",
        "NOT this skill: clear-shape skills.",
        "## Route Map",
        "Routes to other skills.",
        "## Quick Scan Path",
        "Audit mode review.",
        "## Constraints",
        "Read-Only mode default; ask for approval before File-Write.",
        "skill-preamble required; Read First the conventions.",
        "Apply Proof Gate per skill-preamble. OBSERVED evidence required.",
        "## Verification",
        "BLOCKING GATE: pass/fail evidence required at every CHECKPOINT.",
        '(search: "needle") for semantic anchors.',
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:ambiguous")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.ok(
      report.classification.confidence < 0.7,
      `expected confidence < 0.7, got ${report.classification.confidence}`,
    );
    assert.ok(
      report.totalScore / report.profileMax >= 0.7,
      `expected structurePct >= 0.7, got ${report.totalScore}/${report.profileMax}`,
    );
    assert.equal(report.recommendation, "consider-reclassifying");
    assert.ok(
      report.fitNotes.some((note) =>
        note.includes("classification confidence"),
      ),
      report.fitNotes.join("\n"),
    );
  });

  it("includes classification reasoning in every report", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.ok(report.classification.reasoning.length > 0);
    assert.ok(
      report.classification.reasoning[0].startsWith("detected dispatcher"),
    );
  });

  it("reports playbook-shaped skill content without changing the applied subtype", () => {
    const report = evaluateUploadedBundle(PROJECT_ROOT, {
      files: [
        {
          name: "SKILL.md",
          content: SANITISED_PLAYWRIGHT_SHAPED_SKILL,
        },
      ],
      suggestedName: "browser-runbook",
      kind: "skill",
    });

    assert.equal(report.artifact.kind, "skill");
    assert.equal(report.subtype, "workflow");
    assert.equal(report.detectedShape, "playbook");
    assert.equal(report.shapeMismatch, true);
    assert.equal(report.recommendation, "consider-reclassifying");
    assert.ok(
      report.shapeConfidence >= 0.7,
      `expected shape confidence >= 0.7, got ${report.shapeConfidence}`,
    );
    assert.ok(
      report.fitNotes.some((note) =>
        note.includes("Packaged as skill using workflow scoring profile"),
      ),
      report.fitNotes.join("\n"),
    );
    assert.ok(
      report.tips.some((tip) =>
        tip.message.includes("packaged as a skill but reads like a playbook"),
      ),
      report.tips.map((tip) => tip.message).join("\n"),
    );
    const serialized = JSON.stringify(report);
    assert.doesNotMatch(serialized, /example-tenant|deploy\.example|cafebabe/i);
    assert.doesNotMatch(serialized, /\.goat-flow\/tasks\//);
  });

  it("ignores rubric-keyword substrings that appear inside example prose", () => {
    // Adversarial case from a humanizer-style content skill: the body quotes
    // English prose containing "readers ... context", "plans", "Model",
    // "router" - all substrings of rubric signal words (`\bread\b ... context`,
    // `\bPlan\b`, `\bmode\b`, `\broute\b`). Without `\b` boundaries these
    // false-positive into cold-start, write-risk, and dispatcher shape. The
    // regression check: zero false positives on adversarial prose.
    const report = evaluateContent(PROJECT_ROOT, {
      kind: "skill",
      suggestedName: "prose-skill",
      content: [
        "---",
        "name: prose-skill",
        'description: "Use when reviewing writing for tone."',
        "---",
        "# /prose-skill",
        "## Examples",
        "> LLMs hit readers over the head with claims without context.",
        "> The company plans to open two more locations.",
        "> Business Model Canvas and large language models.",
        "> Use the router cache for memoized data.",
      ].join("\n"),
    });

    const coldStart = report.metrics.find((m) => m.metric === "cold-start")!;
    const writeRisk = report.metrics.find((m) => m.metric === "write-risk")!;
    // Cold-start "context setup" gate must not fire from "readers ... context".
    assert.match(coldStart.detail, /no Read First or context setup/);
    // Write-risk mode system must not fire from "plans" or "Model".
    assert.match(writeRisk.detail, /no read-only vs write mode system/);
    // Shape must not be detected as dispatcher from "router".
    assert.notEqual(report.detectedShape, "dispatcher");
  });

  it("reports reference-packaged workflow content without changing the applied subtype", () => {
    const report = evaluateContent(PROJECT_ROOT, {
      kind: "shared-reference",
      suggestedName: "workflow-reference.md",
      content: [
        "---",
        'goat-flow-reference-version: "1.6.1"',
        "---",
        "# Workflow Reference",
        "## Step 0 - Intake",
        "Read context first.",
        "## Phase 1",
        "Plan.",
        "CHECKPOINT before acting.",
        "## Phase 2",
        "Use Read-Only mode unless approved.",
        "## Verification",
        "- [ ] Evidence required.",
      ].join("\n"),
    });

    assert.equal(report.artifact.kind, "shared-reference");
    assert.equal(report.subtype, "playbook");
    assert.equal(report.detectedShape, "workflow");
    assert.equal(report.shapeMismatch, true);
    assert.equal(report.recommendation, "consider-reclassifying");
  });

  it("classifies uploaded bundles against the composed uploaded surface", () => {
    const report = evaluateUploadedBundle(PROJECT_ROOT, {
      kind: "skill",
      suggestedName: "split-skill",
      files: [
        {
          name: "SKILL.md",
          content: [
            "---",
            "name: split-skill",
            'description: "Use when testing bundle composition."',
            'goat-flow-skill-version: "1.6.1"',
            "---",
            "# /split-skill",
            "## Step 0",
            "Read workflow.md.",
          ].join("\n"),
        },
        {
          name: "workflow.md",
          content: [
            "## Phase 1",
            "Plan the change.",
            "## Phase 2",
            "CHECKPOINT: human approves before work.",
            "## Verification",
            '- [ ] OBSERVED evidence required with `(search: "split-anchor")`.',
          ].join("\n"),
        },
      ],
    });

    const workflow = report.metrics.find(
      (m) => m.metric === "workflow-completeness",
    )!;
    assert.equal(workflow.score, workflow.maxScore, workflow.detail);
    assert.equal(report.detectedShape, "workflow");
  });
});
