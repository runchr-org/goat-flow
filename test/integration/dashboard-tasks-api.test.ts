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
describe("dashboard /api/tasks", () => {
  it("parses task directories, active marker, milestones, and malformed fallbacks", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-tasks-"));
    try {
      await writeProjectFile(root, ".goat-flow/tasks/.active", "current\n");
      await writeProjectFile(
        root,
        ".goat-flow/tasks/current/Milestone-side-menu-navigation.md",
        [
          "# Side Menu Navigation",
          "",
          "**Status:** in-progress",
          "**Objective:** Build a desktop side menu.",
          "",
          "- [x] Done",
          "- [ ] Pending",
          "",
        ].join("\n"),
      );
      await writeProjectFile(
        root,
        ".goat-flow/tasks/current/Milestone-malformed.md",
        "no heading or metadata\n- [ ] fallback task\n",
      );

      const { res, body } = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Tasks response");
      assert.equal(data.taskRoot, join(root, ".goat-flow", "tasks"));
      assert.equal(data.exists, true);
      assert.equal(data.active, "current");
      assert.equal(data.activeExists, true);
      assert.equal(data.selectedPlan, "current");
      assert.ok(Array.isArray(data.plans));
      assert.ok(Array.isArray(data.milestones));
      const plans = data.plans as Record<string, unknown>[];
      assert.equal(plans[0]?.name, "current");
      assert.equal(plans[0]?.milestoneCount, 2);
      assert.equal(plans[0]?.active, true);

      const milestones = data.milestones as Record<string, unknown>[];
      assert.equal(
        milestones[0]?.filename,
        "Milestone-side-menu-navigation.md",
      );
      assert.equal(milestones[0]?.title, "Side Menu Navigation");
      assert.equal(milestones[0]?.status, "in-progress");
      assert.equal(milestones[0]?.objective, "Build a desktop side menu.");
      assert.equal(milestones[0]?.totalTasks, 2);
      assert.equal(milestones[0]?.completedTasks, 1);
      assert.equal(milestones[1]?.filename, "Milestone-malformed.md");
      assert.equal(milestones[1]?.title, "Milestone-malformed.md");
      assert.equal(milestones[1]?.status, "unknown");
      assert.equal(milestones[1]?.totalTasks, 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves stale active markers without treating them as selected plans", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-stale-active-"));
    try {
      await writeProjectFile(root, ".goat-flow/tasks/.active", "missing\n");
      await writeProjectFile(
        root,
        ".goat-flow/tasks/current/Milestone-demo.md",
        "# Demo\n\n**Status:** planned\n- [ ] Pending\n",
      );

      const { res, body } = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Tasks response");
      assert.equal(data.active, "missing");
      assert.equal(data.activeExists, false);
      assert.equal(data.selectedPlan, "current");
      const plans = data.plans as Record<string, unknown>[];
      assert.equal(plans[0]?.active, false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid active task plan updates", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-active-invalid-"));
    try {
      await writeProjectFile(
        root,
        ".goat-flow/tasks/one/Milestone-one.md",
        "# One\n\n**Status:** planned\n- [ ] Pending\n",
      );

      const traversal = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "../one" }),
        },
      );
      assert.equal(traversal.res.status, 400);
      assert.match(
        String(expectRecord(traversal.body, "Traversal response").error),
        /top-level task plan directory/,
      );

      const missing = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "missing" }),
        },
      );
      assert.equal(missing.res.status, 404);
      assert.match(
        String(expectRecord(missing.body, "Missing plan response").error),
        /not found/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns an empty state when the selected project has no tasks directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-no-tasks-"));
    try {
      const { res, body } = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Tasks response");
      assert.equal(data.exists, false);
      assert.equal(data.active, null);
      assert.equal(data.activeExists, false);
      assert.equal(data.selectedPlan, null);
      assert.deepEqual(data.plans, []);
      assert.deepEqual(data.milestones, []);
      await assert.rejects(
        readFile(join(root, ".goat-flow", "tasks", ".active")),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("updates the active task plan for the selected project", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-active-task-"));
    try {
      await writeProjectFile(root, ".goat-flow/tasks/.active", "one\n");
      await writeProjectFile(
        root,
        ".goat-flow/tasks/one/Milestone-one.md",
        "# One\n\n**Status:** planned\n- [ ] Pending\n",
      );
      await writeProjectFile(
        root,
        ".goat-flow/tasks/two/Milestone-two.md",
        "# Two\n\n**Status:** planned\n- [ ] Pending\n",
      );

      const { res, body } = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "two" }),
        },
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Tasks response");
      assert.equal(data.active, "two");
      assert.equal(data.activeExists, true);
      assert.equal(data.selectedPlan, "two");
      const plans = data.plans as Record<string, unknown>[];
      assert.equal(plans.find((plan) => plan.name === "two")?.active, true);
      assert.equal(
        await readFile(join(root, ".goat-flow", "tasks", ".active"), "utf-8"),
        "two\n",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses the selected target tasks tree instead of the controlling workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-target-tasks-"));
    try {
      await writeProjectFile(root, ".goat-flow/tasks/.active", "target\n");
      await writeProjectFile(
        root,
        ".goat-flow/tasks/target/Milestone-target.md",
        "# Target Tasks\n\n**Status:** planned\n**Objective:** Target only.\n",
      );

      const { res, body } = await fetchJson(
        `/api/tasks?path=${encodeURIComponent(root)}`,
      );
      assert.equal(res.status, 200);
      const data = expectRecord(body, "Tasks response");
      assert.equal(data.taskRoot, join(root, ".goat-flow", "tasks"));
      assert.equal(data.selectedPlan, "target");
      const milestones = data.milestones as Record<string, unknown>[];
      assert.equal(milestones.length, 1);
      assert.equal(milestones[0]?.filename, "Milestone-target.md");
      assert.equal(
        milestones[0]?.path,
        join(root, ".goat-flow", "tasks", "target", "Milestone-target.md"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
