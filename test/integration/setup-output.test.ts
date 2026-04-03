/**
 * Tests for the setup command output quality.
 * Verifies that setup output is valid markdown, doesn't reference deleted skills,
 * and produces actionable fix instructions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(import.meta.dirname, '../..');
const CLI_PATH = join(ROOT, 'dist/cli/cli.js');
const FIXTURE_MINIMAL = join(ROOT, 'test/fixtures/projects/passing-minimal');

const DELETED_SKILLS = [
  'goat-investigate',
  'goat-onboard',
  'goat-reflect',
  'goat-resume',
  'goat-audit',
];

/** Run setup against a project path and capture output. */
function runSetup(projectPath: string, agent = 'claude'): string {
  return execSync(
    `node "${CLI_PATH}" setup "${projectPath}" --agent ${agent}`,
    { encoding: 'utf8', timeout: 15000 },
  );
}

/** Run scan against a project path and capture output. */
function runScan(projectPath: string, agent = 'claude'): string {
  return execSync(
    `node "${CLI_PATH}" scan "${projectPath}" --agent ${agent}`,
    { encoding: 'utf8', timeout: 15000 },
  );
}

describe('Setup output format', () => {
  it('CLI dist exists', () => {
    assert.ok(
      existsSync(CLI_PATH),
      `CLI not built at ${CLI_PATH}. Run npx tsc first.`,
    );
  });

  it('produces valid markdown with a heading', () => {
    const output = runSetup(FIXTURE_MINIMAL);
    assert.ok(output.startsWith('#'), 'Setup output should start with a heading');
    assert.ok(output.length > 50, 'Setup output should have content');
  });

  it('does not reference deleted skill names', () => {
    const output = runSetup(FIXTURE_MINIMAL);
    for (const deleted of DELETED_SKILLS) {
      assert.ok(
        !output.includes(deleted),
        `Setup output references deleted skill "${deleted}"`,
      );
    }
  });

  it('mentions the agent name', () => {
    const output = runSetup(FIXTURE_MINIMAL);
    assert.ok(
      output.toLowerCase().includes('claude'),
      'Setup output should mention the target agent',
    );
  });

  it('includes a score or percentage', () => {
    const output = runSetup(FIXTURE_MINIMAL);
    const hasScore = /\d+%/.test(output) || /score/i.test(output);
    assert.ok(hasScore, 'Setup output should include a score or percentage');
  });
});

describe('Setup output for passing-minimal fixture', () => {
  it('reports high score (fixture is designed to pass at 100%)', () => {
    const output = runSetup(FIXTURE_MINIMAL);
    const match = output.match(/(\d+)%/);
    assert.ok(match, 'Setup output should contain a percentage');
    const score = parseInt(match[1], 10);
    assert.ok(
      score >= 90,
      `Expected passing-minimal to score 90+%, got ${score}%`,
    );
  });
});

describe('Scan output basic sanity', () => {
  it('scan produces output with check results', () => {
    const output = runScan(FIXTURE_MINIMAL);
    assert.ok(output.length > 100, 'Scan output should have content');
    // Should include tier names or check IDs
    const hasTierOrCheck =
      output.includes('Foundation') ||
      output.includes('Standard') ||
      output.includes('1.1') ||
      output.includes('Grade');
    assert.ok(hasTierOrCheck, 'Scan output should include tier or check information');
  });
});

describe('Setup output for failing fixture', () => {
  const FIXTURE_FAILING = join(ROOT, 'test/fixtures/projects/failing-known');

  it('includes fix recommendations', () => {
    const output = runSetup(FIXTURE_FAILING);
    // Failing fixtures should trigger recommendations
    assert.ok(
      output.includes('Fix') ||
        output.includes('fix') ||
        output.includes('remaining') ||
        output.includes('anti-pattern'),
      `Expected fix recommendations in output for failing fixture`,
    );
  });
});
