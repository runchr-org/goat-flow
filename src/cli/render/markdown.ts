import type { ScanReport, AgentReport, AntiPatternResult, CheckResult } from '../types.js';

const RECOMMENDATION_TAGS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟡',
} as const;

type Priority = 'critical' | 'high' | 'medium' | 'low';
type CheckSeverity = Priority;

function checkSeverityFromTier(tier: string): CheckSeverity {
  if (tier === 'foundation') return 'critical';
  if (tier === 'standard') return 'high';
  return 'medium';
}

function getCheckSeverity(check: CheckResult): CheckSeverity {
  if (check.status === 'partial' && check.tier === 'full') return 'low';
  return checkSeverityFromTier(check.tier);
}

function getTriggeredAntiPatterns(antiPatterns: AntiPatternResult[]): AntiPatternResult[] {
  return antiPatterns.filter(antiPattern => antiPattern.triggered);
}

function collectCheckFailureSummary(checks: AgentReport['checks']): {
  fail: number;
  partial: number;
  pass: number;
  severityCounts: Record<CheckSeverity, number>;
} {
  const summary = {
    fail: 0,
    partial: 0,
    pass: 0,
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 } as Record<CheckSeverity, number>,
  };

  for (const check of checks) {
    if (check.status === 'fail') {
      summary.fail += 1;
      summary.severityCounts[getCheckSeverity(check)] += 1;
      continue;
    }
    if (check.status === 'partial') {
      summary.partial += 1;
      summary.severityCounts.low += 1;
      continue;
    }
    if (check.status === 'pass') {
      summary.pass += 1;
    }
  }

  return summary;
}

function appendSeverityGroupedFailingChecks(lines: string[], checks: AgentReport['checks']): void {
  const critical: CheckResult[] = [];
  const high: CheckResult[] = [];
  const medium: CheckResult[] = [];
  const low: CheckResult[] = [];

  for (const check of checks) {
    if (check.status !== 'fail' && check.status !== 'partial') continue;
    const severity = getCheckSeverity(check);
    if (severity === 'critical') critical.push(check);
    else if (severity === 'high') high.push(check);
    else if (severity === 'medium') medium.push(check);
    else low.push(check);
  }

  const groups: Array<{ name: string; checks: CheckResult[] }> = [
    { name: 'CRITICAL', checks: critical },
    { name: 'HIGH', checks: high },
    { name: 'MEDIUM', checks: medium },
    { name: 'LOW', checks: low },
  ];

  for (const group of groups) {
    if (group.checks.length === 0) continue;
    lines.push(`### ${group.name}`);
    lines.push('| Check | Points | Message |');
    lines.push('|------|--------|---------|');
    for (const check of group.checks) {
      lines.push(`| ${check.id} ${check.name} | ${check.points}/${check.maxPoints} | ${check.message} |`);
    }
    lines.push('');
  }
}

function collectDiagnosticImpacts(agent: AgentReport): Array<{ label: string; points: number; priority: string }> {
  const impacts: Array<{ label: string; points: number; priority: string }> = [];

  for (const recommendation of agent.recommendations) {
    const check = agent.checks.find(candidate => candidate.id === recommendation.checkId);
    const recoverable = check ? check.maxPoints - check.points : 0;
    if (recoverable > 0) {
      impacts.push({ label: `${recommendation.checkId}: ${recommendation.action}`, points: recoverable, priority: recommendation.priority });
    }
  }

  for (const antiPattern of getTriggeredAntiPatterns(agent.antiPatterns)) {
    impacts.push({ label: `${antiPattern.id}: ${antiPattern.name}`, points: Math.abs(antiPattern.deduction), priority: 'critical' });
  }

  impacts.sort((a, b) => b.points - a.points);
  return impacts;
}

function appendDiagnosticSummary(lines: string[], impacts: Array<{ label: string; points: number; priority: string }>): void {
  if (impacts.length === 0) return;

  lines.push('## Diagnostic Summary');
  for (const item of impacts.slice(0, 5)) {
    lines.push(`- ${item.label} (${item.points} pts recoverable)`);
  }
  const topThree = impacts.slice(0, 3).map(item => item.label);
  if (topThree.length > 0) {
    lines.push(`Top ${topThree.length} to fix first: ${topThree.join('; ')}`);
  }
  lines.push('');
}

