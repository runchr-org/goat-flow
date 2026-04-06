import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '../../.claude/skills');
const CONVENTIONS_PATH = join(
  import.meta.dirname,
  '../../.goat-flow/skill-conventions.md',
);
const SKILL_NAMES = ['goat-debug', 'goat-plan', 'goat-review', 'goat-security', 'goat-test'];

function readSkill(name: string): string {
  return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');
}

const conventions = readFileSync(CONVENTIONS_PATH, 'utf-8');

describe('Skill content contracts', () => {
  for (const name of SKILL_NAMES) {
    describe(name, () => {
      const content = readSkill(name);

      it('has YAML frontmatter with required fields', () => {
        assert.ok(content.startsWith('---'), 'Should start with YAML frontmatter');
        assert.ok(content.includes('name:'), 'Should have name field');
        assert.ok(content.includes('description:'), 'Should have description field');
        assert.ok(content.includes('goat-flow-skill-version:'), 'Should have version field');
      });

      it('has Step 0 section', () => {
        assert.ok(content.includes('Step 0'), `${name} should have Step 0`);
      });

      it('has footgun check in Step 0', () => {
        assert.ok(
          content.includes('Footgun check') || content.includes('footgun'),
          `${name} should check footguns in Step 0`,
        );
      });

      it('has contradiction check in Step 0', () => {
        assert.ok(
          content.includes('Contradiction check'),
          `${name} should have contradiction detection in Step 0`,
        );
      });

      it('delegates shared conventions to skill-conventions.md', () => {
        assert.ok(
          content.includes('skill-conventions.md'),
          `${name} should reference skill-conventions.md for shared conventions`,
        );
      });

      it('does not reference deleted skills', () => {
        const deleted = ['goat-investigate', 'goat-onboard', 'goat-reflect', 'goat-resume', 'goat-audit'];
        for (const d of deleted) {
          assert.ok(
            !content.includes(d),
            `${name} references deleted skill ${d}`,
          );
        }
      });

      it('does not have duplicate recurrence check (goat-debug only)', () => {
        if (name !== 'goat-debug') return;
        const recurrenceMatches = content.match(/RECURRENCE CHECK/g);
        assert.ok(
          !recurrenceMatches || recurrenceMatches.length <= 1,
          `goat-debug should have at most 1 recurrence check, found ${recurrenceMatches?.length}`,
        );
      });

      it('goat-debug has investigate mode', () => {
        if (name !== 'goat-debug') return;
        assert.ok(content.includes('Investigate Mode'), 'goat-debug should have Investigate Mode');
        assert.ok(content.includes('Onboard Mode'), 'goat-debug should have Onboard Mode');
      });

      it('goat-plan has refactor mode', () => {
        if (name !== 'goat-plan') return;
        assert.ok(content.includes('Refactor Planning Mode'), 'goat-plan should have Refactor Planning Mode');
        assert.ok(content.includes('Blast Radius'), 'Refactor mode should have blast radius analysis');
      });

      it('goat-plan has Small Feature tier', () => {
        if (name !== 'goat-plan') return;
        assert.ok(content.includes('Small Feature'), 'goat-plan should have Small Feature complexity tier');
      });

      it('goat-plan Phase 2-3 are conditional', () => {
        if (name !== 'goat-plan') return;
        assert.ok(
          content.includes('skip Phases 2-3') || content.includes('skip Phases 2-4') || content.includes('skip Phase 2-3'),
          'goat-plan Phase 2-3 should be conditional on complexity',
        );
      });

      it('goat-review has auto-detect mode', () => {
        if (name !== 'goat-review') return;
        assert.ok(content.includes('Auto-detect mode'), 'goat-review should auto-detect Standard vs Audit');
      });

      it('goat-test has auto-detect mode', () => {
        if (name !== 'goat-test') return;
        assert.ok(content.includes('Auto-detect mode'), 'goat-test should auto-detect Standard vs Audit');
      });
    });
  }
});

describe('Shared skill-conventions.md content', () => {
  it('has ceremony level section', () => {
    assert.ok(
      conventions.includes('Ceremony Level'),
      'skill-conventions.md should have Ceremony Level section',
    );
  });

  it('has footgun fast-path', () => {
    assert.ok(
      conventions.includes('Footgun Fast-Path'),
      'skill-conventions.md should have Footgun Fast-Path section',
    );
  });

  it('has learning loop reference', () => {
    assert.ok(
      conventions.includes('Learning Loop'),
      'skill-conventions.md should have Learning Loop section',
    );
  });

  it('has session log in closing', () => {
    assert.ok(
      conventions.includes('logs/sessions'),
      'skill-conventions.md should reference session logs in closing protocol',
    );
  });

  it('has category bucket format for lessons/footguns', () => {
    assert.ok(
      conventions.includes('## Lesson:') || conventions.includes('## Footgun:'),
      'skill-conventions.md should have category bucket entry format examples',
    );
  });
});

describe('Skill-template consistency', () => {
  const WORKFLOW_DIR = join(import.meta.dirname, '../../workflow/skills');

  for (const name of SKILL_NAMES) {
    it(`${name} installed version has same key sections as workflow template`, () => {
      const installed = readSkill(name);
      const templatePath = join(WORKFLOW_DIR, `${name}.md`);
      if (!existsSync(templatePath)) return;

      const template = readFileSync(templatePath, 'utf-8');

      // Both should have these required sections
      const requiredSections = ['Step 0', 'When to Use', 'Shared Conventions'];
      for (const section of requiredSections) {
        if (template.includes(section)) {
          assert.ok(
            installed.includes(section),
            `${name}: installed missing '${section}' section that template has`,
          );
        }
      }
    });
  }
});
