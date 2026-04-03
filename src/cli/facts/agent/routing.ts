/**
 * Router and Ask First fact extraction — collects referenced paths from instruction file sections.
 */
import type { AgentFacts, ReadonlyFS } from '../../types.js';
import { extractSection } from './instruction.js';

/** Return true if a string contains '/' or '.', suggesting a file path. */
function looksLikePath(s: string): boolean {
  return s.includes('/') || s.includes('.');
}

/** Return true if a string contains glob or template characters. */
function hasGlobChars(s: string): boolean {
  return s.includes('*') || s.includes('{');
}

/** Add a discovered path once without duplicating earlier matches. */
export function pushUniquePath(paths: string[], path: string): void {
  if (paths.includes(path) === false) {
    paths.push(path);
  }
}

/** Collect paths matching a regex pattern, filtered by a validation predicate. */
function collectMatchedPaths(
  content: string,
  pattern: RegExp,
  isValid: (path: string) => boolean,
  paths: string[],
): void {
  for (const match of content.matchAll(pattern)) {
    const path = match[1];
    if (path === undefined) continue;
    if (!isValid(path)) continue;
    pushUniquePath(paths, path);
  }
}

/** Treat backtick-wrapped router references as paths only when they look local and literal. */
function isRouterBacktickPath(path: string): boolean {
  return !hasGlobChars(path) && looksLikePath(path);
}

/** Treat markdown link targets as router paths only when they look local and literal. */
function isRouterLinkPath(path: string): boolean {
  return !hasGlobChars(path) && !path.startsWith('http') && looksLikePath(path);
}

/** Treat Ask First bullet items as boundary paths only when they look like local files. */
function isAskFirstPath(path: string): boolean {
  if (hasGlobChars(path)) return false;
  if (path.startsWith('http')) return false;
  if (!looksLikePath(path)) return false;
  if (path.includes('|') || path.startsWith('-') || path.startsWith('$'))
    return false;
  return true;
}

/** Extract all file/directory paths referenced in the Router Table section. */
function extractRouterPaths(content: string): string[] {
  /** Accumulated list of discovered router paths */
  const paths: string[] = [];
  /** Content of the router section extracted from the instruction file */
  const routerSection = extractSection(content, 'router');
  if (routerSection == null) return paths;

  collectMatchedPaths(routerSection, /`([^`]+)`/g, isRouterBacktickPath, paths);
  collectMatchedPaths(routerSection, /\]\(([^)]+)\)/g, isRouterLinkPath, paths);

  return paths;
}

/** Extract the Ask First section whether it is written as a heading or bold block. */
function extractAskFirstSection(content: string): string | null {
  const headingMatch = content.match(/##\s+ask\s+first[\s\S]*?(?=\n##\s|$)/i);
  if (headingMatch) {
    return headingMatch[0];
  }

  const boldMatch = content.match(
    /\*\*Ask First\*\*[\s\S]*?(?=\n\*\*Never\*\*|\n##\s|$)/i,
  );
  return boldMatch?.[0] ?? null;
}

/** Extract file paths listed in the Ask First boundaries section. */
function extractAskFirstPaths(content: string): string[] {
  /** Accumulated list of discovered ask-first boundary paths */
  const paths: string[] = [];

  const section = extractAskFirstSection(content);
  if (section == null) return paths;

  collectMatchedPaths(section, /`([^`]+)`/g, isAskFirstPath, paths);

  return paths;
}


/** Resolve referenced paths against the filesystem, counting hits and misses. */
function resolveReferencedPaths(
  fs: ReadonlyFS,
  paths: string[],
): {
  resolved: number;
  unresolved: string[];
} {
  let resolved = 0;
  const unresolved: string[] = [];

  for (const path of paths) {
    if (fs.exists(path)) {
      resolved++;
    } else {
      unresolved.push(path);
    }
  }

  return { resolved, unresolved };
}

/** Extract router marker paths from the fenced marker block in the instruction file. */
function extractMarkerPaths(content: string | null): {
  hasMarkers: boolean;
  markerPaths: string[];
} {
  const markerStart = '<!-- goat-flow:router:start -->';
  const markerEnd = '<!-- goat-flow:router:end -->';
  const hasMarkers =
    content !== null &&
    content.includes(markerStart) &&
    content.includes(markerEnd);
  if (!hasMarkers) {
    return { hasMarkers: false, markerPaths: [] };
  }

  const startIdx = content.indexOf(markerStart) + markerStart.length;
  const endIdx = content.indexOf(markerEnd);
  const markerContent = content.slice(startIdx, endIdx);
  const markerPaths: string[] = [];

  for (const match of markerContent.matchAll(/`([^`]+\/[^`]*)`/g)) {
    const raw = match[1];
    if (raw === undefined || raw.includes('*')) continue;
    const ref = raw.replace(/\/$/, '');
    if (!ref) continue;
    pushUniquePath(markerPaths, ref);
  }

  return { hasMarkers, markerPaths };
}

/** Extract router table facts: paths found and their resolution status. */
export function extractRouterFacts(
  fs: ReadonlyFS,
  content: string | null,
): AgentFacts['router'] {
  const paths = content !== null ? extractRouterPaths(content) : [];
  const resolution = resolveReferencedPaths(fs, paths);
  const markerInfo = extractMarkerPaths(content);
  const staleMarkerPaths = markerInfo.markerPaths.filter(
    (path) => !fs.exists(path),
  );

  return {
    exists: paths.length > 0,
    paths,
    resolved: resolution.resolved,
    unresolved: resolution.unresolved,
    hasMarkers: markerInfo.hasMarkers,
    markerPaths: markerInfo.markerPaths,
    staleMarkerPaths,
  };
}

/** Extract ask-first boundary facts: paths listed and their resolution status. */
export function extractAskFirstFacts(
  fs: ReadonlyFS,
  content: string | null,
): AgentFacts['askFirst'] {
  const paths = content !== null ? extractAskFirstPaths(content) : [];
  const resolution = resolveReferencedPaths(fs, paths);
  return {
    exists: paths.length > 0,
    paths,
    resolved: resolution.resolved,
    unresolved: resolution.unresolved,
  };
}

// settingsLocal extraction removed - personal preference file, not a project quality signal.

// ─── Composer ────────────────────────────────────────────────────────

