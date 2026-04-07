/**
 * Unit tests for individual rubric checks.
 * Each test constructs a mock FactContext, runs a single check, and asserts the result.
 * Priority: checks that had real bugs identified by Codex critiques.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCheck } from '../../src/cli/rubric/registry.js';
import { runChecks, runAntiPatterns } from '../../src/cli/scoring/calculate.js';
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
// 2.2.2 - Post-turn hook registered and enforces validation
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
// 2.2.3 - Post-turn hook does not swallow failures
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
// 2.3.7 - Session logs referenced in instruction file
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

// 1.5.7 (config.local.yaml exists) removed - check deleted.

// ---------------------------------------------------------------
// 2.4.3 - Skills referenced in router (caught the goat-* glob bug)
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
// 2.1.11 - All 6 skills present
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
// 1.1.1 - Instruction file exists
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

// 2.2.5 (Preflight script exists) removed - check deleted.

// ---------------------------------------------------------------
// 2.3.4 - Footguns have file:line evidence (had real bugs)
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
// 2.1.12 - Step 0 context gathering
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

// 2.2.6 (Context validation script) removed - check deleted.

// ---------------------------------------------------------------
// Anti-Pattern: AP1 - Instruction file over 150 lines
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
// Anti-Pattern: AP12 - Stale file references in footguns
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

// AP22 (Duplicate learning-loop surfaces) removed - anti-pattern deleted.

// AP3 (DoD duplication) removed - anti-pattern deleted.

// ---------------------------------------------------------------
// 2.2.8 - Agent ignore files for sensitive paths
// ---------------------------------------------------------------
describe('Check 2.2.8: Agent ignore files', () => {
  const check = getCheck('2.2.8');
  assert.ok(check, 'Check 2.2.8 should exist in the registry');

  it('passes when .copilotignore exists', () => {
    const ctx = createMockContext({
      shared: { ignoreFiles: { copilotignore: true, cursorignore: false, geminiignore: false } },
      agentFacts: { hooks: { readDenyCoversSecrets: false } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('passes when Read deny covers secrets', () => {
    const ctx = createMockContext({
      shared: { ignoreFiles: { copilotignore: false, cursorignore: false, geminiignore: false } },
      agentFacts: { hooks: { readDenyCoversSecrets: true } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass, got ${result.status}: ${result.message}`);
  });

  it('fails when no ignore files and no Read deny', () => {
    const ctx = createMockContext({
      shared: { ignoreFiles: { copilotignore: false, cursorignore: false, geminiignore: false } },
      agentFacts: { hooks: { readDenyCoversSecrets: false } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', `Expected fail, got ${result.status}: ${result.message}`);
    assert.equal(result.points, 0);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP23 - Overly broad deny patterns
// ---------------------------------------------------------------
describe('Anti-pattern AP23: Overly broad deny patterns', () => {
  const ap = getAntiPattern('AP23');
  assert.ok(ap, 'AP23 should exist');

  it('does not trigger with specific deny patterns', () => {
    const ctx = createMockContext({
      agentFacts: {
        settings: {
          parsed: {
            permissions: { deny: ['Bash(*git commit*)', 'Bash(*git push*)'] },
          },
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false, `Expected not triggered: ${result.message}`);
  });

  it('triggers on Bash(*git*) - too broad', () => {
    const ctx = createMockContext({
      agentFacts: {
        settings: {
          parsed: {
            permissions: { deny: ['Bash(*git*)'] },
          },
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, `Expected triggered: ${result.message}`);
    assert.equal(result.deduction, -2);
  });

  it('triggers on Bash(*run*) - blocks npm run, cargo run', () => {
    const ctx = createMockContext({
      agentFacts: {
        settings: {
          parsed: {
            permissions: { deny: ['Bash(*run*)'] },
          },
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, `Expected triggered: ${result.message}`);
  });

  it('does not trigger when no deny patterns configured', () => {
    const ctx = createMockContext({
      agentFacts: {
        settings: { parsed: { permissions: {} } },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// 1.5.1 - Deny mechanism has 3+ distinct patterns
// ---------------------------------------------------------------
describe('Check 1.5.1: Deny mechanism patterns', () => {
  const check = getCheck('1.5.1');
  assert.ok(check, 'Check 1.5.1 should exist');

  it('passes with 3+ deny patterns', () => {
    const ctx = createMockContext({
      agentFacts: {
        hooks: { denyExists: true, denyHasBlocks: true },
        settings: { hasDenyPatterns: true },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', `Expected pass: ${result.message}`);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP13 - Stale code references in instruction file
// ---------------------------------------------------------------
describe('Anti-pattern AP13: Stale instruction refs', () => {
  const ap = getAntiPattern('AP13');
  assert.ok(ap, 'AP13 should exist');

  it('does not trigger when instruction file has no backtick paths', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: { content: '# CLAUDE.md\n\nNo code paths here.\n' },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });

  it('does not trigger when paths reference real files', () => {
    // src/cli/types.ts exists in the goat-flow repo
    const ctx = createMockContext({
      agentFacts: {
        instruction: { content: '# CLAUDE.md\n\nSee `src/cli/types.ts` for type definitions.\n' },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false, `Should not trigger for existing path: ${result.message}`);
  });

  // AP13 trigger test requires real filesystem (existsSync against ctx.facts.root).
  // Covered by Layer 1 fixture tests: stale-refs fixture validates AP triggers on real project layouts.
});

// ---------------------------------------------------------------
// Anti-Pattern: AP14 - Duplicate skill directories
// ---------------------------------------------------------------
describe('Anti-pattern AP14: Duplicate skills', () => {
  const ap = getAntiPattern('AP14');
  assert.ok(ap, 'AP14 should exist');

  it('triggers when legacy skill coexists with goat- counterpart', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: {
          installedDirs: ['goat', 'goat-debug', 'goat-review', 'review', 'debug'],
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, `Expected triggered: ${result.message}`);
    assert.equal(result.deduction, -2);
  });

  it('does not trigger with only goat-prefixed skills', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: {
          installedDirs: ['goat', 'goat-debug', 'goat-review', 'goat-plan'],
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP15 - Outdated skill versions
// ---------------------------------------------------------------
describe('Anti-pattern AP15: Outdated skill versions', () => {
  const ap = getAntiPattern('AP15');
  assert.ok(ap, 'AP15 should exist');

  it('triggers when skills have wrong version', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: {
          found: ['goat-debug', 'goat-plan'],
          outdatedCount: 2,
          versions: { 'goat-debug': '0.9.0', 'goat-plan': null },
        },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, `Expected triggered: ${result.message}`);
    assert.ok(result.deduction < 0, 'Expected negative deduction');
  });

  it('does not trigger when all skills are current', () => {
    const ctx = createMockContext(); // defaults have all at current version
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// Anti-Pattern: AP17 - Dangling file references in skills
// ---------------------------------------------------------------
describe('Anti-pattern AP17: Dangling skill refs', () => {
  const ap = getAntiPattern('AP17');
  assert.ok(ap, 'AP17 should exist');

  it('triggers when skills reference non-existent files', () => {
    const ctx = createMockContext({
      agentFacts: {
        skills: { danglingRefs: ['src/deleted-file.ts', 'docs/removed.md'] },
      },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, `Expected triggered: ${result.message}`);
    assert.equal(result.deduction, -3);
  });

  it('does not trigger when all skill refs resolve', () => {
    const ctx = createMockContext(); // defaults have empty danglingRefs
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// Foundation tier batch: custom detection checks
// ---------------------------------------------------------------

describe('Check 1.1.2: Instruction file under line target', () => {
  const check = getCheck('1.1.2');
  assert.ok(check, 'Check 1.1.2 should exist');

  it('passes when under 120 lines', () => {
    const ctx = createMockContext({ agentFacts: { instruction: { lineCount: 100 } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('partial when 121-150 lines', () => {
    const ctx = createMockContext({ agentFacts: { instruction: { lineCount: 135 } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'partial', result.message);
  });

  it('fails when over 150 lines', () => {
    const ctx = createMockContext({ agentFacts: { instruction: { lineCount: 160 } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

describe('Check 1.1.5: Instruction file has concrete examples', () => {
  const check = getCheck('1.1.5');
  assert.ok(check, 'Check 1.1.5 should exist');

  it('passes when BAD/GOOD examples have project paths', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n```\nBAD: guessed without reading `docs/spec.md`\nGOOD: read `src/auth/login.ts:42` first\n```\n',
        },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

describe('Check 1.1.5a: Instruction file paths resolve', () => {
  const check = getCheck('1.1.5a');
  assert.ok(check, 'Check 1.1.5a should exist');

  it('passes when router + askFirst have resolved paths', () => {
    const ctx = createMockContext({
      agentFacts: {
        router: { resolved: 5 },
        askFirst: { resolved: 3 },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when no paths resolve', () => {
    const ctx = createMockContext({
      agentFacts: {
        router: { resolved: 0 },
        askFirst: { resolved: 0 },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

describe('Check 1.2.6: LOG step references real dirs', () => {
  const check = getCheck('1.2.6');
  assert.ok(check, 'Check 1.2.6 should exist');

  it('passes when instruction file references LOG with lessons/footguns', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Execution Loop\n\n**LOG** - MUST update. Lessons go in `.goat-flow/lessons/`. Footguns go in `.goat-flow/footguns/`.\n',
          sections: new Map([
            ['execution loop', 'READ CLASSIFY SCOPE ACT VERIFY LOG lessons footguns'],
          ]),
        },
      },
      shared: { footguns: { exists: true }, lessons: { exists: true } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when only footguns exists (both dirs required)', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Execution Loop\n\n**LOG** - MUST update. Lessons go in `.goat-flow/lessons/`. Footguns go in `.goat-flow/footguns/`.\n',
          sections: new Map([
            ['execution loop', 'READ CLASSIFY SCOPE ACT VERIFY LOG lessons footguns'],
          ]),
        },
      },
      shared: {
        footguns: { exists: true },
        lessons: { exists: false },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });

  it('fails when only lessons exists (both dirs required)', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Execution Loop\n\n**LOG** - MUST update. Lessons go in `.goat-flow/lessons/`. Footguns go in `.goat-flow/footguns/`.\n',
          sections: new Map([
            ['execution loop', 'READ CLASSIFY SCOPE ACT VERIFY LOG lessons footguns'],
          ]),
        },
      },
      shared: {
        footguns: { exists: false },
        lessons: { exists: true },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

describe('Check 1.3.2: Ask First project-specific', () => {
  const check = getCheck('1.3.2');
  assert.ok(check, 'Check 1.3.2 should exist');

  it('passes when askFirst section has 5+ lines with project paths', () => {
    const askFirst = '**Ask First**\n- [ ] Boundary touched: [name]\n- [ ] Related code read: [yes/no]\n- [ ] Footgun entry checked: [entry or none]\n- [ ] Local instruction checked: [file or none]\n- [ ] Rollback command: [exact command]\n\nBoundaries:\n- `docs/spec.md`\n- `src/auth/`\n- `workflow/skills/`';
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: `# CLAUDE.md\n\n## Autonomy Tiers\n\n${askFirst}\n`,
          sections: new Map([['autonomy tiers', askFirst]]),
        },
        askFirst: { exists: true, paths: ['docs/spec.md', 'src/auth/', 'workflow/skills/'], resolved: 3, unresolved: [] },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

describe('Check 1.3.2a: Ask First paths resolve', () => {
  const check = getCheck('1.3.2a');
  assert.ok(check, 'Check 1.3.2a should exist');

  it('passes when all paths resolve', () => {
    const ctx = createMockContext({
      agentFacts: {
        askFirst: { paths: ['docs/', 'src/'], resolved: 2, unresolved: [] },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('partial when some paths are unresolved', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Autonomy Tiers\n\n**Ask First**\n- `docs/`\n- `deleted/`\n',
          sections: new Map([
            ['autonomy tiers', 'Ask First docs/ deleted/'],
          ]),
        },
        askFirst: { paths: ['docs/', 'deleted/'], resolved: 1, unresolved: ['deleted/'] },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'partial', result.message);
  });
});

describe('Check 1.5.2: git commit blocked', () => {
  const check = getCheck('1.5.2');
  assert.ok(check, 'Check 1.5.2 should exist');

  it('passes when git commit is blocked', () => {
    const ctx = createMockContext({ agentFacts: { deny: { gitCommitBlocked: true } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when git commit is not blocked', () => {
    const ctx = createMockContext({ agentFacts: { deny: { gitCommitBlocked: false } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

describe('Check 1.5.3: git push blocked', () => {
  const check = getCheck('1.5.3');
  assert.ok(check, 'Check 1.5.3 should exist');

  it('passes when git push is blocked', () => {
    const ctx = createMockContext({ agentFacts: { deny: { gitPushBlocked: true } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when git push is not blocked', () => {
    const ctx = createMockContext({ agentFacts: { deny: { gitPushBlocked: false } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

describe('Check 1.5.4: Deny hook/script exists', () => {
  const check = getCheck('1.5.4');
  assert.ok(check, 'Check 1.5.4 should exist');

  it('passes when deny hook exists', () => {
    const ctx = createMockContext({ agentFacts: { hooks: { denyExists: true } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when deny hook does not exist', () => {
    const ctx = createMockContext({ agentFacts: { hooks: { denyExists: false } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

// ---------------------------------------------------------------
// Standard tier batch: Skill quality ratio checks (2.1.13-2.1.18)
// All follow the same pattern: quality.with* / total >= 0.8
// ---------------------------------------------------------------
for (const { id, name, qualityKey } of [
  { id: '2.1.13', name: 'Skills have human gates', qualityKey: 'withHumanGate' },
  { id: '2.1.14', name: 'Skills have MUST/MUST NOT constraints', qualityKey: 'withConstraints' },
  { id: '2.1.15', name: 'Skills have phased process', qualityKey: 'withPhases' },
  { id: '2.1.17', name: 'Skills suggest next skill', qualityKey: 'withChaining' },
  { id: '2.1.18', name: 'Skills offer human choices', qualityKey: 'withChoices' },
] as const) {
  describe(`Check ${id}: ${name}`, () => {
    const check = getCheck(id);
    assert.ok(check, `Check ${id} should exist`);

    it('passes when quality ratio >= 0.8', () => {
      const ctx = createMockContext(); // defaults have 5/5 for all quality signals
      const result = runSingleCheck(check, ctx);
      assert.equal(result.status, 'pass', `${id}: ${result.message}`);
    });

    it('fails when quality ratio < 0.8', () => {
      const ctx = createMockContext({
        agentFacts: { skills: { quality: { [qualityKey]: 1, total: 5 } } },
      });
      const result = runSingleCheck(check, ctx);
      assert.equal(result.status, 'fail', `${id}: ${result.message}`);
    });
  });
}

// ---------------------------------------------------------------
// 2.1.19: Skills have output format
// ---------------------------------------------------------------
describe('Check 2.1.19: Skills have output format', () => {
  const check = getCheck('2.1.19');
  assert.ok(check, 'Check 2.1.19 should exist');

  it('passes when most skills define output format', () => {
    const ctx = createMockContext(); // defaults: 5/5
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when few skills have output format', () => {
    const ctx = createMockContext({
      agentFacts: { skills: { quality: { withOutputFormat: 0, total: 5 } } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

// ---------------------------------------------------------------
// 2.1.20: Dispatcher exists
// ---------------------------------------------------------------
describe('Check 2.1.20: Dispatcher installed', () => {
  const check = getCheck('2.1.20');
  assert.ok(check, 'Check 2.1.20 should exist');

  it('passes when dispatcher is installed', () => {
    const ctx = createMockContext({ agentFacts: { skills: { hasDispatcher: true } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when dispatcher is missing', () => {
    const ctx = createMockContext({ agentFacts: { skills: { hasDispatcher: false } } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

// ---------------------------------------------------------------
// Architecture: 2.5.3 decisions dir has real content
// ---------------------------------------------------------------
describe('Check 2.5.3: Decisions dir ADR content', () => {
  const check = getCheck('2.5.3');
  assert.ok(check, 'Check 2.5.3 should exist');

  it('passes when decisions dir has real ADR content', () => {
    const ctx = createMockContext({
      shared: { decisions: { dirExists: true, fileCount: 2, hasRealContent: true } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when no decisions directory', () => {
    const ctx = createMockContext({
      shared: { decisions: { dirExists: false, fileCount: 0, hasRealContent: false } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

// ---------------------------------------------------------------
// Anti-pattern batch: AP19, AP20, AP21
// ---------------------------------------------------------------
// AP18 (Unanswered ADAPT comments) removed - anti-pattern deleted.

describe('Anti-pattern AP19: Hardcoded absolute paths', () => {
  const ap = getAntiPattern('AP19');
  assert.ok(ap, 'AP19 should exist');

  it('triggers when hooks have absolute paths', () => {
    const ctx = createMockContext({
      agentFacts: { hooks: { absolutePathHooks: ['/home/user/project/.claude/hooks/deny.sh'] } },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, result.message);
  });

  it('does not trigger with portable paths', () => {
    const ctx = createMockContext(); // default: []
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

describe('Anti-pattern AP20: Non-canonical skill directories', () => {
  const ap = getAntiPattern('AP20');
  assert.ok(ap, 'AP20 should exist');

  it('triggers when stale goat-prefixed skills exist', () => {
    const ctx = createMockContext({
      agentFacts: { skills: { installedDirs: ['goat', 'goat-debug', 'goat-audit', 'goat-reflect'] } },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, result.message);
  });

  it('does not trigger with only canonical skills', () => {
    const ctx = createMockContext(); // default: canonical set
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

// ---------------------------------------------------------------
// Full tier: Eval checks removed - evals system removed in v1.1.0 (M09).
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// Full tier: Hygiene
// ---------------------------------------------------------------
// Checks 3.3.1 and 3.3.1a (handoff template) removed - handoff is workspace-level, not a rubric concern.

// ---------------------------------------------------------------
// Standard: Learning Loop batch
// ---------------------------------------------------------------
describe('Check 2.3.1: Footguns directory exists', () => {
  const check = getCheck('2.3.1');
  assert.ok(check, 'Check 2.3.1 should exist');

  it('passes with default mock', () => {
    const ctx = createMockContext();
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

describe('Check 2.3.3: Lessons directory exists', () => {
  const check = getCheck('2.3.3');
  assert.ok(check, 'Check 2.3.3 should exist');

  it('passes with default mock', () => {
    const ctx = createMockContext();
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

// 2.3.5b (Learning-loop surfaces are canonical) removed - check deleted.

// ---------------------------------------------------------------
// Standard: Learning Loop additional
// ---------------------------------------------------------------
describe('Check 2.3.2a: Footguns have entries', () => {
  const check = getCheck('2.3.2a');
  assert.ok(check, 'Check 2.3.2a should exist');

  it('passes when footguns have entries', () => {
    const ctx = createMockContext({
      shared: { footguns: { exists: true, entryCount: 3 } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

});

// 2.3.5a (Footguns have evidence labels) removed - check deleted.

describe('Check 2.3.6: Duplicate learning-loop surfaces', () => {
  const check = getCheck('2.3.6');
  assert.ok(check, 'Check 2.3.6 should exist');

  it('exists in registry', () => {
    assert.ok(check.id === '2.3.6');
  });
});

// ---------------------------------------------------------------
// Standard: Local context batch
// ---------------------------------------------------------------
describe('Check 2.6.1: Instructions directory exists', () => {
  const check = getCheck('2.6.1');
  assert.ok(check, 'Check 2.6.1 should exist');

  it('passes with default mock', () => {
    const ctx = createMockContext();
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });

  it('fails when no instructions dir', () => {
    const ctx = createMockContext({
      shared: { localInstructions: { dirExists: false } },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'fail', result.message);
  });
});

// 2.6.2 (.goat-flow/README.md router exists) removed - check deleted.

describe('Check 2.6.3: Instructions have valid router', () => {
  const check = getCheck('2.6.3');
  assert.ok(check, 'Check 2.6.3 should exist');

  it('passes with default mock', () => {
    const ctx = createMockContext();
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

// ---------------------------------------------------------------
// Standard: Signal follow-through
// ---------------------------------------------------------------
describe('Check 2.7.1: LLM integration addressed', () => {
  const check = getCheck('2.7.1');
  assert.ok(check, 'Check 2.7.1 should exist');

  it('is N/A when no LLM integration detected', () => {
    const ctx = createMockContext(); // default: llmIntegration = false
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'na', result.message);
  });
});


// ---------------------------------------------------------------
// Standard: Router additional
// ---------------------------------------------------------------
describe('Check 2.4.1: Router table', () => {
  const check = getCheck('2.4.1');
  assert.ok(check, 'Check 2.4.1 should exist');

  it('passes when router table is found in instruction file', () => {
    const ctx = createMockContext({
      agentFacts: {
        instruction: {
          content: '# CLAUDE.md\n\n## Router Table\n| Resource | Path |\n|---|---|\n| Skills | `.claude/skills/` |\n',
          sections: new Map([['router table', '| Skills | `.claude/skills/` |']]),
        },
        router: { exists: true },
      },
    });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

// ---------------------------------------------------------------
// Standard: Architecture
// ---------------------------------------------------------------
describe('Check 2.5.1: Architecture doc exists', () => {
  const check = getCheck('2.5.1');
  assert.ok(check, 'Check 2.5.1 should exist');

  it('passes with default mock', () => {
    const ctx = createMockContext();
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass', result.message);
  });
});

// ---------------------------------------------------------------
// Remaining anti-patterns: AP6, AP8
// ---------------------------------------------------------------
// AP4 (Footguns without evidence) removed - anti-pattern deleted.

describe('Anti-pattern AP6: Hook swallows failures', () => {
  const ap = getAntiPattern('AP6');
  assert.ok(ap, 'AP6 should exist');

  it('triggers when post-turn hook swallows failures', () => {
    const ctx = createMockContext({
      agentFacts: { hooks: { postTurnSwallowsFailures: true } },
    });
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, true, result.message);
  });

  it('does not trigger when hook reports failures properly', () => {
    const ctx = createMockContext(); // default: swallows = false
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});

describe('Anti-pattern AP8: Generic Ask First boundaries', () => {
  const ap = getAntiPattern('AP8');
  assert.ok(ap, 'AP8 should exist');

  it('does not trigger with default mock (project-specific boundaries)', () => {
    const ctx = createMockContext();
    const result = runSingleAntiPattern(ap, ctx);
    assert.equal(result.triggered, false);
  });
});
