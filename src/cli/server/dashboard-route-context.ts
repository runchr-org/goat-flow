import { recordEvidenceEvent } from "../evidence/envelope.js";
import {
  LocalPathValidationError,
  resolveLocalStatePath,
  validateLocalPath,
} from "./local-paths.js";
import type {
  DashboardRouteContext,
  DashboardRouteDependencies,
} from "./dashboard-route-types.js";

export function createDashboardRouteContext(
  deps: DashboardRouteDependencies,
): DashboardRouteContext {
  const dashboardStateFile = resolveLocalStatePath(
    deps.absDefault,
    "dashboard-state.json",
  );
  const legacyProjectsListFile = resolveLocalStatePath(
    deps.absDefault,
    "dashboard-projects.json",
  );

  return {
    ...deps,
    dashboardStateFile,
    legacyProjectsListFile,
    qualityAuditCache: new Map(),
    recordDashboardEvent(projectPath, eventKind, payload): void {
      recordEvidenceEvent({
        producer: "dashboard-session-trace",
        actor: "server",
        eventKind,
        projectPath,
        payload,
      });
    },
    validatedPath(raw, purpose): string {
      return validateLocalPath(raw || deps.absDefault, purpose).path;
    },
    responseStatusForError(err, fallback): number {
      return err instanceof LocalPathValidationError ? 400 : fallback;
    },
  };
}
