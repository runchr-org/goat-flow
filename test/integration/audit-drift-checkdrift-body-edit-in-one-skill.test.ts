import {
  after,
  assert,
  assertExists,
  before,
  checkDrift,
  createFS,
  describe,
  it,
  join,
  rmSync,
  setupFixture,
  SKILL_STUB,
  writeFileSync,
} from "./audit-drift.helpers.ts";

describe("checkDrift: body edit in one skill", () => {
  let root: string;
  before(() => {
    root = setupFixture();
    // Mutate one installed copy's body (not frontmatter).
    writeFileSync(
      join(root, ".claude", "skills", "goat", "SKILL.md"),
      SKILL_STUB("goat") + "\n# drift injected\n",
    );
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("detects content drift", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "fail");
    const drift = report.findings.find((f) => f.kind === "content");
    assertExists(drift, "expected a content drift finding");
    assert.match(drift.path, /\.claude\/skills\/goat\/SKILL\.md/);
  });
});
