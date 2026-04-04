import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Preset {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  cat: string;
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
