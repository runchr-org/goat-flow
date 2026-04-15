/**
 * Canonical cross-module constants for skills and version-aligned aliases.
 * Keep definitions here so detection, prompts, and audit checks stay in sync.
 */
import { getPackageVersion } from "./paths.js";

/** Canonical list of all GOAT Flow skill names (single mono-skill dispatcher) */
export const SKILL_NAMES = ["goat"] as const;

/**
 * Current audit version - derived from package.json so it stays in sync automatically.
 * Skills embed this as `goat-flow-skill-version: X` in their YAML frontmatter.
 */
export const AUDIT_VERSION = getPackageVersion();
