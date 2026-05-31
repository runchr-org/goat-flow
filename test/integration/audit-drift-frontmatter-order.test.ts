import {
  after,
  assert,
  before,
  checkDrift,
  createFS,
  describe,
  it,
  join,
  rmSync,
  setupFixture,
  writeFileSync,
} from "./audit-drift.helpers.ts";

describe("checkDrift: frontmatter key reorder is not a false positive", () => {
  let root: string;
  before(() => {
    root = setupFixture();
    // Reorder frontmatter keys only - semantic equivalence must hold.
    writeFileSync(
      join(root, ".claude", "skills", "goat", "SKILL.md"),
      "---\ndescription: stub for drift test\nname: goat\n---\n# goat\nbody\n",
    );
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("does not flag reordered frontmatter as drift", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "pass");
    assert.deepEqual(report.findings, []);
  });
});
