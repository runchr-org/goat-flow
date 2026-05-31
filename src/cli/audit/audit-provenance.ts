import { existsSync } from "node:fs";
import type { ReadonlyFS } from "../types.js";
import { getTemplatePath, isPackagedInstall } from "../paths.js";
import { AGENT_CHECKS } from "./check-agent-setup.js";
import { SETUP_CHECKS } from "./check-goat-flow.js";
import { HARNESS_CHECKS } from "./harness/index.js";
import { validateProvenance, type CheckEvidence } from "./provenance-types.js";

const FRAMEWORK_EVIDENCE_PREFIXES = [
  "workflow/",
  "docs/",
  ".goat-flow/footguns/",
  ".goat-flow/lessons/",
  ".goat-flow/decisions/",
  ".goat-flow/skill-reference/",
  ".goat-flow/skill-playbooks/",
];

const FRAMEWORK_EVIDENCE_PATHS = new Set([
  "README.md",
  ".goat-flow/architecture.md",
  ".goat-flow/code-map.md",
  ".goat-flow/glossary.md",
]);

/** Classify evidence paths that describe goat-flow framework truth rather than target-project files. */
function isFrameworkEvidencePath(path: string): boolean {
  return (
    FRAMEWORK_EVIDENCE_PATHS.has(path) ||
    FRAMEWORK_EVIDENCE_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

/** Deduplicate strings while preserving order for stable evidence output. */
function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Add explicit path-base labels while preserving legacy `evidence_paths`. */
export function labelEvidencePathBases(
  provenance: CheckEvidence,
): CheckEvidence {
  const paths = provenance.evidence_paths ?? [];
  if (paths.length === 0) return provenance;

  const frameworkPaths = paths.filter(isFrameworkEvidencePath);
  const targetPaths = paths.filter((path) => !isFrameworkEvidencePath(path));
  return {
    ...provenance,
    ...(frameworkPaths.length > 0
      ? {
          framework_evidence_paths: unique([
            ...(provenance.framework_evidence_paths ?? []),
            ...frameworkPaths,
          ]),
        }
      : {}),
    ...(targetPaths.length > 0
      ? {
          target_evidence_paths: unique([
            ...(provenance.target_evidence_paths ?? []),
            ...targetPaths,
          ]),
        }
      : {}),
  };
}

/** Validate registered check provenance once per process; throws when dev evidence paths are stale. */
let provenanceValidated = false;

/** Validate provenance on every registered check against the target project or package root.
 *
 *  In packaged installs, `evidence_paths` pointing at framework-repo docs
 *  (`.goat-flow/footguns/*`, `.goat-flow/lessons/*`, `docs/*`) can't be
 *  resolved because those files aren't in `package.json` `files`. Skip the
 *  existence check there - the paths are human-readable pointers for future
 *  maintainers, not runtime contracts. In dev mode we keep the check so
 *  stale provenance surfaces in preflight. */
export function validateRegisteredCheckProvenance(fs: ReadonlyFS): void {
  if (provenanceValidated) return;
  const checks = [...SETUP_CHECKS, ...AGENT_CHECKS, ...HARNESS_CHECKS];
  const errors: string[] = [];
  const pathExists = isPackagedInstall()
    ? undefined
    : (p: string) => fs.exists(p) || existsSync(getTemplatePath(p));
  for (const check of checks) {
    for (const error of validateProvenance(check.provenance, pathExists)) {
      errors.push(`${check.id}: ${error}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `Invalid audit check provenance:\n- ${errors.join("\n- ")}`,
    );
  }
  provenanceValidated = true;
}
