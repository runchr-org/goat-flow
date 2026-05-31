import {
  describe,
  it,
  assert,
  join,
  discoverArtifacts,
  evaluateContent,
  findArtifact,
  scoreArtifact,
  PROJECT_ROOT,
  FULL_TOOL_DEPENDENCY_SCORE,
  MIN_PLAYBOOK_TOOL_SCORE,
  makeTempProject,
  writeText,
  writeSkill,
} from "./helpers.js";

describe("recommendation gates", () => {
  it("forces needs-human-review when an applicable metric scores zero", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "zero-gate",
      [
        "---",
        "name: zero-gate",
        'description: "Skill with structure but no gates."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /zero-gate",
        "## When to Use",
        "Use when testing zero gates.",
        "NOT this skill: references.",
        "## Step 0",
        "Gather context.",
        "## Phase 1",
        "Do work.",
        "## Phase 2",
        "Do more work.",
        "## Phase 3",
        "Finish work.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:zero-gate")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.equal(report.recommendation, "needs-human-review");
    assert.ok(
      report.fitNotes.some((note) => note.includes("scored 0/")),
      report.fitNotes.join("\n"),
    );
  });

  it("retires very low quality skills before demoting them", () => {
    const projectRoot = makeTempProject();
    writeSkill(projectRoot, "empty", "# /empty\n");
    const artifact = findArtifact(projectRoot, "skill:empty")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.equal(report.recommendation, "retire");
  });

  it("recommends revision for moderate skills without zero-metric failures", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "moderate",
      [
        "---",
        "name: moderate",
        'description: "Moderate skill."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /moderate",
        "## When to Use",
        "Use when checking recommendation bands.",
        "## Step 0",
        "Gather context.",
        "## Phase 1",
        "Do work.",
        "## Phase 2",
        "Prepare evidence.",
        "## Verification",
        "- [ ] evidence required.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:moderate")!;
    const report = scoreArtifact(projectRoot, artifact);
    assert.equal(report.recommendation, "consider-revision");
    assert.ok(
      report.metrics.every(
        (metric) => metric.maxScore === 0 || metric.score > 0,
      ),
    );
  });

  it("does not score prose phrase 'which milestone' as tool handling", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "which-prose",
      [
        "---",
        "name: which-prose",
        'description: "Skill with prose only."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /which-prose",
        "## When to Use",
        "Use when deciding which milestone comes next.",
        "NOT this skill: tool checks.",
        "## Step 0",
        "Read context.",
        "## Phase 1",
        "CHECKPOINT before work.",
        "## Phase 2",
        "Finish.",
        "## Verification",
        "- [ ] Evidence required.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:which-prose")!;
    const report = scoreArtifact(projectRoot, artifact);
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.equal(tool.score, FULL_TOOL_DEPENDENCY_SCORE);
  });

  it("does not score reference version frontmatter as a tool dependency", () => {
    const report = evaluateContent(PROJECT_ROOT, {
      kind: "shared-reference",
      suggestedName: "plain-reference.md",
      content: [
        "---",
        'goat-flow-reference-version: "1.6.1"',
        "---",
        "# Plain Reference",
        "## Purpose",
        "Documents local process.",
        "## Workflow",
        "Read and apply.",
        "## Fallback",
        "Ask a human.",
      ].join("\n"),
    });
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.equal(tool.score, FULL_TOOL_DEPENDENCY_SCORE, tool.detail);
  });

  it("does not score ordinary shell/runtime commands as tool dependencies", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "ordinary-command",
      [
        "---",
        "name: ordinary-command",
        'description: "Skill with ordinary commands."',
        'goat-flow-skill-version: "1.6.1"',
        "---",
        "# /ordinary-command",
        "## When to Use",
        "Use when testing ordinary commands.",
        "NOT this skill: browser work.",
        "## Step 0",
        "Run `npm test` and `git status`.",
        "## Phase 1",
        "CHECKPOINT before work.",
        "## Phase 2",
        "Finish.",
        "## Verification",
        "- [ ] Evidence required.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:ordinary-command")!;
    const report = scoreArtifact(projectRoot, artifact);
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.equal(tool.score, FULL_TOOL_DEPENDENCY_SCORE, tool.detail);
  });

  it("scores browser MCP commands as tool dependencies requiring availability and fallback", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "browser-command",
      [
        "---",
        "name: browser-command",
        'description: "Skill with browser MCP commands."',
        'goat-flow-skill-version: "1.6.1"',
        "---",
        "# /browser-command",
        "## When to Use",
        "Use when testing browser tool detection.",
        "NOT this skill: prose-only checks.",
        "## Step 0",
        "Run `browser_navigate` and `mcp__browser__snapshot` against the page.",
        "## Phase 1",
        "CHECKPOINT before work.",
        "## Phase 2",
        "Finish.",
        "## Verification",
        "- [ ] Evidence required.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:browser-command")!;
    const report = scoreArtifact(projectRoot, artifact);
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.ok(tool.score < 10, `expected tool score < 10, got ${tool.score}`);
    assert.match(tool.detail, /references tools without availability check/);
    assert.match(tool.detail, /no fallback for tool dependencies/);
  });

  it("scores explicit command availability and fallback as handled tool dependency", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "tool-skill",
      [
        "---",
        "name: tool-skill",
        'description: "Skill with a tool dependency."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /tool-skill",
        "## When to Use",
        "Use when testing tools.",
        "NOT this skill: no tools.",
        "## Step 0",
        "Run `command -v browser-use`.",
        "## Phase 1",
        "Availability Check: confirm browser-use exists.",
        "## Phase 2",
        "Fallback: ask for manual browser evidence if unavailable.",
        "## Verification",
        "- [ ] pass/fail evidence required.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:tool-skill")!;
    const report = scoreArtifact(projectRoot, artifact);
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.ok(
      tool.score >= MIN_PLAYBOOK_TOOL_SCORE,
      `expected tool score >= ${MIN_PLAYBOOK_TOOL_SCORE}, got ${tool.score}`,
    );
  });

  it("inherits tool dependency handling from a referenced playbook", () => {
    const projectRoot = makeTempProject();
    writeSkill(
      projectRoot,
      "playbook-delegator",
      [
        "---",
        "name: playbook-delegator",
        'description: "Skill that delegates tool checks."',
        'goat-flow-skill-version: "1.6.0"',
        "---",
        "# /playbook-delegator",
        "## When to Use",
        "Use when exercising browser actions.",
        "NOT this skill: unrelated work.",
        "## Step 0",
        "Read references/browser-use.md before acting.",
        "## Phase 1",
        "Do browser work.",
        "## Phase 2",
        "Verify evidence.",
        "## Verification",
        "- [ ] pass/fail evidence required.",
      ].join("\n"),
    );
    writeText(
      join(
        projectRoot,
        ".claude/skills/playbook-delegator/references/browser-use.md",
      ),
      [
        "# Browser Use",
        "## Availability Check",
        "Run `command -v browser-use`.",
        "Fallback: capture manual browser evidence if unavailable.",
      ].join("\n"),
    );
    const artifact = findArtifact(projectRoot, "skill:playbook-delegator")!;
    const report = scoreArtifact(projectRoot, artifact);
    const tool = report.metrics.find((m) => m.metric === "tool-deps")!;
    assert.ok(
      tool.score >= MIN_PLAYBOOK_TOOL_SCORE,
      `expected tool score >= ${MIN_PLAYBOOK_TOOL_SCORE}, got ${tool.score}`,
    );
    assert.ok(report.composedFrom.includes("references/browser-use.md"));
  });

  it("uses unique IDs when shared-reference basenames exist in both roots", () => {
    const projectRoot = makeTempProject();
    writeText(
      join(projectRoot, ".goat-flow/skill-reference/browser-use.md"),
      "# Legacy Browser Use\n",
    );
    writeText(
      join(projectRoot, ".goat-flow/skill-playbooks/browser-use.md"),
      "# Browser Use\n\n## Availability Check\ncommand -v browser-use\n",
    );

    const refs = discoverArtifacts(projectRoot).filter(
      (artifact) =>
        artifact.kind === "shared-reference" && artifact.name === "browser-use",
    );
    const expectedReferenceVariants = 2;
    assert.equal(refs.length, expectedReferenceVariants);
    assert.equal(
      new Set(refs.map((artifact) => artifact.id)).size,
      expectedReferenceVariants,
    );
    assert.ok(
      refs.some((artifact) =>
        artifact.id.includes("goat-flow-skill-reference"),
      ),
    );
    assert.ok(
      refs.some((artifact) =>
        artifact.id.includes("goat-flow-skill-playbooks"),
      ),
    );
  });
});
