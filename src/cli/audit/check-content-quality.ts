/**
 * Cold-path content quality linting (M05 § 1).
 *
 * Three detector families, all running on truth-bearing prose (instruction
 * files, installed skills, canonical docs). Ports logic inline from cclint
 * and agnix (per Assumption "no new runtime deps"):
 *
 *   - Vague-term detection (3-term conservative subset: `properly`,
 *     `correctly`, `appropriately`). INFO severity.
 *   - Generic-instruction detection (5 cclint regex patterns, e.g.
 *     "follow best practices"). WARNING severity.
 *   - Non-actionable statement detection (3 cclint regex patterns with
 *     negative lookaheads, e.g. bare "remember" without "to"). INFO.
 *
 * Both cclint code-block-skipping bugs are fixed here (ContentOrganizationRule
 * and ContentAppropriatenessRule both leak fenced-block content into their
 * matchers). A single `inCodeBlock` state machine is shared across all three
 * detector families — toggled on lines starting with ``` (after trimming).
 */
import type { AuditContext } from "./types.js";
import type { ContentFinding, ContentSeverity } from "./types.js";
import type { CheckEvidence } from "./provenance-types.js";
import { SKILL_NAMES } from "../constants.js";

interface PatternRule {
  rule: string;
  /** Compiled regex (case-insensitive, word-boundary handled inside the pattern). */
  pattern: RegExp;
  severity: ContentSeverity;
  message: (match: string, line: string) => string;
  suggestion?: (match: string, line: string) => string | undefined;
}

/** Target scope for content-quality checks: truth-bearing prose. */
const QUALITY_TARGETS = [
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".goat-flow/architecture.md",
  ".goat-flow/code-map.md",
  ".goat-flow/glossary.md",
  ".goat-flow/patterns.md",
  ".goat-flow/skill-reference/skill-preamble.md",
  ".goat-flow/skill-reference/skill-conventions.md",
  "docs/cli.md",
  "docs/skills.md",
  "docs/audit-and-quality.md",
] as const;

const VAGUE_TERMS: { term: string; suggestion: (line: string) => string }[] = [
  {
    term: "properly",
    suggestion: (line) =>
      /format|style/i.test(line)
        ? "Specify the exact format or style guide (e.g. 'Follow Prettier defaults' or 'Use 2-space indentation')."
        : "Be specific about the expected format or standard (e.g. 'Use 2-space indentation' instead of 'Format properly').",
  },
  {
    term: "correctly",
    suggestion: (_line) =>
      "Define what 'correct' means with measurable criteria.",
  },
  {
    term: "appropriately",
    suggestion: (_line) =>
      "Describe the specific situation and the expected response.",
  },
];

const GENERIC_INSTRUCTIONS: PatternRule[] = [
  {
    rule: "generic-best-practices",
    pattern: /follow\s+best\s+practices/i,
    severity: "warning",
    message: () =>
      "Avoid generic 'follow best practices'. Be specific about which practice applies here.",
  },
  {
    rule: "generic-good-code",
    pattern: /write\s+good\s+code/i,
    severity: "warning",
    message: () =>
      "Avoid vague 'write good code'. Be specific about the standards the reader must meet.",
  },
  {
    rule: "generic-correct",
    pattern: /do\s+it\s+correctly/i,
    severity: "warning",
    message: () =>
      "Avoid generic 'do it correctly'. Define what correct means with measurable criteria.",
  },
  {
    rule: "generic-common-sense",
    pattern: /use\s+common\s+sense/i,
    severity: "warning",
    message: () =>
      "Avoid 'use common sense'. Document the specific decision criteria the reader should apply.",
  },
  {
    rule: "generic-be-careful",
    pattern: /be\s+careful/i,
    severity: "warning",
    message: () =>
      "Instead of 'be careful', specify the exact risk and mitigation.",
  },
];

