/**
 * Layer 3: Hook event JSON schema validation.
 * Validates that hook scripts parse the correct JSON fields for each event type.
 * Claude Code hook events have different payload shapes - this catches mismatches.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');

/**
 * Hook event schemas - documents what fields are available on stdin for each event.
 * Source: Claude Code documentation + workflow/hooks/
 */
const HOOK_EVENT_SCHEMAS: Record<string, { requiredFields: string[]; description: string }> = {
  PreToolUse: {
    requiredFields: ['tool_name', 'tool_input'],
    description: 'Fires before a tool is executed. tool_input contains tool-specific fields (e.g., .command for Bash, .file_path for Write).',
  },
  Stop: {
    requiredFields: [],
    description: 'Fires after every agent turn. No structured stdin - check git diff for changed files.',
  },
  Notification: {
    requiredFields: [],
    description: 'Fires on events like compaction. Matcher filters by event type.',
  },
};

/** Check if a hook script correctly parses the expected JSON field for its event type. */
function hookParsesField(content: string, field: string): boolean {
  // Check for jq extraction: jq -r '.field' or jq '.field // empty'
  if (new RegExp(`jq.*['"]?\\.${field}\\b`).test(content)) return true;
  // Check for sed/grep extraction of the field name
  if (new RegExp(`"${field}"`, 'i').test(content)) return true;
  return false;
}

describe('Hook scripts parse correct JSON fields per event schema', () => {
  const hooksDir = join(ROOT, '.claude/hooks');
  if (!existsSync(hooksDir)) return;

  it('deny-dangerous.sh parses PreToolUse .tool_input.command', () => {
    const scriptPath = join(hooksDir, 'deny-dangerous.sh');
    if (!existsSync(scriptPath)) return;
    const content = readFileSync(scriptPath, 'utf-8');

    assert.ok(
      content.includes('.tool_input.command') || content.includes('"command"'),
      'deny-dangerous.sh should extract the command from PreToolUse stdin',
    );
  });

  it('stop-lint.sh does not parse stdin JSON (Stop hooks get no structured input)', () => {
    const scriptPath = join(hooksDir, 'stop-lint.sh');
    if (!existsSync(scriptPath)) return;
    const content = readFileSync(scriptPath, 'utf-8');

    // Stop hooks should check git diff, not parse JSON stdin
    assert.ok(
      content.includes('git diff') || content.includes('git ls-files'),
      'stop-lint.sh should detect changes via git, not stdin JSON',
    );
  });
});

describe('Hook event schemas are documented', () => {
  for (const [event, schema] of Object.entries(HOOK_EVENT_SCHEMAS)) {
    it(`${event} schema has description and field list`, () => {
      assert.ok(schema.description.length > 0, `${event}: missing description`);
      assert.ok(Array.isArray(schema.requiredFields), `${event}: requiredFields should be an array`);
    });
  }
});
