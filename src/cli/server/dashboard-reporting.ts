import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { AGENT_PROFILE_MAP } from "./dashboard-route-types.js";
import type {
  DashboardAuditProfileSpan,
  DashboardAuditProfiler,
} from "./dashboard-route-types.js";
import type { AuditReport } from "../audit/types.js";
import { loadConfig } from "../config/reader.js";
import { createFS } from "../facts/fs.js";
import { extractSharedFacts } from "../facts/shared/index.js";
import type { QualityHistoryEntry } from "../quality/history.js";
import { buildStatsReport, checkStats } from "../stats/stats.js";
import type { AgentId } from "../types.js";
import { resolveLocalStatePath } from "./local-paths.js";
import type { DashboardReport } from "./types.js";

/**
 * Home-card projection of the latest quality report, stripped to display totals.
 */
interface LatestQualitySummary {
  id: string;
  date: string;
  time: string;
  agent: AgentId;
  setupTotal: number;
  systemTotal: number;
  blockerCount: number;
  majorCount: number;
  minorCount: number;
  evidenceMethods: string[];
  scope: string | null;
}

/**
 * Compact learning-loop entry shown on the dashboard without loading full files.
 */
interface RecentLessonSummary {
  title: string;
  created: string | null;
  path: string;
  order: number;
}

/**
 * Enable expensive profiling only when the request opts in and the server is trusted.
 */
export function shouldProfileAuditRequest(url: URL, devMode: boolean): boolean {
  return (
    url.searchParams.get("profile") === "true" &&
    (devMode || process.env["GOAT_FLOW_AUDIT_PROFILE"] === "1")
  );
}

export function createDashboardAuditProfiler(
  enabled: boolean,
): DashboardAuditProfiler {
  const spans: DashboardAuditProfileSpan[] = [];
  return {
    enabled,
    spans,
    span<T>(name: string, fn: () => T): T {
      if (!enabled) return fn();
      const start = performance.now();
      try {
        return fn();
      } finally {
        spans.push({
          name,
          durationMs: Number((performance.now() - start).toFixed(3)),
        });
      }
    },
  };
}

export function appendAuditProfile<T extends object>(
  body: T,
  profiler: DashboardAuditProfiler,
): T & {
  _profile?: { summedSpanMs: number; spans: DashboardAuditProfileSpan[] };
} {
  if (!profiler.enabled) return body;
  const summedSpanMs = Number(
    profiler.spans
      .reduce((total, span) => total + span.durationMs, 0)
      .toFixed(3),
  );
  return {
    ...body,
    _profile: {
      summedSpanMs,
      spans: profiler.spans,
    },
  };
}

/** Build the latest quality summary. */
export function buildLatestQualitySummary(
  entry: QualityHistoryEntry | null,
): LatestQualitySummary | null {
  if (!entry) return null;
  const findings = entry.report.findings;
  return {
    id: entry.id,
    date: entry.date,
    time: entry.time,
    agent: entry.agent,
    setupTotal: entry.report.scores.setup.total,
    systemTotal: entry.report.scores.system.total,
    blockerCount: findings.filter((f) => f.severity === "BLOCKER").length,
    majorCount: findings.filter((f) => f.severity === "MAJOR").length,
    minorCount: findings.filter((f) => f.severity === "MINOR").length,
    evidenceMethods: Array.from(
      new Set(findings.map((f) => f.evidence_method)),
    ),
    scope: entry.report.scope ?? null,
  };
}

