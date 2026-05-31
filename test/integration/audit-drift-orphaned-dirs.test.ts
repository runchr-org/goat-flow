import {
  after,
  assert,
  before,
  checkDrift,
  createFS,
  describe,
  it,
  join,
  mkdirSync,
  rmSync,
  setupFixture,
  SKILL_NAMES,
  writeFileSync,
} from "./audit-drift.helpers.ts";

describe("checkDrift: orphan and deprecated directory detection", () => {
  let root: string;
  before(() => {
    root = setupFixture();
    // Orphan: name not in SKILL_NAMES and not in manifest.stale_names.
    mkdirSync(join(root, ".claude", "skills", "goat-unknown"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".claude", "skills", "goat-unknown", "SKILL.md"),
      "# orphan\n",
    );
    // Deprecated: name in manifest.stale_names (goat-audit is listed).
    mkdirSync(join(root, ".agents", "skills", "goat-audit"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".agents", "skills", "goat-audit", "SKILL.md"),
      "# deprecated\n",
    );
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("flags orphans and deprecated separately", () => {
    const report = checkDrift({
      fs: createFS(root),
      projectPath: root,
      templateRoot: root,
    });
    assert.equal(report.status, "fail");
    const orphan = report.findings.find(
      (f) => f.kind === "orphan" && f.path.includes("goat-unknown"),
    );
    const deprecated = report.findings.find(
      (f) => f.kind === "deprecated" && f.path.includes("goat-audit"),
    );
    assert.ok(orphan, "expected orphan finding for goat-unknown");
    assert.ok(deprecated, "expected deprecated finding for goat-audit");
  });
});
