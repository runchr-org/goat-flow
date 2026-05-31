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
describe("dashboard /api/agents/installed", () => {
  it("normalizes trailing punctuation from one-line version output", () => {
    assert.equal(
      normalizeAgentVersionOutput("GitHub Copilot CLI 1.0.34.\n"),
      "GitHub Copilot CLI 1.0.34",
    );
    assert.equal(
      normalizeAgentVersionOutput("codex 1.2.3-beta.1\n"),
      "codex 1.2.3-beta.1",
    );
    assert.equal(normalizeAgentVersionOutput("\n"), null);
  });

  it("does not execute runner --version probes unless fresh detection is requested", async () => {
    let versionCalls = 0;
    childProcess.execFileSync = ((file, args, options) => {
      if (Array.isArray(args) && args.includes("--version")) {
        versionCalls += 1;
        throw new Error("default agent detection should be passive");
      }
      return originalExecFileSync(file, args, options);
    }) as typeof childProcess.execFileSync;
    syncBuiltinESMExports();

    try {
      const { res } = await fetchJson("/api/agents/installed");
      assert.equal(res.status, 200);
      assert.equal(versionCalls, 0);
    } finally {
      childProcess.execFileSync = originalExecFileSync;
      syncBuiltinESMExports();
    }
  });

  it("returns the supported agent list", async () => {
    const { res, body } = await fetchJson("/api/agents/installed");
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Agent detection response");
    assert.ok(Array.isArray(data.agents));
    assert.equal((data.agents as unknown[]).length, getKnownAgentIds().length);
    const ids = (data.agents as Array<Record<string, unknown>>).map((agent) =>
      String(agent.id),
    );
    const names = (data.agents as Array<Record<string, unknown>>).map((agent) =>
      String(agent.name),
    );
    assert.deepEqual(ids.sort(), [...getKnownAgentIds()].sort());
    assert.deepEqual(
      names.sort(),
      getKnownAgentIds()
        .map((id) => getAgentProfileMap()[id].name)
        .sort(),
    );
  });
});
