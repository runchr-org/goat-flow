/**
 * Quality command tests - prompt generation, payload contract, audit embedding.
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseCLIArgs } from "../../../src/cli/cli.js";
import { withStubbedDate } from "../../helpers/global-fixtures.js";
import { composeQuality } from "../../../src/cli/prompt/compose-quality.js";
import { runAudit } from "../../../src/cli/audit/audit.js";
import { createFS } from "../../../src/cli/facts/fs.js";
import type { QualityHistoryEntry } from "../../../src/cli/quality/history.js";
import { parseQualityReport } from "../../../src/cli/quality/schema.js";
import type { LearningLoopEntryFact } from "../../../src/cli/types.js";
import { makeSharedFacts } from "../../fixtures/projects/index.js";

export const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..");
export const CLI_PATH = join(PROJECT_ROOT, "src", "cli", "cli.ts");
// Node's --import flag rejects raw Windows paths (D:\...) as ERR_UNSUPPORTED_ESM_URL_SCHEME
// because it parses "D:" as a URL scheme. pathToFileURL produces the safe file:// form.
export const TSX_LOADER_URL = pathToFileURL(
  join(PROJECT_ROOT, "node_modules", "tsx", "dist", "loader.mjs"),
).href;
export const disposables: string[] = [];

after(() => {
  for (const dir of disposables) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Writes an isolated project root with the quality command log directory. */
export function makeTempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "goat-flow-quality-command-"));
  mkdirSync(join(root, ".goat-flow"), { recursive: true });
  disposables.push(root);
  return root;
}

export function runCLI(
  cwd: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ["--import", TSX_LOADER_URL, CLI_PATH, ...args],
    {
      cwd,
      encoding: "utf-8",
      timeout: 20000,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Extract the first ```json fenced block from a prompt string; throws when the fixture lacks one. */
export function extractExampleJson(prompt: string): string {
  const match = prompt.match(/```json\n([\s\S]*?)\n```/);
  if (!match) throw new Error("no ```json fenced block found in prompt");
  return match[1];
}

export function qualityContextEntry(
  overrides: Partial<LearningLoopEntryFact> & { title: string },
): LearningLoopEntryFact {
  return {
    sourcePath: ".goat-flow/footguns/auditor.md",
    kind: "footgun",
    title: overrides.title,
    status: "active",
    created: "2026-05-16",
    updated: null,
    resolved: null,
    excerpt: `${overrides.title} excerpt`,
    staleRefs: [],
    invalidLineRefs: [],
    hasValidAnchor: true,
    bucketSizeBytes: 1_000,
    order: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1: quality without --agent exits with usage error
// ---------------------------------------------------------------------------

export {
  after,
  describe,
  it,
  assert,
  resolve,
  join,
  pathToFileURL,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  tmpdir,
  spawnSync,
  parseCLIArgs,
  withStubbedDate,
  composeQuality,
  runAudit,
  createFS,
  parseQualityReport,
  makeSharedFacts,
};
