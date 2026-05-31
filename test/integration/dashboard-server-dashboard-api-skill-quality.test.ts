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
describe("dashboard /api/skill-quality", () => {
  it("returns artifact inventory for the project", async () => {
    const { res, body } = await fetchJson(
      `/api/skill-quality/inventory?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude`,
    );
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Skill quality inventory");
    assert.ok(Array.isArray(data.artifacts));
    const artifacts = data.artifacts as Array<Record<string, unknown>>;
    assert.ok(
      artifacts.length >= 12,
      `expected at least 12 artifacts (skills + shared references), got ${artifacts.length}`,
    );
    assert.ok(artifacts.some((a) => a.kind === "skill"));
    assert.ok(artifacts.some((a) => a.kind === "shared-reference"));
    assert.ok(artifacts.some((a) => a.id === "skill:goat-plan"));
    assert.ok(artifacts.some((a) => a.id === "reference:browser-use"));
    assert.ok(artifacts.some((a) => a.id === "reference:skill-preamble"));
  });

  it("returns shared references regardless of selected agent", async () => {
    const { res, body } = await fetchJson(
      `/api/skill-quality/inventory?path=${encodeURIComponent(PROJECT_PATH)}&agent=codex`,
    );
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Skill quality inventory");
    const artifacts = data.artifacts as Array<Record<string, unknown>>;
    assert.ok(artifacts.some((a) => a.id === "reference:browser-use"));
    assert.ok(artifacts.some((a) => a.id === "reference:skill-preamble"));
  });

  it("uses the selected runner skills directory for inventory", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-skill-runner-"));
    try {
      await writeProjectFile(
        root,
        ".claude/skills/claude-only/SKILL.md",
        "# Claude\n",
      );
      await writeProjectFile(
        root,
        ".agents/skills/codex-only/SKILL.md",
        "# Codex\n",
      );

      const { res, body } = await fetchJson(
        `/api/skill-quality/inventory?path=${encodeURIComponent(root)}&agent=codex`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Skill quality inventory");
      const artifacts = data.artifacts as Array<Record<string, unknown>>;
      assert.ok(artifacts.some((a) => a.id === "skill:codex-only"));
      assert.ok(!artifacts.some((a) => a.id === "skill:claude-only"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("scores a valid artifact with metrics and prompt", async () => {
    const { res, body } = await fetchJson(
      `/api/skill-quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude&artifact=skill:goat-plan`,
    );
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Skill quality report");
    assert.equal(
      (data.artifact as Record<string, unknown>).id,
      "skill:goat-plan",
    );
    assert.ok(typeof data.totalScore === "number");
    assert.ok(typeof data.maxTotalScore === "number");
    assert.equal(data.subtype, "workflow");
    const expectedWorkflowProfileMax = 100;
    assert.equal(data.profileMax, expectedWorkflowProfileMax);
    assert.ok(Array.isArray(data.composedFrom));
    assert.ok(typeof data.recommendation === "string");
    assert.ok(Array.isArray(data.metrics));
    assert.ok(typeof data.prompt === "string");
    assert.match(String(data.prompt), /Quality Review/);
  });

  it("returns 404 for unknown artifact id", async () => {
    const { res, body } = await fetchJson(
      `/api/skill-quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude&artifact=skill:nonexistent`,
    );
    assert.equal(res.status, 404);
    const data = expectRecord(body, "Skill quality 404");
    assert.match(String(data.error), /not found/);
  });

  it("returns 400 when artifact param is missing", async () => {
    const { res } = await fetchJson(
      `/api/skill-quality?path=${encodeURIComponent(PROJECT_PATH)}&agent=claude`,
    );
    assert.equal(res.status, 400);
  });

  it("returns 400 when agent param is missing", async () => {
    const { res } = await fetchJson(
      `/api/skill-quality/inventory?path=${encodeURIComponent(PROJECT_PATH)}`,
    );
    assert.equal(res.status, 400);
  });
});
