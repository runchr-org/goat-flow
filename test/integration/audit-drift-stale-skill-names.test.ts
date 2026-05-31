import {
  after,
  assert,
  before,
  checkDrift,
  createFS,
  describe,
  getInstalledSkillRoots,
  it,
  join,
  mkdirSync,
  rmSync,
  setupFixture,
  writeFileSync,
} from "./audit-drift.helpers.ts";

describe("checkDrift: v1.2.0 stale names (goat-sbao, goat-test)", () => {
  let root: string;
  before(() => {
    root = setupFixture();
    for (const agentDir of getInstalledSkillRoots()) {
      for (const staleName of ["goat-sbao", "goat-test"]) {
        mkdirSync(join(root, agentDir, staleName), { recursive: true });
        writeFileSync(
          join(root, agentDir, staleName, "SKILL.md"),
          `# ${staleName}\n`,
        );
      }
    }
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("flags goat-sbao and goat-test as deprecated per manifest.stale_names", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "fail");
    const deprecatedSbao = report.findings.find(
      (f) => f.kind === "deprecated" && f.path.includes("goat-sbao"),
    );
    const deprecatedTest = report.findings.find(
      (f) => f.kind === "deprecated" && f.path.includes("goat-test"),
    );
    assert.ok(deprecatedSbao, "expected deprecated finding for goat-sbao");
    assert.ok(deprecatedTest, "expected deprecated finding for goat-test");
  });
});
