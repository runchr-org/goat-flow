import {
  after,
  assert,
  before,
  checkDrift,
  describe,
  existsSync,
  INSTALL_FIXTURE_FILES,
  INSTALL_FIXTURE_SKILL,
  it,
  join,
  patchInstallRoundTripFixture,
  PROJECT_ROOT,
  rmSync,
  runCommand,
  setupInstallRoundTripFixture,
} from "./audit-drift.helpers.ts";

describe("checkDrift: installer round-trip fixture", () => {
  let root: string;
  before(() => {
    assert.ok(
      existsSync(join(PROJECT_ROOT, "node_modules")),
      "node_modules must exist for temp-repo preflight coverage",
    );
    assert.ok(
      existsSync(join(PROJECT_ROOT, "dist", "cli", "cli.js")),
      "run npm run build before this test",
    );
    root = setupInstallRoundTripFixture();
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it(
    "installs fixture-backed references, passes preflight, and reports zero drift",
    { timeout: 400000 },
    () => {
      const { agentIds, skillRoots } = patchInstallRoundTripFixture(root);
      const format = runCommand(
        root,
        "npx",
        [
          "prettier",
          "--write",
          "workflow/manifest.json",
          "src/cli/constants.ts",
          "package.json",
        ],
        60000,
      );
      assert.equal(
        format.status,
        0,
        `prettier should format temp round-trip files:\n${format.output}`,
      );

      for (const agentId of agentIds) {
        const install = runCommand(
          root,
          "bash",
          ["workflow/install-goat-flow.sh", root, "--agent", agentId],
          60000,
        );
        assert.equal(
          install.status,
          0,
          `install for ${agentId} should pass:\n${install.output}`,
        );
      }

      for (const skillRoot of skillRoots) {
        for (const relativeFile of INSTALL_FIXTURE_FILES) {
          assert.ok(
            existsSync(
              join(root, skillRoot, INSTALL_FIXTURE_SKILL, relativeFile),
            ),
            `expected ${skillRoot}/${INSTALL_FIXTURE_SKILL}/${relativeFile} to exist after install`,
          );
        }
      }

      const preflight = runCommand(
        root,
        "bash",
        ["scripts/preflight-checks.sh", "--verbose", "--no-color"],
        400000,
      );
      assert.equal(
        preflight.status,
        0,
        `preflight should pass in temp round-trip repo:\n${preflight.output}`,
      );
      // Footer verdict line in the redesigned formatter (M-preflight-redesign).
      assert.match(
        preflight.output,
        /^\s*PASS(?: \(with warnings\))?\s+\d+\s+checks/m,
      );
      assert.match(
        preflight.output,
        /All installed skill files match workflow templates/,
      );

      const drift = runCommand(
        root,
        "node",
        ["dist/cli/cli.js", "audit", ".", "--check-drift", "--format", "json"],
        60000,
      );
      assert.equal(
        drift.status,
        0,
        `drift audit should pass after round-trip install:\n${drift.output}`,
      );

      const report = JSON.parse(drift.stdout) as {
        status: string;
        drift: { status: string; findings: unknown[] } | null;
      };
      assert.equal(report.status, "pass");
      assert.equal(report.drift?.status, "pass");
      assert.deepEqual(report.drift?.findings ?? [], []);
    },
  );
});
