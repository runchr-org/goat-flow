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
} from "./audit-drift.helpers.ts";

describe("checkDrift: missing installed copy", () => {
  let root: string;
  before(() => {
    root = setupFixture();
    // Remove one installed copy entirely.
    rmSync(join(root, ".claude", "skills", "goat"), {
      recursive: true,
      force: true,
    });
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("detects a missing install as drift", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "fail");
    const missing = report.findings.find((f) => f.kind === "missing");
    assertExists(missing, "expected a missing finding");
    assert.match(missing.path, /\.claude\/skills\/goat\/SKILL\.md/);
  });
});
