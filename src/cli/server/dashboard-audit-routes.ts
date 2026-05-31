import type { ServerResponse } from "node:http";
import { isPackagedInstall } from "../paths.js";
import { runAudit, runAuditBatch } from "../audit/audit.js";
import type { AuditReport } from "../audit/types.js";
import { loadConfig } from "../config/reader.js";
import { recordEvidenceEvent } from "../evidence/envelope.js";
import { redactEvidenceText } from "../evidence/redaction.js";
import { createFS } from "../facts/fs.js";
import { extractProjectFacts } from "../facts/orchestrator.js";
import type { AgentId } from "../types.js";
import {
  KNOWN_AGENT_IDS,
  KNOWN_AGENT_LIST,
  VALID_AGENTS,
  type DashboardAuditProfiler,
  type DashboardRouteContext,
} from "./dashboard-route-types.js";
import {
  appendAuditProfile,
  buildAuditCacheSignature,
  buildDashboardReport,
  createDashboardAuditProfiler,
  enrichDashboardReport,
  readAuditCache,
  shouldProfileAuditRequest,
  writeAuditCache,
} from "./dashboard-reporting.js";
import { buildSetupDetectPayload } from "./setup-detect.js";
import type { DashboardReport } from "./types.js";

function isCacheEligible(
  agentFilter: AgentId | null,
  harness: boolean,
): boolean {
  return !agentFilter && harness && isPackagedInstall();
}

/** Resolve the managed agent list for dashboard aggregate audits. */
function resolveDashboardManagedAgentIds(
  agentFilter: AgentId | null,
): AgentId[] {
  return agentFilter === null ? [...KNOWN_AGENT_IDS] : [agentFilter];
}

function buildDashboardAuditReport(
  projectPath: string,
  agentFilter: AgentId | null,
  harness: boolean,
  profiler: DashboardAuditProfiler,
): DashboardReport {
  const fs = createFS(projectPath);
  const configAgents = profiler.span("managed-agent resolution", () =>
    resolveDashboardManagedAgentIds(agentFilter),
  );
  const auditFactProfile = agentFilter === null ? "dashboard-summary" : "full";
  const batch = profiler.span("runAuditBatch", () =>
    runAuditBatch(
      fs,
      projectPath,
      {
        agentFilter,
        harness,
        // Summary cards only need to know whether the deny mechanism is
        // installed. Explicit per-agent audits and quality flows still run the
        // slower runtime self-test.
        denyMechanismEvidenceLevel:
          agentFilter === null ? "present-only" : "full",
        factProfile: auditFactProfile,
        profile: profiler,
      },
      configAgents,
    ),
  );
  return profiler.span("dashboard report build", () =>
    buildDashboardReport(
      batch.aggregate,
      batch.perAgent,
      projectPath,
      profiler,
    ),
  );
}

function readCachedDashboardAudit(
  ctx: DashboardRouteContext,
  projectPath: string,
  fresh: boolean,
  signature: string | null,
  profiler: DashboardAuditProfiler,
) {
  if (fresh || signature === null) return null;
  return profiler.span("cache read", () =>
    readAuditCache(projectPath, ctx.packageVersion, signature),
  );
}

/** Parse optional agent filters without rejecting dashboard-wide requests. */
function parseAgentFilter(param: string | null): AgentId | null {
  return param && VALID_AGENTS.has(param) ? (param as AgentId) : null;
}

function recordSetupPrompt(
  projectPath: string,
  agent: AgentId,
  renderedOutput: string,
): void {
  recordEvidenceEvent({
    producer: "dashboard-session-trace",
    actor: "server",
    eventKind: "setup.prompt",
    projectPath,
    payload: {
      agent,
      output: redactEvidenceText("setup prompt", renderedOutput),
    },
  });
}

