/**
 * Tests that installed hooks (.claude/hooks/*) are consistent with the
 * workflow/hooks/ template reference directory.
 *
 * Verifies: JSON key parsing matches, deny patterns cover the documented set,
 * format hook reads the documented field name.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const HOOKS_DIR = join(ROOT, ".claude/hooks");
const HOOKS_TEMPLATE_DIR = join(ROOT, "workflow/hooks");

/** Read a hook script if it exists. */
function readHook(name: string): string | null {
  const path = join(HOOKS_DIR, name);
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}

describe("Hook template consistency with workflow/hooks/", () => {
  const hooksTemplateExists = existsSync(HOOKS_TEMPLATE_DIR);

  it("workflow/hooks/ exists as the reference template directory", () => {
    assert.ok(hooksTemplateExists, "workflow/hooks/ should exist");
  });

  describe("deny-dangerous.sh", () => {
    const hook = readHook("deny-dangerous.sh");

    it("exists", () => {
      assert.ok(hook, "deny-dangerous.sh should exist");
    });

    it("reads .tool_input.command from JSON (matching enforcement.md)", () => {
      assert.ok(hook);
      assert.ok(
        hook.includes(".tool_input.command"),
        "deny-dangerous.sh should parse .tool_input.command from stdin JSON",
      );
    });

    it("uses jq for JSON parsing (matching enforcement.md)", () => {
      assert.ok(hook);
      assert.ok(
        hook.includes("jq"),
        "deny-dangerous.sh should use jq for JSON parsing",
      );
    });

    it("has sed fallback for when jq is unavailable", () => {
      assert.ok(hook);
      assert.ok(
        hook.includes("sed"),
        "deny-dangerous.sh should have sed fallback",
      );
    });

    it("handles command chaining (&&, ||, ;)", () => {
      assert.ok(hook);
      const handlesChaining =
        hook.includes("&&") ||
        hook.includes("segments") ||
        hook.includes("SEGMENTS");
      assert.ok(
        handlesChaining,
        "deny-dangerous.sh should split on command chaining operators",
      );
    });

    it("blocks all documented patterns from enforcement.md", () => {
      assert.ok(hook);
      // Core patterns from enforcement.md
      const requiredPatterns = [
        { name: "rm -rf", pattern: /rm.*-.*r.*f/ },
        { name: "force push", pattern: /push.*force|push.*-f/ },
        { name: "chmod 777", pattern: /chmod.*777/ },
        { name: "pipe-to-shell", pattern: /curl.*\|.*sh|wget.*\|.*sh/ },
        { name: ".env modification", pattern: /\.env/ },
        { name: "--no-verify", pattern: /no.verify/ },
        { name: "lockfile", pattern: /lock/ },
      ];

      for (const { name, pattern } of requiredPatterns) {
        assert.ok(
          pattern.test(hook),
          `deny-dangerous.sh should block "${name}" (pattern: ${pattern})`,
        );
      }
    });

    it("exits 2 for blocked commands (matching enforcement.md)", () => {
      assert.ok(hook);
      assert.ok(
        hook.includes("exit 2"),
        "deny-dangerous.sh should exit 2 for blocked commands",
      );
    });

    it("exits 0 for allowed commands (default allow)", () => {
      assert.ok(hook);
      assert.ok(
        hook.includes("exit 0"),
        "deny-dangerous.sh should exit 0 for allowed commands",
      );
    });
  });

  describe("Post-turn hook guidance", () => {
    const hooksReadme = join(HOOKS_TEMPLATE_DIR, "README.md");
    const readmeContent = existsSync(hooksReadme)
      ? readFileSync(hooksReadme, "utf-8")
      : "";

    it("explains project-specific post-turn validation setup", () => {
      assert.ok(readmeContent.includes("project-specific"), readmeContent);
    });
  });
});

describe("Settings.json hook registration matches installed hooks", () => {
  const settingsPath = join(ROOT, ".claude/settings.json");

  it(".claude/settings.json exists", () => {
    assert.ok(existsSync(settingsPath));
  });

  it("registered hook paths point to existing scripts", () => {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const hooks = settings.hooks ?? {};

    for (const [event, entries] of Object.entries(hooks)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries as Array<{
        hooks?: Array<{ command?: string }>;
      }>) {
        if (!entry.hooks) continue;
        for (const h of entry.hooks) {
          if (h.command) {
            // Extract script path (may be wrapped in bash "$(git rev-parse)/.claude/hooks/...")
            const scriptMatch = h.command.match(/\.claude\/hooks\/[a-z-]+\.sh/);
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
