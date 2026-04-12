/**
 * Canonical cross-module constants for skills and version-aligned aliases.
 * Keep definitions here so detection, prompts, and audit checks stay in sync.
 */
import { getPackageVersion } from "./paths.js";

/** Canonical list of all GOAT Flow skill names (6 specialized skills + dispatcher = 7) */
export const SKILL_NAMES = [
  "goat",
  "goat-debug",
  "goat-plan",
  "goat-review",
  "goat-sbao",
  "goat-security",
  "goat-test",
] as const;

/**
 * Current rubric/audit version - derived from package.json so it stays in sync automatically.
 * Skills embed this as `goat-flow-skill-version: X` in their YAML frontmatter.
 */
export const RUBRIC_VERSION = getPackageVersion();
