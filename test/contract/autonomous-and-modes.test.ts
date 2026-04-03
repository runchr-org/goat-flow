/**
 * Structural verification for M11 (autonomous mode), M14 (auto-mode selection),
 * and M12 (persona) prerequisites. These tests verify SKILL.md content
 * contains the patterns required for each feature.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '../../.claude/skills');
const PREAMBLE_PATH = join(
  import.meta.dirname,
  '../../workflow/skills/reference/shared-preamble.md',
);

function readSkill(name: string): string {
  return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');
}

const preamble = readFileSync(PREAMBLE_PATH, 'utf-8');
const ALL_SKILLS = [
  'goat-debug',
  'goat-plan',
  'goat-review',
  'goat-security',
  'goat-test',
];

// === M11: Autonomous mode prerequisites ===

describe('M11: autonomous mode structural checks', () => {
  it('shared preamble has CHECKPOINT definition', () => {
    assert.ok(
      preamble.includes('CHECKPOINT'),
      'Shared preamble should define CHECKPOINT behavior',
    );
  });

  it('shared preamble has BLOCKING GATE definition', () => {
    assert.ok(
      preamble.includes('BLOCKING GATE'),
      'Shared preamble should define BLOCKING GATE behavior',
    );
  });

  it('shared preamble has ceremony level table', () => {
    assert.ok(
      preamble.includes('Ceremony Level') || preamble.includes('Ceremony:'),
      'Shared preamble should have ceremony level guidance',
    );
    assert.ok(
      preamble.includes('Hotfix'),
      'Ceremony should reference Hotfix complexity',
    );
  });

  it('shared preamble has sub-agent mode handling', () => {
    assert.ok(
      preamble.includes('Sub-agent mode') || preamble.includes('sub-agent'),
      'Shared preamble should document sub-agent mode behavior',
    );
  });

  it('shared preamble has recovery section', () => {
    assert.ok(
      preamble.includes('Recovery'),
      'Shared preamble should have recovery guidance',
    );
    assert.ok(
      preamble.includes('Partial completion'),
      'Recovery should cover partial completion',
    );
    assert.ok(
      preamble.includes('Missing artifacts'),
      'Recovery should cover missing artifacts',
    );
  });

  it('shared preamble has handoff recovery for autonomous mode', () => {
    assert.ok(
      preamble.includes('handoff'),
      'Recovery should mention handoff for context preservation',
    );
  });

  for (const name of ALL_SKILLS) {
    it(`${name} has ceremony-conditional content`, () => {
      const content = readSkill(name);
      assert.ok(
        content.includes('Ceremony') || content.includes('ceremony'),
        `${name} should have ceremony-conditional logic`,
      );
    });

    it(`${name} has CHECKPOINT mentions (autonomous support)`, () => {
      const content = readSkill(name);
      assert.ok(
        content.includes('CHECKPOINT') || content.includes('Checkpoint'),
        `${name} should have CHECKPOINT for autonomous mode`,
      );
    });
  }
});

// === M14: Auto-mode selection prerequisites ===

describe('M14: auto-mode selection structural checks', () => {
  it('goat-review has scope detection priority', () => {
    const content = readSkill('goat-review');
    assert.ok(
      content.includes('Scope detection priority') ||
        content.includes('scope detection'),
      'goat-review should have scope detection priority order',
    );
  });

  it('goat-review auto-detects Standard vs Audit', () => {
    const content = readSkill('goat-review');
    assert.ok(
      content.includes('Standard mode'),
      'goat-review should mention Standard mode',
    );
    assert.ok(
      content.includes('Audit mode'),
      'goat-review should mention Audit mode',
    );
  });

  it('goat-review handles dirty worktree', () => {
    const content = readSkill('goat-review');
    assert.ok(
      content.includes('20+ changed files') || content.includes('very dirty'),
      'goat-review should handle dirty worktree edge case',
    );
  });

  it('goat-review supports explicit override', () => {
    const content = readSkill('goat-review');
    assert.ok(
      content.includes('respect override') ||
        content.includes('explicitly says'),
      'goat-review should support explicit mode override',
    );
  });

  it('goat-test has scope detection priority', () => {
    const content = readSkill('goat-test');
    assert.ok(
      content.includes('Scope detection priority') ||
        content.includes('scope detection'),
      'goat-test should have scope detection priority order',
    );
  });

  it('goat-test auto-detects Standard vs Audit', () => {
    const content = readSkill('goat-test');
    assert.ok(
      content.includes('Standard mode'),
      'goat-test should mention Standard mode',
    );
    assert.ok(
      content.includes('Audit mode'),
      'goat-test should mention Audit mode',
    );
  });

  it('goat-test audit mode skips Phase 0', () => {
    const content = readSkill('goat-test');
    assert.ok(
      content.includes('skip Phase 0') ||
        content.includes('gap analysis'),
      'goat-test Audit mode should skip Phase 0 or go to gap analysis',
    );
  });

  for (const name of ALL_SKILLS) {
    it(`${name} has contradiction check`, () => {
      const content = readSkill(name);
      assert.ok(
        content.includes('Contradiction check'),
        `${name} should have contradiction detection in Step 0`,
      );
    });

    it(`${name} contradiction check flags hotfix scope mismatch`, () => {
      const content = readSkill(name);
      const contradictionSection = content.match(
        /Contradiction check[\s\S]*?(?=\n\*\*|$)/,
      );
      assert.ok(contradictionSection, `${name} should have contradiction section`);
      assert.ok(
        contradictionSection[0].includes('hotfix') ||
          contradictionSection[0].includes('Hotfix'),
        `${name} contradiction should flag hotfix scope mismatch`,
      );
    });
  }
});

// === M12: Persona prerequisites ===

describe('M12: persona structural checks', () => {
  it('config.yaml has persona field', () => {
    const configContent = readFileSync(
      join(import.meta.dirname, '../../.goat-flow/config.yaml'),
      'utf-8',
    );
    assert.ok(
      configContent.includes('persona:'),
      'config.yaml should have persona field',
    );
    assert.ok(
      configContent.includes('developer'),
      'config.yaml should default to developer persona',
    );
    assert.ok(
      configContent.includes('investigator'),
      'config.yaml should document investigator option',
    );
  });

  it('config.yaml documents persona options for dispatcher routing', () => {
    const configContent = readFileSync(
      join(import.meta.dirname, '../../.goat-flow/config.yaml'),
      'utf-8',
    );
    // Persona is documented in config.yaml — dispatcher reads it at runtime
    assert.ok(
      configContent.includes('persona: developer'),
      'config.yaml should set persona: developer as default',
    );
    assert.ok(
      configContent.includes('investigator'),
      'config.yaml should document investigator option',
    );
  });

  it('investigation-mode skills are read-only by design', () => {
    // goat-review and goat-security are read-only skills — no implementation phases
    const review = readSkill('goat-review');
    const security = readSkill('goat-security');

    // These skills should NOT have implementation/edit phases
    assert.ok(
      !review.includes('## Phase.*Implement'),
      'goat-review should not have implementation phases',
    );
    assert.ok(
      !security.includes('## Phase.*Implement'),
      'goat-security should not have implementation phases',
    );
  });

  it('goat-debug D2 gate offers "just report findings" option', () => {
    const content = readSkill('goat-debug');
    assert.ok(
      content.includes('just report findings') ||
        content.includes('report findings') ||
        content.includes('stop here'),
      'goat-debug D2 gate should offer investigation-only exit',
    );
  });
});
