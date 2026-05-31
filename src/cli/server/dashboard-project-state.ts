/**
 * Persistent identity and on-disk state model for the dashboard's recent-projects list.
 *
 * Resolves a stable identity for each checkout (git remote hash, then a gitignored `.goat-flow`
 * marker, then the absolute path) so the same project is recognised after it moves on disk, and
 * hydrates/normalises the JSON state file into a deduplicated, deterministically ordered shape.
 * Reads and writes the local marker file and shells out to `git config` with a short timeout; all
 * filesystem and git failures are swallowed into path-based fallbacks so a read-only or non-git
 * project still loads. Consumed by dashboard-project-routes.ts.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveLocalStatePath } from "./local-paths.js";

type ProjectIdentitySource = "git-remote" | "goat-marker" | "path";

/**
 * Stable project identity used to recognise the same checkout after it moves.
 */
export interface DashboardProjectIdentity {
  identity: string;
  identitySource: ProjectIdentitySource;
  currentPath: string;
  remoteUrlHash?: string;
  markerId?: string;
}

/**
 * Persistent dashboard project entry, including every known local path for the identity.
 */
interface DashboardProjectRecord extends DashboardProjectIdentity {
  paths: string[];
  title?: string;
}

/**
 * On-disk dashboard state schema, including legacy path lists and identity records.
 */
export interface DashboardStateData {
  paths: string[];
  favorites: string[];
  projectTitles: Record<string, string>;
  projects: Record<string, DashboardProjectRecord>;
}

/** Hash cache and identity inputs without storing raw remote URLs in keys. */
function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const PROJECT_MARKER_COMMENT =
  "# Local goat-flow dashboard project identity. Gitignored by default.";

/** Accept only persisted identity-source values understood by this dashboard build. */
function identitySourceFrom(value: unknown): ProjectIdentitySource | null {
  return value === "git-remote" || value === "goat-marker" || value === "path"
    ? value
    : null;
}

/** Preserve first-seen path order while removing duplicate project paths. */
function dedupeStrings(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (value && !result.includes(value)) result.push(value);
  }
  return result;
}

/** Resolve a project path to its realpath, with fallback when realpath lookup fails. */
function normalizeProjectPath(projectPath: string): string {
  const resolved = resolve(projectPath);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/** Probe optional project directories; swallows permission and removal races. */
function directoryExists(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Canonicalise a git remote host/path pair into the identity hash input. */
function cleanRemotePath(host: string | undefined, path: string | undefined) {
  const remotePath = path?.replace(/^\/+/u, "");
  if (!host || !remotePath) return null;
  return `${host.toLowerCase()}/${remotePath}`
    .replace(/\.git$/u, "")
    .replace(/\/+$/u, "");
}

/** Normalise `git@host:owner/repo` remotes before URL parsing gets a chance. */
function normalizeScpLikeRemote(trimmed: string): string | null {
  const scpLike = trimmed.match(/^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/u);
  if (!scpLike || trimmed.includes("://")) return null;
  return cleanRemotePath(scpLike[1], scpLike[2]);
}

/** Normalise URL-style git remotes; swallows invalid URL inputs as `null`. */
function normalizeUrlRemote(trimmed: string): string | null {
  try {
    const parsed = new URL(trimmed);
    return cleanRemotePath(parsed.hostname, parsed.pathname);
  } catch {
    return null;
  }
}

/** Build the stable remote identity string used before hashing project records. */
function normalizeGitRemoteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (
    normalizeScpLikeRemote(trimmed) ??
    normalizeUrlRemote(trimmed) ??
    trimmed.replace(/\.git$/u, "").replace(/\/+$/u, "")
  );
}

/** Spawns `git config` with a short timeout; swallows failures into marker/path fallback. */
function readGitRemote(projectPath: string): string | null {
  try {
    const output = execFileSync(
      "git",
      ["-C", projectPath, "config", "--get", "remote.origin.url"],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1000,
      },
    );
    return typeof output === "string" ? output.trim() : String(output).trim();
  } catch {
    return null;
  }
}

