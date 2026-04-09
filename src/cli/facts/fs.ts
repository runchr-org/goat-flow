/**
 * Read-only filesystem adapter over Node's `fs` APIs.
 * The rest of the scanner targets this interface so tests can swap in mock filesystems without touching extraction logic.
 */
import {
  readFileSync,
  statSync,
  readdirSync,
  accessSync,
  constants,
  type Dirent,
} from "node:fs";
import { resolve, relative, join } from "node:path";
import type { ReadonlyFS } from "../types.js";

/** Read directory entries, returning an empty list when the path is missing. */
function readDirEntries(path: string): Dirent[] {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Convert one glob segment into the regex used by the filesystem walker. */
function buildGlobRegex(part: string): RegExp {
  return new RegExp(
    "^" + part.replace(/\./g, "\\.").replace(/\*/g, "[^/]*") + "$",
  );
}

/** Walk a glob pattern recursively from the current directory segment. */
function walkGlob(
  root: string,
  resolvePath: (path: string) => string,
  parts: string[],
  dir: string,
  patternIndex: number,
  results: string[],
): void {
  if (patternIndex >= parts.length) return;

  const part = parts[patternIndex];
  if (part === undefined) return;
  if (part === "**") {
    walkGlobStar(root, resolvePath, parts, dir, patternIndex, results);
    return;
  }
  walkGlobSegment(root, resolvePath, parts, dir, patternIndex, results, part);
}

/** Handle the recursive `**` segment in the custom glob walker. */
function walkGlobStar(
  root: string,
  resolvePath: (path: string) => string,
  parts: string[],
  dir: string,
  patternIndex: number,
  results: string[],
): void {
  if (patternIndex + 1 < parts.length) {
    walkGlob(root, resolvePath, parts, dir, patternIndex + 1, results);
  }

  for (const entry of readDirEntries(resolvePath(dir))) {
    if (entry.isDirectory() && isIgnoredDir(entry.name) === false) {
      walkGlob(
        root,
        resolvePath,
        parts,
        join(dir, entry.name),
        patternIndex,
        results,
      );
    }
  }
}

/** Handle a normal glob segment and descend when matching directories remain. */
function walkGlobSegment(
  root: string,
  resolvePath: (path: string) => string,
  parts: string[],
  dir: string,
  patternIndex: number,
  results: string[],
  part: string,
): void {
  const isLast = patternIndex === parts.length - 1;
  const regex = buildGlobRegex(part);

  for (const entry of readDirEntries(resolvePath(dir))) {
    if (!regex.test(entry.name)) continue;

    const fullPath = join(dir, entry.name);
    if (isLast) {
      results.push(relative(root, resolvePath(fullPath)));
      continue;
    }
    if (entry.isDirectory()) {
      walkGlob(root, resolvePath, parts, fullPath, patternIndex + 1, results);
    }
  }
}

/** Create a read-only filesystem abstraction rooted at the given path. */
export function createFS(rootPath: string): ReadonlyFS {
  /** Absolute path to the project root directory */
  const root = resolve(rootPath);

  /** Resolve a relative path against the project root. */
  function resolvePath(p: string): string {
    return resolve(root, p);
  }

  return {
    /** Report whether a relative path exists under the project root. */
    exists(path: string): boolean {
      try {
        statSync(resolvePath(path));
        return true;
      } catch {
        return false;
      }
    },

    /** Read a UTF-8 file under the project root. */
    readFile(path: string): string | null {
      try {
        return readFileSync(resolvePath(path), "utf-8");
      } catch {
        return null;
      }
    },

    /** Count newline-delimited lines in a UTF-8 file. */
    lineCount(path: string): number {
      try {
        const content = readFileSync(resolvePath(path), "utf-8");
        return content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
      } catch {
        return 0;
      }
    },

    /** Read and parse a JSON file under the project root. */
    readJson(path: string): unknown {
      try {
        const content = readFileSync(resolvePath(path), "utf-8");
        return JSON.parse(content);
      } catch {
        return null;
      }
    },

    /** List direct children of a directory under the project root. */
    listDir(path: string): string[] {
      try {
        return readdirSync(resolvePath(path), { withFileTypes: true }).map(
          (entry) => entry.name,
        );
      } catch {
        return [];
      }
    },

    /** Report whether a file under the project root has any execute bit set. */
    isExecutable(path: string): boolean {
      try {
        accessSync(resolvePath(path), constants.X_OK);
        return true;
      } catch {
        // On Windows, check for shebang instead
        if (process.platform === "win32") {
          try {
            const content = readFileSync(resolvePath(path), "utf-8");
            return content.startsWith("#!");
          } catch {
            return false;
          }
        }
        return false;
      }
    },

    /** Expand a simplified glob pattern against the project tree. */
    glob(pattern: string): string[] {
      // Simple recursive glob implementation (no deps)
      // Supports: *, **, specific extensions
      /** Accumulated matching file paths */
      const results: string[] = [];
      /** Pattern split into path segments for incremental matching */
      const parts = pattern.split("/");
      walkGlob(root, resolvePath, parts, ".", 0, results);
      return results;
    },
  };
}

/** Directory names to skip during recursive glob traversal */
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "vendor",
  ".venv",
  "__pycache__",
  ".idea",
  ".vscode",
]);

/** Skip heavyweight or generated directories during recursive glob walking. */
function isIgnoredDir(name: string): boolean {
  return IGNORED_DIRS.has(name);
}
