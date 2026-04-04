/**
 * Layer 4: Validates that instruction files and router tables reference paths that actually exist.
 * Catches stale references introduced by renames or deletions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');

/** Extract backtick-wrapped file paths from markdown content. */
function extractPaths(content: string): string[] {
  const pattern = /`((?:src|config|docs|ai-docs|scripts|setup|workflow|\.claude|\.agents|\.github|\.goat-flow)\/[^`]+)`/g;
  const paths: string[] = [];
  for (const match of content.matchAll(pattern)) {
    const rawPath = match[1];
    if (rawPath === undefined) continue;
    // Strip line numbers
    const clean = rawPath.replace(/:[0-9]+(?:[-,][0-9]+)*$/, '');
    // Skip globs and placeholders
    if (/[*?{}]/.test(clean)) continue;
    if (/YYYY|file:line|path\/to/.test(clean)) continue;
    paths.push(clean);
  }
  return [...new Set(paths)];
}

/** Extract pipe-table paths from a router table section. */
function extractRouterPaths(content: string): string[] {
  const paths: string[] = [];
  // Match | path | in router table rows
  const tableRows = content.matchAll(/\|\s*`([^`]+)`\s*\|/g);
  for (const match of tableRows) {
    const rawPath = match[1];
    if (rawPath === undefined) continue;
    // Skip globs
    if (/[*?]/.test(rawPath)) continue;
    // Strip trailing slashes for directory checks
    paths.push(rawPath);
  }
  return [...new Set(paths)];
}

describe('CLAUDE.md path resolution', () => {
  const claudePath = join(ROOT, 'CLAUDE.md');
  if (!existsSync(claudePath)) return;

  const content = readFileSync(claudePath, 'utf-8');
  const paths = extractPaths(content);

  it('has backtick-wrapped paths to check', () => {
    assert.ok(paths.length > 0, 'CLAUDE.md should reference at least one path');
  });

  it('all referenced paths resolve on disk', () => {
    const stale = paths.filter(p => !existsSync(join(ROOT, p)));
    assert.equal(
      stale.length, 0,
      `${stale.length} stale path(s) in CLAUDE.md: ${stale.join(', ')}`,
    );
  });
});

describe('CLAUDE.md router table path resolution', () => {
  const claudePath = join(ROOT, 'CLAUDE.md');
  if (!existsSync(claudePath)) return;

  const content = readFileSync(claudePath, 'utf-8');
  // Extract router table section
  const routerMatch = content.match(/## Router Table[\s\S]*?(?=\n## |\n<!-- |$)/);
  if (!routerMatch) return;

  const routerPaths = extractRouterPaths(routerMatch[0]);

  it('router table has entries', () => {
    assert.ok(routerPaths.length > 0, 'Router table should have path entries');
  });

  it('all router paths resolve on disk', () => {
    const stale = routerPaths.filter(p => {
      const full = join(ROOT, p);
      return !existsSync(full) && !existsSync(full.replace(/\/$/, ''));
    });
    assert.equal(
      stale.length, 0,
      `${stale.length} stale router path(s): ${stale.join(', ')}`,
    );
  });
});

describe('Eval frontmatter validation', () => {
  const evalsDir = join(ROOT, 'ai-docs/evals');
  if (!existsSync(evalsDir)) return;

  const evalFiles = readdirSync(evalsDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  for (const file of evalFiles) {
    it(`${file} has no duplicate YAML frontmatter blocks`, () => {
      const content = readFileSync(join(evalsDir, file), 'utf-8');
      const frontmatterBlocks = content.match(/^---$/gm);
      if (!frontmatterBlocks) return; // No frontmatter is OK
      assert.ok(
        frontmatterBlocks.length <= 2,
        `${file} has ${frontmatterBlocks.length / 2} YAML blocks (expected at most 1)`,
      );
    });
  }
});
