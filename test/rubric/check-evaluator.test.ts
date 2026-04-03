/**
 * Unit tests for individual rubric checks.
 * Each test constructs a mock FactContext, runs a single check, and asserts the result.
 * Priority: checks that had real bugs identified by Codex critiques.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCheck } from '../../src/cli/rubric/registry.js';
import { runChecks, runAntiPatterns } from '../../src/cli/scoring/scorer.js';
import { antiPatterns } from '../../src/cli/rubric/anti-patterns.js';
import { createMockContext } from '../helpers/mock-context.js';
import type { CheckDef, AntiPatternDef } from '../../src/cli/types.js';

/** Run a single check against a context and return its result. */
function runSingleCheck(check: CheckDef, ctx: ReturnType<typeof createMockContext>) {
  const results = runChecks([check], ctx);
  assert.equal(results.length, 1, `Expected 1 result, got ${results.length}`);
  return results[0];
}

/** Find an anti-pattern by ID. */
function getAntiPattern(id: string): AntiPatternDef | undefined {
  return antiPatterns.find((ap) => ap.id === id);
}

/** Run a single anti-pattern against a context. */
function runSingleAntiPattern(
  ap: AntiPatternDef,
  ctx: ReturnType<typeof createMockContext>,
) {
  const results = runAntiPatterns([ap], ctx);
  assert.equal(results.length, 1);
  return results[0];
}

// ---------------------------------------------------------------
// 2.2.2 — Post-turn hook registered and enforces validation
// ---------------------------------------------------------------
describe('Check 2.2.2: Post-turn hook registered', () => {
  const check = getCheck('2.2.2');
  assert.ok(check, 'Check 2.2.2 should exist in the registry');

  it('passes when hook is registered and has validation', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: true,
          postTurnRegistered: true,
          postTurnHasValidation: true,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
    assert.equal(result.points, check.pts);
  });

  it('fails when hook exists but is not registered in settings', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: true,
          postTurnRegistered: false,
          postTurnHasValidation: true,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.equal(result.points, 0);
  });

  it('fails when hook does not exist', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: false,
          postTurnRegistered: false,
          postTurnHasValidation: false,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.ok(
      result.status === 'fail' || result.status === 'na',
      `Expected fail or na, got ${result.status}: ${result.message}`,
    );
  });
});

