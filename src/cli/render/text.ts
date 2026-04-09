/**
 * Terminal-oriented renderer for human-readable scan output.
 * This is the default CLI presentation layer and owns compact formatting, labels, and recommendation grouping.
 */
import type {
  ScanReport,
  AgentReport,
  CheckResult,
  AntiPatternResult,
  CheckStatus,
} from "../types.js";
import {
  getCheckSeverity,
  collectCheckFailureSummary,
  getTriggeredAntiPatterns,
  collectDiagnosticImpacts,
} from "./shared.js";

/** Recommendation priority levels used for display labels */
type Priority = "critical" | "high" | "medium" | "low";

/** Render a text-based progress bar using block characters */
function progressBar(percentage: number, width: number = 20): string {
  /** Number of filled blocks proportional to the percentage */
  const filled = Math.round((percentage / 100) * width);
  /** Remaining empty blocks */
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

/** Map a check status to its 4-character display label */
function statusIcon(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "partial":
      return "PART";
    case "fail":
      return "FAIL";
    case "na":
      return "N/A ";
  }
}

/** Map a priority level to its fixed-width display label */
function priorityLabel(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH    ";
    case "medium":
      return "MEDIUM  ";
    case "low":
      return "LOW     ";
  }
}

/** Append failing checks grouped by severity to the output buffer. */
function appendSeverityGroupedFailingChecks(
  lines: string[],
  checks: AgentReport["checks"],
): void {
  const critical: CheckResult[] = [];
  const high: CheckResult[] = [];
  const medium: CheckResult[] = [];
  const low: CheckResult[] = [];

  for (const check of checks) {
    if (check.status !== "fail" && check.status !== "partial") continue;
    const severity = getCheckSeverity(check);
    if (severity === "critical") critical.push(check);
    else if (severity === "high") high.push(check);
    else if (severity === "medium") medium.push(check);
    else low.push(check);
  }

  const groups: Array<{ name: string; checks: CheckResult[] }> = [
    { name: "CRITICAL", checks: critical },
    { name: "HIGH", checks: high },
    { name: "MEDIUM", checks: medium },
    { name: "LOW", checks: low },
  ];

  for (const group of groups) {
    if (group.checks.length === 0) continue;
    lines.push(`  ${group.name}:`);
    for (const check of group.checks) {
      lines.push(`    - ${check.id} ${check.name}: ${check.message}`);
    }
  }
}

/** Append the per-tier score breakdown for one agent. */
function appendTierScores(lines: string[], agent: AgentReport): void {
  const { foundation, standard, full } = agent.score.tiers;
  lines.push(
    `  Foundation:  ${String(foundation.earned).padStart(3)}/${foundation.available}  ${progressBar(foundation.percentage)}  ${foundation.percentage}%`,
  );
  lines.push(
    `  Standard:    ${String(standard.earned).padStart(3)}/${standard.available}  ${progressBar(standard.percentage)}  ${standard.percentage}%`,
  );
  if (full.available > 0) {
    lines.push(
      `  Full:        ${String(full.earned).padStart(3)}/${full.available}  ${progressBar(full.percentage)}  ${full.percentage}%`,
    );
  }
}

/** Append triggered anti-pattern deductions for one agent. */
function appendDeductionSummary(lines: string[], agent: AgentReport): void {
  lines.push(`  Deductions:  ${agent.score.deductions}`);
  for (const antiPattern of getTriggeredAntiPatterns(agent.antiPatterns)) {
    lines.push(
      `    ${antiPattern.id} ${antiPattern.name}: ${antiPattern.deduction} pts`,
    );
  }
}

/** Append the top remediation recommendations for one agent. */
function appendRecommendations(lines: string[], agent: AgentReport): void {
  if (agent.recommendations.length === 0) return;

  lines.push("Recommendations:");
  for (const recommendation of agent.recommendations.slice(0, 10)) {
    lines.push(
      `  [${priorityLabel(recommendation.priority)}] ${recommendation.checkId}: ${recommendation.action}`,
    );
  }
  if (agent.recommendations.length > 10) {
    lines.push(`  ... and ${agent.recommendations.length - 10} more`);
  }
  lines.push("");
}

/** Append the compact failure overview used in non-verbose output. */
function appendFailureOverview(lines: string[], agent: AgentReport): void {
  const counts = collectCheckFailureSummary(agent.checks);
  const totalChecks = counts.pass + counts.partial + counts.fail;
  const triggeredAntiPatterns = getTriggeredAntiPatterns(agent.antiPatterns);
  if (counts.fail + counts.partial === 0 && triggeredAntiPatterns.length === 0)
    return;

  lines.push(
    `Failures: ${counts.fail} failed, ${counts.partial} partial, ${counts.pass} pass / ${totalChecks} checks.`,
  );
  lines.push(
    `Critical: ${counts.severityCounts.critical} | High: ${counts.severityCounts.high} | Medium: ${counts.severityCounts.medium} | Low: ${counts.severityCounts.low}`,
  );
  if (counts.fail + counts.partial > 0) {
    appendSeverityGroupedFailingChecks(lines, agent.checks);
  }
  if (triggeredAntiPatterns.length > 0) {
    lines.push(`Anti-patterns triggered: ${triggeredAntiPatterns.length}`);
  }
  lines.push("");
}

