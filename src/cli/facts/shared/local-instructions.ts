/**
 * Local instruction fact extraction - analyzes .goat-flow/coding-standards/ or .github/instructions/ directories.
 * Validates router links, conventions content quality, and instruction file presence.
 */
import type { SharedFacts, ReadonlyFS } from "../../types.js";

/** Resolved local instruction directory with its source location tag. */
interface LocalInstructionDir {
  location: "ai" | "github";
  dir: string;
}

/** Presence flags for key local instruction documents. */
interface LocalInstructionFlags {
  hasConventions: boolean;
  hasFrontend: boolean;
  hasBackend: boolean;
  hasCodeReview: boolean;
  hasGitCommit: boolean;
}

/** Result of validating router link references in .goat-flow/README.md. */
interface RouterValidation {
  hasValidRouter: boolean;
  routerNeedsFix: string | null;
  invalidRefs: string[];
}

/** Resolve the local instruction directory in either `ai/` or `.github/instructions/`. */
function resolveLocalInstructionDir(
  aiDirExists: boolean,
  githubDirExists: boolean,
  csPath: string,
): LocalInstructionDir | null {
  if (aiDirExists) return { location: "ai", dir: csPath };
  if (githubDirExists)
    return { location: "github", dir: ".github/instructions" };
  return null;
}

/** Build the empty local-instructions result used when no instruction directory exists. */
function createEmptyLocalInstructions(
  csPath: string,
): SharedFacts["localInstructions"] {
  return {
    dirExists: false,
    location: null,
    aiDirExists: false,
    githubDirExists: false,
    duplicateSurfacePaths: [],
    fileCount: 0,
    hasRouter: false,
    hasValidRouter: false,
    routerNeedsFix: null,
    hasConventions: false,
    conventionsHasContent: false,
    hasFrontend: false,
    hasBackend: false,
    hasCodeReview: false,
    hasGitCommit: false,
    conventionsContent: null,
    localFileSizes: [],
    path: csPath,
  };
}

/** Check for instruction files in either naming convention (.md or .instructions.md). */
function hasInstructionFile(files: string[], baseName: string): boolean {
  return files.some(
    (file) =>
      file === `${baseName}.md` || file === `${baseName}.instructions.md`,
  );
}

/** Collect presence flags for the key local-instruction documents. */
function collectLocalInstructionFlags(files: string[]): LocalInstructionFlags {
  return {
    hasConventions: hasInstructionFile(files, "conventions"),
    hasFrontend: hasInstructionFile(files, "frontend"),
    hasBackend: hasInstructionFile(files, "backend"),
    hasCodeReview: hasInstructionFile(files, "code-review"),
    hasGitCommit: hasInstructionFile(files, "git-commit"),
  };
}

/** Collect line counts for all local instruction files. */
function collectLocalFileSizes(
  fs: ReadonlyFS,
  dir: string,
  files: string[],
): Array<{ path: string; lines: number }> {
  return files.map((file) => ({
    path: `${dir}/${file}`,
    lines: fs.lineCount(`${dir}/${file}`),
  }));
}

/** Treat conventions as real only when they include both commands and behavioral rules. */
function hasConventionsContent(content: string): boolean {
  const hasCommands = /##.*command|```bash|```sh/i.test(content);
  const hasConventionRules =
    /##.*convention|do.*don't|do:.*don't:|good.*bad/i.test(content);
  const lineCount = content.split("\n").length;
  return hasCommands && hasConventionRules && lineCount > 15;
}

/** Treat only readable local paths as valid router references, not prose or URLs. */
function isReadableRouterRef(rawRef: string): boolean {
  const ref = rawRef.trim();
  if (!ref) return false;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return false;
  if (ref.startsWith("$")) return false;
  if (!ref.includes("/") && /\b(README|docs|command|format|lint)\b/i.test(ref))
    return false;
  if (ref.includes(" ")) return false;
  return /(?:^\.\/|^\.\.\/|^[\w-]+\/|^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$)/.test(
    ref,
  );
}

/** Remove any markdown anchor fragment from a router reference. */
function stripRouterAnchor(ref: string): string {
  const anchorIndex = ref.indexOf("#");
  if (anchorIndex === -1) return ref.trim();
  return ref.slice(0, anchorIndex).trim();
}

