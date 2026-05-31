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
describe("dashboard /api/quality", () => {
  it("returns 400 without agent", async () => {
    const { res } = await fetchJson(
      `/api/quality?path=${encodeURIComponent(PROJECT_PATH)}`,
    );
    assert.equal(res.status, 400);
  });

  it("returns mode-specific quality prompts", async () => {
    const { res, body } = await fetchJson(
      `/api/quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude&mode=skills`,
    );
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Quality mode response");
    assert.equal(data.command, "quality");
    assert.equal(data.agent, "claude");
    assert.match(
      String(data.prompt),
      /# GOAT Flow Skills Assessment - Claude Code/,
    );
    assert.match(String(data.prompt), /"quality_mode": "skills"/);
  });

  it("uses cache-only audit enrichment when fast=true is requested", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-quality-fast-"));
    try {
      const { res, body } = await fetchJson(
        `/api/quality?path=${encodeURIComponent(root)}&agent=claude&fast=true`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Fast quality response");
      assert.equal(data.command, "quality");
      assert.equal(data.agent, "claude");
      assert.equal(data.auditStatus, "unavailable");
      assert.match(String(data.prompt), /Audit: NOT LOADED/);
      assert.match(String(data.prompt), /fast quality prompt/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits a redacted evidence envelope for generated quality prompts", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-quality-events-"));
    try {
      const { res, body } = await fetchJson(
        `/api/quality?path=${encodeURIComponent(root)}&agent=claude&fast=true`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Quality event response");
      const prompt = String(data.prompt);

      const envelopes = await readEventEnvelopes(root);
      const event = envelopes.find(
        (candidate) => candidate.event_kind === "quality.prompt",
      );
      assert.ok(event, "quality prompt request should emit an event envelope");
      assertValidEmittedEnvelope(event);
      assert.equal(JSON.stringify(event).includes(prompt), false);

      const payload = expectRecord(event.payload, "Quality event payload");
      const redactedPrompt = expectRecord(
        payload.prompt,
        "Quality event payload.prompt",
      );
      assert.equal(redactedPrompt.kind, "redacted");
      assert.equal(redactedPrompt.label, "quality prompt");
      assert.equal(typeof redactedPrompt.sha256, "string");
      assert.equal(typeof redactedPrompt.length, "number");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reuses cached quality audits unless fresh=true is requested", async () => {
    const runQualityRequest = async (
      suffix: string,
    ): Promise<Record<string, unknown>> => {
      const { res, body } = await fetchJson(
        `/api/quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude${suffix}`,
      );
      assert.equal(res.status, 200);
      return expectRecord(body, "Quality cache response");
    };

    const first = await runQualityRequest("&fresh=true");
    const second = await runQualityRequest("");
    const third = await runQualityRequest("&fresh=true");

    assert.equal(first.command, "quality");
    assert.equal(second.command, "quality");
    assert.equal(third.command, "quality");
    assert.equal(first.agent, "claude");
    assert.equal(second.agent, "claude");
    assert.equal(third.agent, "claude");
    assert.equal(first.prompt, second.prompt);
    assert.equal(first.prompt, third.prompt);
    assert.equal(first.auditCacheStatus, "bypass");
    assert.equal(second.auditCacheStatus, "hit");
    assert.equal(third.auditCacheStatus, "bypass");
  });

  for (const agent of getKnownAgentIds()) {
    it(`generates quality output for ${agent}`, async () => {
      const { res, body } = await fetchJson(
        `/api/quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=${agent}`,
      );
      assert.equal(res.status, 200);

      const data = expectRecord(body, "Quality response");
      assert.equal(data.command, "quality");
      assert.equal(data.agent, agent);
      assert.match(String(data.auditStatus), /^(pass|fail|unavailable)$/);
      assert.equal(typeof data.auditSummary, "string");
      assert.equal(typeof data.prompt, "string");
      assert.ok(String(data.prompt).length > 100);
    });
  }
});
