import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getAgentProfileMap,
  getAgentProfiles,
  getKnownAgentIds,
} from "../agents/registry.js";
import type { AuditReport } from "../audit/types.js";
import { MAX_EVALUATE_CONTENT_BYTES } from "./decoders.js";
import type {
  EvidenceEventKind,
  EvidencePayload,
} from "../evidence/envelope.js";
import { QUALITY_MODES, type QualityMode } from "../quality/schema.js";
import type { AgentId } from "../types.js";
import type { LocalPathPurpose } from "./local-paths.js";

export const KNOWN_AGENT_IDS = getKnownAgentIds();
export const KNOWN_AGENT_LIST = KNOWN_AGENT_IDS.join(", ");
export const AGENT_PROFILE_MAP = getAgentProfileMap();
const AGENT_PROFILES = getAgentProfiles();
export const SUPPORTED_AGENTS = AGENT_PROFILES.map(
  ({
    id,
    name,
    terminalBinary,
    setupSurfaces,
    promptInvocationStyle,
    skillSource,
    supportsPostTurnHook,
  }) => ({
    id,
    name,
    terminalBinary,
    setupSurfaces,
    promptInvocationStyle,
    skillSource,
    supportsPostTurnHook,
  }),
);
export const VALID_AGENTS = new Set<string>(KNOWN_AGENT_IDS);
export const VALID_QUALITY_MODES = new Set<string>(QUALITY_MODES);
export const QUALITY_EVALUATE_MAX_BODY_BYTES =
  MAX_EVALUATE_CONTENT_BYTES + 64 * 1024;

export type QualityAuditCacheStatus = "hit" | "miss" | "bypass";

/**
 * Preset JSON shape served to the dashboard; keep fields aligned with the
 * bundled `preset-prompts.json` asset rather than deriving labels at runtime.
 */
interface DashboardPresetData {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  cat: string;
}

/**
 * Normalised `/api/quality` query parameters after mode and agent validation.
 */
export interface QualityRequestParams {
  agent: AgentId;
  qualityMode: QualityMode;
  fresh: boolean;
  fast: boolean;
}

type JsonResponder = (
  res: ServerResponse,
  status: number,
  body: unknown,
) => void;

/**
 * Request-body read limits for upload and mutation routes.
 */
interface BodyReadOptions {
  maxBytes?: number;
  tooLargeMessage?: string;
}

type BodyReader = (
  req: IncomingMessage,
  options?: BodyReadOptions,
) => Promise<string>;

/**
 * Per-step server timing exposed only for explicit audit profiling requests.
 */
export interface DashboardAuditProfileSpan {
  name: string;
  durationMs: number;
}

/**
 * Per-request profiler so dashboard audit timings cannot leak between responses.
 */
export interface DashboardAuditProfiler {
  enabled: boolean;
  spans: DashboardAuditProfileSpan[];
  span<T>(name: string, fn: () => T): T;
}

/**
 * Dependency bag for non-terminal dashboard routes across dev and packaged modes.
 */
export interface DashboardRouteDependencies {
  absDefault: string;
  devMode: boolean;
  getTemplate: () => string;
  packageVersion: string;
  dashboardToken: string;
  dashboardPresets: ReadonlyArray<DashboardPresetData>;
  jsonResponse: JsonResponder;
  readBody: BodyReader;
}

export interface DashboardRouteContext extends DashboardRouteDependencies {
  dashboardStateFile: string;
  legacyProjectsListFile: string;
  qualityAuditCache: Map<string, { report: AuditReport; cachedAt: number }>;
  recordDashboardEvent: (
    projectPath: string,
    eventKind: EvidenceEventKind,
    payload?: EvidencePayload,
  ) => void;
  validatedPath: (raw: string | null, purpose: LocalPathPurpose) => string;
  responseStatusForError: (err: unknown, fallback: number) => number;
}

/**
 * Normalise agent `--version` output to the first printable line.
 *
 * @param raw - Raw stdout captured from the agent binary.
 * @returns A trimmed version line, or `null` when the command produced no text.
 */
export function normalizeAgentVersionOutput(raw: string): string | null {
  const firstLine = raw.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return null;
  return firstLine.replace(/(\d)[.,;:]+$/u, "$1");
}
