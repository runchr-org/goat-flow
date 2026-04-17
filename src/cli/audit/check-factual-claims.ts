/**
 * Factual-claim extraction for cold-path docs (M05 § 2).
 *
 * Catches the documented failure class from `.goat-flow/lessons/verification.md`
 * ("Structural audit passing hides cold-path content drift"): README/doc prose
 * that claims wrong skill counts, wrong check counts, or points at files that
 * no longer exist. All counts compared against the code constants that are the
 * single source of truth.
 *
 * Scope per milestone Assumption: `README.md`, `CONTRIBUTING.md`, `docs/*.md`,
 * `.goat-flow/architecture.md`, `.goat-flow/code-map.md`. Lesson and footgun
 * files legitimately discuss historical counts in prose — excluded.
 */
import type { AuditContext, ContentFinding } from "./types.js";
import type { CheckEvidence } from "./provenance-types.js";
import { SKILL_NAMES } from "../constants.js";
import { SETUP_CHECKS } from "./check-goat-flow.js";
import { AGENT_CHECKS } from "./check-agent-setup.js";
import { HARNESS_CHECKS } from "./harness/index.js";
import { loadManifest } from "../manifest/manifest.js";

export const FACTUAL_CLAIMS_EVIDENCE: CheckEvidence = {
  source_type: "incident",
  source_urls: [],
  verified_on: "2026-04-17",
  normative_level: "MUST",
  evidence_paths: [
    ".goat-flow/lessons/verification.md",
    ".goat-flow/lessons/agent-behavior.md",
  ],
};

const PROSE_TARGETS = [
  "README.md",
  "CONTRIBUTING.md",
  ".goat-flow/architecture.md",
  ".goat-flow/code-map.md",
];

const DOC_GLOB = "docs/*.md";

/** Files where a loose `N views`/`N presets` pattern is safe because the file
 *  is dashboard-specific. Outside these files, the pattern would false-positive
 *  on generic prose, so we keep it scoped. */
const DASHBOARD_SCOPED_TARGETS = ["docs/dashboard.md"];

/** Looser view/preset patterns that only run against DASHBOARD_SCOPED_TARGETS. */
const DASHBOARD_SCOPED_CHECKS: CountClaimCheck[] = [
  {
    rule: "dashboard-views-count-drift",
    pattern: /\b(\d+)\s+views?\b/gi,
    actual: () => loadManifest().facts.dashboard_views.count,
    label: "views",
  },
  {
    rule: "preset-count-drift",
    pattern: /\b(\d+)\s+presets?\b/gi,
    actual: () => loadManifest().facts.presets.count,
    label: "presets",
  },
];

/** Path-reference check runs only on these two files — they're the catalogues. */
const PATH_REF_TARGETS = [
  ".goat-flow/architecture.md",
  ".goat-flow/code-map.md",
];

interface CountClaimCheck {
  rule: string;
  /** Regex with ONE capturing group for the claimed number. */
  pattern: RegExp;
  actual: () => number;
  label: string;
}

const COUNT_CHECKS: CountClaimCheck[] = [
  {
    rule: "skill-count-drift",
    pattern: /\b(\d+)\s+skills?\b/gi,
    actual: () => SKILL_NAMES.length,
    label: "skills",
  },
  {
    rule: "agent-check-count-drift",
    pattern: /\b(\d+)\s+checks?\s+per\s+(?:configured\s+)?agent\b/gi,
    actual: () => AGENT_CHECKS.length,
    label: "checks per configured agent",
  },
  {
    rule: "harness-check-count-drift",
    pattern: /\b(\d+)\s+checks\s+across\s+\d+\s+concerns\b/gi,
    actual: () => HARNESS_CHECKS.length,
    label: "harness checks across 5 concerns",
  },
  {
    rule: "setup-check-count-drift",
    pattern: /\b(\d+)\s+checks\s+on\s+goat-flow-owned\s+surfaces\b/gi,
    actual: () => SETUP_CHECKS.length,
    label: "setup checks on goat-flow-owned surfaces",
  },
  {
    rule: "dashboard-views-count-drift",
    pattern: /\b(\d+)\s+dashboard\s+views?\b/gi,
    actual: () => loadManifest().facts.dashboard_views.count,
    label: "dashboard views",
  },
  {
    rule: "preset-count-drift",
    pattern: /\b(\d+)\s+workspace\s+presets?\b/gi,
    actual: () => loadManifest().facts.presets.count,
    label: "workspace presets",
  },
];

