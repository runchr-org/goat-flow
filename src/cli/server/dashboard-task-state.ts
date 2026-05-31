import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLocalStatePath } from "./local-paths.js";

/**
 * Milestone row parsed from an `M*.md` task file without sending full Markdown to the UI.
 */
interface DashboardTaskMilestoneSummary {
  filename: string;
  path: string;
  title: string;
  status: string;
  objective: string;
  totalTasks: number;
  completedTasks: number;
  modifiedAt: string;
}

/**
 * Task-plan row for the dashboard plan picker; `modifiedAt` comes from the newest milestone.
 */
interface DashboardTaskPlanSummary {
  name: string;
  path: string;
  modifiedAt: string;
  milestoneCount: number;
  active: boolean;
}

/**
 * Task browser response where `.active` is advisory and may name a missing plan.
 */
export interface DashboardTaskState {
  taskRoot: string;
  exists: boolean;
  active: string | null;
  activeExists: boolean;
  selectedPlan: string | null;
  plans: DashboardTaskPlanSummary[];
  milestones: DashboardTaskMilestoneSummary[];
}

/**
 * Return filesystem stats; swallows missing-path and permission errors as `null`.
 */
function statOrNull(path: string) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

/**
 * Read optional dashboard state files, swallowing local churn as a `null` fallback.
 */
function readOptionalTextFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

/**
 * List a stable numeric sort of `M*.md` milestones; swallows absent plan directories.
 */
