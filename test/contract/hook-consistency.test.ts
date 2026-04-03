/**
 * Tests that installed hooks (.claude/hooks/*) are consistent with the
 * workflow/runtime/enforcement.md template reference.
 *
 * Verifies: JSON key parsing matches, deny patterns cover the documented set,
 * format hook reads the documented field name.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const HOOKS_DIR = join(ROOT, '.claude/hooks');
const ENFORCEMENT_MD = join(ROOT, 'workflow/runtime/enforcement.md');

/** Read a hook script if it exists. */
function readHook(name: string): string | null {
  const path = join(HOOKS_DIR, name);
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

describe('Hook template consistency with enforcement.md', () => {
  const enforcement = existsSync(ENFORCEMENT_MD)
    ? readFileSync(ENFORCEMENT_MD, 'utf-8')
    : null;

  it('enforcement.md exists as the reference template', () => {
    assert.ok(enforcement, 'workflow/runtime/enforcement.md should exist');
  });

  describe('deny-dangerous.sh', () => {
    const hook = readHook('deny-dangerous.sh');

    it('exists', () => {
      assert.ok(hook, 'deny-dangerous.sh should exist');
    });

    it('reads .tool_input.command from JSON (matching enforcement.md)', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('.tool_input.command'),
        'deny-dangerous.sh should parse .tool_input.command from stdin JSON',
      );
    });

    it('uses jq for JSON parsing (matching enforcement.md)', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('jq'),
        'deny-dangerous.sh should use jq for JSON parsing',
      );
    });

    it('has sed fallback for when jq is unavailable', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('sed'),
        'deny-dangerous.sh should have sed fallback',
      );
    });

    it('handles command chaining (&&, ||, ;)', () => {
      assert.ok(hook);
      const handlesChaining =
        hook.includes('&&') || hook.includes('segments') || hook.includes('SEGMENTS');
      assert.ok(
        handlesChaining,
        'deny-dangerous.sh should split on command chaining operators',
      );
    });

    it('blocks all documented patterns from enforcement.md', () => {
      assert.ok(hook);
      // Core patterns from enforcement.md
      const requiredPatterns = [
        { name: 'rm -rf', pattern: /rm.*-.*r.*f/ },
        { name: 'force push', pattern: /push.*force|push.*-f/ },
        { name: 'chmod 777', pattern: /chmod.*777/ },
        { name: 'pipe-to-shell', pattern: /curl.*\|.*sh|wget.*\|.*sh/ },
        { name: '.env modification', pattern: /\.env/ },
        { name: '--no-verify', pattern: /no.verify/ },
        { name: 'lockfile', pattern: /lock/ },
      ];

      for (const { name, pattern } of requiredPatterns) {
        assert.ok(
          pattern.test(hook),
          `deny-dangerous.sh should block "${name}" (pattern: ${pattern})`,
        );
      }
    });

    it('exits 2 for blocked commands (matching enforcement.md)', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('exit 2'),
        'deny-dangerous.sh should exit 2 for blocked commands',
      );
    });

    it('exits 0 for allowed commands (default allow)', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('exit 0'),
        'deny-dangerous.sh should exit 0 for allowed commands',
      );
    });
  });

  describe('stop-lint.sh', () => {
    const hook = readHook('stop-lint.sh');

    it('exists', () => {
      assert.ok(hook, 'stop-lint.sh should exist');
    });

    it('always exits 0 (matching enforcement.md)', () => {
      assert.ok(hook);
      // The last non-empty line should be exit 0
      const lines = hook.trim().split('\n');
      const lastLine = lines[lines.length - 1].trim();
      assert.equal(
        lastLine,
        'exit 0',
        'stop-lint.sh must end with exit 0 to prevent infinite loops',
      );
    });

    it('has infinite loop guard (matching enforcement.md)', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('STOP_HOOK_ACTIVE'),
        'stop-lint.sh should have STOP_HOOK_ACTIVE infinite loop guard',
      );
    });

    it('checks git diff for changed files', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('git diff'),
        'stop-lint.sh should check git diff for changed files',
      );
    });
  });

  describe('format-file.sh', () => {
    const hook = readHook('format-file.sh');

    it('exists', () => {
      assert.ok(hook, 'format-file.sh should exist');
    });

    it('reads top-level .file_path from JSON (NOT .tool_input.file_path)', () => {
      assert.ok(hook);
      // enforcement.md says PostToolUse provides .file_path at top level
      assert.ok(
        hook.includes('.file_path') || hook.includes("'file_path'"),
        'format-file.sh should parse .file_path from stdin JSON',
      );
      // Should NOT use .tool_input.file_path for PostToolUse
      assert.ok(
        !hook.includes('.tool_input.file_path'),
        'format-file.sh should NOT parse .tool_input.file_path (wrong key for PostToolUse)',
      );
    });

    it('skips agent config directories', () => {
      assert.ok(hook);
      assert.ok(
        hook.includes('.claude') || hook.includes('agent'),
        'format-file.sh should skip agent config directories',
      );
    });
  });
});

describe('Settings.json hook registration matches installed hooks', () => {
  const settingsPath = join(ROOT, '.claude/settings.json');

  it('.claude/settings.json exists', () => {
    assert.ok(existsSync(settingsPath));
  });

  it('registered hook paths point to existing scripts', () => {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const hooks = settings.hooks ?? {};

    for (const [event, entries] of Object.entries(hooks)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries as Array<{ hooks?: Array<{ command?: string }> }>) {
        if (!entry.hooks) continue;
        for (const h of entry.hooks) {
          if (h.command) {
            // Extract script path (may be wrapped in bash "$(git rev-parse)/.claude/hooks/...")
            const scriptMatch = h.command.match(
              /\.claude\/hooks\/[a-z-]+\.sh/,
            );
            if (scriptMatch) {
              const fullPath = join(ROOT, scriptMatch[0]);
              assert.ok(
                existsSync(fullPath),
                `${event} hook references ${scriptMatch[0]} but it does not exist at ${fullPath}`,
              );
            }
          }
        }
      }
    }
  });
});
