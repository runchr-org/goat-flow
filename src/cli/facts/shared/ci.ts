/**
 * Gitignore fact extraction.
 * CI validation facts removed - CI workflow is a project-level concern.
 */
import type { SharedFacts, ReadonlyFS } from "../../types.js";

/** Gitignore entries that every project must include for secret protection. */
const REQUIRED_GITIGNORE_ENTRIES = [".env", "settings.local.json"];

/** Extract `.gitignore` presence and required-entry coverage. */
export function extractGitignoreFacts(
  fs: ReadonlyFS,
): SharedFacts["gitignore"] {
  const content = fs.readFile(".gitignore");
  return {
    exists: content !== null,
    hasRequiredEntries:
      content !== null &&
      REQUIRED_GITIGNORE_ENTRIES.every((entry) => content.includes(entry)),
  };
}
