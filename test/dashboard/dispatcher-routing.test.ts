import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load the dispatcher SKILL.md to extract the routing table
const dispatcherContent = readFileSync(
  join(import.meta.dirname, '../../.claude/skills/goat/SKILL.md'),
  'utf-8',
);

// Extract intent mapping rows from the markdown table
function extractRoutingTable(content: string): Array<{ keywords: string; skill: string; mode: string; edits: string }> {
  const tableMatch = content.match(/\| If the input mentions[\s\S]*?\n\n/);
  if (!tableMatch) return [];
  const lines = tableMatch[0].split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('If the input'));
  return lines.map(line => {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    return { keywords: cols[0] ?? '', skill: cols[1] ?? '', mode: cols[2] ?? '', edits: cols[3] ?? '' };
  });
}

const routes = extractRoutingTable(dispatcherContent);

describe('Dispatcher routing table', () => {
  it('has at least 10 routing rows', () => {
    assert.ok(routes.length >= 10, `Expected ≥10 routes, got ${routes.length}`);
  });

  it('has an "Edits code?" column', () => {
    assert.ok(
      dispatcherContent.includes('Edits code?'),
      'Routing table should have "Edits code?" column for investigation vs implementation',
    );
  });

  it('investigation verbs route to read-only', () => {
    const investigateRow = routes.find(r => r.keywords.includes('understand'));
    assert.ok(investigateRow, 'Should have an understand/investigate row');
    assert.ok(investigateRow.edits.includes('No'), `Investigate should be read-only, got: ${investigateRow.edits}`);
  });

  it('implementation verbs route to edits', () => {
    const fixRow = routes.find(r => r.keywords.includes('fix'));
    assert.ok(fixRow, 'Should have a fix/change/update row');
    assert.ok(fixRow.edits.includes('Yes'), `Fix should allow edits, got: ${fixRow.edits}`);
  });

  it('build/create routes to goat-plan with execute', () => {
    const buildRow = routes.find(r => r.keywords.includes('build'));
    assert.ok(buildRow, 'Should have a build/create row');
    assert.ok(buildRow.skill.includes('goat-plan'), `Build should route to goat-plan, got: ${buildRow.skill}`);
    assert.ok(buildRow.edits.includes('Yes'), `Build should allow edits`);
  });

  it('review routes to read-only', () => {
    const reviewRow = routes.find(r => r.keywords.includes('review'));
    assert.ok(reviewRow, 'Should have a review row');
    assert.ok(reviewRow.edits.includes('No'), `Review should be read-only, got: ${reviewRow.edits}`);
  });

  it('security routes to read-only', () => {
    const secRow = routes.find(r => r.keywords.includes('security'));
    assert.ok(secRow, 'Should have a security row');
    assert.ok(secRow.edits.includes('No'), `Security should be read-only, got: ${secRow.edits}`);
  });

  it('has escape hatch for simple questions', () => {
    assert.ok(
      dispatcherContent.includes('Simple Questions') || dispatcherContent.includes('escape hatch'),
      'Dispatcher should have an escape hatch for factual questions',
    );
  });

  it('has disambiguation for ambiguous inputs', () => {
    assert.ok(dispatcherContent.includes('the login is broken'), 'Should have "login is broken" disambiguation');
    assert.ok(dispatcherContent.includes('investigate') && dispatcherContent.includes('fix it'), 'Should ask about investigate vs fix');
  });

  it('all 5 specialized skills appear in routing table', () => {
    const tableText = routes.map(r => r.skill).join(' ');
    assert.ok(tableText.includes('goat-debug'), 'goat-debug should be in routing');
    assert.ok(tableText.includes('goat-review'), 'goat-review should be in routing');
    assert.ok(tableText.includes('goat-plan'), 'goat-plan should be in routing');
    assert.ok(tableText.includes('goat-test'), 'goat-test should be in routing');
    assert.ok(tableText.includes('goat-security'), 'goat-security should be in routing');
  });
});

describe('Dispatcher skill content contracts', () => {
  it('has post-dispatch chaining suggestions', () => {
    assert.ok(dispatcherContent.includes('Post-Dispatch Chaining'), 'Should have chaining section');
  });

  it('has override support', () => {
    assert.ok(dispatcherContent.includes('Override'), 'Should support explicit skill overrides');
    assert.ok(dispatcherContent.includes('--debug'), 'Should support --debug flag');
  });

  it('has bare invocation examples', () => {
    assert.ok(dispatcherContent.includes('Bare Invocation'), 'Should handle /goat with no args');
  });
});
