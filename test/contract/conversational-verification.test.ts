import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface GuidedField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  default?: string;
}

interface Preset {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  cat: string;
  guided?: boolean;
  guidedFields?: GuidedField[];
  guidedTemplate?: string;
}

const PRESETS_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  'src',
  'dashboard',
  'presets.js',
);

function loadPresets(): Preset[] {
  const content = readFileSync(PRESETS_PATH, 'utf-8');
  return eval(content + '; PRESETS') as Preset[];
}

describe('guided presets validation', () => {
  const presets = loadPresets();
  const guidedIds = ['fix-bug', 'review', 'plan', 'security', 'test', 'explore', 'error', 'user-flow', 'simplify', 'uncommitted', 'review-instructions', 'critique', 'refactor', 'sbao', 'qa-gaps', 'dep-scan', 'compliance', 'triage'];

  it('guided presets have guided: true', () => {
    for (const id of guidedIds) {
      const preset = presets.find((p) => p.id === id);
      assert.ok(preset, `Preset ${id} not found`);
      assert.equal(
        preset.guided,
        true,
        `Preset ${id} should have guided: true`,
      );
    }
  });

  it('guided presets have guidedFields array', () => {
    for (const id of guidedIds) {
      const preset = presets.find((p) => p.id === id)!;
      assert.ok(
        Array.isArray(preset.guidedFields),
        `Preset ${id} missing guidedFields`,
      );
      assert.ok(
        preset.guidedFields!.length >= 1,
        `Preset ${id} should have >= 1 guided field, got ${preset.guidedFields!.length}`,
      );
    }
  });

  it('guided presets have guidedTemplate', () => {
    for (const id of guidedIds) {
      const preset = presets.find((p) => p.id === id)!;
      assert.ok(
        typeof preset.guidedTemplate === 'string' &&
          preset.guidedTemplate.length > 0,
        `Preset ${id} missing guidedTemplate`,
      );
    }
  });

  it('guided field keys match template placeholders', () => {
    for (const id of guidedIds) {
      const preset = presets.find((p) => p.id === id)!;
      for (const field of preset.guidedFields!) {
        assert.ok(
          preset.guidedTemplate!.includes(`{${field.key}}`),
          `Preset ${id}: field "${field.key}" not found in guidedTemplate`,
        );
      }
    }
  });

  it('guided fields have valid types', () => {
    const validTypes = new Set(['input', 'textarea', 'select']);
    for (const id of guidedIds) {
      const preset = presets.find((p) => p.id === id)!;
      for (const field of preset.guidedFields!) {
        assert.ok(
          validTypes.has(field.type),
          `Preset ${id}: field "${field.key}" has invalid type "${field.type}"`,
        );
        if (field.type === 'select') {
          assert.ok(
            Array.isArray(field.options) && field.options.length > 0,
            `Preset ${id}: select field "${field.key}" missing options`,
          );
        }
      }
    }
  });

  it('non-guided presets do not have guided: true', () => {
    const guidedSet = new Set(guidedIds);
    for (const preset of presets) {
      if (!guidedSet.has(preset.id)) {
        assert.ok(
          !preset.guided,
          `Preset ${preset.id} should NOT have guided: true`,
        );
      }
    }
  });
});

