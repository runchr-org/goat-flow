/**
 * Agent config template parity: Claude and Codex use different config formats,
 * but their broad secret path families must not drift silently.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

describe("agent config template parity", () => {
  it("keeps Codex broad secret-path denies aligned with Claude", () => {
    const claude = JSON.parse(
      readFileSync(
        join(PROJECT_ROOT, "workflow/hooks/agent-config/claude.json"),
        "utf-8",
      ),
    ) as { permissions?: { deny?: unknown } };
    const claudeDeny = Array.isArray(claude.permissions?.deny)
      ? claude.permissions.deny.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [];
    const claudeReadPatterns = new Set(
      claudeDeny.flatMap((entry) => {
        const match = entry.match(/^Read\((.+)\)$/u);
        return match?.[1] ? [match[1]] : [];
      }),
    );
    const codexTemplate = readFileSync(
      join(PROJECT_ROOT, "workflow/hooks/agent-config/codex.toml"),
      "utf-8",
    );

    for (const pattern of ["**/.env*", "**/credentials*"]) {
      assert.ok(
        claudeReadPatterns.has(pattern),
        `Claude template should deny Read(${pattern})`,
      );
      assert.match(
        codexTemplate,
        new RegExp(`"${escapeRegExp(pattern)}"\\s*=\\s*"deny"`),
        `Codex template should deny ${pattern}`,
      );
    }
    assert.match(codexTemplate, /env\.example is intentionally denied/);
  });
});
