import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load presets from the source file
const presetsContent = readFileSync(join(import.meta.dirname, '../../src/dashboard/presets.js'), 'utf-8');
// Extract the PRESETS array by evaluating the JS
const PRESETS: Array<{ id: string; name: string; desc: string; prompt: string; cat: string }> = eval(presetsContent + '; PRESETS');

describe('Preset launcher content validation', () => {
  it('has at least 12 presets', () => {
    assert.ok(PRESETS.length >= 12, `Expected ≥12 presets, got ${PRESETS.length}`);
  });

  it('every preset has required fields', () => {
    for (const p of PRESETS) {
      assert.ok(p.id, `Preset missing id`);
      assert.ok(p.name, `Preset ${p.id} missing name`);
      assert.ok(p.desc, `Preset ${p.id} missing desc`);
      assert.ok(p.prompt.length > 10, `Preset ${p.id} prompt too short (${p.prompt.length} chars)`);
      assert.ok(p.cat, `Preset ${p.id} missing cat`);
    }
  });

  it('no duplicate preset IDs', () => {
    const ids = PRESETS.map(p => p.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, `Duplicate preset IDs: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
  });

  it('categories are from the allowed set', () => {
    const allowed = new Set(['understand', 'review', 'plan', 'test', 'security', 'audit']);
    for (const p of PRESETS) {
      assert.ok(allowed.has(p.cat), `Preset ${p.id} has unknown category '${p.cat}'. Allowed: ${[...allowed].join(', ')}`);
    }
  });

  it('deleted presets are gone', () => {
    const ids = PRESETS.map(p => p.id);
    assert.ok(!ids.includes('question'), 'Quick Question should be deleted');
    assert.ok(!ids.includes('docs'), 'Generate Docs should be deleted');
    assert.ok(!ids.includes('compare'), 'Compare & Rate should be deleted');
  });

  it('new presets exist', () => {
    const ids = PRESETS.map(p => p.id);
    assert.ok(ids.includes('fix-bug'), 'Fix Bug preset missing');
    assert.ok(ids.includes('quick-test'), 'Quick Test preset missing');
    assert.ok(ids.includes('dep-scan'), 'Dependency Scan preset missing');
    assert.ok(ids.includes('targeted-test'), 'Targeted Test Plan preset missing');
  });

  it('every preset with a skill prefix uses a valid skill', () => {
    const validSkills = ['/goat-debug', '/goat-review', '/goat-plan', '/goat-test', '/goat-security', '/goat'];
    for (const p of PRESETS) {
      if (p.prompt.startsWith('/goat')) {
        const skill = p.prompt.split(' ')[0];
        assert.ok(
          validSkills.some(s => skill.startsWith(s)),
          `Preset ${p.id} uses unknown skill prefix '${skill}'`,
        );
      }
    }
  });

  it('search filters presets by name, desc, and prompt', () => {
    // Simulate the filteredPresets logic
    const search = (q: string) => {
      const lower = q.toLowerCase();
      return PRESETS.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.desc.toLowerCase().includes(lower) ||
        p.prompt.toLowerCase().includes(lower),
      );
    };

    assert.ok(search('security').length >= 1, 'Search "security" should find security presets');
    assert.ok(search('bug').length >= 1, 'Search "bug" should find bug-related presets');
    assert.ok(search('zzzznonexistent').length === 0, 'Search nonsense should find nothing');
    assert.ok(search('review').length >= 1, 'Search "review" should find review presets');
  });

  it('category filter works correctly', () => {
    const filterByCategory = (cat: string) =>
      cat === 'all' ? PRESETS : PRESETS.filter(p => p.cat === cat);

    assert.ok(filterByCategory('all').length === PRESETS.length, 'All filter returns everything');
    assert.ok(filterByCategory('understand').length >= 2, 'Understand category has presets');
    assert.ok(filterByCategory('security').length >= 1, 'Security category has presets');
    assert.ok(filterByCategory('nonexistent').length === 0, 'Unknown category returns nothing');
  });

  it('architecture diagram preset asks scoping questions', () => {
    const diagram = PRESETS.find(p => p.id === 'diagram');
    assert.ok(diagram, 'Architecture Diagram preset exists');
    assert.ok(diagram.prompt.includes('ask me'), 'Should ask questions before generating');
    assert.ok(diagram.prompt.includes('Mermaid'), 'Should mention Mermaid format');
    assert.ok(diagram.prompt.includes('15-20 nodes'), 'Should constrain node count');
  });

  it('targeted test preset waits for input', () => {
    const targeted = PRESETS.find(p => p.id === 'targeted-test');
    assert.ok(targeted, 'Targeted Test Plan preset exists');
    assert.ok(targeted.prompt.includes('Wait for me to paste'), 'Should wait for GitHub issue paste');
    assert.ok(targeted.prompt.includes('1-hour version'), 'Should offer time-boxed versions');
    assert.ok(targeted.prompt.includes('Do NOT include'), 'Should specify exclusions');
  });
});