function listTaskMilestoneFilenames(planPath: string): string[] {
  try {
    return readdirSync(planPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^M.*\.md$/iu.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

function readMarkdownField(
  content: string,
  pattern: RegExp,
  fallback: string,
): string {
  return content.match(pattern)?.[1]?.trim() || fallback;
}

/**
 * Count Markdown task checkboxes using the same shape goat-plan writes into milestones.
 */
function readTaskProgress(content: string): {
  totalTasks: number;
  completedTasks: number;
} {
  const taskMatches = Array.from(content.matchAll(/^\s*-\s+\[( |x|X)\]/gmu));
  return {
    totalTasks: taskMatches.length,
    completedTasks: taskMatches.filter(
      (match) => match[1]?.toLowerCase() === "x",
    ).length,
  };
}

function parseTaskMilestone(
  planPath: string,
  filename: string,
): DashboardTaskMilestoneSummary {
  const path = join(planPath, filename);
  const content = readOptionalTextFile(path) ?? "";
  const modifiedAt = statOrNull(path)?.mtime.toISOString() ?? "";
  const progress = readTaskProgress(content);
  return {
    filename,
    path,
    title: readMarkdownField(content, /^#\s+(.+)$/mu, filename),
    status: readMarkdownField(content, /^\*\*Status:\*\*\s*(.+)$/mu, "unknown"),
    objective: readMarkdownField(content, /^\*\*Objective:\*\*\s*(.+)$/mu, ""),
    totalTasks: progress.totalTasks,
    completedTasks: progress.completedTasks,
    modifiedAt,
  };
}

function buildTaskPlanSummary(
  taskRoot: string,
  name: string,
  active: string | null,
): DashboardTaskPlanSummary {
  const planPath = join(taskRoot, name);
  const milestoneFilenames = listTaskMilestoneFilenames(planPath);
  const newestMilestoneTime = milestoneFilenames.reduce<number | null>(
    (newest, filename) => {
      const mtime = statOrNull(join(planPath, filename))?.mtime.getTime();
      if (mtime === undefined) return newest;
      return newest === null ? mtime : Math.max(newest, mtime);
    },
    null,
  );
  const planMtime = statOrNull(planPath)?.mtime.getTime() ?? 0;
  const modifiedAt = new Date(newestMilestoneTime ?? planMtime).toISOString();
  return {
    name,
    path: planPath,
    modifiedAt,
    milestoneCount: milestoneFilenames.length,
    active: active === name,
  };
}

/**
 * List top-level task plan directories while ignoring local dotfile markers.
 */
function listTaskPlanNames(taskRoot: string): string[] {
  return readdirSync(taskRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);
}

function emptyDashboardTaskState(
  taskRoot: string,
  active: string | null,
): DashboardTaskState {
  return {
    taskRoot,
    exists: false,
    active,
    activeExists: false,
    selectedPlan: null,
    plans: [],
    milestones: [],
  };
}

function selectDashboardTaskPlan(
  requestedPlan: string | null,
  active: string | null,
  activeExists: boolean,
  plans: DashboardTaskPlanSummary[],
): string | null {
  const requestedExists = plans.some((plan) => plan.name === requestedPlan);
  if (requestedPlan && requestedExists) return requestedPlan;
  if (activeExists) return active;
  return plans[0]?.name ?? null;
}

export function buildDashboardTaskState(
  projectPath: string,
  requestedPlan: string | null,
): DashboardTaskState {
  const taskRoot = resolveLocalStatePath(projectPath, "tasks");
  const taskRootStats = statOrNull(taskRoot);
  const active =
    readOptionalTextFile(join(taskRoot, ".active"))?.trim() || null;
  if (!taskRootStats?.isDirectory()) {
    return emptyDashboardTaskState(taskRoot, active);
  }

  const planNames = listTaskPlanNames(taskRoot);
  const plans = planNames
    .map((name) => buildTaskPlanSummary(taskRoot, name, active))
    .sort((a, b) => {
      const byMtime =
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      return byMtime !== 0 ? byMtime : a.name.localeCompare(b.name);
    });
  const activeExists = Boolean(
    active && plans.some((plan) => plan.name === active),
  );
  const selectedPlan = selectDashboardTaskPlan(
    requestedPlan,
    active,
    activeExists,
    plans,
  );
  const selectedPlanPath = selectedPlan ? join(taskRoot, selectedPlan) : null;
  const milestones = selectedPlanPath
    ? listTaskMilestoneFilenames(selectedPlanPath).map((filename) =>
        parseTaskMilestone(selectedPlanPath, filename),
      )
    : [];

  return {
    taskRoot,
    exists: true,
    active,
    activeExists,
    selectedPlan,
    plans,
    milestones,
  };
}

/**
 * Parse mutation request JSON before route handlers inspect path-like fields.
 *
 * Throws when the body is malformed JSON or is not a top-level object.
 */
function parseJsonObjectBody(body: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Reject plan names that could escape the `.goat-flow/tasks` top level.
 *
 * Throws when the plan name is hidden, relative, or path-like.
 */
function assertTopLevelPlanName(planName: string): void {
  if (
    planName === "." ||
    planName === ".." ||
    planName.includes("/") ||
    planName.includes("\\") ||
    planName.startsWith(".")
  ) {
    throw new Error("body.plan must name a top-level task plan directory");
  }
}

/**
 * Extract and validate the active task-plan name from the dashboard request body.
 *
 * Throws when `body.plan` is missing, blank, or not a safe top-level plan name.
 */
export function readActiveTaskPlanBody(body: string): string {
  const parsed = parseJsonObjectBody(body);
  const plan = parsed["plan"];
  if (typeof plan !== "string" || plan.trim().length === 0) {
    throw new Error("body.plan must be a non-empty string");
  }
  const normalized = plan.trim();
  assertTopLevelPlanName(normalized);
  return normalized;
}

/**
 * Writes `.active` only for an existing task plan so the dashboard never creates task structure.
 *
 * Throws when tasks are absent or the requested plan does not exist.
 */
export function writeActiveTaskPlan(
  projectPath: string,
  planName: string,
): void {
  const taskRoot = resolveLocalStatePath(projectPath, "tasks");
  const taskRootStats = statOrNull(taskRoot);
  if (!taskRootStats?.isDirectory()) {
    throw new Error(".goat-flow/tasks does not exist for the selected project");
  }
  const planNames = listTaskPlanNames(taskRoot);
  if (!planNames.includes(planName)) {
    throw new Error(`task plan not found: ${planName}`);
  }
  writeFileSync(
    resolveLocalStatePath(projectPath, "tasks/.active"),
    `${planName}\n`,
  );
}
