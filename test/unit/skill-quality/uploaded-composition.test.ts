import {
  describe,
  it,
  assert,
  join,
  evaluateContent,
  evaluateUploadedBundle,
  findArtifact,
  scoreArtifact,
  PROJECT_ROOT,
} from "./helpers.js";

describe("uploaded skill evaluation skips host preamble composition", () => {
  // Uploads in the dashboard "Evaluate skill" modal are scored as standalone
  // artifacts: only the user's files contribute to the composed surface.
  // skill-preamble.md / skill-conventions.md from the host project are
  // intentionally excluded - gluing them on inflates gate/evidence/tool-deps
  // scores for content the uploaded skill doesn't actually own.
  const UPLOADED_SKILL = [
    "---",
    "name: uploaded-skill",
    'description: "Uploaded skill that should score on its own merits."',
    'goat-flow-skill-version: "1.6.0"',
    "---",
    "# /uploaded-skill",
    "",
    "**NOT this skill:** other intents.",
    "",
    "## Step 0",
    "Read context.",
    "## Phase 1",
    "Do work.",
    "## Verification",
    "Done.",
  ].join("\n");
  const PORTABLE_SKILL_WITHOUT_GOAT_FLOW_PREAMBLE = [
    "---",
    "name: portable-skill",
    'description: "Use when checking portable skill evaluator behavior."',
    'goat-flow-skill-version: "1.6.1"',
    "---",
    "# /portable-skill",
    "",
    "## When to Use",
    "Use when evaluating a skill that is not built for goat-flow inheritance.",
    "",
    "**NOT this skill:** goat-flow framework setup.",
    "",
    "## Read First",
    "",
    "- Read `docs/testing.md` before acting.",
    "",
    "## Prerequisites",
    "",
    "- Requires a checked-out repository and a clear target file.",
    "- Default mode is Read-Only unless the user approves File-Write.",
    "",
    "## Step 0",
    "",
    "Confirm the target file, scope, assumptions, and operating mode.",
    "",
    "## Phase 1",
    "",
    "Inspect the target and capture findings.",
    "",
    "CHECKPOINT: human approves before any file write.",
    "",
    "## Verification",
    "",
    "- [ ] OBSERVED findings cite current source evidence.",
    '- [ ] Evidence required for each claim, including `(search: "portable-anchor")`.',
  ].join("\n");

  it("evaluateContent composedFrom omits skill-preamble.md and skill-conventions.md", () => {
    const report = evaluateContent(PROJECT_ROOT, {
      content: UPLOADED_SKILL,
      suggestedName: "uploaded-skill",
      kind: "skill",
    });
    assert.deepEqual(report.composedFrom, ["SKILL.md"]);
    assert.ok(!report.composedFrom.includes("skill-preamble.md"));
    assert.ok(!report.composedFrom.includes("skill-conventions.md"));
  });

  it("evaluateUploadedBundle composedFrom (single file) lists only the uploaded file", () => {
    const report = evaluateUploadedBundle(PROJECT_ROOT, {
      files: [{ name: "SKILL.md", content: UPLOADED_SKILL }],
      suggestedName: "uploaded-skill",
      kind: "skill",
    });
    assert.deepEqual(report.composedFrom, ["SKILL.md"]);
  });

  it("evaluateUploadedBundle composedFrom (multi-file) lists only the user's files", () => {
    const report = evaluateUploadedBundle(PROJECT_ROOT, {
      files: [
        { name: "SKILL.md", content: UPLOADED_SKILL },
        { name: "notes.md", content: "# Notes\nBackground.\n" },
      ],
      suggestedName: "uploaded-skill",
      kind: "skill",
    });
    assert.deepEqual(report.composedFrom, ["SKILL.md", "notes.md"]);
    assert.ok(!report.composedFrom.includes("skill-preamble.md"));
    assert.ok(!report.composedFrom.includes("skill-conventions.md"));
  });

  it("scoring an uploaded skill does not credit gate/evidence signals from skill-preamble", () => {
    // skill-preamble.md in this repo carries `Proof Gate`, `OBSERVED|INFERRED`,
    // and `BLOCKING GATE`/`CHECKPOINT` vocabulary. If composition leaked, the
    // upload would inherit gate-quality and evidence-testability credit it
    // didn't earn. The bare upload contains none of those signals, so both
    // metrics must score 0.
    const report = evaluateContent(PROJECT_ROOT, {
      content: UPLOADED_SKILL,
      suggestedName: "uploaded-skill",
      kind: "skill",
    });
    const gate = report.metrics.find((m) => m.metric === "gate-quality")!;
    const evidence = report.metrics.find(
      (m) => m.metric === "evidence-testability",
    )!;
    assert.equal(gate.score, 0, gate.detail);
    assert.equal(evidence.score, 0, evidence.detail);
  });

  it("does not require goat-flow preamble inheritance for portable uploaded skills", () => {
    const report = evaluateContent(PROJECT_ROOT, {
      content: PORTABLE_SKILL_WITHOUT_GOAT_FLOW_PREAMBLE,
      suggestedName: "portable-skill",
      kind: "skill",
    });
    const coldStart = report.metrics.find((m) => m.metric === "cold-start")!;
    assert.equal(coldStart.score, coldStart.maxScore, coldStart.detail);
    assert.ok(
      !report.tips.some((tip) =>
        /skill-preamble|\.goat-flow\/skill-reference|Proof Gate/i.test(
          tip.message,
        ),
      ),
      report.tips.map((tip) => tip.message).join("\n"),
    );
  });

  it("on-disk scoreArtifact still composes preamble (regression guard for runtime skills)", () => {
    // Counterpart to the upload tests above: skills shipped in this repo are
    // loaded with skill-preamble.md/skill-conventions.md at runtime, so their
    // composed score should continue to include those sources.
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    assert.ok(report.composedFrom.includes("skill-preamble.md"));
    assert.ok(report.composedFrom.includes("skill-conventions.md"));
  });
});
