import type { BucketFreshness, ReadonlyFS } from "../../types.js";

/** Strict YYYY-MM-DD format - rejects full ISO 8601 timestamps in `last_reviewed`. */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Matches file path evidence in multiple formats:
 * - `src/auth.ts` (backtick-wrapped file path)
 * - `src/auth.ts:42` (backtick-wrapped with line number)
 * - `src/auth.ts:42-50` (backtick-wrapped with line range)
 * - (lines 866-880) or (line 52) (prose-style)
 * Line numbers are discouraged per ADR-024; flagged for cleanup when found alongside a semantic anchor.
 * File paths alone remain valid evidence.
 */
export const EVIDENCE_PATTERN =
  /`[^`]+\.[a-zA-Z]{1,10}(?::[0-9]+(?:[-,][0-9]+)*)?`|\(lines?\s+[0-9]+/;

/** Regex to extract file paths from backtick-wrapped references (with optional line numbers). */
export const FILE_REF_REGEX =
  /`([^`]+\.[a-zA-Z]{1,10})(?::[0-9]+(?:[-,][0-9]+)*)?`/g;

/** Matches `` `<file>` (search: `<needle>`) `` - the footgun evidence form that
 *  cites a literal string to grep for inside the referenced file. */
const SEARCH_ANCHOR_REGEX =
  /`([^`]+\.[a-zA-Z0-9]{1,10})`\s*\(search:\s*`([^`]+)`\)/g;

/** One markdown file read from a learning-loop directory. */
export interface MarkdownEntry {
  path: string;
  content: string;
}

/** A learning-loop directory with its existence flag and contained markdown entries. */
export interface EntryDir {
  path: string;
  exists: boolean;
  files: MarkdownEntry[];
}

/** Aggregated file-reference validation results for footgun entries. */
export interface FootgunRefSummary {
  staleRefs: string[];
  invalidLineRefs: string[];
  totalRefs: number;
  validRefs: number;
}

/** Check if a backtick-wrapped file:line reference is a real file path (not a URL/hostname) */
export function isFileRef(filePath: string): boolean {
  // Skip hostname/URL patterns (not file references)
  if (
    /^https?:|:\/\//.test(filePath) ||
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(filePath)
  )
    return false;
  // Paths with '/' are clearly file paths
  if (filePath.includes("/")) return true;
  // Root-level files with extensions (e.g., AGENTS.md:42) are valid refs
  // Bare names without extensions (e.g., webpack:123) are ambiguous - skip
  return /\.[a-zA-Z0-9]+$/.test(filePath);
}

/** Check whether a file reference can be validated for staleness without guessing. */
/** Paths under these dirs are intentionally gitignored per `.goat-flow/tasks/.gitignore`
 *  (milestone files + plan subdirs + `.active` marker are local-session state by
 *  design). References to them in lessons/footguns are navigation pointers,
 *  not resolvable artifacts - treating absence as "stale" false-positives on
 *  any clean checkout or CI run. Keep this list short and specific. */
function isIntentionallyGitignored(filePath: string): boolean {
  return (
    filePath.startsWith(".goat-flow/tasks/") ||
    filePath.startsWith(".goat-flow/scratchpad/") ||
    filePath.startsWith(".goat-flow/logs/")
  );
}

/** Check whether the file path is checkable for staleness. */
function isCheckableForStaleness(filePath: string, fs: ReadonlyFS): boolean {
  if (isIntentionallyGitignored(filePath)) return false;
  if (filePath.includes("/")) return true;
  // If it exists at root, it's checkable regardless of extension
  if (fs.exists(filePath)) return true;
  // Bare source filenames that don't exist at root are likely shorthand
  // for deeply nested files - skip to avoid false positives
  if (
    /\.(go|ts|tsx|js|jsx|py|php|rs|java|kt|rb|cs|c|cpp|h|hpp|swift|scala)$/i.test(
      filePath,
    )
  )
    return false;
  // Non-source files (AGENTS.md, package.json, etc.) should be at root
  return true;
}

/** Normalize a surface path so trailing slashes do not affect comparisons. */
function normalizeSurfacePath(path: string): string {
  return path.replace(/\/$/, "");
}

/** Detect competing artifact surfaces outside the configured canonical path. */
export function findCompetingArtifactSurfaces(
  fs: ReadonlyFS,
  canonicalPaths: string[],
  knownPaths: string[],
): string[] {
  if (!canonicalPaths.some((path) => fs.exists(path))) return [];

  const canonicalSet = new Set(canonicalPaths.map(normalizeSurfacePath));
  return knownPaths
    .filter((path) => !canonicalSet.has(normalizeSurfacePath(path)))
    .filter((path) => fs.exists(path))
    .sort((a, b) => a.localeCompare(b));
}

/** List markdown files in deterministic order, preserving flat-file config as a stable single-entry contract. */
export function listMarkdownEntries(fs: ReadonlyFS, dir: string): EntryDir {
  // Flat-file mode: config points at a single .md file instead of a directory
  if (dir.endsWith(".md")) {
    const exists = fs.exists(dir);
    const content = exists ? fs.readFile(dir) : null;
    const files = content !== null ? [{ path: dir, content }] : [];
    return { path: dir, exists, files };
  }

  const exists = fs.exists(dir);
  const files = exists
    ? fs
        .listDir(dir)
        .filter((file) => file.endsWith(".md") && file !== "README.md")
        .sort((a, b) => a.localeCompare(b))
        .flatMap((file) => {
          const path = dir.endsWith("/") ? `${dir}${file}` : `${dir}/${file}`;
          const content = fs.readFile(path);
          if (content === null) return [];
          return [{ path, content }];
        })
    : [];
  return { path: dir, exists, files };
}

/** Split markdown content into optional YAML frontmatter and remaining body. */
export function parseMarkdownFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  return { frontmatter: match[1] ?? "", body: match[2] ?? "" };
}

