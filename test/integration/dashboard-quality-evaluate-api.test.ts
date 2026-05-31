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
describe("dashboard /api/quality/evaluate", () => {
  const SKILL_DRAFT = [
    "---",
    "name: postgres-index",
    "description: Walk through a Postgres index change with explicit evidence gates.",
    "goat-flow-skill-version: 1.6.0",
    "---",
    "# /postgres-index",
    "",
    "## Step 0",
    "Read CLAUDE.md and the migration file.",
    "",
    "## Phase 1",
    "Plan the index change with downtime estimate.",
    "",
    "## Verification",
    "- [ ] EXPLAIN ANALYZE confirms the new plan.",
    "- [ ] Lock acquisition under 100ms in staging.",
  ].join("\n");

  it("counts evaluate bundle content caps in UTF-8 bytes", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [
          { name: "one.md", content: "€".repeat(44 * 1024) },
          { name: "two.md", content: "€".repeat(44 * 1024) },
        ],
      }),
    });
    assert.equal(res.status, 400);
  });

  it("counts evaluate content caps in UTF-8 bytes, not UTF-16 characters", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "€".repeat(90 * 1024) }),
    });
    assert.equal(res.status, 400);
  });

  it("counts evaluate filenames in UTF-8 bytes", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ name: `${"é".repeat(130)}.md`, content: "# x" }],
      }),
    });
    assert.equal(res.status, 400);
  });

  it("infers the artifact kind when no explicit kind is provided", async () => {
    const { res, body } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: SKILL_DRAFT }),
    });
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Evaluate result");
    const artifact = expectRecord(data.artifact, "Evaluate result.artifact");
    assert.equal(artifact.kind, "skill");
  });

  it("returns 400 for a file with a path-separator in its name", async () => {
    for (const name of ["../escape.md", "..\\escape.md"]) {
      const { res } = await fetchJson("/api/quality/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name, content: "# x" }],
        }),
      });
      assert.equal(res.status, 400, name);
    }
  });

  it("returns 400 for an empty files array", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [] }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for an invalid kind value", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: SKILL_DRAFT, kind: "not-a-kind" }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for duplicate filenames in the bundle", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [
          { name: "SKILL.md", content: "# a" },
          { name: "SKILL.md", content: "# b" },
        ],
      }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for empty content", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for missing content", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedName: "x.md" }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 when both content and files are set", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "# x",
        files: [{ name: "SKILL.md", content: "# x" }],
      }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 when neither content nor files is set", async () => {
    const { res } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedName: "x" }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 405 for non-POST methods", async () => {
    const { res } = await fetchJson("/api/quality/evaluate");
    assert.equal(res.status, 405);
  });

  it("returns 413 for evaluate bodies above the route body cap", async () => {
    const { res, body } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(330 * 1024) }),
    });
    assert.equal(res.status, 413);
    const data = expectRecord(body, "Evaluate oversized result");
    assert.match(String(data.error), /Evaluate body too large/);
  });

  it("returns a quality report and improvement tips for an uploaded skill", async () => {
    const { res, body } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: SKILL_DRAFT,
        suggestedName: "postgres-index.md",
        kind: "skill",
      }),
    });
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Evaluate result");
    const artifact = expectRecord(data.artifact, "Evaluate result.artifact");
    assert.equal(artifact.kind, "skill");
    assert.equal(typeof data.totalScore, "number");
    assert.equal(typeof data.profileMax, "number");
    assert.ok(Array.isArray(data.metrics));
    assert.ok(Array.isArray(data.tips));
    assert.equal(typeof data.subtype, "string");
    assert.equal(typeof data.detectedShape, "string");
    assert.equal(typeof data.shapeConfidence, "number");
    assert.equal(typeof data.shapeMismatch, "boolean");
    assert.equal(typeof data.recommendation, "string");
  });

  it("scores a multi-file uploaded bundle and lists every file in composedFrom", async () => {
    const skillBody = [
      "---",
      "name: bundled-skill",
      "description: A multi-file workflow that walks through a deploy.",
      "goat-flow-skill-version: 1.6.0",
      "---",
      "# /bundled-skill",
      "",
      "## Step 0",
      "Read the workflow.md and template.md alongside this file.",
    ].join("\n");
    const workflow = [
      "## Phase 1 - Plan",
      "List the change, downtime, and rollback.",
      "",
      "## Phase 2 - Apply",
      "CHECKPOINT: human reviews before applying.",
      "",
      "## Verification",
      "- [ ] EXPLAIN ANALYZE confirms the new plan.",
    ].join("\n");
    const template = [
      "# Deploy template",
      "",
      "Used by Phase 1 to scaffold the report body.",
    ].join("\n");
    const { res, body } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [
          { name: "SKILL.md", content: skillBody },
          { name: "workflow.md", content: workflow },
          { name: "template.md", content: template },
        ],
        suggestedName: "bundled-skill",
        kind: "skill",
      }),
    });
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Bundle evaluate result");
    const composed = data.composedFrom as string[];
    assert.ok(Array.isArray(composed), "composedFrom must be an array");
    for (const expected of ["SKILL.md", "workflow.md", "template.md"]) {
      assert.ok(
        composed.includes(expected),
        `expected ${expected} in composedFrom (got ${composed.join(", ")})`,
      );
    }
    assert.ok(Array.isArray(data.tips));
    assert.equal(typeof data.totalScore, "number");
  });

  it("surfaces improvement tips for a deliberately weak draft", async () => {
    const weakDraft = [
      "# untitled",
      "",
      "Some prose without sections, frontmatter, or evidence.",
    ].join("\n");
    const { res, body } = await fetchJson("/api/quality/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: weakDraft, kind: "skill" }),
    });
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Evaluate result");
    assert.ok(Array.isArray(data.tips));
    assert.ok(
      (data.tips as unknown[]).length > 0,
      "expected at least one improvement tip for a weak draft",
    );
  });
});
