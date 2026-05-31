import {
  describe,
  it,
  assert,
  join,
  findArtifact,
  scoreArtifact,
  PROJECT_ROOT,
  MIN_HUMAN_STOP_GATE_SCORE,
  FULL_GATE_QUALITY_SCORE,
  makeTempProject,
  writeSkill,
} from "./helpers.js";

describe("gate vocabulary", () => {
  /** Score only the gate-quality metric for a one-off skill body. */
  function gateScoreFor(content: string): number {
    const projectRoot = makeTempProject();
    writeSkill(projectRoot, "gate-vocab", content);
    const artifact = findArtifact(projectRoot, "skill:gate-vocab")!;
    const report = scoreArtifact(projectRoot, artifact);
    return report.metrics.find((m) => m.metric === "gate-quality")!.score;
  }

  /** Wrap gate-vocabulary snippets in the minimum valid skill scaffold. */
  function frontmatterSkill(body: string): string {
    return [
      "---",
      "name: gate-vocab",
      'description: "Skill exercising one gate-vocabulary pattern."',
      'goat-flow-skill-version: "1.6.0"',
      "---",
      "# /gate-vocab",
      "## When to Use",
      "Use when testing gate vocabulary.",
      "NOT this skill: unrelated work.",
      "## Step 0",
      "Read context.",
      "## Phase 1",
      "Do work.",
      body,
    ].join("\n");
  }

  const VERIFICATION_GATE_PATTERNS = [
    ["verification gate literal", "## Verification gate\nReview before merge."],
    ["exit criteria literal", "## Exit criteria\nDo not proceed until..."],
    ["testing gate literal", "## Testing gate\nMust pass all checks."],
    [
      "Proof Gate literal",
      "## Phase 2\nApply Proof Gate before claiming done.",
    ],
    [
      "BLOCKING GATE literal",
      "## Verification\nBLOCKING GATE: human approves before merge.",
    ],
    ["CHECKPOINT literal", "## Phase 2\nCHECKPOINT before continuing."],
    ["plain checklist", "## Verification\n- [ ] step done\n- [ ] evidence ok"],
  ] as const;

  for (const [label, body] of VERIFICATION_GATE_PATTERNS) {
    it(`recognises ${label} as a verification-gate signal`, () => {
      const score = gateScoreFor(frontmatterSkill(body));
      assert.ok(
        score >= 5,
        `expected gate score >= 5 (verification-gate band) for ${label}, got ${score}`,
      );
    });
  }

  const EXPLICIT_PASS_PATTERNS = [
    [
      "pass/fail literal",
      "## Verification\nBLOCKING GATE: enforce pass/fail criteria for every claim.",
    ],
    ["exit on literal", "## Verification\nCHECKPOINT exit on green build."],
    [
      "must pass literal",
      "## Verification\nBLOCKING GATE: tests must pass before merge.",
    ],
    [
      "evidence required literal",
      "## Verification\nCHECKPOINT: cited evidence required for every claim.",
    ],
  ] as const;

  for (const [label, body] of EXPLICIT_PASS_PATTERNS) {
    it(`recognises ${label} as an explicit-pass signal`, () => {
      const score = gateScoreFor(frontmatterSkill(body));
      assert.ok(
        score >= 8,
        `expected gate score >= 8 (verification + explicit-pass) for ${label}, got ${score}`,
      );
    });
  }

  const HUMAN_STOP_PATTERNS = [
    [
      "Human Verification phrase",
      "## Verification\nMust pass Human Verification.",
    ],
    [
      "approval phrase",
      "## Verification\nMust pass before stakeholder approval.",
    ],
  ] as const;

  for (const [label, body] of HUMAN_STOP_PATTERNS) {
    it(`recognises ${label} as a human-stop signal`, () => {
      const score = gateScoreFor(frontmatterSkill(body));
      assert.ok(
        score >= MIN_HUMAN_STOP_GATE_SCORE,
        `expected gate score >= ${MIN_HUMAN_STOP_GATE_SCORE} (full credit) for ${label}, got ${score}`,
      );
    });
  }

  it("keeps goat-plan at 10/10 gate quality (regression guard)", () => {
    const artifact = findArtifact(PROJECT_ROOT, "skill:goat-plan")!;
    const report = scoreArtifact(PROJECT_ROOT, artifact);
    const gate = report.metrics.find((m) => m.metric === "gate-quality")!;
    assert.equal(gate.score, gate.maxScore);
    assert.equal(gate.score, FULL_GATE_QUALITY_SCORE);
  });
});
