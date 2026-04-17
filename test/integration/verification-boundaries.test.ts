/**
 * Contract test: verification routing boundaries (ADR-045).
 * Pins:
 *  - goat-test quick-mode trigger no longer claims raw "verify" (now "verify coverage").
 *  - skill-preamble.md routes "verification planning" to /goat-test (not bare "verification").
 *  - every canonical goat-* skill template references the Proof Gate.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

const CANONICAL_SKILLS = [
  "goat",
  "goat-debug",
  "goat-plan",
  "goat-review",
  "goat-sbao",
  "goat-security",
  "goat-test",
];

describe("verification routing boundaries (ADR-045)", () => {
  it("goat-test does not claim raw 'verify' in its quick-mode trigger", () => {
    const content = readFileSync(
      resolve(PROJECT_ROOT, "workflow/skills/goat-test/SKILL.md"),
      "utf-8",
    );
    const triggerLine = content
      .split("\n")
      .find((l) => l.includes("Standard mode (quick depth)"));
    assert.ok(
      triggerLine,
      "goat-test should have a Standard-mode trigger line",
    );
    assert.doesNotMatch(
      triggerLine!,
      /"verify"/,
      'goat-test Standard-mode trigger must not contain bare quoted "verify" (use "verify coverage" instead) — see ADR-045',
    );
  });

  it("skill-preamble.md routes 'verification planning' to /goat-test, not bare 'verification'", () => {
    const content = readFileSync(
      resolve(PROJECT_ROOT, ".goat-flow/skill-preamble.md"),
      "utf-8",
    );
    assert.match(
      content,
      /verification planning → \/goat-test/,
      "preamble routing must read 'verification planning → /goat-test' (ADR-045)",
    );
    assert.doesNotMatch(
      content,
      /coverage, verification → \/goat-test/,
      "preamble routing must not use bare 'verification' as a goat-test route (ADR-045)",
    );
  });

  it("every canonical goat-* skill template references the Proof Gate", () => {
    for (const skill of CANONICAL_SKILLS) {
      const content = readFileSync(
        resolve(PROJECT_ROOT, `workflow/skills/${skill}/SKILL.md`),
        "utf-8",
      );
      assert.match(
        content,
        /Proof Gate/,
        `${skill} SKILL.md must reference the Proof Gate (ADR-045)`,
      );
    }
  });
});
