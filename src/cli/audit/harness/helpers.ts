/**
 * Shared helpers for harness quality checks.
 */
import type { QualityCheckResult } from "../types.js";

export function pass(findings: string[]): QualityCheckResult {
  return { score: 100, findings, recommendations: [] };
}

export function partial(
  score: number,
  findings: string[],
  recommendations: string[],
  howToFix?: string[],
): QualityCheckResult {
  return { score, findings, recommendations, howToFix };
}

export function fail(
  findings: string[],
  recommendations: string[],
  howToFix?: string[],
): QualityCheckResult {
  return { score: 0, findings, recommendations, howToFix };
}

/** Extract YYYY-MM-DD dates from **Created:** lines in markdown content. */
export function parseCreatedDates(content: string): Date[] {
  const pattern = /\*\*Created:\*\*\s*(\d{4}-\d{2}-\d{2})/g;
  const dates: Date[] = [];
  let m;
  while ((m = pattern.exec(content))) {
    const d = new Date(m[1]! + "T00:00:00");
    if (!isNaN(d.getTime())) dates.push(d);
  }
  return dates;
}

/** Extract backtick-quoted file paths from markdown content. */
export function extractBacktickPaths(content: string): string[] {
  const pattern = /`([^`]*\/[^`]+)`/g;
  const paths: string[] = [];
  let m;
  while ((m = pattern.exec(content))) {
    const p = m[1]!;
    if (p.includes("://") || p.includes("*") || p.includes("(")) continue;
    if (p.startsWith("/") || p.includes(" ")) continue;
    paths.push(p);
  }
  return paths;
}

/** Collect .md files from a directory tree (one level deep). */
export function collectMarkdownFiles(
  fs: { listDir(p: string): string[] },
  dir: string,
): string[] {
  const mdFiles: string[] = [];
  let entries: string[];
  try {
    entries = fs.listDir(dir);
  } catch {
    return mdFiles;
  }
  for (const entry of entries) {
    const entryPath = `${dir}/${entry}`;
    if (entry.endsWith(".md")) {
      mdFiles.push(entryPath);
    } else {
      try {
        for (const sf of fs.listDir(entryPath)) {
          if (sf.endsWith(".md")) mdFiles.push(`${entryPath}/${sf}`);
        }
      } catch {
        // Not a directory, skip
      }
    }
  }
  return mdFiles;
}