function isFenceLine(line: string): boolean {
  return /^\s*```/.test(line);
}

/** Scan one doc file for numeric-count drift using the provided check set. */
export function scanCountClaims(
  path: string,
  text: string,
  checks: CountClaimCheck[] = COUNT_CHECKS,
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
    for (const check of checks) {
      const rx = new RegExp(check.pattern.source, check.pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = rx.exec(line)) !== null) {
        const claimed = Number(match[1]);
        const actual = check.actual();
        if (claimed !== actual) {
          findings.push({
            severity: "warning",
            rule: check.rule,
            path,
            line: i + 1,
            message: `Doc claims ${claimed} ${check.label}, code says ${actual}.`,
            suggestion: `Update "${match[0]}" to match the actual count (${actual}).`,
          });
        }
      }
    }
  }
  return findings;
}

/** Extract backtick-wrapped repo-relative paths and flag ones that don't exist. */
export function scanPathReferences(
  path: string,
  text: string,
  ctx: AuditContext,
): ContentFinding[] {
  const findings: ContentFinding[] = [];
  const lines = text.split(/\r?\n/);
  let inCodeBlock = false;
  // Backtick-wrapped paths that look repo-local.
  const rx = /`([^`\s]+)`/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isFenceLine(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    let match: RegExpExecArray | null;
    rx.lastIndex = 0;
    while ((match = rx.exec(line)) !== null) {
      const candidate = match[1] ?? "";
      if (!looksLikeRepoPath(candidate)) continue;
      const cleaned = candidate.replace(/[)\].,;:]+$/, ""); // trim trailing punctuation
      if (ctx.fs.exists(cleaned)) continue;
      findings.push({
        severity: "info",
        rule: "path-ref-unresolved",
        path,
        line: i + 1,
        message: `Referenced path \`${cleaned}\` does not exist in the project.`,
      });
    }
  }
  return findings;
}

const REPO_PATH_PREFIXES = [
  "src/",
  "workflow/",
  ".goat-flow/",
  "scripts/",
  "docs/",
  "test/",
  ".claude/",
  ".codex/",
  ".gemini/",
  ".agents/",
  ".github/",
];

function looksLikeRepoPath(candidate: string): boolean {
  if (candidate.length < 3) return false;
  if (candidate.startsWith("http")) return false;
  // Glob patterns are not literal paths — skip them.
  if (candidate.includes("*") || candidate.includes("?")) return false;
  return REPO_PATH_PREFIXES.some((p) => candidate.startsWith(p));
}

function collectTargets(ctx: AuditContext): string[] {
  const targets: string[] = [];
  for (const rel of PROSE_TARGETS) {
    if (ctx.fs.exists(rel)) targets.push(rel);
  }
  for (const rel of ctx.fs.glob(DOC_GLOB)) {
    targets.push(rel);
  }
  return targets;
}

export function runFactualClaimChecks(ctx: AuditContext): {
  findings: ContentFinding[];
  filesScanned: number;
} {
  const findings: ContentFinding[] = [];
  let filesScanned = 0;
  for (const rel of collectTargets(ctx)) {
    const text = ctx.fs.readFile(rel);
    if (text === null) continue;
    filesScanned++;
    findings.push(...scanCountClaims(rel, text));
  }
  // Dashboard-specific loose patterns (safe only on dashboard docs).
  for (const rel of DASHBOARD_SCOPED_TARGETS) {
    if (!ctx.fs.exists(rel)) continue;
    const text = ctx.fs.readFile(rel);
    if (text === null) continue;
    findings.push(...scanCountClaims(rel, text, DASHBOARD_SCOPED_CHECKS));
  }
  for (const rel of PATH_REF_TARGETS) {
    if (!ctx.fs.exists(rel)) continue;
    const text = ctx.fs.readFile(rel);
    if (text === null) continue;
    findings.push(...scanPathReferences(rel, text, ctx));
  }
  return { findings, filesScanned };
}