/** Read the first non-comment project marker line; swallows missing marker files. */
function readProjectMarkerIdentifier(markerPath: string): string | null {
  try {
    const raw = readFileSync(markerPath, "utf-8");
    for (const line of raw.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      return trimmed;
    }
  } catch {
    /* missing or unreadable marker */
  }
  return null;
}

/** Writes a gitignored project marker; swallows read-only projects as `null`. */
function writeProjectMarkerIdentifier(markerPath: string): string | null {
  try {
    const markerIdentifier = `gf_${randomUUID()}`;
    writeFileSync(
      markerPath,
      `${PROJECT_MARKER_COMMENT}\n${markerIdentifier}\n`,
      {
        encoding: "utf-8",
      },
    );
    return markerIdentifier;
  } catch {
    return null;
  }
}

function resolveGitRemoteIdentity(
  currentPath: string,
): DashboardProjectIdentity | null {
  const normalizedRemote = normalizeGitRemoteUrl(
    readGitRemote(currentPath) ?? "",
  );
  if (!normalizedRemote) return null;
  const remoteUrlHash = hashString(normalizedRemote);
  return {
    identity: `git-remote:${remoteUrlHash}`,
    identitySource: "git-remote",
    currentPath,
    remoteUrlHash,
  };
}

function resolveMarkerIdentity(
  currentPath: string,
  allowMarkerWrite: boolean,
): DashboardProjectIdentity | null {
  const goatFlowDir = join(currentPath, ".goat-flow");
  if (!directoryExists(goatFlowDir)) return null;
  let markerPath: string | null = null;
  try {
    markerPath = resolveLocalStatePath(currentPath, "project-id");
  } catch (err) {
    if (allowMarkerWrite) throw err;
  }
  const markerIdentifier =
    markerPath === null
      ? null
      : (readProjectMarkerIdentifier(markerPath) ??
        (allowMarkerWrite ? writeProjectMarkerIdentifier(markerPath) : null));
  if (!markerIdentifier) return null;
  return {
    identity: `goat-marker:${markerIdentifier}`,
    identitySource: "goat-marker",
    currentPath,
    markerId: markerIdentifier,
  };
}

export function resolveProjectIdentity(
  projectPath: string,
  options: { allowMarkerWrite?: boolean } = {},
): DashboardProjectIdentity {
  const currentPath = normalizeProjectPath(projectPath);
  return (
    resolveGitRemoteIdentity(currentPath) ??
    resolveMarkerIdentity(currentPath, options.allowMarkerWrite === true) ?? {
      identity: `path:${currentPath}`,
      identitySource: "path",
      currentPath,
    }
  );
}

/** Read one optional string array property from a parsed dashboard state file. */
function readOptionalStringArrayProperty(
  value: Record<string, unknown>,
  key: string,
): string[] | null {
  const raw = value[key];
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const items: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    items.push(item);
  }
  return items;
}

/** Read an optional `{ [path]: title }` map from parsed dashboard state.
 *  Invalid entries are dropped rather than failing the whole load so one bad
 *  title can't wipe the user's `paths` / `favorites`. */
function readOptionalStringMapProperty(
  value: Record<string, unknown>,
  key: string,
): Record<string, string> {
  const raw = value[key];
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) result[k] = v;
  }
  return result;
}

/** Normalise legacy project-record paths before merging them into identity records. */
function normalizeProjectRecordPaths(record: Record<string, unknown>) {
  return Array.isArray(record.paths)
    ? record.paths
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeProjectPath(entry))
    : [];
}

function readRecordString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function applyOptionalProjectRecordFields(
  normalized: DashboardProjectRecord,
  record: Record<string, unknown>,
): void {
  const remoteUrlHash = readRecordString(record, "remoteUrlHash");
  const markerId = readRecordString(record, "markerId");
  const title = readRecordString(record, "title")?.trim();
  if (remoteUrlHash) normalized.remoteUrlHash = remoteUrlHash;
  if (markerId) normalized.markerId = markerId;
  if (title) normalized.title = title.slice(0, 120);
}