/** Append the full per-check section for verbose output. */
function appendCheckDetails(lines: string[], agent: AgentReport): void {
  const counts = collectCheckFailureSummary(agent.checks);
  const totalChecks = counts.pass + counts.partial + counts.fail;
  lines.push(
    `Failures: ${counts.fail} failed, ${counts.partial} partial, ${counts.pass} pass / ${totalChecks} checks.`,
  );
  lines.push(
    `Critical: ${counts.severityCounts.critical} | High: ${counts.severityCounts.high} | Medium: ${counts.severityCounts.medium} | Low: ${counts.severityCounts.low}`,
  );
  if (counts.fail + counts.partial > 0) {
    appendSeverityGroupedFailingChecks(lines, agent.checks);
    if (getTriggeredAntiPatterns(agent.antiPatterns).length > 0) {
      lines.push(
        `Anti-patterns triggered: ${getTriggeredAntiPatterns(agent.antiPatterns).length}`,
      );
    }
  }
  lines.push("");

  lines.push("Check Details:");
  for (const check of agent.checks) {
    lines.push(renderCheck(check));
  }
  lines.push("");
}

/** Append detailed anti-pattern deductions for verbose output. */
function appendAntiPatternDetails(
  lines: string[],
  antiPatterns: AntiPatternResult[],
): void {
  if (antiPatterns.length === 0) return;

  lines.push("Anti-Pattern Deductions:");
  for (const antiPattern of antiPatterns) {
    lines.push(renderAntiPattern(antiPattern));
  }
  lines.push("");
}

/** Append the highest-impact fixes and score recovery summary. */
function appendDiagnosticSummary(
  lines: string[],
  impacts: Array<{ label: string; points: number; priority: string }>,
): void {
  if (impacts.length === 0) return;

  lines.push("Diagnostic Summary:");
  for (const item of impacts.slice(0, 5)) {
    lines.push(
      `  ${priorityLabel(item.priority as Priority)
        .trim()
        .padEnd(8)} ${item.label} (${item.points} pts recoverable)`,
    );
  }
  lines.push("");
  const top = impacts[0];
  if (top)
    lines.push(
      `  Highest-impact fix: ${top.label} - recovers ${top.points} points`,
    );
  if (impacts.length > 0) {
    const topThree = impacts.slice(0, 3).map((item) => item.label);
    lines.push(`  Top ${topThree.length} to fix next: ${topThree.join("; ")}`);
  }
  lines.push("");
}

/** Append the verbose-only diagnostics section. */
function appendVerboseDetails(lines: string[], agent: AgentReport): void {
  appendCheckDetails(lines, agent);
  appendAntiPatternDetails(lines, getTriggeredAntiPatterns(agent.antiPatterns));
  appendDiagnosticSummary(lines, collectDiagnosticImpacts(agent));
}

/** Render a scan report as human-readable plain text */
export function renderText(report: ScanReport, verbose: boolean): string {
  /** Accumulated output lines joined into the final text */
  const lines: string[] = [];

  lines.push(`GOAT Flow Audit: ${report.target}`);
  if (report.stack.languages.length > 0) {
    lines.push(`Stack: ${report.stack.languages.join(", ")}`);
  }
  lines.push(
    `Learning loop: footguns ${report.meta.learningLoop.footguns.count} | lessons ${report.meta.learningLoop.lessons.count}`,
  );
  lines.push(
    `Config: ${report.meta.config.exists ? (report.meta.config.valid ? ".goat-flow/config.yaml valid" : ".goat-flow/config.yaml invalid") : ".goat-flow/config.yaml missing (defaults active)"}`,
  );
  lines.push("");

  if (report.agents.length === 0) {
    lines.push("No GOAT Flow agents detected.");
    lines.push("No CLAUDE.md, AGENTS.md, or GEMINI.md found.");
    lines.push("");
    lines.push("Get started: https://github.com/blundergoat/goat-flow");
    return lines.join("\n");
  }

  // Iterate over each detected agent to render its report section
  for (const agent of report.agents) {
    lines.push(renderAgent(agent, verbose));
    lines.push("");
  }

  lines.push(
    `Rubric: v${report.rubricVersion} | Checks: ${report.meta.checkCount} | Anti-patterns: ${report.meta.antiPatternCount}`,
  );

  return lines.join("\n");
}

/** Filter out hidden checks that should not appear in output */
function visibleChecks(agent: AgentReport): AgentReport {
  return { ...agent, checks: agent.checks.filter((c) => !c.hidden) };
}

/** Render a single agent's report including grade, tiers, and recommendations */
function renderAgent(agent: AgentReport, verbose: boolean): string {
  /** Agent with hidden checks filtered out for display (scores are unaffected) */
  const display = visibleChecks(agent);
  /** Accumulated output lines for this agent */
  const lines: string[] = [];
  /** Destructured score summary for the agent */
  const { score } = agent;

  lines.push(`--- ${agent.agentName} ---`);
  lines.push("");

  if (score.grade === "insufficient-data") {
    lines.push("Grade: Insufficient Data (<10% checks applicable)");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`Grade: ${score.grade} (${score.percentage}%)`);
  lines.push("");
  appendTierScores(lines, agent);

  if (score.deductions < 0) {
    appendDeductionSummary(lines, agent);
  }

  lines.push("");
  if (!verbose) appendFailureOverview(lines, display);
  appendRecommendations(lines, agent);
  if (verbose) appendVerboseDetails(lines, display);

  return lines.join("\n");
}

/** Format a single check result as a bracketed status line */
function renderCheck(check: CheckResult): string {
  /** 4-character status label */
  const status = statusIcon(check.status);
  /** Points display, or N/A for non-applicable checks */
  const points =
    check.status === "na" ? "N/A" : `${check.points}/${check.maxPoints}`;
  /** Optional evidence suffix */
  const evidence = check.evidence ? ` (${check.evidence})` : "";
  return `  [${status}] ${check.id} ${check.name}: ${points}${evidence}`;
}

/** Format a single triggered anti-pattern as a bracketed deduction line */
function renderAntiPattern(ap: AntiPatternResult): string {
  return `  [${ap.id}] ${ap.name}: ${ap.deduction} - ${ap.message}`;
}
