import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AgentReport } from '../../src/cli/types.js';
import { scanFixture } from '../helpers/fixture-scanner.js';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    cleanup?.();
  }
});

function getAgent(reportName: string, agents: AgentReport[], agentId: string): AgentReport {
  const agent = agents.find(candidate => candidate.agent === agentId);
  assert.ok(agent, `${reportName}: missing agent ${agentId}`);
  return agent;
}

describe('project fixture corpus', () => {
  it('passing-minimal scores 100 for Claude', () => {
    const fixture = scanFixture('passing-minimal');
    cleanups.push(fixture.cleanup);

    const claude = getAgent('passing-minimal', fixture.report.agents, 'claude');
    assert.equal(claude.score.percentage, 100);
    assert.equal(claude.score.grade, 'A');
    assert.deepEqual(
      claude.checks.filter(check => check.status === 'fail' || check.status === 'partial').map(check => check.id),
      [],
    );
    assert.deepEqual(
      claude.antiPatterns.filter(pattern => pattern.triggered).map(pattern => pattern.id),
      [],
    );
  });

  it('passing-full scores 100 for Claude', () => {
    const fixture = scanFixture('passing-full');
    cleanups.push(fixture.cleanup);

    const claude = getAgent('passing-full', fixture.report.agents, 'claude');
    assert.equal(claude.score.percentage, 100);
    assert.equal(claude.score.grade, 'A');
    assert.deepEqual(
      claude.checks.filter(check => check.status === 'fail' || check.status === 'partial').map(check => check.id),
      [],
    );
    assert.deepEqual(
      claude.antiPatterns.filter(pattern => pattern.triggered).map(pattern => pattern.id),
      [],
    );
  });

  it('failing-known exposes the expected scanner regressions', () => {
    const fixture = scanFixture('failing-known');
    cleanups.push(fixture.cleanup);

    const claude = getAgent('failing-known', fixture.report.agents, 'claude');
    assert.ok(claude.score.percentage < 100, `Expected failing-known < 100, got ${claude.score.percentage}`);

    const failingChecks = new Set(
      claude.checks
        .filter(check => check.status === 'fail')
        .map(check => check.id),
    );
    assert.ok(failingChecks.has('2.2.4b'), `Expected 2.2.4b to fail. Saw: ${Array.from(failingChecks).join(', ')}`);
    assert.ok(failingChecks.has('2.6.2'), `Expected 2.6.2 to fail. Saw: ${Array.from(failingChecks).join(', ')}`);
  });
});