const NON_ACTIONABLE: PatternRule[] = [
  {
    // `note` dropped from cclint's term list — too many false positives on
    // goat-flow's own docs: label usage (`Note:`), direct-object verbs
    // (`note them`, `Note what X`) all match cclint's `(?!\s+to\s+)` guard
    // but are legitimate instructions. `remember | keep in mind | don't
    // forget` retain the non-actionable signal without the label clash.
    rule: "non-actionable-remember",
    pattern: /(?:\bremember\b|\bkeep in mind\b|\bdon'?t forget\b)(?!\s+to\s+)/i,
    severity: "info",
    message: (match) =>
      `"${match}" without "to <verb>" has no action. State what the reader must do.`,
  },
  {
    rule: "non-actionable-important",
    pattern: /it'?s\s+important(?!\s+to\s+)/i,
    severity: "info",
    message: () =>
      '"it\'s important" without "to <verb>" leaves the expected action unspecified.',
  },
  {
    rule: "non-actionable-should-know",
    pattern: /you\s+should\s+know(?!\s+that\s+)/i,
    severity: "info",
    message: () =>
      '"you should know" without "that <fact>" has no propositional content.',
  },
];

export const CONTENT_QUALITY_EVIDENCE: CheckEvidence = {
  source_type: "community",
  source_urls: [
    "https://github.com/blundergoat/cclint#contentappropriatenessrule",
    "https://github.com/blundergoat/cclint#contentorganizationrule",
  ],
  verified_on: "2026-04-17",
  normative_level: "SHOULD",
  evidence_paths: [".goat-flow/lessons/verification.md"],
};

/** One iteration of code-block state: toggled on fence lines, guards all matchers. */
function isFenceLine(line: string): boolean {
  return /^\s*```/.test(line);
}

/** Scan one line for vague, generic, or non-actionable guidance. */
function scanLine(
  line: string,
  lineNumber: number,
  path: string,
  findings: ContentFinding[],
): void {
  for (const { term, suggestion } of VAGUE_TERMS) {
    const rx = new RegExp(`\\b${term}\\b`, "i");
    const match = rx.exec(line);
    if (match) {
      findings.push({
        severity: "info",
        rule: "vague-term",
        path,
        line: lineNumber,
        message: `Vague term "${match[0]}" — no measurable standard.`,
        suggestion: suggestion(line),
      });
    }
  }
  for (const rule of GENERIC_INSTRUCTIONS) {
    const match = rule.pattern.exec(line);
    if (match) {
      findings.push({
        severity: rule.severity,
        rule: rule.rule,
        path,
        line: lineNumber,
        message: rule.message(match[0], line),
      });
    }
  }
  for (const rule of NON_ACTIONABLE) {
    const match = rule.pattern.exec(line);
    if (match) {
      findings.push({
        severity: rule.severity,
        rule: rule.rule,
        path,
        line: lineNumber,
        message: rule.message(match[0], line),
      });
    }
  }
}

/** Scan one file. Returns zero or more findings, skipping fenced code blocks. */
export function scanContentQuality(
  path: string,
  text: string,
): ContentFinding[] {
  const findings: ContentFinding[] = [];
  const lines = text.split(/\r?\n/);
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isFenceLine(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    scanLine(line, i + 1, path, findings);
  }
  return findings;
}

/** Full list of target paths, including every installed skill SKILL.md. */
function resolveTargets(): string[] {
  const targets: string[] = [...QUALITY_TARGETS];
  for (const agentDir of [".claude/skills", ".agents/skills"]) {
    for (const name of SKILL_NAMES) {
      targets.push(`${agentDir}/${name}/SKILL.md`);
    }
  }
  return targets;
}

/** Run content-quality checks across the configured documentation targets. */
export function runContentQualityChecks(ctx: AuditContext): {
  findings: ContentFinding[];
  filesScanned: number;
} {
  const findings: ContentFinding[] = [];
  let filesScanned = 0;
  for (const rel of resolveTargets()) {
    if (!ctx.fs.exists(rel)) continue;
    const text = ctx.fs.readFile(rel);
    if (text === null) continue;
    filesScanned++;
    findings.push(...scanContentQuality(rel, text));
  }
  return { findings, filesScanned };
}
