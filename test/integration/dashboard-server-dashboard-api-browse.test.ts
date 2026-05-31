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
describe("dashboard /api/browse", () => {
  it("returns a directory listing", async () => {
    const { res, body } = await fetchJson(
      `/api/browse?path=${encodeURIComponent(PROJECT_PATH)}`,
    );
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Browse response");
    assert.equal(data.current, PROJECT_PATH);
    assert.equal(typeof data.parent, "string");
    assert.ok(Array.isArray(data.dirs), "Browse response should include dirs");
    const dirs = data.dirs as Array<Record<string, unknown>>;
    const names = dirs.map((dir) => String(dir.name));
    assert.ok(names.includes("src"), "Browse response should include src/");
  });

  it("allows passive browsing of exact system roots without granting write capability", async () => {
    if (process.platform === "win32") return;

    const { res, body } = await fetchJson(
      `/api/browse?path=${encodeURIComponent("/")}`,
    );
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Browse root response");
    assert.equal(data.current, "/");
    assert.ok(Array.isArray(data.dirs));
  });

  it("returns 400 with JSON for an unreadable path", async () => {
    const { res, body } = await fetchJson(
      `/api/browse?path=${encodeURIComponent(MISSING_PATH)}`,
    );
    assert.equal(res.status, 400);

    const data = expectRecord(body, "Browse error");
    assert.equal(typeof data.error, "string");
  });
});
