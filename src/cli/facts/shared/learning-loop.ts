/**
 * Footgun and lesson fact extractors for the learning-loop system.
 * Analyzes category-bucket markdown files for evidence quality, entry counts, and stale references.
 */
import type { SharedFacts, ReadonlyFS } from "../../types.js";
import type { LoadedConfig } from "../../config/types.js";

/**
 * Matches file path evidence in multiple formats:
 * - `src/auth.ts` (backtick-wrapped file path)
 * - `src/auth.ts:42` (backtick-wrapped with line number)
 * - `src/auth.ts:42-50` (backtick-wrapped with line range)
 * - (lines 866-880) or (line 52) (prose-style)
 * Line numbers are optional historical context - file paths alone are valid evidence.
 */
const EVIDENCE_PATTERN =
  /`[^`]+\.[a-zA-Z]{1,10}(?::[0-9]+(?:[-,][0-9]+)*)?`|\(lines?\s+[0-9]+/;

/** Regex to extract file paths from backtick-wrapped references (with optional line numbers). */
const FILE_REF_REGEX = /`([^`]+\.[a-zA-Z]{1,10})(?::[0-9]+(?:[-,][0-9]+)*)?`/g;

/** Check if a backtick-wrapped file:line reference is a real file path (not a URL/hostname) */
function isFileRef(filePath: string): boolean {
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

/**
 * Check if a file reference can be reliably validated for staleness.
 * Paths with '/' are resolvable relative to the project root.
 * Bare filenames with source-code extensions (e.g., `router.go`, `auth.ts`)
 * are ambiguous - they may exist deep in subdirectories. We try fs.exists()
 * at root first; if it resolves, it's checkable. If not, and it has a source
 * extension without '/', skip it rather than reporting a false stale ref.
 */
function isCheckableForStaleness(filePath: string, fs: ReadonlyFS): boolean {
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

/** One markdown file read from a learning-loop directory. */
interface MarkdownEntry {
  path: string;
  content: string;
}

/** A learning-loop directory with its existence flag and contained markdown entries. */
interface EntryDir {
  path: string;
  exists: boolean;
  files: MarkdownEntry[];
}

/** Aggregated file-reference validation results for footgun entries. */
interface FootgunRefSummary {
  staleRefs: string[];
  invalidLineRefs: string[];
  totalRefs: number;
  validRefs: number;
}

/** Known filesystem locations where footgun artifacts may appear. */
const FOOTGUN_SURFACE_CANDIDATES = [".goat-flow/footguns/", "docs/footguns.md"];
/** Known filesystem locations where lesson artifacts may appear. */
const LESSON_SURFACE_CANDIDATES = [
  ".goat-flow/lessons/",
  "docs/lessons/",
  "docs/lessons.md",
];

/** Normalize a surface path so trailing slashes do not affect comparisons. */
function normalizeSurfacePath(path: string): string {
  return path.replace(/\/$/, "");
}

/** Detect competing artifact surfaces outside the configured canonical path. */
function findCompetingArtifactSurfaces(
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

/** List markdown files in a directory, reading each into a path+content pair. */
function listMarkdownEntries(fs: ReadonlyFS, dir: string): EntryDir {
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
function parseMarkdownFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  return { frontmatter: match[1] ?? "", body: match[2] ?? "" };
}

/** Count all regex matches within a string. */
function countMatches(content: string, pattern: RegExp): number {
  return Array.from(content.matchAll(pattern)).length;
}

/** Count `## Lesson:` or `## Pattern:` bucket entries in one markdown file. */
function countLessonEntries(content: string): number {
  const { body } = parseMarkdownFrontmatter(content);
  const bucketCount = countMatches(body, /^##\s+(?:Lesson|Pattern):\s+/gm);
  return bucketCount > 0 ? bucketCount : 1;
}

/** Count footgun entries. */
function countFootgunEntries(content: string): number {
  const { body } = parseMarkdownFrontmatter(content);
  const bucketCount = countMatches(body, /^##\s+Footgun:\s+/gm);
  return bucketCount > 0 ? bucketCount : 1;
}

/** Count footgun labels. */
function countFootgunLabels(content: string): number {
  const { body } = parseMarkdownFrontmatter(content);
  const bucketCount = countMatches(body, /^##\s+Footgun:\s+/gm);
  if (bucketCount > 0) {
    return countMatches(
      body,
      /\*\*Evidence(?:\s+type)?:\*\*\s*(?:ACTUAL_MEASURED|DESIGN_TARGET|HYPOTHETICAL_EXAMPLE)/gim,
    );
  }
  return hasEvidenceLabel(content) ? 1 : 0;
}

/** Accumulate directory mention counts from file references in markdown content. */
function mergeDirMentions(target: Map<string, number>, content: string): void {
  const pathRefs = content.matchAll(new RegExp(FILE_REF_REGEX.source, "g"));
  for (const match of pathRefs) {
    const group = match[1];
    if (group === undefined || !isFileRef(group)) continue;
    const dir = group.split("/").slice(0, -1).join("/");
    if (!dir) continue;
    target.set(dir, (target.get(dir) ?? 0) + 1);
  }
}

/** Detect whether a footgun entry declares an explicit evidence label. */
function hasEvidenceLabel(content: string): boolean {
  return (
    /^evidence_type:\s*.+$/im.test(content) ||
    /^\*\*Evidence type:\*\*/m.test(content) ||
    /\*\*Evidence:\*\*\s*(?:ACTUAL_MEASURED|DESIGN_TARGET|HYPOTHETICAL_EXAMPLE)/m.test(
      content,
    )
  );
}

/** Detect whether markdown content cites at least one file reference. */
function hasFileEvidence(content: string): boolean {
  const refs = content.matchAll(
    /`([^`]+\.[a-zA-Z]{1,10}:[0-9]+(?:[-,][0-9]+)*)`/g,
  );
  for (const match of refs) {
    if (match[1] !== undefined && isFileRef(match[1])) return true;
  }
  return false;
}

/** Detect whether a footgun entry includes usable file or line evidence. */
function hasFootgunEvidence(content: string): boolean {
  if (!EVIDENCE_PATTERN.test(content)) return false;
  return hasFileEvidence(content);
}

/** Check referenced `file:line` evidence for stale footgun paths. */
function summarizeFootgunRefs(
  fs: ReadonlyFS,
  content: string,
): FootgunRefSummary {
  const summary: FootgunRefSummary = {
    staleRefs: [],
    invalidLineRefs: [],
    totalRefs: 0,
    validRefs: 0,
  };
  const fileRefs = content.matchAll(/`([^`]+):([0-9]+(?:[-,][0-9]+)*)`/g);

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

    const lineCount = fs.lineCount(filePath);
    const lineNumbers = Array.from(rawLines.matchAll(/[0-9]+/g)).flatMap(
      (lineMatch) => {
        const value = Number.parseInt(lineMatch[0], 10);
        return Number.isNaN(value) ? [] : [value];
      },
    );
    const hasOutOfBoundsLine = lineNumbers.some(
      (lineNumber) => lineNumber < 1 || lineNumber > lineCount,
    );

    if (hasOutOfBoundsLine) {
      summary.invalidLineRefs.push(`${filePath}:${rawLines}`);
      continue;
    }

    summary.validRefs++;
  }

  return summary;
}

/** Return a format diagnostic when a lesson or footgun bucket is missing required frontmatter. */
function getMissingFrontmatterDiagnostic(
  path: string,
  content: string,
): string | null {
  const { frontmatter, body } = parseMarkdownFrontmatter(content);
  if (frontmatter === null) return `${path} missing YAML frontmatter`;

  const lessonBucketCount = countMatches(
    body,
    /^##\s+(?:Lesson|Pattern):\s+/gm,
  );
  if (
    lessonBucketCount > 0 &&
    /^category:\s*.+$/im.test(frontmatter) === false
  ) {
    return `${path} is a lessons category bucket but missing frontmatter category`;
  }

  const footgunBucketCount = countMatches(body, /^##\s+Footgun:\s+/gm);
  if (
    footgunBucketCount > 0 &&
    /^category:\s*.+$/im.test(frontmatter) === false
  ) {
    return `${path} is a footguns category bucket but missing frontmatter category`;
  }

  return null;
}

/** Aggregate evidence, labels, directory mentions, and stale refs across footgun entries. */
function summarizeFootgunEntries(
  fs: ReadonlyFS,
  entries: MarkdownEntry[],
): Pick<
  SharedFacts["footguns"],
  | "hasEvidence"
  | "entryCount"
  | "labelCount"
  | "dirMentions"
  | "staleRefs"
  | "invalidLineRefs"
  | "totalRefs"
  | "validRefs"
  | "formatDiagnostic"
> {
  const dirMentions = new Map<string, number>();
  const staleRefs: string[] = [];
  const invalidLineRefs: string[] = [];
  const diagnostics: string[] = [];
  let hasEvidence = false;
  let entryCount = 0;
  let labelCount = 0;
  let totalRefs = 0;
  let validRefs = 0;

  for (const entry of entries) {
    const { content, path } = entry;
    entryCount += countFootgunEntries(content);
    labelCount += countFootgunLabels(content);
    hasEvidence ||= hasFootgunEvidence(content);
    mergeDirMentions(dirMentions, content);
    const refSummary = summarizeFootgunRefs(fs, content);
    totalRefs += refSummary.totalRefs;
    validRefs += refSummary.validRefs;
    staleRefs.push(...refSummary.staleRefs);
    invalidLineRefs.push(...refSummary.invalidLineRefs);
    const diagnostic = getMissingFrontmatterDiagnostic(path, content);
    if (diagnostic) diagnostics.push(diagnostic);
  }

  return {
    hasEvidence,
    entryCount,
    labelCount,
    dirMentions,
    staleRefs,
    invalidLineRefs,
    totalRefs,
    validRefs,
    formatDiagnostic: diagnostics.length > 0 ? diagnostics.join("; ") : null,
  };
}

/** Aggregate entry counts, stale refs, and format diagnostics across lesson entries. */
function summarizeLessonEntries(
  fs: ReadonlyFS,
  entries: MarkdownEntry[],
): Pick<
  SharedFacts["lessons"],
  "entryCount" | "staleRefs" | "formatDiagnostic"
> {
  const staleRefs: string[] = [];
  const diagnostics: string[] = [];
  let entryCount = 0;

  for (const entry of entries) {
    const { content, path } = entry;
    entryCount += countLessonEntries(content);
    const pathPattern =
      /`((?:src|config|app|apps|lib|docs|scripts|setup|workflow|strands_agents|agents|\.goat-flow)\/[^`]+)`/g;
    for (const match of content.matchAll(pathPattern)) {
      const ref = match[1];
      if (ref === undefined || /[*?{}]/.test(ref)) continue;
      const filePath = ref.replace(/:[0-9]+(?:[-,][0-9]+)*$/, "");
      if (!fs.exists(filePath)) staleRefs.push(filePath);
    }
    const diagnostic = getMissingFrontmatterDiagnostic(path, content);
    if (diagnostic) diagnostics.push(diagnostic);
  }

  return {
    entryCount,
    staleRefs,
    formatDiagnostic: diagnostics.length > 0 ? diagnostics.join("; ") : null,
  };
}

/** Extract footgun facts: existence, evidence quality, and directory mention counts. */
export function extractFootgunFacts(
  fs: ReadonlyFS,
  configState: LoadedConfig,
): SharedFacts["footguns"] {
  const dir = listMarkdownEntries(fs, configState.config.footguns.path);
  const summary = summarizeFootgunEntries(fs, dir.files);
  const formatDiagnostic =
    summary.entryCount === 0 && dir.exists
      ? "Footgun directory exists but contains 0 entries"
      : summary.formatDiagnostic;

  return {
    exists: dir.exists,
    hasEvidence: summary.hasEvidence,
    entryCount: summary.entryCount,
    labelCount: summary.labelCount,
    hasEvidenceLabels:
      summary.entryCount > 0 && summary.labelCount >= summary.entryCount,
    dirMentions: summary.dirMentions,
    staleRefs: summary.staleRefs,
    invalidLineRefs: summary.invalidLineRefs,
    duplicateSurfacePaths: findCompetingArtifactSurfaces(
      fs,
      [configState.config.footguns.path],
      FOOTGUN_SURFACE_CANDIDATES,
    ),
    totalRefs: summary.totalRefs,
    validRefs: summary.validRefs,
    formatDiagnostic,
    path: configState.config.footguns.path,
  };
}

/** Extract lessons facts: existence and whether entries are present. */
export function extractLessonsFacts(
  fs: ReadonlyFS,
  configState: LoadedConfig,
): SharedFacts["lessons"] {
  const dir = listMarkdownEntries(fs, configState.config.lessons.path);
  const summary = summarizeLessonEntries(fs, dir.files);
  const formatDiagnostic =
    summary.entryCount === 0 && dir.exists
      ? "Lesson directory exists but contains 0 entries"
      : summary.formatDiagnostic;

  return {
    exists: dir.exists,
    hasEntries: summary.entryCount > 0,
    entryCount: summary.entryCount,
    staleRefs: summary.staleRefs,
    duplicateSurfacePaths: findCompetingArtifactSurfaces(
      fs,
      [configState.config.lessons.path],
      LESSON_SURFACE_CANDIDATES,
    ),
    formatDiagnostic,
    path: configState.config.lessons.path,
  };
}