export function createAuditRouteHandlers(ctx: DashboardRouteContext): {
  handleAuditRequest: (url: URL, res: ServerResponse) => boolean;
  handleSetupDetectRequest: (url: URL, res: ServerResponse) => boolean;
  handleSetupRequest: (url: URL, res: ServerResponse) => Promise<boolean>;
} {
  const { jsonResponse } = ctx;

  /**
   * Run both evaluation systems and return the shared DashboardReport consumed
   * by Home, Setup, and Quality. Aggregate dashboard requests intentionally use
   * dashboard-summary facts: stack-derived setup details come from
   * `/api/setup/detect`, while this route must preserve report/scopes/agentScores
   * without paying setup-time stack detection on every fresh Home load.
   *
   * Reports validation, audit, and cache failures as JSON instead of throwing.
   */
  function handleAuditRequest(url: URL, res: ServerResponse): boolean {
    if (url.pathname !== "/api/audit") return false;

    const harness = url.searchParams.get("quality") === "true";
    const agentFilter = parseAgentFilter(url.searchParams.get("agent"));
    const fresh = url.searchParams.get("fresh") === "true";
    const profiler = createDashboardAuditProfiler(
      shouldProfileAuditRequest(url, ctx.devMode),
    );

    try {
      const projectPath = ctx.validatedPath(
        url.searchParams.get("path"),
        "project-read",
      );
      const auditCacheSignature = isCacheEligible(agentFilter, harness)
        ? profiler.span("cache signature", () =>
            buildAuditCacheSignature(projectPath, ctx.packageVersion),
          )
        : null;

      const cached = readCachedDashboardAudit(
        ctx,
        projectPath,
        fresh,
        auditCacheSignature,
        profiler,
      );
      if (cached) {
        const report = profiler.span("learning-loop enrichment", () =>
          enrichDashboardReport(cached.report, projectPath),
        );
        ctx.recordDashboardEvent(projectPath, "audit.run", {
          cached: true,
          harness,
          agent: agentFilter ?? "all",
          status: report.status,
        });
        jsonResponse(
          res,
          200,
          appendAuditProfile(
            {
              ...report,
              cached: true,
              cachedAt: cached.cachedAt,
            },
            profiler,
          ),
        );
        return true;
      }

      const report = buildDashboardAuditReport(
        projectPath,
        agentFilter,
        harness,
        profiler,
      );

      if (auditCacheSignature !== null) {
        profiler.span("cache write", () => {
          writeAuditCache(
            projectPath,
            ctx.packageVersion,
            auditCacheSignature,
            report,
          );
        });
      }

      ctx.recordDashboardEvent(projectPath, "audit.run", {
        cached: false,
        harness,
        agent: agentFilter ?? "all",
        status: report.status,
      });
      jsonResponse(
        res,
        200,
        appendAuditProfile(
          { ...report, cached: false, cachedAt: null },
          profiler,
        ),
      );
    } catch (err) {
      jsonResponse(
        res,
        ctx.responseStatusForError(err, 500),
        appendAuditProfile(
          {
            error: err instanceof Error ? err.message : String(err),
          },
          profiler,
        ),
      );
    }
    return true;
  }

  /** Detect setup inputs for the setup view and reports validation failures as JSON. */
  function handleSetupDetectRequest(url: URL, res: ServerResponse): boolean {
    if (url.pathname !== "/api/setup/detect") return false;

    try {
      const projectPath = ctx.validatedPath(
        url.searchParams.get("path"),
        "project-read",
      );
      jsonResponse(res, 200, buildSetupDetectPayload(projectPath));
    } catch (err) {
      jsonResponse(res, ctx.responseStatusForError(err, 500), {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return true;
  }

  /** Compose setup output for one agent and return it to the dashboard. */
  async function handleSetupRequest(
    url: URL,
    res: ServerResponse,
  ): Promise<boolean> {
    if (url.pathname !== "/api/setup") return false;

    const agentParam = url.searchParams.get("agent");
    if (!agentParam) {
      jsonResponse(res, 400, {
        error: `Missing required parameter: agent. Valid: ${KNOWN_AGENT_LIST}`,
      });
      return true;
    }
    if (!VALID_AGENTS.has(agentParam)) {
      jsonResponse(res, 400, {
        error: `Invalid agent: ${agentParam}. Valid: ${KNOWN_AGENT_LIST}`,
      });
      return true;
    }

    const agent = agentParam as AgentId;
    try {
      const projectPath = ctx.validatedPath(
        url.searchParams.get("path"),
        "project-read",
      );
      const fs = createFS(projectPath);
      const configState = loadConfig(projectPath, fs);
      const facts = extractProjectFacts(fs, {
        agentFilter: agent,
        projectPath,
        configState,
        includeStack: false,
      });
      const auditReport: AuditReport = runAudit(fs, projectPath, {
        agentFilter: agent,
        harness: true,
        factProfile: "dashboard-summary",
        denyMechanismEvidenceLevel: "static",
      });
      const { composeSetup } = await import("../prompt/compose-setup.js");
      const output = composeSetup(auditReport, facts, agent, {
        denyMechanismEvidenceLevel: "static",
      });
      const renderedOutput = output ?? "No setup output generated.";
      recordSetupPrompt(projectPath, agent, renderedOutput);
      jsonResponse(res, 200, {
        output: renderedOutput,
      });
    } catch (err) {
      jsonResponse(res, ctx.responseStatusForError(err, 500), {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return true;
  }

  return {
    handleAuditRequest,
    handleSetupDetectRequest,
    handleSetupRequest,
  };
}
