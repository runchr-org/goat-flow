import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '../../.claude/skills');
const SKILL_NAMES = ['goat-debug', 'goat-plan', 'goat-review', 'goat-security', 'goat-test'];

function readSkill(name: string): string {
  return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');
}

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

      it('has ceremony level in shared conventions', () => {
        assert.ok(
          content.includes('Ceremony:') || content.includes('ceremony'),
          `${name} should have ceremony-conditional logic`,
        );
      });

      it('has footgun fast-path', () => {
        assert.ok(
          content.includes('Footgun Fast-Path') || content.includes('footgun fast'),
          `${name} should have footgun fast-path`,
        );
      });

      it('has learning loop reference', () => {
        assert.ok(
          content.includes('Learning Loop') || content.includes('learning loop'),
          `${name} should reference the learning loop`,
        );
      });

      it('has session log in closing', () => {
        assert.ok(
          content.includes('logs/sessions'),
          `${name} should reference session logs in closing protocol`,
        );
      });

      it('has category bucket format for lessons/footguns', () => {
        assert.ok(
          content.includes('category bucket') || content.includes('## Lesson:') || content.includes('## Footgun:'),
          `${name} should reference category bucket format`,
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
          content.includes('skip for Hotfix') || content.includes('skip for Standard') || content.includes('only for System'),
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
