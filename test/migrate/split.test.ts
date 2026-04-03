/**
 * Round-trip tests for lesson and footgun migration helpers.
 * These cases protect both split output structure and merge-back fidelity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  mergeFootguns,
  mergeLessons,
  splitFootguns,
  splitLessons,
} from '../../src/cli/migrate/index.js';

/** Run a migration test inside a disposable temporary directory. */
function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'goat-flow-migrate-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('migration helpers', () => {
  it('splits and merges footguns', () => {
    withTempDir((dir) => {
      const input = join(dir, 'footguns.md');
      const outputDir = join(dir, 'footguns');
      const merged = join(dir, 'footguns-merged.md');
      const source = [
        '# Footguns',
        '',
        'Intro text.',
        '',
        '## Footgun: Cross reference fragility',
        '',
        '**Evidence type:** ACTUAL_MEASURED',
        '',
        '**Symptoms:** Broken links.',
        '',
        '**Prevention:** Grep after rename.',
        '',
        '**Created:** 2026-03-20',
        '',
        '## Footgun: Duplicate slug',
        '',
        '**Evidence type:** DESIGN_TARGET',
        '',
        '**Status:** RESOLVED',
        '',
        '**Prevention:** Keep canonical source.',
        '',
        '**Created:** 2026-03-21',
        '',
        '## Footgun: Duplicate slug',
        '',
        '**Evidence type:** ACTUAL_MEASURED',
        '',
        '**Prevention:** Add suffix.',
        '',
        '**Created:** 2026-03-22',
        '',
      ].join('\n');
      writeFileSync(input, source);

      const result = splitFootguns(input, outputDir);
      assert.equal(result.fileCount, 3);
      assert.ok(result.files.includes('README.md'));
      assert.ok(result.files.includes('general.md'));

      const bucket = readFileSync(join(outputDir, 'general.md'), 'utf8');
      assert.match(bucket, /^---\ncategory: general/m);
      assert.match(bucket, /## Footgun: Cross reference fragility/);
      assert.match(bucket, /\*\*Evidence type:\*\* ACTUAL_MEASURED/);
      assert.match(bucket, /\*\*Status:\*\* resolved/);

      const mergedResult = mergeFootguns(outputDir, merged);
      assert.equal(mergedResult.fileCount, 3);
      const mergedText = readFileSync(merged, 'utf8');
      assert.match(mergedText, /## Footgun: Cross reference fragility/);
      assert.match(mergedText, /\*\*Status:\*\* RESOLVED/);
    });
  });

  it('splits and merges lessons including patterns', () => {
    withTempDir((dir) => {
      const input = join(dir, 'lessons.md');
      const outputDir = join(dir, 'lessons');
      const merged = join(dir, 'lessons-merged.md');
      const source = [
        '# Lessons',
        '',
        'Intro text.',
        '',
        '## Entries',
        '',
        '### Version bumps require confirmation',
        '**What happened:** Bumped versions without approval.',
        '',
        '**Prevention:** Treat version changes separately.',
        '',
        '**created_at:** 2026-03-29',
        '',
        '### Double check means read the files',
        '**What happened:** Tests passed but content was wrong.',
        '',
        '**created_at:** 2026-03-22',
        '',
        '## Patterns',
        '',
        '### Pattern: Verification scope must match change scope',
        '_Entries: "Version bumps require confirmation", "Double check means read the files"_',
        '',
        'Read the changed files, not just tests.',
        '',
        '**created_at:** 2026-03-30',
        '',
      ].join('\n');
      writeFileSync(input, source);

      const result = splitLessons(input, outputDir);
      assert.equal(result.fileCount, 3);
      assert.ok(result.files.includes('general.md'));
      assert.ok(result.files.includes('patterns.md'));

      const general = readFileSync(join(outputDir, 'general.md'), 'utf8');
      assert.match(general, /^---\ncategory: general/m);
      assert.match(general, /## Lesson: Version bumps require confirmation/);

      const pattern = readFileSync(join(outputDir, 'patterns.md'), 'utf8');
      assert.match(pattern, /^---\ncategory: patterns/m);
      assert.match(
        pattern,
        /## Pattern: Verification scope must match change scope/,
      );
      assert.match(
        pattern,
        /_Entries: "Version bumps require confirmation", "Double check means read the files"_/,
      );

      const mergedResult = mergeLessons(outputDir, merged);
      assert.equal(mergedResult.fileCount, 3);
      const mergedText = readFileSync(merged, 'utf8');
      assert.match(mergedText, /## Entries/);
      assert.match(mergedText, /## Patterns/);
      assert.match(
        mergedText,
        /_Entries: "Version bumps require confirmation", "Double check means read the files"_/,
      );
    });
  });

  it('warns on missing lesson dates and preserves files', () => {
    withTempDir((dir) => {
      const input = join(dir, 'lessons.md');
      const outputDir = join(dir, 'lessons');
      writeFileSync(
        input,
        [
          '# Lessons',
          '',
          '## Entries',
          '',
          '### Missing date',
          'Body only.',
          '',
        ].join('\n'),
      );

      const result = splitLessons(input, outputDir);
      assert.ok(
        result.warnings.some((warning) =>
          warning.includes('no created_at date'),
        ),
      );
      assert.ok(readdirSync(outputDir).some((file) => file === 'general.md'));
    });
  });

  it('warns on empty footgun body after metadata extraction', () => {
    withTempDir((dir) => {
      const input = join(dir, 'footguns.md');
      const outputDir = join(dir, 'footguns');
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(
        input,
        [
          '# Footguns',
          '',
          '## Footgun: Empty body',
          '',
          '**Evidence type:** ACTUAL_MEASURED',
          '',
          '**Created:** 2026-03-20',
          '',
        ].join('\n'),
      );

      const result = splitFootguns(input, outputDir);
      assert.ok(
        result.warnings.some((warning) => warning.includes('empty body')),
      );
    });
  });
});
