/**
 * End-to-end tests for eval parsing, loading, and summary formatting.
 * The suite covers both structured frontmatter evals and older legacy markdown inputs.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvalFile } from '../../src/cli/evals/parser.js';
import {
  loadEvals,
  summarize,
  formatSummaryText,
  formatSummaryJson,
} from '../../src/cli/evals/loader.js';
import { createMockFS } from '../helpers/mock-fs.js';

// --- Parser tests ---

describe('parseEvalFile — new format (frontmatter)', () => {
  it('parses a complete eval file', () => {
    const raw = `---
name: test-eval
description: A test eval
origin: real-incident
agents: claude
skill: goat-debug
difficulty: hard
---

### Scenario

User reports a bug in the auth module.

### Expected Behavior

- [ ] Agent reads auth module first
- [x] Agent identifies the root cause

### Anti-Patterns

- Agent skips reading the code
- Agent guesses without evidence
`;
    const result = parseEvalFile(raw, 'test-eval.md');
    assert.equal(result.file, 'test-eval.md');
    assert.equal(result.frontmatter.name, 'test-eval');
    assert.equal(result.frontmatter.description, 'A test eval');
    assert.equal(result.frontmatter.origin, 'real-incident');
    assert.equal(result.frontmatter.agents, 'claude');
    assert.equal(result.frontmatter.skill, 'goat-debug');
    assert.equal(result.frontmatter.difficulty, 'hard');
    assert.equal(result.scenario, 'User reports a bug in the auth module.');
    assert.equal(result.expectedBehaviors.length, 2);
    assert.equal(
      result.expectedBehaviors[0].text,
      'Agent reads auth module first',
    );
    assert.equal(result.expectedBehaviors[0].status, 'fail');
    assert.equal(
      result.expectedBehaviors[1].text,
      'Agent identifies the root cause',
    );
    assert.equal(result.expectedBehaviors[1].status, 'pass');
    assert.equal(result.antiPatterns.length, 2);
    assert.equal(result.antiPatterns[0], 'Agent skips reading the code');
  });

  it('defaults missing optional fields', () => {
    const raw = `---
name: minimal
description: Minimal eval
---

### Scenario

Do something.
`;
    const result = parseEvalFile(raw, 'minimal.md');
    assert.equal(result.frontmatter.origin, 'synthetic-seed');
    assert.equal(result.frontmatter.agents, 'all');
    assert.equal(result.frontmatter.skill, null);
    assert.equal(result.frontmatter.difficulty, 'medium');
  });

  it('rejects frontmatter without name', () => {
    const raw = `---
description: No name field
---

### Scenario
Test.
`;
    assert.throws(() => parseEvalFile(raw, 'bad.md'), /Invalid frontmatter/);
  });

  it('validates skill against SKILL_NAMES', () => {
    const raw = `---
name: skill-test
description: Test skill validation
skill: goat-nonexistent
---

### Scenario
Test.
`;
    const result = parseEvalFile(raw, 'skill-test.md');
    assert.equal(result.frontmatter.skill, null); // unknown skill → null
  });

  it('strips code fences from scenario', () => {
    const raw = `---
name: fenced
description: Code fence test
---

### Scenario

\`\`\`text
Run this exact prompt in Claude Code.
\`\`\`
`;
    const result = parseEvalFile(raw, 'fenced.md');
    assert.equal(result.scenario, 'Run this exact prompt in Claude Code.');
  });

  it('handles numbered list items as gates', () => {
    const raw = `---
name: numbered
description: Numbered gates
---

### Expected Behavior

1. Agent reads the file
2. Agent proposes a fix
`;
    const result = parseEvalFile(raw, 'numbered.md');
    assert.equal(result.expectedBehaviors.length, 2);
    assert.equal(result.expectedBehaviors[0].status, 'fail'); // numbered items default to fail
    assert.equal(result.expectedBehaviors[0].text, 'Agent reads the file');
  });

  it('treats non-bulleted anti-pattern section as single item', () => {
    const raw = `---
name: prose-ap
description: Prose anti-pattern
---

### Anti-Patterns

The agent should never skip the diagnosis phase and jump straight to a fix.
`;
    const result = parseEvalFile(raw, 'prose-ap.md');
    assert.equal(result.antiPatterns.length, 1);
    assert.ok(result.antiPatterns[0].includes('never skip'));
  });
});

describe('parseEvalFile — legacy format (no frontmatter)', () => {
  it('parses legacy eval with **Origin:** and **Agents:**', () => {
    const raw = `# Eval: Debug before fix

**Origin:** \`real-incident\`
**Agents:** \`claude\`

## Replay Prompt

Fix the login bug.

## Expected Outcome

1. Agent reads the auth module
2. Agent identifies the root cause
`;
    const result = parseEvalFile(raw, 'debug-before-fix.md');
    assert.equal(result.frontmatter.name, 'debug-before-fix');
    assert.equal(result.frontmatter.origin, 'real-incident');
    assert.equal(result.frontmatter.agents, 'claude');
    assert.equal(result.frontmatter.skill, null);
    assert.equal(result.frontmatter.difficulty, 'medium');
    assert.equal(result.scenario, 'Fix the login bug.');
    assert.equal(result.expectedBehaviors.length, 2);
  });

  it('defaults origin and agents when missing', () => {
    const raw = `# Eval: simple test

## Replay Prompt

Do something.
`;
    const result = parseEvalFile(raw, 'simple.md');
    assert.equal(result.frontmatter.origin, 'synthetic-seed');
    assert.equal(result.frontmatter.agents, 'all');
  });
});

describe('parseEvalFile — section heading aliases', () => {
  it('accepts "Replay Prompt" as alias for Scenario', () => {
    const raw = `---
name: alias-test
description: Alias test
---

### Replay Prompt

This is the scenario via alias.
`;
    const result = parseEvalFile(raw, 'alias.md');
    assert.equal(result.scenario, 'This is the scenario via alias.');
  });

  it('accepts "Expected Outcome" as alias for Expected Behavior', () => {
    const raw = `---
name: outcome-test
description: Outcome alias
---

### Expected Outcome

- [ ] Something happens
`;
    const result = parseEvalFile(raw, 'outcome.md');
    assert.equal(result.expectedBehaviors.length, 1);
  });

  it('accepts "Known Failure Mode" as alias for Anti-Patterns', () => {
    const raw = `---
name: failure-test
description: Failure mode alias
---

### Known Failure Mode

- Agent does the wrong thing
`;
    const result = parseEvalFile(raw, 'failure.md');
    assert.equal(result.antiPatterns.length, 1);
  });
});

// --- Loader tests ---

describe('loadEvals', () => {
  it('loads eval files from a directory', () => {
    const fs = createMockFS({
      'evals/test-one.md': `---\nname: one\ndescription: First\n---\n\n### Scenario\nDo A.`,
      'evals/test-two.md': `---\nname: two\ndescription: Second\n---\n\n### Scenario\nDo B.`,
    });
    const { evals, errors } = loadEvals(fs, 'evals');
    assert.equal(evals.length, 2);
    assert.equal(errors.length, 0);
  });

  it('skips README.md and FORMAT.md', () => {
    const fs = createMockFS({
      'evals/README.md': '# Evals readme',
      'evals/FORMAT.md': '# Format docs',
      'evals/real-eval.md': `---\nname: real\ndescription: Real\n---\n\n### Scenario\nTest.`,
    });
    const { evals } = loadEvals(fs, 'evals');
    assert.equal(evals.length, 1);
    assert.equal(evals[0].frontmatter.name, 'real');
  });

  it('reports parse errors without crashing', () => {
    const fs = createMockFS({
      'evals/good.md': `---\nname: good\ndescription: Good\n---\n\n### Scenario\nOK.`,
      'evals/bad.md': `---\ndescription: no name field\n---\n\nBroken.`,
    });
    const { evals, errors } = loadEvals(fs, 'evals');
    assert.equal(evals.length, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, 'bad.md');
  });

  it('returns empty for non-existent directory', () => {
    const fs = createMockFS({});
    const { evals, errors } = loadEvals(fs, 'evals');
    assert.equal(evals.length, 0);
    assert.equal(errors.length, 0);
  });
});

// --- Summarize tests ---

describe('summarize', () => {
  it('groups evals by skill, agent, difficulty, origin', () => {
    const fs = createMockFS({
      'evals/a.md': `---\nname: a\ndescription: A\nskill: goat-debug\nagents: claude\ndifficulty: hard\norigin: real-incident\n---\n\n### Scenario\nA.`,
      'evals/b.md': `---\nname: b\ndescription: B\nskill: goat-review\nagents: all\ndifficulty: easy\norigin: synthetic-seed\n---\n\n### Scenario\nB.`,
      'evals/c.md': `---\nname: c\ndescription: C\nskill: goat-debug\nagents: claude\ndifficulty: medium\norigin: real-incident\n---\n\n### Scenario\nC.`,
    });
    const { evals, errors } = loadEvals(fs, 'evals');
    const summary = summarize(evals, errors);

    assert.equal(summary.totalEvals, 3);
    assert.equal(summary.bySkill.length, 2); // goat-debug, goat-review
    const debugSkill = summary.bySkill.find((s) => s.skill === 'goat-debug');
    assert.equal(debugSkill?.count, 2);
    assert.equal(summary.byOrigin['real-incident'], 2);
    assert.equal(summary.byOrigin['synthetic-seed'], 1);
    assert.equal(summary.byDifficulty.hard, 1);
    assert.equal(summary.byDifficulty.easy, 1);
    assert.equal(summary.byDifficulty.medium, 1);
  });

  it('handles empty eval list', () => {
    const summary = summarize([], []);
    assert.equal(summary.totalEvals, 0);
    assert.equal(summary.bySkill.length, 0);
    assert.equal(summary.byAgent.length, 0);
  });
});

// --- Formatter tests ---

describe('formatSummaryText', () => {
  it('produces readable text output', () => {
    const summary = summarize([], []);
    const text = formatSummaryText(summary);
    assert.ok(text.includes('Eval Summary'));
    assert.ok(text.includes('Total evals: 0'));
  });
});

describe('formatSummaryJson', () => {
  it('produces valid JSON', () => {
    const summary = summarize([], []);
    const json = formatSummaryJson(summary);
    const parsed = JSON.parse(json);
    assert.equal(parsed.totalEvals, 0);
  });
});
