import {
  assert,
  createFS,
  describe,
  getRepoAudit,
  it,
  makeTempProject,
  runAudit,
} from "./helpers.js";

describe("audit on well-configured project", () => {
  it("passes on this repo", () => {
    const report = getRepoAudit({ agentFilter: "claude", harness: false });
    assert.equal(report.command, "audit");
    assert.equal(
      report.status,
      "pass",
      `Expected pass but got failures: ${JSON.stringify(report.scopes)}`,
    );
    assert.equal(
      report.scopes.setup.status,
      "pass",
      `Setup failures: ${JSON.stringify(report.scopes.setup.failures)}`,
    );
  });

  it("audits an external project root without throwing on package-root provenance paths", async () => {
    const project = await makeTempProject(async () => {});
    try {
      const fs = createFS(project.root);
      const report = runAudit(fs, project.root, {
        agentFilter: null,
        harness: false,
      });
      assert.equal(report.command, "audit");
      assert.equal(report.target, project.root);
      assert.ok(["pass", "fail"].includes(report.status));
    } finally {
      await project.cleanup();
    }
  });
});