/** Render a scan report as GitHub-flavored markdown suitable for PR comments */
export function renderMarkdown(report: ScanReport): string {
  const lines: string[] = [];

  lines.push('## GOAT Flow Audit');
  lines.push('');
  lines.push(`Learning loop: footguns ${report.meta.learningLoop.footguns.committed} committed / ${report.meta.learningLoop.footguns.local} local; lessons ${report.meta.learningLoop.lessons.committed} committed / ${report.meta.learningLoop.lessons.local} local.`);
  lines.push(`Config: ${report.meta.config.exists ? (report.meta.config.valid ? '`.goat-flow/config.yaml` valid.' : '`.goat-flow/config.yaml` invalid.') : '`.goat-flow/config.yaml` missing; scanner used defaults.'}`);
  lines.push('');

  if (report.agents.length === 0) {
    lines.push('No GOAT Flow agents detected. No `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md` found.');
    return lines.join('\n');
  }

  // Summary table
  lines.push('| Agent | Grade | Score | Foundation | Standard | Full |');
  lines.push('|-------|-------|-------|------------|----------|------|');
  for (const agent of report.agents) {
    const { score } = agent;
    if (score.grade === 'insufficient-data') {
      lines.push(`| ${agent.agentName} | N/A | Insufficient data | - | - | - |`);
      continue;
    }
    const { foundation, standard, full } = score.tiers;
    lines.push(`| ${agent.agentName} | **${score.grade}** | ${score.percentage}% | ${foundation.percentage}% | ${standard.percentage}% | ${full.percentage}% |`);
  }
  lines.push('');

  // Per-agent details
  for (const agent of report.agents) {
    if (agent.score.grade === 'insufficient-data') continue;
    lines.push(...renderAgentMarkdown(agent));
    lines.push('');
  }

  lines.push(`<sub>Rubric v${report.rubricVersion} · ${report.meta.checkCount} checks · ${report.meta.antiPatternCount} anti-patterns</sub>`);

  return lines.join('\n');
}

function appendFailingChecks(lines: string[], failing: AgentReport['checks']): void {
  if (failing.length === 0) return;

  const counts = collectCheckFailureSummary(failing);
  const totalChecks = counts.fail + counts.partial + counts.pass;
  lines.push(`Failures: ${counts.fail} failed, ${counts.partial} partial, ${counts.pass} pass / ${totalChecks} checks.`);
  lines.push(`Severity: Critical ${counts.severityCounts.critical} | High ${counts.severityCounts.high} | Medium ${counts.severityCounts.medium} | Low ${counts.severityCounts.low}`);
  lines.push('');

  appendSeverityGroupedFailingChecks(lines, failing);
}

function appendTriggeredAntiPatterns(lines: string[], agent: AgentReport): void {
  const triggered = getTriggeredAntiPatterns(agent.antiPatterns);
  if (triggered.length === 0) return;

  lines.push('**Anti-pattern deductions:**');
  for (const antiPattern of triggered) {
    lines.push(`- ${antiPattern.id} ${antiPattern.name}: ${antiPattern.deduction} pts - ${antiPattern.message}`);
  }
  lines.push('');
}

function appendRecommendations(lines: string[], agent: AgentReport): void {
  if (agent.recommendations.length === 0) return;

  lines.push('**Top recommendations:**');
  for (const recommendation of agent.recommendations.slice(0, 5)) {
    lines.push(`- ${RECOMMENDATION_TAGS[recommendation.priority]} \`${recommendation.checkId}\` ${recommendation.action}`);
  }
  if (agent.recommendations.length > 5) {
    lines.push(`- ... and ${agent.recommendations.length - 5} more`);
  }
  lines.push('');
}

/** Render a single agent's failing checks and recommendations */
function renderAgentMarkdown(agent: AgentReport): string[] {
  const lines: string[] = [];
  const failing = agent.checks.filter(c => c.status === 'fail' || c.status === 'partial');

  if (failing.length === 0 && agent.recommendations.length === 0) return lines;

  if (agent.checks.length > 0) {
    lines.push(`<details><summary><strong>${agent.agentName}</strong> - ${failing.length} issue${failing.length !== 1 ? 's' : ''}</summary>`);
    lines.push('');
  }
  appendFailingChecks(lines, agent.checks);
  appendTriggeredAntiPatterns(lines, agent);
  appendDiagnosticSummary(lines, collectDiagnosticImpacts(agent));
  appendRecommendations(lines, agent);

  if (agent.checks.length > 0) {
    lines.push('</details>');
  }

  return lines;
}
