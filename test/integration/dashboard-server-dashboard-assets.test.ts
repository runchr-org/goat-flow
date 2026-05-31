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
describe("dashboard assets", () => {
  it("GET /assets/dashboard-readers.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-readers.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function readDashboardReport\(/);
  });

  it("GET /assets/dashboard-setup-quality.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-setup-quality.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function dashboardDetectStack\(/);
  });

  it("GET /assets/dashboard-projects.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-projects.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function dashboardOpenBrowser\(/);
  });

  it("GET /assets/dashboard-prompts.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-prompts.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function dashboardFilteredPresets\(/);
  });

  it("GET /assets/dashboard-custom-prompts.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-custom-prompts.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function dashboardSaveCustomPrompt\(/);
  });

  it("GET /assets/dashboard-terminal.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/dashboard-terminal.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /function dashboardConnectTerminal\(/);
  });

  it("GET /assets/xterm.js returns bundled xterm JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/xterm.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);
    assert.equal(res.headers.get("cache-control"), "no-cache");
    assert.match(res.headers.get("etag") ?? "", /^"\d+-\d+"$/);

    const body = await res.text();
    assert.match(body, /bracketedPasteMode/);
  });

  it("GET /assets/xterm.js supports ETag revalidation", async () => {
    const first = await fetch(`${baseUrl}/assets/xterm.js`);
    assert.equal(first.status, 200);
    const etag = first.headers.get("etag");
    assert.match(etag ?? "", /^"\d+-\d+"$/);

    const second = await fetch(`${baseUrl}/assets/xterm.js`, {
      headers: { "If-None-Match": etag ?? "" },
    });
    assert.equal(second.status, 304);
    assert.equal(second.headers.get("etag"), etag);
    assert.equal(second.headers.get("cache-control"), "no-cache");
  });

  it("GET /assets/addon-fit.js returns bundled xterm fit addon JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/addon-fit.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);

    const body = await res.text();
    assert.match(body, /FitAddon/);
  });

  it("GET /assets/app.js returns JavaScript", async () => {
    const res = await fetch(`${baseUrl}/assets/app.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/i);
    assert.equal(res.headers.get("cache-control"), "no-cache");
    assert.match(res.headers.get("etag") ?? "", /^"\d+-\d+"$/);

    const body = await res.text();
    assert.match(body, /function app\(/);
  });

  it("GET /assets/styles.css returns CSS", async () => {
    const res = await fetch(`${baseUrl}/assets/styles.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/css/i);
  });

  it("GET /assets/xterm.css returns bundled xterm CSS", async () => {
    const res = await fetch(`${baseUrl}/assets/xterm.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/css/i);

    const body = await res.text();
    assert.match(body, /\.xterm/);
  });

  it("GET /assets/preset-prompts.json returns preset data", async () => {
    const res = await fetch(`${baseUrl}/assets/preset-prompts.json`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /json/i);

    const body = (await res.json()) as unknown;
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    const first = body[0] as Record<string, unknown>;
    assert.equal(typeof first.route, "string");
    assert.equal(typeof first.globalSafe, "boolean");
    assert.ok(Array.isArray(first.bestTargetSurfaces));
  });

  it("rejects path traversal asset requests", async () => {
    const res = await fetch(`${baseUrl}/assets/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(res.status, 404);
  });
});
