/**
 * Renderers for AuditReport: text (terminal), json (stable schema), markdown (PR comments).
 */
import type { AuditConcernKey, AuditReport, AuditScope } from "./types.js";

// === Text renderer ===

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function statusBadge(status: "pass" | "fail"): string {
  return status === "pass"
    ? `${GREEN}PASS${RESET}`
    : `${RED}FAIL${RESET}`;
}

function renderTextScope(name: string, scope: AuditScope): string {
  const lines: string[] = [];
  lines.push(`${name}:${" ".repeat(Math.max(1, 20 - name.length))}${statusBadge(scope.status)}`);
  for (const [key, value] of Object.entries(scope.summary)) {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`  ${label}:${" ".repeat(Math.max(1, 18 - label.length))}${value}`);
  }
  for (const f of scope.failures) {
    lines.push(`  ${RED}x ${f.check}: ${f.message}${RESET}`);
  }
  return lines.join("\n");
}

const CONCERN_LABELS: Record<AuditConcernKey, string> = {
  context: "Context",
  constraints: "Constraints",
  verification: "Verification",
  recovery: "Recovery",
  feedback_loop: "Feedback Loop",
};

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return YELLOW;
  return RED;
}

export function renderAuditText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`${BOLD}GOAT Flow Audit: ${report.target}${RESET}`);
  lines.push("");

  // Build scopes
  lines.push(renderTextScope("setup", report.scopes.setup));
  lines.push("");
  lines.push(renderTextScope("project", report.scopes.project));
  lines.push("");
  lines.push(renderTextScope("integration", report.scopes.integration));
  lines.push("");

  lines.push(`Result: ${statusBadge(report.status)}`);

  // Quality concerns
  if (report.concerns) {
    lines.push("");
    lines.push(`${BOLD}Quality by harness concern:${RESET}`);
    lines.push("");

    for (const key of Object.keys(report.concerns) as AuditConcernKey[]) {
      const concern = report.concerns[key];
      const label = CONCERN_LABELS[key];
      const color = scoreColor(concern.score);
      lines.push(`  ${CYAN}${label}${RESET} (${color}${concern.score}%${RESET})`);
      for (const finding of concern.findings) {
        lines.push(`    ${DIM}${finding}${RESET}`);
      }
      if (concern.recommendations.length > 0) {
        for (const rec of concern.recommendations) {
          lines.push(`    ${YELLOW}-> ${rec}${RESET}`);
        }
      }
      lines.push("");
    }

    if (report.overall.grade && report.overall.qualityScore !== null) {
      const color = scoreColor(report.overall.qualityScore);
      lines.push(
        `Overall Quality: ${color}${report.overall.grade} (${report.overall.qualityScore}%)${RESET}`,
      );
    }
  }

  return lines.join("\n");
}

// === JSON renderer ===

export function renderAuditJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

// === Markdown renderer ===

function mdScopeStatus(status: "pass" | "fail"): string {
  return status === "pass" ? "PASS" : "FAIL";
}

function renderMdScope(name: string, scope: AuditScope): string {
  const lines: string[] = [];
  lines.push(`### ${name}: ${mdScopeStatus(scope.status)}`);
  for (const [key, value] of Object.entries(scope.summary)) {
    lines.push(`- **${key}**: ${value}`);
  }
  for (const f of scope.failures) {
    lines.push(`- :x: **${f.check}**: ${f.message}`);
  }
  return lines.join("\n");
}

export function renderAuditMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# GOAT Flow Audit: ${report.target}`);
  lines.push("");
  lines.push(`**Result: ${mdScopeStatus(report.status)}**`);
  lines.push("");

  lines.push(renderMdScope("Setup", report.scopes.setup));
  lines.push("");
  lines.push(renderMdScope("Project", report.scopes.project));
  lines.push("");
  lines.push(renderMdScope("Integration", report.scopes.integration));

  if (report.concerns) {
    lines.push("");
    lines.push("## Quality by harness concern");
    lines.push("");

    for (const key of Object.keys(report.concerns) as AuditConcernKey[]) {
      const concern = report.concerns[key];
      const label = CONCERN_LABELS[key];
      lines.push(`### ${label} (${concern.score}%)`);
      for (const finding of concern.findings) {
        lines.push(`- ${finding}`);
      }
      for (const rec of concern.recommendations) {
        lines.push(`- *Recommendation:* ${rec}`);
      }
      lines.push("");
    }

    if (report.overall.grade && report.overall.qualityScore !== null) {
      lines.push(
        `**Overall Quality: ${report.overall.grade} (${report.overall.qualityScore}%)**`,
      );
    }
  }

  return lines.join("\n");
}
