/**
 * Recovery concern: Can the agent resume after crash or compaction?
 * Consolidated from 4 → 3 checks (milestone-files + milestone-has-checkboxes → milestone-tracking).
 */
import type { QualityCheck } from "../types.js";
import { pass, partial } from "./helpers.js";
import { collectMarkdownFiles } from "./helpers.js";

/** Consolidated: milestone-files + milestone-has-checkboxes */
const milestoneTracking: QualityCheck = {
  id: "milestone-tracking",
  concern: "recovery",
  weight: 2,
  run: (ctx) => {
    const tasksDir = ".goat-flow/tasks";

    if (!ctx.fs.exists(tasksDir)) {
      return partial(
        20,
        ["No tasks directory found"],
        ["Create milestone files with checkbox items in .goat-flow/tasks/"],
        [
          "Create .goat-flow/tasks/ with milestone .md files containing - [ ] checkbox items for trackable progress.",
        ],
      );
    }

    const mdFiles = collectMarkdownFiles(ctx.fs, tasksDir);
    if (mdFiles.length === 0) {
      return partial(
        30,
        ["Tasks directory empty"],
        ["Create milestone files for current work"],
        [
          "Create milestone .md files in .goat-flow/tasks/ to track current work.",
        ],
      );
    }

    const checkboxPattern = /- \[[ x]\]/;
    let withCheckboxes = 0;
    for (const f of mdFiles) {
      const content = ctx.fs.readFile(f);
      if (content && checkboxPattern.test(content)) {
        withCheckboxes++;
      }
    }

    if (withCheckboxes === 0) {
      return partial(
        40,
        [`${mdFiles.length} milestone files but none have checkbox items`],
        ["Add - [ ] checkbox items to milestone files for trackable progress"],
        [
          "Add - [ ] checkbox items to milestone files so agents can track and checkpoint progress.",
        ],
      );
    }
    return pass([
      `${withCheckboxes}/${mdFiles.length} milestone files have trackable checkbox items`,
    ]);
  },
};

const sessionLogs: QualityCheck = {
  id: "session-logs",
  concern: "recovery",
  weight: 1,
  run: (ctx) => {
    const logsDir = ".goat-flow/logs/sessions";
    let files: string[];
    try {
      files = ctx.fs.listDir(logsDir);
    } catch {
      return partial(
        30,
        ["No session logs directory"],
        ["Log sessions to .goat-flow/logs/sessions/"],
        [
          "Create .goat-flow/logs/sessions/ and start logging sessions for continuity between conversations.",
        ],
      );
    }
    if (files.length === 0) {
      return partial(
        40,
        ["No session logs"],
        ["Start logging sessions"],
        [
          "Start logging sessions to .goat-flow/logs/sessions/ for work continuity.",
        ],
      );
    }
    return pass([`${files.length} session logs found`]);
  },
};

const compactionHook: QualityCheck = {
  id: "compaction-hook",
  concern: "recovery",
  weight: 1,
  run: (ctx) => {
    const covered: string[] = [];
    const uncovered: string[] = [];
    for (const af of ctx.agents) {
      if (af.hooks.compactionHookExists) {
        covered.push(af.agent.id);
      } else {
        uncovered.push(af.agent.id);
      }
    }
    if (uncovered.length === 0) {
      return pass([`${covered.join(", ")}: compaction hook registered`]);
    }
    const nonCodexUncovered = uncovered.filter((id) => id !== "codex");
    const codexUncovered = uncovered.filter((id) => id === "codex");
    if (covered.length === 0 && nonCodexUncovered.length === 0) {
      return partial(
        30,
        ["No compaction hooks registered"],
        [
          "codex: context compaction not supported - this recommendation does not apply",
        ],
      );
    }
    const findings: string[] = [];
    const recs: string[] = [];
    const howToFix: string[] = [];
    if (nonCodexUncovered.length > 0) {
      findings.push(
        `${nonCodexUncovered.join(", ")}: no compaction hook registered`,
      );
      recs.push(`Add compaction hook for ${nonCodexUncovered.join(", ")}`);
      howToFix.push(
        `Register a compaction hook for ${nonCodexUncovered.join(", ")} that re-injects task state after context compression.`,
      );
    }
    if (codexUncovered.length > 0) {
      findings.push(`codex: no compaction hook registered`);
      recs.push(
        "codex: context compaction not supported - this recommendation does not apply",
      );
    }
    return partial(60, findings, recs, howToFix);
  },
};

export const RECOVERY_CHECKS: QualityCheck[] = [
  milestoneTracking,
  sessionLogs,
  compactionHook,
];
