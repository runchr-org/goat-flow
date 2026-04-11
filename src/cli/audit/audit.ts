/**
 * Audit orchestrator for `goat-flow audit`.
 * Loads config, extracts facts, runs build checks (pass/fail) and optional quality checks (advisory).
 * Returns an AuditReport consumed by renderers and the dashboard.
 */
import type { AgentId, ReadonlyFS } from "../types.js";
import { loadConfig } from "../config/index.js";
import { extractProjectFacts } from "../facts/orchestrator.js";
import { getProjectStructure } from "../paths.js";
import { BUILD_CHECKS } from "./build-checks.js";
import { QUALITY_CHECKS } from "./quality-checks.js";
import type {
  AuditContext,
  AuditConcern,
  AuditConcernKey,
  AuditFailure,
  AuditReport,
  AuditScope,
  AuditScopeName,
  ProjectStructure,
} from "./types.js";

export interface AuditOptions {
  agentFilter: AgentId | null;
  quality: boolean;
}

/** Parse the raw project-structure.json into the typed subset audit needs. */
function parseProjectStructure(raw: Record<string, unknown>): ProjectStructure {
  return {
    required_files: (raw.required_files as string[] | undefined) ?? [],
    required_dirs: (raw.required_dirs as string[] | undefined) ?? [],
    skills: {
      canonical:
        ((raw.skills as Record<string, unknown> | undefined)
          ?.canonical as string[]) ?? [],
      stale_names:
        ((raw.skills as Record<string, unknown> | undefined)
          ?.stale_names as string[]) ?? [],
      stale_generic:
        ((raw.skills as Record<string, unknown> | undefined)
          ?.stale_generic as string[]) ?? [],
    },
    agents:
      (raw.agents as ProjectStructure["agents"] | undefined) ?? {},
  };
}

/** Build a scope result from accumulated failures */
function buildScope(
  failures: AuditFailure[],
  summary: Record<string, string>,
): AuditScope {
  return {
    status: failures.length === 0 ? "pass" : "fail",
    failures,
    summary,
  };
}

/** Build summary details for the setup scope */
function setupSummary(ctx: AuditContext): Record<string, string> {
  const totalSkills = ctx.structure.skills.canonical.length;
  let installedSkills = 0;
  for (const af of ctx.agents) {
    installedSkills = af.skills.found.length;
    break;
  }
  const configValid = ctx.config.exists && ctx.config.valid;
  const configVersion = ctx.config.config.version;
  const instructionLines = ctx.agents[0]?.instruction.lineCount ?? 0;

  return {
    skills: `${installedSkills}/${totalSkills} installed`,
    config: configValid ? `valid, version ${configVersion}` : "invalid or missing",
    instructionFile: `${instructionLines} lines`,
  };
}

/** Build summary details for the project scope */
function projectSummary(ctx: AuditContext): Record<string, string> {
  const tc = ctx.config.config.toolchain;
  const parts: string[] = [];
  if (tc.test.length > 0) parts.push("test");
  if (tc.lint.length > 0) parts.push("lint");
  if (tc.build.length > 0) parts.push("build");
  return {
    toolchain: parts.length > 0 ? parts.join(" + ") + " configured" : "none configured",
  };
}

/** Build summary details for the integration scope */
function integrationSummary(ctx: AuditContext): Record<string, string> {
  const hookInfo: string[] = [];
  for (const af of ctx.agents) {
    if (af.hooks.denyExists || af.hooks.denyIsConfigBased) {
      hookInfo.push(`${af.agent.id}:deny installed`);
    }
  }
  return {
    hooks: hookInfo.length > 0 ? hookInfo.join(", ") : "none installed",
  };
}

/** Compute quality concerns from quality checks */
function computeConcerns(
  ctx: AuditContext,
): Record<AuditConcernKey, AuditConcern> {
  const concerns: Record<AuditConcernKey, AuditConcern> = {
    context: { score: 0, findings: [], recommendations: [] },
    constraints: { score: 0, findings: [], recommendations: [] },
    verification: { score: 0, findings: [], recommendations: [] },
    recovery: { score: 0, findings: [], recommendations: [] },
    feedback_loop: { score: 0, findings: [], recommendations: [] },
  };

  const weights: Record<AuditConcernKey, number> = {
    context: 0,
    constraints: 0,
    verification: 0,
    recovery: 0,
    feedback_loop: 0,
  };
  const weighted: Record<AuditConcernKey, number> = {
    context: 0,
    constraints: 0,
    verification: 0,
    recovery: 0,
    feedback_loop: 0,
  };

  for (const check of QUALITY_CHECKS) {
    const result = check.run(ctx);
    const concern = concerns[check.concern];
    concern.findings.push(...result.findings);
    concern.recommendations.push(...result.recommendations);
    weights[check.concern] += check.weight;
    weighted[check.concern] += result.score * check.weight;
  }

  for (const key of Object.keys(concerns) as AuditConcernKey[]) {
    concerns[key].score =
      weights[key] > 0 ? Math.round(weighted[key] / weights[key]) : 0;
  }

  return concerns;
}

/** Compute overall grade from quality score */
function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Run the audit against a project and return the full report. */
export function runAudit(
  fs: ReadonlyFS,
  projectPath: string,
  options: AuditOptions,
): AuditReport {
  const configState = loadConfig(projectPath, fs);
  const facts = extractProjectFacts(fs, {
    agentFilter: options.agentFilter,
    projectPath,
    configState,
  });
  const structure = parseProjectStructure(getProjectStructure());

  const ctx: AuditContext = {
    projectPath,
    facts,
    config: configState,
    fs,
    structure,
    agents: facts.agents,
    agentFilter: options.agentFilter,
  };

  // Run build checks grouped by scope
  const scopeFailures: Record<AuditScopeName, AuditFailure[]> = {
    setup: [],
    project: [],
    integration: [],
  };
  for (const check of BUILD_CHECKS) {
    const failure = check.run(ctx);
    if (failure) {
      scopeFailures[check.scope].push(failure);
    }
  }

  const scopes = {
    setup: buildScope(scopeFailures.setup, setupSummary(ctx)),
    project: buildScope(scopeFailures.project, projectSummary(ctx)),
    integration: buildScope(scopeFailures.integration, integrationSummary(ctx)),
  };

  const buildPassed =
    scopes.setup.status === "pass" &&
    scopes.project.status === "pass" &&
    scopes.integration.status === "pass";

  // Run quality checks only when requested
  let concerns: Record<AuditConcernKey, AuditConcern> | null = null;
  let grade: string | null = null;
  let qualityScore: number | null = null;

  if (options.quality) {
    concerns = computeConcerns(ctx);
    const scores = Object.values(concerns).map((c) => c.score);
    qualityScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    grade = scoreToGrade(qualityScore);
  }

  return {
    command: "audit",
    quality: options.quality,
    status: buildPassed ? "pass" : "fail",
    target: projectPath,
    scopes,
    concerns,
    overall: {
      status: buildPassed ? "pass" : "fail",
      grade,
      qualityScore,
    },
  };
}
