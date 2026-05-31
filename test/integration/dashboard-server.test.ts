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
describe("dashboard HTML", () => {
  it("GET / returns HTML shell with the expected scripts", async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/i);

    const html = await res.text();
    assert.match(html, /__GOAT_FLOW_DEFAULT_PATH__/);
    assert.match(html, /__GOAT_FLOW_VERSION__/);
    assert.match(html, /__GOAT_FLOW_DASHBOARD_TOKEN__/);
    assert.match(html, /__GOAT_FLOW_AGENTS__/);
    assert.match(html, /__GOAT_FLOW_RUNNER_IDS__/);
    assert.match(html, /__GOAT_FLOW_PRESETS__/);
    assert.match(html, /alpinejs@3/i);
    assert.match(html, /\/assets\/dashboard-readers\.js/);
    assert.match(html, /\/assets\/dashboard-setup-quality\.js/);
    assert.match(html, /\/assets\/dashboard-projects\.js/);
    assert.match(html, /\/assets\/dashboard-custom-prompts\.js/);
    assert.match(html, /\/assets\/dashboard-prompts\.js/);
    assert.match(html, /\/assets\/dashboard-terminal\.js/);
    assert.match(html, /\/assets\/app\.js/);
    assert.equal(
      html.match(/x-show="activeView === 'home'"/g)?.length ?? 0,
      1,
      "dashboard HTML should contain exactly one Home view root",
    );
  });
});
