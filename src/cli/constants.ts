/**
 * Canonical cross-module constants for skills and version-aligned aliases.
 * Keep definitions here so detection, prompts, and scanner checks stay in sync.
 */
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
 * Current skill template version - matches the package/rubric version.
 * Skills embed this as `goat-flow-skill-version: X` in their YAML frontmatter.
 * The scanner compares the embedded version against this constant.
 * Re-exported from version.ts to keep a single source of truth.
 */
export { RUBRIC_VERSION as SKILL_VERSION } from "./rubric/version.js";
