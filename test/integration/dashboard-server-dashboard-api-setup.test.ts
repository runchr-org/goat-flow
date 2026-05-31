import {
  after,
  assert,
  assertAuditCheckProvenance,
  assertAuditScope,
  assertDashboardReport,
  assertJsonResponse,
  assertValidEmittedEnvelope,
  AUDIT_VERSION,
  baseUrl,
  before,
  childProcess,
  CODEX_CONFIG,
  CODEX_WORKSPACE_ROOT_ENTRIES,
  commitDashboardCacheProject,
  createRequire,
  DASHBOARD_STATE_PATH,
  dashboardSetupInstruction,
  dashboardToken,
  describe,
  dirname,
  existsSync,
  expectRecord,
  extractDashboardToken,
  fetchJson,
  getAgentProfileMap,
  getKnownAgentIds,
  it,
  join,
  LEGACY_PROJECTS_LIST_PATH,
  makeDashboardCacheProject,
  makeDashboardSetupPromptProject,
  MISSING_PATH,
  mkdir,
  mkdtemp,
  normalizeAgentVersionOutput,
  originalDashboardState,
  originalExecFileSync,
  originalLegacyProjectsList,
  performance,
  PROJECT_PATH,
  readEventEnvelopes,
  readFile,
  readdir,
  rename,
  require,
  resolve,
  rm,
  runGit,
  server,
  setEnv,
  syncBuiltinESMExports,
  TERMINAL_UPLOAD_MAX_BODY_BYTES,
  tmpdir,
  validateEvidenceEnvelope,
  withTimeout,
  writeFile,
  writeProjectFile,
} from "./dashboard-server.helpers.js";
import type { AgentId } from "../../src/cli/types.js";
describe("dashboard /api/setup", () => {
  it("returns 400 without agent parameter", async () => {
    const { res, body } = await fetchJson(
      `/api/setup?path=${encodeURIComponent(PROJECT_PATH)}`,
    );
    assert.equal(res.status, 400);

    const data = expectRecord(body, "Setup error");
    assert.match(String(data.error), /agent/i);
  });

  it("returns 400 for an invalid agent", async () => {
    const { res, body } = await fetchJson(
      `/api/setup?path=${encodeURIComponent(PROJECT_PATH)}&agent=invalid`,
    );
    assert.equal(res.status, 400);

    const data = expectRecord(body, "Setup error");
    assert.match(String(data.error), /invalid/i);
  });

  for (const agent of getKnownAgentIds()) {
    it(`generates setup output for ${agent}`, async () => {
      const { res, body } = await fetchJson(
        `/api/setup?path=${encodeURIComponent(PROJECT_PATH)}&agent=${agent}`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Setup response");
      assert.equal(typeof data.output, "string");
      assert.ok(String(data.output).length > 100);
    });
  }

  it("avoids deny hook self-tests while preserving setup prompt checks", async () => {
    let selfTestCalls = 0;
    childProcess.execFileSync = ((file, args, options) => {
      if (
        Array.isArray(args) &&
        args.some((arg) => String(arg).startsWith("--self-test"))
      ) {
        selfTestCalls += 1;
        throw new Error("setup prompt should not run deny hook self-tests");
      }
      return originalExecFileSync(file, args, options);
    }) as typeof childProcess.execFileSync;
    syncBuiltinESMExports();

    try {
      const { res, body } = await fetchJson(
        `/api/setup?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Setup response");
      assert.equal(typeof data.output, "string");
      assert.equal(
        selfTestCalls,
        0,
        "setup prompt should not run deny hook self-tests",
      );
    } finally {
      childProcess.execFileSync = originalExecFileSync;
      syncBuiltinESMExports();
    }
  });

  it("reports setup and agent install failures even when selected harness checks pass", async () => {
    // installSkills: true so classifyProjectState returns "current" (not "incomplete"),
    // allowing composeSetup to reach the audit-fail path with individual check details.
    const project = await makeDashboardSetupPromptProject({
      decisionsDir: true,
      installSkills: true,
    });
    try {
      const { res, body } = await fetchJson(
        `/api/setup?path=${encodeURIComponent(project.root)}&agent=codex`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Setup response");
      const output = String(data.output);
      assert.doesNotMatch(output, /All audit checks pass\./);
      assert.match(
        output,
        /Re-run: `[^`]* audit [^`]* --harness --agent codex`/,
      );
    } finally {
      await project.cleanup();
    }
  });

  it("reports harness failures alongside setup remediation", async () => {
    // installSkills: true so classifyProjectState returns "current" (not "incomplete"),
    // allowing composeSetup to reach the audit-fail path with individual check details.
    const project = await makeDashboardSetupPromptProject({
      decisionsDir: false,
      installSkills: true,
    });
    try {
      const { res, body } = await fetchJson(
        `/api/setup?path=${encodeURIComponent(project.root)}&agent=codex`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Setup response");
      const output = String(data.output);
      assert.match(output, /Decisions/);
      assert.doesNotMatch(output, /All audit checks pass\./);
      assert.match(
        output,
        /Re-run: `[^`]* audit [^`]* --harness --agent codex`/,
      );
    } finally {
      await project.cleanup();
    }
  });
});
