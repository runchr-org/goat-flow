import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

interface Scenario {
  vagueInput: string;
  expectedQuestions: string[];
  idealSpecificInput: string;
}

interface ScenarioFile {
  skill: string;
  scenarios: Scenario[];
}

const SCENARIO_DIR = join(import.meta.dirname, '.');
const PRESETS_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  'src',
  'dashboard',
  'presets.js',
);

function loadScenarioFiles(): ScenarioFile[] {
  const files = readdirSync(SCENARIO_DIR).filter((f) =>
    f.endsWith('.scenarios.json'),
  );
  return files.map((f) => {
    const content = readFileSync(join(SCENARIO_DIR, f), 'utf-8');
    return JSON.parse(content) as ScenarioFile;
  });
}

function loadPresets(): Preset[] {
  const content = readFileSync(PRESETS_PATH, 'utf-8');
  return eval(content + '; PRESETS') as Preset[];
}

/** Prompt specificity scorer (mirrors dashboard implementation). */
function promptSpecificity(text: string): number {
  let score = 0;
  if (/[/\\]|\.ts|\.js|\.py|\.php|src\/|lib\/|app\//.test(text)) score++;
  if (
    /error|bug|broken|fail|crash|slow|wrong|missing|symptom|issue/.test(text)
  )
    score++;
  if (/only|just|specific|in\s+\w+\/|scope|area|module|component/.test(text))
    score++;
  if (/should|expect|want|need|goal|done|criteria|must/.test(text)) score++;
  return score;
}

describe('scenario file validation', () => {
  const scenarios = loadScenarioFiles();

  it('scenario files are valid JSON with required fields', () => {
    for (const file of scenarios) {
      assert.ok(
        typeof file.skill === 'string' && file.skill.length > 0,
        `Scenario file missing skill name`,
      );
      assert.ok(
        Array.isArray(file.scenarios),
        `${file.skill}: scenarios must be an array`,
      );
      for (const s of file.scenarios) {
        assert.ok(
          typeof s.vagueInput === 'string' && s.vagueInput.length > 0,
          `${file.skill}: scenario missing vagueInput`,
        );
        assert.ok(
          Array.isArray(s.expectedQuestions) &&
            s.expectedQuestions.length > 0,
          `${file.skill}: scenario "${s.vagueInput}" missing expectedQuestions`,
        );
        assert.ok(
          typeof s.idealSpecificInput === 'string' &&
            s.idealSpecificInput.length > 0,
          `${file.skill}: scenario "${s.vagueInput}" missing idealSpecificInput`,
        );
      }
    }
  });

  it('each skill has at least 3 scenarios', () => {
    for (const file of scenarios) {
      assert.ok(
        file.scenarios.length >= 3,
        `${file.skill}: expected >= 3 scenarios, got ${file.scenarios.length}`,
      );
    }
  });

  it('covers all 5 goat skills', () => {
    const skills = new Set(scenarios.map((s) => s.skill));
    for (const expected of [
      'goat-debug',
      'goat-review',
      'goat-plan',
      'goat-security',
      'goat-test',
    ]) {
      assert.ok(
        skills.has(expected),
        `Missing scenario file for ${expected}`,
      );
    }
  });

  it('ideal specific inputs are more specific than vague inputs', () => {
    for (const file of scenarios) {
      for (const s of file.scenarios) {
        assert.ok(
          s.idealSpecificInput.length > s.vagueInput.length,
          `${file.skill}: idealSpecificInput should be longer than vagueInput for "${s.vagueInput}"`,
        );
      }
    }
  });
});

describe('guided presets validation', () => {
  const presets = loadPresets();
  const guidedIds = ['fix-bug', 'review', 'plan', 'security', 'test'];

  it('top 5 presets have guided: true', () => {
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
        preset.guidedFields!.length >= 3,
        `Preset ${id} should have >= 3 guided fields, got ${preset.guidedFields!.length}`,
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

describe('prompt specificity scoring', () => {
  it('scores 0 for empty string', () => {
    assert.equal(promptSpecificity(''), 0);
  });

  it('scores 0 for generic text', () => {
    assert.equal(promptSpecificity('help me'), 0);
  });

  it('scores 1 for file path only', () => {
    assert.equal(promptSpecificity('look at src/auth/login.ts'), 1);
  });

  it('scores 2 for file path + symptom', () => {
    assert.equal(
      promptSpecificity('src/auth/login.ts has a bug'),
      2,
    );
  });

  it('scores 3 for path + symptom + scope', () => {
    assert.equal(
      promptSpecificity('bug in src/auth/ area only'),
      3,
    );
  });

  it('scores 4 for fully detailed prompt', () => {
    assert.equal(
      promptSpecificity(
        'bug in src/auth/login.ts — should return 200, only in the auth module',
      ),
      4,
    );
  });

  it('symptom keywords are detected', () => {
    for (const keyword of ['error', 'broken', 'crash', 'slow', 'wrong']) {
      assert.ok(
        promptSpecificity(`the ${keyword}`) >= 1,
        `"${keyword}" should trigger symptom detection`,
      );
    }
  });

  it('criteria keywords are detected', () => {
    for (const keyword of ['should', 'expect', 'need', 'goal', 'must']) {
      assert.ok(
        promptSpecificity(`${keyword} work`) >= 1,
        `"${keyword}" should trigger criteria detection`,
      );
    }
  });
});