/**
 * Parse simple `key: value` pairs from a YAML frontmatter block.
 * Only handles flat scalar fields (sufficient for goat-flow's single-level frontmatter);
 * nested structures, arrays, and multi-line scalars are intentionally unsupported.
 *
 * @param frontmatter - YAML frontmatter body without the surrounding `---` markers
 * @returns flat key/value fields parsed from the frontmatter block
 */
export function parseFrontmatterFields(
  frontmatter: string,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*?)\s*$/);
    if (!match || match[1] === undefined) continue;
    fields[match[1]] = match[2] ?? "";
  }
  return fields;
}

/**
 * Compute days-since-review and a coarse freshness band for a bucket file.
 * Returns `unknown` for missing or non-YYYY-MM-DD values so callers can flag them.
 *
 * @param lastReviewed - ISO date from bucket frontmatter, or null when absent
 * @param now - comparison clock for deterministic tests and reports
 */
export function computeFreshness(
  lastReviewed: string | null,
  now: Date = new Date(),
): { days: number | null; band: BucketFreshness["freshnessBand"] } {
  if (lastReviewed === null || !ISO_DATE_REGEX.test(lastReviewed)) {
    return { days: null, band: "unknown" };
  }
  const reviewedMs = Date.parse(`${lastReviewed}T00:00:00Z`);
  if (Number.isNaN(reviewedMs)) return { days: null, band: "unknown" };

  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const days = Math.max(0, Math.floor((todayMs - reviewedMs) / 86400000));
  if (days <= 30) return { days, band: "fresh" };
  if (days <= 90) return { days, band: "aging" };
  return { days, band: "stale" };
}

/** Count all regex matches within a string. */
export function countMatches(content: string, pattern: RegExp): number {
  return Array.from(content.matchAll(pattern)).length;
}

/** Remove strikethrough history so historical notes do not count as live evidence. */
export function stripStrikethrough(content: string): string {
  return content.replace(/~~[\s\S]*?~~/g, "");
}

/** Check a concrete file:line reference for out-of-bounds lines or missing anchors. */
function getLineRefDiagnostic(
  fs: ReadonlyFS,
  filePath: string,
  rawLines: string,
  hasSemanticAnchor: boolean,
): string | null {
  const lineCount = fs.lineCount(filePath);
  const lineNumbers = Array.from(rawLines.matchAll(/[0-9]+/g)).flatMap(
    (lineMatch) => {
      const value = Number.parseInt(lineMatch[0], 10);
      return Number.isNaN(value) ? [] : [value];
    },
  );
  const ref = `${filePath}:${rawLines}`;
  if (
    lineNumbers.some((lineNumber) => lineNumber < 1 || lineNumber > lineCount)
  ) {
    return ref;
  }
  if (!hasSemanticAnchor) return `${ref} (missing semantic anchor)`;
  return lineNumbers.length > 0
    ? `${ref} (line ref redundant, semantic anchor exists)`
    : null;
}