/** Return compact learning-loop health for Home without exposing the full stats report. */
function buildDashboardLearningLoopSummary(
  projectPath: string,
): DashboardReport["learningLoop"] {
  try {
    const fs = createFS(projectPath);
    const configState = loadConfig(projectPath, fs);
    const shared = extractSharedFacts(fs, configState);
    const stats = buildStatsReport({
      footguns: shared.footguns,
      lessons: shared.lessons,
    });
    const check = checkStats(stats);
    const staleCount = check.findings.filter(
      (finding) =>
        finding.rule === "stale-last-reviewed" || finding.rule === "stale-ref",
    ).length;
    const invalidLineRefCount = check.findings.filter(
      (finding) => finding.rule === "invalid-line-ref",
    ).length;
    const oversizedCount = check.findings.filter(
      (finding) => finding.rule === "bucket-size",
    ).length;
    const recordCount =
      stats.footguns.totalEntries + stats.lessons.totalEntries;

    const allBuckets = [...stats.footguns.buckets, ...stats.lessons.buckets];
    const reviewedDates = allBuckets
      .map((bucket) => bucket.lastReviewed)
      .filter((lastReviewed): lastReviewed is string => lastReviewed !== null)
      .sort();
    const oldestLastReviewed = reviewedDates[0] ?? null;

    const topBucketsNeedingAction = allBuckets
      .filter(
        (b) =>
          b.staleRefs.length > 0 ||
          b.invalidLineRefs.length > 0 ||
          b.sizeBytes > 40_000,
      )
      .sort(
        (a, b) =>
          b.staleRefs.length +
          b.invalidLineRefs.length -
          (a.staleRefs.length + a.invalidLineRefs.length),
      )
      .slice(0, 3)
      .map((b) => ({
        path: b.path,
        reason: [
          b.staleRefs.length > 0 ? `${b.staleRefs.length} stale refs` : "",
          b.invalidLineRefs.length > 0
            ? `${b.invalidLineRefs.length} invalid line refs`
            : "",
          b.sizeBytes > 40_000 ? `${Math.round(b.sizeBytes / 1024)}KB` : "",
        ]
          .filter(Boolean)
          .join(", "),
      }));

    const status =
      !shared.footguns.exists && !shared.lessons.exists
        ? "unavailable"
        : staleCount > 2 || invalidLineRefCount > 0 || oversizedCount > 0
          ? "needs-review"
          : "fresh";
    return {
      recordCount,
      footgunCount: stats.footguns.totalEntries,
      lessonCount: stats.lessons.totalEntries,
      staleCount,
      invalidLineRefCount,
      oversizedCount,
      oldestLastReviewed,
      topBucketsNeedingAction,
      status,
    };
  } catch {
    return null;
  }
}

/** List stable markdown lesson buckets; swallows absent lessons directories. */
function listLessonBuckets(lessonsDir: string): string[] {
  try {
    return readdirSync(lessonsDir)
      .filter(
        (filename) => filename.endsWith(".md") && filename !== "README.md",
      )
      .sort();
  } catch {
    return [];
  }
}