// ---------------------------------------------------------------
// 2.2.3 — Post-turn hook does not swallow failures
// ---------------------------------------------------------------
describe('Check 2.2.3: Hook does not swallow failures', () => {
  const check = getCheck('2.2.3');
  assert.ok(check, 'Check 2.2.3 should exist in the registry');

  it('passes when hook does NOT swallow failures', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: true,
          postTurnSwallowsFailures: false,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
    assert.equal(result.points, 1);
  });

  it('fails when hook swallows failures with || true', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: true,
          postTurnSwallowsFailures: true,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.equal(result.points, 0);
    assert.ok(
      result.message.includes('|| true') || result.message.includes('swallow'),
      `Expected message to mention swallowed failures, got: ${result.message}`,
    );
  });

  it('returns na when no post-turn hook exists', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: {
          postTurnExists: false,
          postTurnSwallowsFailures: false,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'na', `Expected na, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 2.3.7 — Session logs referenced in instruction file
// ---------------------------------------------------------------
describe('Check 2.3.7: Session logs referenced', () => {
  const check = getCheck('2.3.7');
  assert.ok(check, 'Check 2.3.7 should exist in the registry');

  it('passes when instruction file mentions logs/sessions', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          exists: true,
          content: '# CLAUDE.md\n\n## LOG\n\nSession summaries go in `.goat-flow/logs/sessions/`.\n',
          lineCount: 5,
          sections: new Map([
            ['log', 'Session summaries go in `.goat-flow/logs/sessions/`.'],
          ]),
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when instruction file does not mention session logs', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          exists: true,
          content: '# CLAUDE.md\n\n## LOG\n\nUpdate lessons when tripped.\n',
          lineCount: 5,
          sections: new Map([
            ['log', 'Update lessons when tripped.'],
          ]),
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 1.5.7 — .goat-flow/config.local.yaml exists
// ---------------------------------------------------------------
describe('Check 1.5.7: config.local.yaml exists', () => {
  const check = getCheck('1.5.7');
  assert.ok(check, 'Check 1.5.7 should exist in the registry');

  it('passes when config.local.yaml exists', () => {
    const ctx = createMockContext({
      shared: {
        config: { configLocalExists: true },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when config.local.yaml is missing', () => {
    const ctx = createMockContext({
      shared: {
        config: { configLocalExists: false },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 2.4.3 — Skills referenced in router (caught the goat-* glob bug)
// ---------------------------------------------------------------
describe('Check 2.4.3: Skills referenced in router', () => {
  const check = getCheck('2.4.3');
  assert.ok(check, 'Check 2.4.3 should exist in the registry');

  it('passes when router points at .claude/skills/', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          exists: true,
          content: '# CLAUDE.md\n\n## Router Table\n| Skills | `.claude/skills/` |\n',
          lineCount: 5,
          sections: new Map([
            ['router table', '| Skills | `.claude/skills/` |'],
          ]),
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when router uses legacy goat-* glob', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          exists: true,
          content: '# CLAUDE.md\n\n## Router Table\n| Skills | `.claude/skills/goat-*/` |\n',
          lineCount: 5,
          sections: new Map([
            ['router table', '| Skills | `.claude/skills/goat-*/` |'],
          ]),
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.ok(
      result.message.includes('goat-*') || result.message.includes('dispatcher'),
      `Expected message about goat-* glob missing dispatcher, got: ${result.message}`,
    );
  });

  it('fails when router has no skill path at all', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          exists: true,
          content: '# CLAUDE.md\n\n## Router Table\n| Docs | `docs/` |\n',
          lineCount: 5,
          sections: new Map([
            ['router table', '| Docs | `docs/` |'],
          ]),
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 2.1.11 — All 6 skills present
// ---------------------------------------------------------------
describe('Check 2.1.11: All 6 skills present', () => {
  const check = getCheck('2.1.11');
  assert.ok(check, 'Check 2.1.11 should exist in the registry');

  it('passes when all 6 skills are present', () => {
    const ctx = createMockContext(); // defaults have all skills
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails or partial when skills are missing', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: {
          found: ['goat', 'goat-debug', 'goat-plan', 'goat-review'],
          missing: ['goat-security', 'goat-test'],
          allPresent: false,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.ok(
      result.status === 'fail' || result.status === 'partial',
      `Expected fail or partial when 2 skills missing, got ${result.status}: ${result.message}`,
    );
  });
});

// ---------------------------------------------------------------
// 1.1.1 — Instruction file exists
// ---------------------------------------------------------------
describe('Check 1.1.1: Instruction file exists', () => {
  const check = getCheck('1.1.1');
  assert.ok(check, 'Check 1.1.1 should exist in the registry');

  it('passes when instruction file exists', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: { exists: true },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when instruction file is missing', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: { exists: false, content: null, lineCount: 0 },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 2.2.5 — Preflight script exists
// ---------------------------------------------------------------
describe('Check 2.2.5: Preflight script', () => {
  const check = getCheck('2.2.5');
  assert.ok(check, 'Check 2.2.5 should exist in the registry');

  it('passes when preflight script exists', () => {
    const ctx = createMockContext({
      shared: { preflightScript: { exists: true } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when preflight script is missing', () => {
    const ctx = createMockContext({
      shared: { preflightScript: { exists: false } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// 2.3.4 — Footguns have file:line evidence (had real bugs)
// ---------------------------------------------------------------
describe('Check 2.3.4: Footgun evidence', () => {
  const check = getCheck('2.3.4');
  assert.ok(check, 'Check 2.3.4 should exist in the registry');

  it('passes when footguns have valid evidence', () => {
    const ctx = createMockContext({
      shared: {
        footguns: {
          hasEvidence: true,
          staleRefs: [],
          invalidLineRefs: [],
          formatDiagnostic: null,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when footguns have no evidence', () => {
    const ctx = createMockContext({
      shared: {
        footguns: {
          hasEvidence: false,
          staleRefs: [],
          invalidLineRefs: [],
          formatDiagnostic: null,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
  });

  it('fails when footguns have stale file references', () => {
    const ctx = createMockContext({
      shared: {
        footguns: {
          hasEvidence: true,
          staleRefs: ['src/deleted.ts:42'],
          invalidLineRefs: [],
          formatDiagnostic: null,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.ok(
      result.message.includes('missing files') || result.message.includes('stale'),
      `Expected stale ref message, got: ${result.message}`,
    );
  });

  it('fails when footguns have out-of-range line references', () => {
    const ctx = createMockContext({
      shared: {
        footguns: {
          hasEvidence: true,
          staleRefs: [],
          invalidLineRefs: ['src/auth.ts:9999'],
          formatDiagnostic: null,
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.ok(
      result.message.includes('out-of-range') || result.message.includes('line'),
      `Expected line ref message, got: ${result.message}`,
    );
  });
});

// ---------------------------------------------------------------
// 2.1.12 — Step 0 context gathering
// ---------------------------------------------------------------
describe('Check 2.1.12: Skills have Step 0', () => {
  const check = getCheck('2.1.12');
  assert.ok(check, 'Check 2.1.12 should exist in the registry');

  it('passes when all skills have Step 0', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: { quality: { withStep0: 5, total: 5 } },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when no skills have Step 0', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: { quality: { withStep0: 0, total: 5 } },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.ok(
      result.status === 'fail' || result.status === 'partial',
      `Expected fail/partial, got ${result.status}: ${result.message}`,
    );
  });
});

// ---------------------------------------------------------------
// 2.2.6 — Context validation script exists
// ---------------------------------------------------------------
describe('Check 2.2.6: Context validation', () => {
  const check = getCheck('2.2.6');
  assert.ok(check, 'Check 2.2.6 should exist in the registry');

  it('passes when context-validate.sh exists', () => {
    const ctx = createMockContext({
      shared: { ci: { workflowExists: true } },
    });
    const result = runSingleCheck(check, ctx);
    // This is a composite check (any of: context-validate.sh OR CI workflow)
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP1 — Instruction file over 150 lines
// ---------------------------------------------------------------
describe('Anti-pattern AP1: Instruction file over 150 lines', () => {
  const ap = getAntiPattern('AP1');
  assert.ok(ap, 'AP1 should exist');

  it('does not trigger when under 150 lines', () => {
    const ctx = createMockContext({
      agentFacts: { instruction: { lineCount: 100 } },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
    assert.equal(result.deduction, 0);
  });

  it('triggers when over 150 lines', () => {
    const ctx = createMockContext({
      agentFacts: { instruction: { lineCount: 200 } },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true);
    assert.ok(result.deduction < 0, 'Should have negative deduction');
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP12 — Stale file references in footguns
// ---------------------------------------------------------------
describe('Anti-pattern AP12: Stale file references in footguns', () => {
  const ap = getAntiPattern('AP12');
  assert.ok(ap, 'AP12 should exist');

  it('does not trigger when all refs resolve', () => {
    const ctx = createMockContext({
      shared: {
        footguns: { staleRefs: [], totalRefs: 5 },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
    assert.equal(result.deduction, 0);
  });

  it('triggers when stale refs exist', () => {
    const ctx = createMockContext({
      shared: {
        footguns: {
          staleRefs: ['src/deleted.ts:42', 'lib/gone.py:10'],
          totalRefs: 5,
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true);
    assert.ok(result.deduction < 0);
    assert.ok(
      result.message.includes('stale') || result.message.includes('deleted'),
      `Expected stale ref in message, got: ${result.message}`,
    );
  });

  it('does not trigger when no refs to check', () => {
    const ctx = createMockContext({
      shared: {
        footguns: { staleRefs: [], totalRefs: 0 },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP22 — Duplicate learning-loop surfaces
// ---------------------------------------------------------------
describe('Anti-pattern AP22: Duplicate learning-loop surfaces', () => {
  const ap = getAntiPattern('AP22');
  assert.ok(ap, 'AP22 should exist');

  it('does not trigger when no duplicate surfaces', () => {
    const ctx = createMockContext({
      shared: {
        footguns: { duplicateSurfacePaths: [] },
        lessons: { duplicateSurfacePaths: [] },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });

  it('triggers when duplicate footgun surfaces exist', () => {
    const ctx = createMockContext({
      shared: {
        footguns: { duplicateSurfacePaths: ['docs/footguns.md'] },
        lessons: { duplicateSurfacePaths: [] },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true);
    assert.ok(result.deduction < 0);
  });

  it('triggers when duplicate lesson surfaces exist', () => {
    const ctx = createMockContext({
      shared: {
        footguns: { duplicateSurfacePaths: [] },
        lessons: { duplicateSurfacePaths: ['docs/lessons.md'] },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true);
    assert.ok(result.deduction < 0);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP3 — DoD in both instruction file and guidelines
// ---------------------------------------------------------------
describe('Anti-pattern AP3: DoD duplication', () => {
  const ap = getAntiPattern('AP3');
  assert.ok(ap, 'AP3 should exist');

  it('does not trigger when DoD is only in instruction file', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Definition of Done\n\n1. tests pass\n',
        },
      },
      shared: {
        localInstructions: { hasConventionsContent: false },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});
