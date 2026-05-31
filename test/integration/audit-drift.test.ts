describe("checkDrift: clean fixture", () => {
  let root: string;
  before(() => {
    root = setupFixture();
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("reports pass with zero findings when templates and installed copies match", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "pass");
    assert.deepEqual(report.findings, []);
    const expectedSkillComparisons =
      SKILL_NAMES.reduce(
        (total, name) => total + getSkillFiles(name).length,
        0,
      ) * getInstalledSkillRoots().length;
    const expectedSharedComparisons = 15;
    assert.equal(
      report.checked,
      expectedSkillComparisons + expectedSharedComparisons,
    );
  });
});