/** Extract local file references from markdown links and backticks. */
function extractRouterRefsFromMarkdown(content: string): string[] {
  const refs = new Set<string>();

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const raw = match[1];
    if (!raw) continue;
    const ref = stripRouterAnchor(raw);
    if (isReadableRouterRef(ref)) refs.add(ref);
  }

  for (const match of content.matchAll(/`([^`]+)`/g)) {
    const raw = match[1];
    if (!raw) continue;
    const ref = stripRouterAnchor(raw);
    if (isReadableRouterRef(ref)) refs.add(ref);
  }

  return Array.from(refs);
}

/** Validate that `.goat-flow/README.md` references only existing local instruction files. */
function validateRouterLinks(
  fs: ReadonlyFS,
  aiReadmeContent: string | null,
): RouterValidation {
  if (aiReadmeContent === null) {
    return {
      hasValidRouter: false,
      invalidRefs: [],
      routerNeedsFix:
        ".goat-flow/README.md missing - create it and reference existing coding standard files",
    };
  }

  const refs = extractRouterRefsFromMarkdown(aiReadmeContent);
  if (refs.length === 0) {
    return {
      hasValidRouter: false,
      invalidRefs: [],
      routerNeedsFix:
        ".goat-flow/README.md should reference at least one instruction file (for example .goat-flow/coding-standards/conventions.md).",
    };
  }

  const invalidRefs = refs.filter((ref) => !fs.exists(ref));
  if (invalidRefs.length > 0) {
    return {
      hasValidRouter: false,
      invalidRefs,
      routerNeedsFix: `.goat-flow/README.md references missing paths: ${invalidRefs.join(", ")}`,
    };
  }

  return {
    hasValidRouter: true,
    invalidRefs: [],
    routerNeedsFix: null,
  };
}

/** Load and grade the conventions document for the active local-instructions location. */
function analyzeConventionsContent(
  fs: ReadonlyFS,
  location: LocalInstructionDir["location"],
  csPath: string,
  hasConventions: boolean,
): Pick<
  SharedFacts["localInstructions"],
  "conventionsContent" | "conventionsHasContent"
> {
  if (!hasConventions)
    return { conventionsContent: null, conventionsHasContent: false };

  const conventionsPath =
    location === "ai"
      ? `${csPath}/conventions.md`
      : ".github/instructions/conventions.instructions.md";
  const conventionsContent = fs.readFile(conventionsPath);
  return {
    conventionsContent,
    conventionsHasContent:
      conventionsContent !== null && hasConventionsContent(conventionsContent),
  };
}

/** Resolve router file existence and validate its links. */
function resolveRouterValidation(
  fs: ReadonlyFS,
  location: "ai" | "github",
): {
  hasRouter: boolean;
  routerValidation: {
    hasValidRouter: boolean;
    routerNeedsFix: string | null;
    invalidRefs: string[];
  };
} {
  const hasRouter = location === "ai" && fs.exists(".goat-flow/README.md");
  const routerValidation =
    location === "ai"
      ? validateRouterLinks(fs, fs.readFile(".goat-flow/README.md"))
      : { hasValidRouter: true, routerNeedsFix: null, invalidRefs: [] };
  return { hasRouter, routerValidation };
}

/** Detect and analyze local instruction files from coding-standards dir or .github/instructions/. */
export function extractLocalInstructions(
  fs: ReadonlyFS,
  rawCsPath: string,
): SharedFacts["localInstructions"] {
  const csPath = rawCsPath.replace(/\/$/, "");
  const aiDirExists = fs.exists(csPath);
  const githubDirExists = fs.exists(".github/instructions");
  // Detect duplicate instruction surfaces, but exempt pointer files.
  // If .goat-flow/coding-standards/conventions.md references .github/instructions/
  // without substantial duplicated content, it's a pointer — not a duplicate.
  let duplicateSurfacePaths: string[] = [];
  if (aiDirExists && githubDirExists) {
    const conventionsContent = fs.readFile(`${csPath}/conventions.md`);
    const isPointerFile =
      conventionsContent !== null &&
      /\.github\/instructions\//.test(conventionsContent) &&
      conventionsContent.split("\n").length < 50;
    if (!isPointerFile) {
      duplicateSurfacePaths = [csPath, ".github/instructions"];
    }
  }
  const localInstructionDir = resolveLocalInstructionDir(
    aiDirExists,
    githubDirExists,
    csPath,
  );
  if (localInstructionDir === null) return createEmptyLocalInstructions(csPath);

  const { dir, location } = localInstructionDir;
  const files = fs.listDir(dir).filter((file) => file.endsWith(".md"));
  const flags = collectLocalInstructionFlags(files);
  const conventions = analyzeConventionsContent(
    fs,
    location,
    csPath,
    flags.hasConventions,
  );
  const { hasRouter, routerValidation } = resolveRouterValidation(fs, location);

  return {
    dirExists: true,
    location,
    aiDirExists,
    githubDirExists,
    duplicateSurfacePaths,
    fileCount: files.length,
    hasRouter,
    hasValidRouter: routerValidation.hasValidRouter && hasRouter,
    routerNeedsFix: hasRouter ? routerValidation.routerNeedsFix : null,
    hasConventions: flags.hasConventions,
    conventionsHasContent: conventions.conventionsHasContent,
    hasFrontend: flags.hasFrontend,
    hasBackend: flags.hasBackend,
    hasCodeReview: flags.hasCodeReview,
    hasGitCommit: flags.hasGitCommit,
    conventionsContent: conventions.conventionsContent,
    localFileSizes: collectLocalFileSizes(fs, dir, files),
    path: dir,
  };
}
