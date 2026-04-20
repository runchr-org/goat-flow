/**
 * Recovery concern: Can the agent resume after crash or compaction?
 * 2 checks: milestone-tracking, session-logs.
 */
import type { HarnessCheck } from "../types.js";
import type { CheckEvidence } from "../provenance-types.js";
import { pass, fail } from "./helpers.js";
import { collectMarkdownFiles } from "./helpers.js";

const VERIFIED_ON = "2026-04-18";

/** Return the recovery provenance. */
function recoveryProvenance(
  type: HarnessCheck["type"],
  paths: string[],
  sourceType: CheckEvidence["source_type"] = "spec",
): CheckEvidence {
  return {
    source_type: sourceType,
    source_urls: [],
    verified_on: VERIFIED_ON,
    normative_level:
      type === "integrity"
        ? "MUST"
        : type === "advisory"
          ? "SHOULD"
          : "BEST_PRACTICE",
    evidence_paths: paths,
  };
}

const milestoneTracking: HarnessCheck = {
  id: "milestone-tracking",
  name: "Milestone tracking configured",
  concern: "recovery",
  type: "integrity",
  provenance: recoveryProvenance("integrity", [
    "docs/harness-audit.md",
    ".goat-flow/architecture.md",
    ".goat-flow/tasks/README.md",
  ]),
  /** Run the Milestone tracking configured check. */
  run: (ctx) => {
    const tasksDir = ".goat-flow/tasks";
    if (!ctx.fs.exists(tasksDir)) {
      return fail(
        ["No tasks directory found"],
        ["Create .goat-flow/tasks/ for milestone tracking"],
        [
          "Create .goat-flow/tasks/ with milestone .md files containing - [ ] checkbox items for trackable progress.",
        ],
      );
    }
    const allMdFiles = collectMarkdownFiles(ctx.fs, tasksDir);
    // Filter to milestone-shaped files (M01-*, M1-*, milestone-*, or files with checkpoint content)
    const milestonePattern = /^M\d+-|^milestone-/i;
    const mdFiles = allMdFiles.filter((f) => {
      const name = f.split("/").pop() ?? "";
      if (milestonePattern.test(name)) return true;
      // Also include files that contain milestone structure (checkboxes + exit criteria)
      const content = ctx.fs.readFile(f);
      return content
        ? /- \[[ x]\]/.test(content) &&
            /exit criter|testing gate/i.test(content)
        : false;
    });
    if (allMdFiles.length === 0) {
      return pass(["Tasks directory exists (empty - valid for new projects)"]);
    }
    const checkboxPattern = /- \[[ x]\]/;
    let withCheckboxes = 0;
    for (const f of mdFiles) {
      const content = ctx.fs.readFile(f);
      if (content && checkboxPattern.test(content)) {
        withCheckboxes++;
      }
    }
    const extra = allMdFiles.length - mdFiles.length;
    const extraNote =
      extra > 0 ? ` (${extra} non-milestone .md files ignored)` : "";
    return pass([
      `${withCheckboxes}/${mdFiles.length} milestone files have trackable checkbox items${extraNote}`,
    ]);
  },
};

const sessionLogs: HarnessCheck = {
  id: "session-logs",
  name: "Session logs directory",
  concern: "recovery",
  type: "integrity",
  provenance: recoveryProvenance("integrity", [
    "docs/harness-audit.md",
    ".goat-flow/architecture.md",
  ]),
  /** Run the Session logs directory check. */
  run: (ctx) => {
    const logsDir = ".goat-flow/logs/sessions";
    try {
      ctx.fs.listDir(logsDir);
    } catch {
      return fail(
        ["No session logs directory"],
        ["Create .goat-flow/logs/sessions/ directory"],
        [
          "Create .goat-flow/logs/sessions/ and start logging sessions for continuity between conversations.",
        ],
      );
    }
    return pass(["Session logs directory exists"]);
  },
};

export const RECOVERY_CHECKS: HarnessCheck[] = [milestoneTracking, sessionLogs];
