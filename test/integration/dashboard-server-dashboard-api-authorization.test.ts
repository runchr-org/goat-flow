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
describe("dashboard API authorization", () => {
  it("rejects API requests with a missing token", async () => {
    const res = await fetch(`${baseUrl}/api/terminal/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "", projectPath: PROJECT_PATH }),
    });
    assert.equal(res.status, 403);
    assertJsonResponse(res, "missing token rejection");
    assert.deepEqual(await res.json(), { error: "Forbidden" });
  });

  it("rejects API requests with a wrong token", async () => {
    const res = await fetch(`${baseUrl}/api/terminal/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goat-Flow-Dashboard-Token": "wrong-token",
      },
      body: JSON.stringify({ prompt: "", projectPath: PROJECT_PATH }),
    });
    assert.equal(res.status, 403);
    assertJsonResponse(res, "wrong token rejection");
    assert.deepEqual(await res.json(), { error: "Forbidden" });
  });

  it("rejects cross-origin side-effectful browser requests", async () => {
    const res = await fetch(`${baseUrl}/api/projects/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://evil.example",
        "X-Goat-Flow-Dashboard-Token": dashboardToken,
      },
      body: JSON.stringify({ paths: [], favorites: [], projectTitles: {} }),
    });
    assert.equal(res.status, 403);
    assertJsonResponse(res, "bad origin rejection");
    assert.deepEqual(await res.json(), { error: "Forbidden" });
  });

  it("rejects cross-origin terminal image uploads", async () => {
    const res = await fetch(`${baseUrl}/api/terminal/sess-x/upload-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://evil.example",
        "X-Goat-Flow-Dashboard-Token": dashboardToken,
      },
      body: JSON.stringify({ files: [] }),
    });
    assert.equal(res.status, 403);
    assertJsonResponse(res, "bad origin terminal upload rejection");
    assert.deepEqual(await res.json(), { error: "Forbidden" });
  });

  it("accepts valid token and same-origin side-effectful requests", async () => {
    const res = await fetch(`${baseUrl}/api/projects/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        "X-Goat-Flow-Dashboard-Token": dashboardToken,
      },
      body: JSON.stringify({ paths: [], favorites: [], projectTitles: {} }),
    });
    assert.equal(res.status, 200);
    assertJsonResponse(res, "same-origin authorized write");
    assert.deepEqual(await res.json(), { ok: true });
    const persisted = await readFile(DASHBOARD_STATE_PATH, "utf-8");
    assert.equal(persisted.includes(dashboardToken), false);
  });

  it("rejects terminal WebSocket upgrades with a missing token", async () => {
    const { WebSocket } = await import("ws");
    let rejectedUpgrade = false;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        `${baseUrl.replace(/^http/u, "ws")}/ws/terminal/test`,
        { headers: { Origin: baseUrl } },
      );
      const timer = setTimeout(
        () => reject(new Error("terminal WebSocket rejection timed out")),
        1000,
      );
      ws.once("open", () => {
        clearTimeout(timer);
        ws.close();
        reject(new Error("terminal WebSocket opened without a token"));
      });
      ws.once("error", () => {
        clearTimeout(timer);
        rejectedUpgrade = true;
        resolve();
      });
      ws.once("close", () => {
        clearTimeout(timer);
        rejectedUpgrade = true;
        resolve();
      });
    });
    assert.equal(rejectedUpgrade, true);
  });
});