function normalizeDashboardProjectRecord(
  identity: string,
  value: unknown,
): DashboardProjectRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const identityValue = readRecordString(record, "identity") ?? identity;
  const identitySource = identitySourceFrom(record.identitySource);
  const currentPath = readRecordString(record, "currentPath");
  if (!identityValue || !identitySource || !currentPath) return null;

  const normalized: DashboardProjectRecord = {
    identity: identityValue,
    identitySource,
    currentPath: normalizeProjectPath(currentPath),
    paths: dedupeStrings([
      normalizeProjectPath(currentPath),
      ...normalizeProjectRecordPaths(record),
    ]),
  };
  applyOptionalProjectRecordFields(normalized, record);
  return normalized;
}

function readOptionalProjectRecordsProperty(
  value: Record<string, unknown>,
): Record<string, DashboardProjectRecord> {
  const raw = value.projects;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const records: Record<string, DashboardProjectRecord> = {};
  for (const [identity, record] of Object.entries(raw)) {
    const normalized = normalizeDashboardProjectRecord(identity, record);
    if (normalized) records[normalized.identity] = normalized;
  }
  return records;
}

function addProjectRecord(
  records: Map<string, DashboardProjectRecord>,
  next: DashboardProjectRecord,
): void {
  const existing = records.get(next.identity);
  if (!existing) {
    records.set(next.identity, {
      ...next,
      paths: dedupeStrings(next.paths),
    });
    return;
  }
  records.set(next.identity, {
    ...existing,
    currentPath: next.currentPath,
    paths: dedupeStrings([...existing.paths, ...next.paths]),
    title: next.title ?? existing.title,
    remoteUrlHash: next.remoteUrlHash ?? existing.remoteUrlHash,
    markerId: next.markerId ?? existing.markerId,
  });
}

export function hydrateDashboardState(
  state: DashboardStateData,
  options: { allowMarkerWrite: boolean },
): DashboardStateData {
  const records = new Map<string, DashboardProjectRecord>();
  for (const record of Object.values(state.projects)) {
    addProjectRecord(records, record);
  }

  for (const path of state.paths) {
    const identity = resolveProjectIdentity(path, {
      allowMarkerWrite: options.allowMarkerWrite,
    });
    const title =
      state.projectTitles[identity.identity] ?? state.projectTitles[path];
    addProjectRecord(records, {
      ...identity,
      paths: [identity.currentPath],
      ...(title ? { title } : {}),
    });
  }

  const projectTitles: Record<string, string> = {};
  for (const record of records.values()) {
    const title =
      record.title ??
      state.projectTitles[record.identity] ??
      state.projectTitles[record.currentPath];
    if (title) {
      record.title = title;
      projectTitles[record.identity] = title;
    }
  }

  const projects = Object.fromEntries(
    [...records.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const paths = dedupeStrings(
    Object.values(projects).flatMap((record) => record.paths),
  );
  return {
    paths,
    favorites: dedupeStrings(state.favorites),
    projectTitles,
    projects,
  };
}

/** Normalize parsed dashboard state JSON into the server's expected shape. */
function normalizeDashboardState(value: unknown): DashboardStateData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const paths = readOptionalStringArrayProperty(record, "paths");
  if (paths === null) return null;
  const favorites = readOptionalStringArrayProperty(record, "favorites");
  if (favorites === null) return null;
  const projectTitles = readOptionalStringMapProperty(record, "projectTitles");
  return hydrateDashboardState(
    {
      paths,
      favorites,
      projectTitles,
      projects: readOptionalProjectRecordsProperty(record),
    },
    { allowMarkerWrite: false },
  );
}

/**
 * Read dashboard state from the new file first, then the legacy projects-only file.
 *
 * Swallows malformed or missing state files so the dashboard can recover to empty state.
 */
export async function loadDashboardState(
  dashboardStateFile: string,
  legacyProjectsListFile: string,
): Promise<DashboardStateData> {
  const { readFile } = await import("node:fs/promises");
  for (const filePath of [dashboardStateFile, legacyProjectsListFile]) {
    try {
      const parsed = normalizeDashboardState(
        JSON.parse(await readFile(filePath, "utf-8")),
      );
      if (parsed) return parsed;
    } catch {
      /* try next location */
    }
  }
  return { paths: [], favorites: [], projectTitles: {}, projects: {} };
}
