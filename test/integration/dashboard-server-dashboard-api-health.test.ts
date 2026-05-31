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
describe("dashboard /api/health", () => {
  it("returns health response shape", async () => {
    const { res, body } = await fetchJson("/api/health");
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Health response");
    assert.equal(typeof data.uptime, "number");
    assert.equal(typeof data.activeSessions, "number");
    assert.equal(typeof data.nodePtyAvailable, "boolean");
    assert.ok(Array.isArray(data.availableRunners));
    assert.ok(
      data.platformHint === undefined ||
        data.platformHint === "linux" ||
        data.platformHint === "darwin" ||
        data.platformHint === "win32",
      `platformHint should be a known platform or undefined, got: ${data.platformHint}`,
    );
  });
});