/** Check referenced `file:line` evidence for stale footgun paths and ADR-024 compliance. */
export function summarizeFootgunRefs(
  fs: ReadonlyFS,
  content: string,
): FootgunRefSummary {
  const summary: FootgunRefSummary = {
    staleRefs: [],
    invalidLineRefs: [],
    totalRefs: 0,
    validRefs: 0,
  };
  const cleanedContent = stripStrikethrough(content);
  for (const line of cleanedContent.split("\n")) {
    const hasSemanticAnchor = new RegExp(SEARCH_ANCHOR_REGEX.source).test(line);
    const fileRefs = line.matchAll(/`([^`]+):([0-9]+(?:[-,][0-9]+)*)`/g);
    for (const match of fileRefs) {
      const filePath = match[1];
      const rawLines = match[2];
      if (
        filePath === undefined ||
        rawLines === undefined ||
        !isFileRef(filePath) ||
        !isCheckableForStaleness(filePath, fs)
      )
        continue;
      summary.totalRefs++;
      if (!fs.exists(filePath)) {
        summary.staleRefs.push(`${filePath}:${rawLines}`);
        continue;
      }
      const diagnostic = getLineRefDiagnostic(
        fs,
        filePath,
        rawLines,
        hasSemanticAnchor,
      );
      if (diagnostic !== null) {
        summary.invalidLineRefs.push(diagnostic);
        continue;
      }
      summary.validRefs++;
    }
  }

  scanSearchAnchors(fs, cleanedContent, summary);

  return summary;
}

/** `(search: "<needle>")` anchors: confirm the literal string still appears in
 *  the referenced file. A stale anchor is the mechanism that lets retired-code
 *  footguns pass validation while pointing at code that no longer exists. */
function scanSearchAnchors(
  fs: ReadonlyFS,
  cleanedContent: string,
  summary: FootgunRefSummary,
): void {
  const searchAnchors = cleanedContent.matchAll(
    new RegExp(SEARCH_ANCHOR_REGEX.source, "g"),
  );
  for (const match of searchAnchors) {
    const filePath = match[1];
    const needle = match[2];
    if (
      filePath === undefined ||
      needle === undefined ||
      !isFileRef(filePath) ||
      !isCheckableForStaleness(filePath, fs)
    )
      continue;
    summary.totalRefs++;
    if (!fs.exists(filePath)) {
      summary.staleRefs.push(`${filePath} (search: \`${needle}\`)`);
      continue;
    }
    const fileContent = fs.readFile(filePath);
    if (fileContent === null || !fileContent.includes(needle)) {
      summary.staleRefs.push(`${filePath} (search: \`${needle}\`)`);
      continue;
    }
    summary.validRefs++;
  }
}

/** Validate lesson/pattern evidence refs using the same rules as bucket stats. */
export function summarizeLessonRefs(
  fs: ReadonlyFS,
  content: string,
): FootgunRefSummary {
  const summary: FootgunRefSummary = {
    staleRefs: [],
    invalidLineRefs: [],
    totalRefs: 0,
    validRefs: 0,
  };
  const pathPattern =
    /`((?:src|config|app|apps|lib|docs|scripts|setup|workflow|agents|\.goat-flow)\/[^`]+)`/g;
  const cleanedContent = stripStrikethrough(content);
  for (const match of cleanedContent.matchAll(pathPattern)) {
    const ref = match[1];
    if (ref === undefined || /[*?{}<>]|\.\.\./.test(ref)) continue;
    const filePath = ref.replace(/:[0-9]+(?:[-,][0-9]+)*$/, "");
    if (isIntentionallyGitignored(filePath)) continue;
    summary.totalRefs++;
    if (fs.exists(filePath)) {
      summary.validRefs++;
    } else {
      summary.staleRefs.push(filePath);
    }
  }
  summary.invalidLineRefs.push(
    ...collectInvalidLessonLineRefs(fs, cleanedContent),
  );
  scanSearchAnchors(fs, cleanedContent, summary);
  return summary;
}

/** Validate `file:line` refs in lesson content, returning out-of-bounds or anchorless refs. */
function collectInvalidLessonLineRefs(
  fs: ReadonlyFS,
  cleanedContent: string,
): string[] {
  const invalid: string[] = [];
  for (const line of cleanedContent.split("\n")) {
    const hasSemanticAnchor = new RegExp(SEARCH_ANCHOR_REGEX.source).test(line);
    for (const match of line.matchAll(/`([^`]+):([0-9]+(?:[-,][0-9]+)*)`/g)) {
      const filePath = match[1];
      const rawLines = match[2];
      if (
        filePath === undefined ||
        rawLines === undefined ||
        !isFileRef(filePath) ||
        !isCheckableForStaleness(filePath, fs) ||
        !fs.exists(filePath)
      )
        continue;
      const diagnostic = getLineRefDiagnostic(
        fs,
        filePath,
        rawLines,
        hasSemanticAnchor,
      );
      if (diagnostic !== null) invalid.push(diagnostic);
    }
  }
  return invalid;
}
