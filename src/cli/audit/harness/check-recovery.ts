/**
 * Recovery concern: Can the agent resume after crash or compaction?
 * 2 checks: milestone-tracking, session-logs.
 */
import type { HarnessCheck } from "../types.js";
import type { CheckEvidence } from "../provenance-types.js";
import { pass, fail } from "./helpers.js";
import { collectMarkdownFiles } from "./helpers.js";

const VERIFIED_ON = "2026-04-18";

interface MilestoneProgress {
  path: string;
  status: string | null;
  checked: number;
  unchecked: number;
  total: number;
  hasClearNextAction: boolean;
  hasUncheckedTestingGate: boolean;
  isArchived: boolean;
}

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

function extractStatus(content: string): string | null {
  const match = content.match(/^\*\*Status:\*\*\s*([^|\n]+)/im);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function hasClearNextAction(content: string): boolean {
  return (
    /^\s*(?:- \[[ xX]\]\s*)?(?:\*\*)?Next action(?:\*\*)?:\s*\S/im.test(
      content,
    ) || /^##+\s*Next action\b/im.test(content)
  );
}

function hasUncheckedTestingGate(content: string): boolean {
  const match = content.match(/^##+\s*Testing Gate\b[\s\S]*?(?=^##+\s|\s*$)/im);
  return Boolean(match?.[0] && /- \[ \]/.test(match[0]));
}

function countProgress(path: string, content: string): MilestoneProgress {
  const checkboxMatches = content.match(/- \[[ xX]\]/g) ?? [];
  const checkedMatches = content.match(/- \[[xX]\]/g) ?? [];
  return {
    path,
    status: extractStatus(content),
    checked: checkedMatches.length,
    unchecked: checkboxMatches.length - checkedMatches.length,
    total: checkboxMatches.length,
    hasClearNextAction: hasClearNextAction(content),
    hasUncheckedTestingGate: hasUncheckedTestingGate(content),
    isArchived: path.includes("/_archived/"),
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
    const progress: MilestoneProgress[] = [];
    for (const f of mdFiles) {
      const content = ctx.fs.readFile(f);
      if (content) progress.push(countProgress(f, content));
    }
    const extra = allMdFiles.length - mdFiles.length;
    const extraNote =
      extra > 0 ? ` (${extra} non-milestone .md files ignored)` : "";
    const checked = progress.reduce((sum, item) => sum + item.checked, 0);
    const total = progress.reduce((sum, item) => sum + item.total, 0);
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
    const zeroProgress = progress.filter(
      (item) => item.total > 0 && item.checked === 0,
    );
    const degraded = progress.filter((item) => {
      if (item.isArchived) return false;
      if (item.status === "testing-gate") {
        return item.unchecked > 0 || item.hasUncheckedTestingGate;
      }
      if (item.status === "in-progress" || item.status === "active") {
        return item.unchecked > 0 && !item.hasClearNextAction;
      }
      return false;
    });
    const findings = [
      `${checked}/${total} checkboxes complete (${percent}%) across ${mdFiles.length} milestone files${extraNote}`,
      "Planned, complete, and archived milestone checkbox counts are reported as local working state; active/testing-gate milestones are status-checked for resumability.",
    ];
    if (zeroProgress.length > 0) {
      findings.push(
        `${zeroProgress.length} milestone files are at 0%: ${zeroProgress.map((item) => item.path).join(", ")}`,
      );
    }
    if (degraded.length > 0) {
      findings.push(
        `Recovery degraded: ${degraded
          .map((item) => {
            const status = item.status ?? "unknown-status";
            const reason =
              status === "testing-gate"
                ? "unchecked tasks or testing gate items"
                : "unchecked tasks without a clear next action";
            return `${item.path} (${status}: ${reason})`;
          })
          .join(", ")}`,
      );
      return fail(
        findings,
        [
          "Update active/testing-gate milestone files before relying on recovery state",
        ],
        [
          "Tick completed checklist items, record a clear Next action for in-progress work, and do not leave testing-gate milestones with unchecked tasks or gates.",
        ],
      );
    }
    return pass(findings);
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