/** Return the created date inside one lesson section, if present. */
function parseLessonCreated(section: string): string | null {
  return section.match(/\*\*Created:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

/** Read lesson headings from one bucket file. */
function readLessonBucketEntries(
  lessonsDir: string,
  filename: string,
  startOrder: number,
): RecentLessonSummary[] {
  let content: string;
  try {
    content = readFileSync(join(lessonsDir, filename), "utf-8");
  } catch {
    return [];
  }

  return Array.from(content.matchAll(/^## Lesson:\s+(.+)$/gm)).flatMap(
    (heading, index, headings) => {
      const title = heading[1]?.trim();
      if (!title) return [];
      const start = heading.index;
      const nextHeading = headings[index + 1];
      const end =
        nextHeading === undefined ? content.length : nextHeading.index;
      const section = content.slice(start, end);
      return [
        {
          title,
          created: parseLessonCreated(section),
          path: `.goat-flow/lessons/${filename}`,
          order: startOrder + index,
        },
      ];
    },
  );
}

/** Sort latest lessons first, with file order as the fallback. */
function sortRecentLessons(
  lessons: RecentLessonSummary[],
): RecentLessonSummary[] {
  return lessons.sort((a, b) => {
    if (a.created !== b.created) {
      if (a.created === null) return 1;
      if (b.created === null) return -1;
      return b.created.localeCompare(a.created);
    }
    return b.order - a.order;
  });
}

/** Read recent lesson headings for the compact Home panel. */
function readRecentLessons(
  projectPath: string,
): DashboardReport["recentLessons"] {
  const lessonsDir = join(projectPath, ".goat-flow", "lessons");
  const filenames = listLessonBuckets(lessonsDir);

  const lessons: RecentLessonSummary[] = [];
  for (const filename of filenames) {
    lessons.push(
      ...readLessonBucketEntries(lessonsDir, filename, lessons.length),
    );
  }

  const total = lessons.length;
  return sortRecentLessons(lessons)
    .slice(0, 4)
    .map((lesson, index) => ({
      id: `L-${String(total - index).padStart(3, "0")}`,
      title: lesson.title,
      created: lesson.created,
      path: lesson.path,
    }));
}

const ENRICHMENT_TTL_MS = 60_000;
const DIRECTORY_SIGNATURE_FILE_LIMIT = 500;
const DIRECTORY_SIGNATURE_IGNORES = new Set([".git", "node_modules", "dist"]);
const enrichmentCache = new Map<
  string,
  {
    learningLoop: DashboardReport["learningLoop"];
    recentLessons: DashboardReport["recentLessons"];
    signature: string;
    cachedAt: number;
  }
>();

/** Hash cache and identity inputs without storing raw remote URLs in keys. */
function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Hash one cache input file; swallows disappearing files as a stable `missing` sentinel. */
function hashExistingFile(projectPath: string, relativePath: string): string {
  try {
    return hashString(readFileSync(join(projectPath, relativePath), "utf-8"));
  } catch {
    return "missing";
  }
}

function readSignatureStat(
  projectPath: string,
  relativePath: string,
): ReturnType<typeof statSync> | null {
  try {
    return statSync(join(projectPath, relativePath));
  } catch {
    return null;
  }
}

function appendDirectorySignatureEntry(
  projectPath: string,
  relativeDir: string,
  name: string,
  entries: string[],
): void {
  if (DIRECTORY_SIGNATURE_IGNORES.has(name)) return;

  const relativePath = join(relativeDir, name);
  const stat = readSignatureStat(projectPath, relativePath);
  if (!stat) {
    entries.push(`${relativePath}:missing`);
    return;
  }
  if (stat.isDirectory()) {
    readDirectorySignatureEntries(projectPath, relativePath, entries);
    return;
  }
  if (!stat.isFile()) return;
  entries.push(
    `${relativePath}:${stat.size}:${stat.mtimeMs}:${hashExistingFile(
      projectPath,
      relativePath,
    )}`,
  );
}

function readDirectorySignatureEntries(
  projectPath: string,
  relativeDir: string,
  entries: string[],
): void {
  if (entries.length >= DIRECTORY_SIGNATURE_FILE_LIMIT) return;
  let names: string[];
  try {
    names = readdirSync(join(projectPath, relativeDir)).sort();
  } catch {
    entries.push(`${relativeDir}:missing`);
    return;
  }

  for (const name of names) {
    if (entries.length >= DIRECTORY_SIGNATURE_FILE_LIMIT) {
      entries.push(`${relativeDir}:truncated`);
      return;
    }
    appendDirectorySignatureEntry(projectPath, relativeDir, name, entries);
  }
}

/** Hash a bounded, deterministic directory snapshot for cache invalidation. */
function directorySignature(projectPath: string, relativeDir: string): string {
  const entries: string[] = [];
  readDirectorySignatureEntries(projectPath, relativeDir, entries);
  return hashString(entries.join("\n"));
}

/** Build the Home enrichment cache key from learning-loop content directories. */
function buildLearningLoopCacheSignature(projectPath: string): string {
  return hashString(
    [
      directorySignature(projectPath, ".goat-flow/footguns"),
      directorySignature(projectPath, ".goat-flow/lessons"),
    ].join("\n"),
  );
}

export function buildAuditCacheSignature(
  projectPath: string,
  packageVersion: string,
): string {
  const contentFiles = [
    ".goat-flow/config.yaml",
    ".goat-flow/architecture.md",
    ".goat-flow/code-map.md",
    ".goat-flow/glossary.md",
    "CLAUDE.md",
    "AGENTS.md",
    ".github/copilot-instructions.md",
    ".claude/settings.json",
    ".codex/config.toml",
    ".codex/hooks.json",
    ".agents/hooks.json",
    ".github/hooks/hooks.json",
    ".claude/hooks/deny-dangerous.sh",
    ".codex/hooks/deny-dangerous.sh",
    ".agents/hooks/deny-dangerous.sh",
    ".github/hooks/deny-dangerous.sh",
    ".goat-flow/hook-lib/patterns-shell.sh",
    ".goat-flow/hook-lib/patterns-paths.sh",
    ".goat-flow/hook-lib/patterns-writes.sh",
    ".goat-flow/hook-lib/deny-dangerous-self-test.sh",
  ];
  const directoryInputs = [
    ".claude/skills",
    ".agents/skills",
    ".github/skills",
    ".goat-flow/decisions",
    ".goat-flow/footguns",
    ".goat-flow/lessons",
    ".goat-flow/patterns",
    ".goat-flow/skill-reference",
    ".goat-flow/hook-lib",
  ];
  return hashString(
    [
      `package:${packageVersion}`,
      ...contentFiles.map(
        (relativePath) =>
          `${relativePath}:${hashExistingFile(projectPath, relativePath)}`,
      ),
      ...directoryInputs.map(
        (relativeDir) =>
          `${relativeDir}:${directorySignature(projectPath, relativeDir)}`,
      ),
    ].join("\n"),
  );
}

/** Enrich a dashboard report with compact Home-only learning-loop context. */
export function enrichDashboardReport(
  report: DashboardReport,
  projectPath: string,
  fresh = false,
): DashboardReport {
  const now = Date.now();
  const signature = buildLearningLoopCacheSignature(projectPath);
  const cached = enrichmentCache.get(projectPath);
  if (
    !fresh &&
    cached &&
    cached.signature === signature &&
    now - cached.cachedAt < ENRICHMENT_TTL_MS
  ) {
    return {
      ...report,
      learningLoop: cached.learningLoop,
      recentLessons: cached.recentLessons,
    };
  }
  const learningLoop = buildDashboardLearningLoopSummary(projectPath);
  const recentLessons = readRecentLessons(projectPath);
  enrichmentCache.set(projectPath, {
    learningLoop,
    recentLessons,
    signature,
    cachedAt: now,
  });
  return { ...report, learningLoop, recentLessons };
}

/** Build the dashboard API payload from aggregate and per-agent audit results. */
export function buildDashboardReport(
  auditRpt: AuditReport,
  perAgentAudits: { id: string; audit: AuditReport }[],
  projectPath: string,
  profiler?: DashboardAuditProfiler,
): DashboardReport {
  const report: DashboardReport = {
    agentScores: perAgentAudits.map((pa) => {
      const agentId = pa.id as AgentId;
      return {
        id: pa.id,
        name: AGENT_PROFILE_MAP[agentId].name,
        agent: pa.audit.scopes.agent,
        harness: pa.audit.scopes.harness,
        concerns: pa.audit.concerns,
        enforcement:
          pa.audit.enforcement.find((entry) => entry.agent === pa.id) ?? null,
      };
    }),
    status: auditRpt.status,
    scopes: {
      setup: auditRpt.scopes.setup,
      agent: auditRpt.scopes.agent,
      ...(auditRpt.scopes.harness ? { harness: auditRpt.scopes.harness } : {}),
    },
    overall: auditRpt.overall,
    learningLoop: null,
    recentLessons: [],
    target: auditRpt.target,
  };
  return profiler
    ? profiler.span("learning-loop enrichment", () =>
        enrichDashboardReport(report, projectPath, true),
      )
    : enrichDashboardReport(report, projectPath, true);
}

const AUDIT_CACHE_FILE = "audit-cache.json";

/**
 * Persisted audit cache schema keyed by package version, config version, and content signature.
 */
interface AuditCacheEnvelope {
  packageVersion: string;
  configVersion: string;
  cachedAt: string;
  signature: string;
  report: DashboardReport;
}

/** Read the local config version; swallows absent configs as cache-miss input. */
function readConfigVersion(projectPath: string): string | null {
  try {
    const raw = readFileSync(
      resolveLocalStatePath(projectPath, "config.yaml"),
      "utf-8",
    );
    const match = raw.match(/^version:\s*["']?([^\s"']+)["']?\s*$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Validate persisted cache JSON before trusting it as a dashboard report. */
function isAuditCacheEnvelope(value: unknown): value is AuditCacheEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const envelope = value as Record<string, unknown>;
  return (
    typeof envelope.packageVersion === "string" &&
    typeof envelope.configVersion === "string" &&
    typeof envelope.cachedAt === "string" &&
    typeof envelope.signature === "string" &&
    typeof envelope.report === "object" &&
    envelope.report !== null
  );
}

/** Parse cached audit JSON; swallows malformed envelopes as a cache miss. */
function parseAuditCacheEnvelope(raw: string): AuditCacheEnvelope | null {
  try {
    const parsed = JSON.parse(raw);
    return isAuditCacheEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function auditCacheMatches(
  envelope: AuditCacheEnvelope,
  projectPath: string,
  packageVersion: string,
  signature: string,
): boolean {
  const configVersion = readConfigVersion(projectPath);
  return (
    envelope.packageVersion === packageVersion &&
    envelope.signature === signature &&
    configVersion !== null &&
    envelope.configVersion === configVersion
  );
}

export function readAuditCache(
  projectPath: string,
  packageVersion: string,
  signature: string,
): { report: DashboardReport; cachedAt: string } | null {
  try {
    const raw = readFileSync(
      resolveLocalStatePath(projectPath, AUDIT_CACHE_FILE),
      "utf-8",
    );
    const envelope = parseAuditCacheEnvelope(raw);
    if (!envelope) return null;
    if (!auditCacheMatches(envelope, projectPath, packageVersion, signature)) {
      return null;
    }
    return {
      report: envelope.report,
      cachedAt: envelope.cachedAt,
    };
  } catch {
    return null;
  }
}

export function writeAuditCache(
  projectPath: string,
  packageVersion: string,
  signature: string,
  report: DashboardReport,
): void {
  try {
    const configVersion = readConfigVersion(projectPath);
    if (!configVersion) return;
    const envelope = {
      packageVersion,
      configVersion,
      signature,
      cachedAt: new Date().toISOString(),
      report,
    };
    writeFileSync(
      resolveLocalStatePath(projectPath, AUDIT_CACHE_FILE),
      JSON.stringify(envelope),
    );
  } catch {
    // Cache write failure is non-fatal
  }
}

export function buildQualityAuditCacheKey(
  projectPath: string,
  agent: AgentId,
): string {
  return `${projectPath}\n${agent}`;
}
