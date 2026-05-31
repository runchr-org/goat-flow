import type { ReadonlyFS } from "../types.js";

/** Detect whether any exact path in a candidate list exists. */
export function hasAnyPath(fs: ReadonlyFS, paths: readonly string[]): boolean {
  return paths.some((path) => fs.exists(path));
}

/** Detect whether any glob in a candidate list matches at least one file. */
export function hasAnyGlob(fs: ReadonlyFS, globs: readonly string[]): boolean {
  return globs.some((pattern) => fs.existsGlob(pattern));
}

/** Read the first file in a candidate list that actually exists. */
export function readFirstExistingFile(
  fs: ReadonlyFS,
  paths: readonly string[],
): string | null {
  for (const path of paths) {
    const content = fs.readFile(path);
    if (content !== null) return content;
  }
  return null;
}
