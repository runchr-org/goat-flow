/**
 * Feedback Loop concern: Is the harness getting smarter from failures?
 * Consolidated from 4 → 2 checks (footgun-activity + lesson-activity + feedback-recency → feedback-loop-active).
 */
import type { QualityCheck } from "../types.js";
import { pass, partial } from "./helpers.js";
import { parseCreatedDates } from "./helpers.js";

/** Consolidated: footgun-activity + lesson-activity + feedback-recency */
const feedbackLoopActive: QualityCheck = {
  id: "feedback-loop-active",
  concern: "feedback_loop",
  weight: 3,
  run: (ctx) => {
    const footgunCount = ctx.facts.shared.footguns.entryCount;
    const lessonCount = ctx.facts.shared.lessons.entryCount;
    const totalEntries = footgunCount + lessonCount;

    // No entries at all
    if (totalEntries === 0) {
      return partial(
        20,
        ["No footgun or lesson entries logged"],
        [
          "Start logging footguns (architectural traps) and lessons (behavioral mistakes)",
        ],
        [
          "Add entries to .goat-flow/footguns/ and .goat-flow/lessons/ as issues are discovered.",
        ],
      );
    }

    // Check recency
    const allDates: Date[] = [];
    const collectDates = (dirPath: string) => {
      try {
        for (const f of ctx.fs.listDir(dirPath)) {
          if (!f.endsWith(".md")) continue;
          const content = ctx.fs.readFile(`${dirPath}/${f}`);
          if (content) allDates.push(...parseCreatedDates(content));
        }
      } catch {
        // Directory doesn't exist
      }
    };
    collectDates(ctx.config.config.footguns.path);
    collectDates(ctx.config.config.lessons.path);

    const findings: string[] = [];
    findings.push(`${footgunCount} footgun entries`);
    findings.push(`${lessonCount} lesson entries`);

    if (allDates.length > 0) {
      const now = new Date();
      const ninetyDaysAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 90,
      );
      const recentCount = allDates.filter((d) => d >= ninetyDaysAgo).length;

      if (recentCount === 0) {
        const newest = allDates.sort((a, b) => b.getTime() - a.getTime())[0]!;
        const daysAgo = Math.round(
          (now.getTime() - newest.getTime()) / (1000 * 60 * 60 * 24),
        );
        findings.push(
          `No entries in last 90 days (newest: ${daysAgo} days ago)`,
        );
        return partial(
          40,
          findings,
          [
            "Capture recent footguns and lessons to keep the feedback loop active",
          ],
          [
            "Add new footgun or lesson entries from recent work to .goat-flow/footguns/ and .goat-flow/lessons/.",
          ],
        );
      }
      findings.push(
        `${recentCount}/${allDates.length} feedback entries are from the last 90 days`,
      );
    }

    if (totalEntries < 3) {
      return partial(
        60,
        findings,
        ["Continue logging to build institutional memory"],
        [
          "Add more entries to .goat-flow/footguns/ and .goat-flow/lessons/ to build institutional memory.",
        ],
      );
    }

    return pass(findings);
  },
};

const decisionsTracked: QualityCheck = {
  id: "decisions-tracked",
  concern: "feedback_loop",
  weight: 1,
  run: (ctx) => {
    const { decisions } = ctx.facts.shared;
    if (!decisions.dirExists) {
      return partial(
        30,
        ["No decisions directory"],
        [
          "Create .goat-flow/decisions/ and log significant technical decisions",
        ],
        [
          "Create .goat-flow/decisions/ and log significant technical decisions with context and rationale.",
        ],
      );
    }
    if (decisions.fileCount === 0) {
      return partial(
        40,
        ["Decisions directory empty"],
        ["Log architectural decisions with context and rationale"],
        [
          "Add decision records to .goat-flow/decisions/ with rationale and alternatives considered.",
        ],
      );
    }
    return pass([`${decisions.fileCount} decision records`]);
  },
};

export const FEEDBACK_LOOP_CHECKS: QualityCheck[] = [
  feedbackLoopActive,
  decisionsTracked,
];
