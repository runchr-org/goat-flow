import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dispatcherContent = readFileSync(
  join(import.meta.dirname, "../../.claude/skills/goat/SKILL.md"),
  "utf-8",
);

describe("Dispatcher intake flow", () => {
  it("uses UNDERSTAND → GATHER → ROUTE instead of an intent table", () => {
    assert.ok(
      dispatcherContent.includes("UNDERSTAND"),
      "Dispatcher should have an UNDERSTAND step",
    );
    assert.ok(
      dispatcherContent.includes("GATHER"),
      "Dispatcher should have a GATHER step",
    );
    assert.ok(
      dispatcherContent.includes("ROUTE"),
      "Dispatcher should have a ROUTE step",
    );
    assert.ok(
      !dispatcherContent.includes("## Intent Mapping"),
      "Dispatcher should not keep the old intent mapping table",
    );
  });

  it("routes simple implementation requests directly", () => {
    assert.ok(
      dispatcherContent.includes("rename X to Y") ||
        dispatcherContent.includes("rename this helper"),
      "Dispatcher should include a simple implementation example",
    );
    assert.ok(
      dispatcherContent.includes("execution loop"),
      "Simple implementation requests should proceed with the execution loop",
    );
  });

  it("offers one clarifying question for vague requests", () => {
    assert.ok(
      dispatcherContent.includes("one clarifying question"),
      "Dispatcher should cap vague-intent clarification at one question",
    );
    assert.ok(
      dispatcherContent.includes("understand it, find a bug, review quality"),
      "Dispatcher should include a conversational clarification example",
    );
  });

  it("offers quick/full planning depth with Mob and SBAO", () => {
    assert.ok(
      dispatcherContent.includes("quick plan"),
      "Dispatcher should mention the quick plan path",
    );
    assert.ok(
      dispatcherContent.includes("Mob") && dispatcherContent.includes("SBAO"),
      "Dispatcher should route planning requests toward Mob and SBAO",
    );
  });

  it("gathers enriched routing context", () => {
    assert.ok(
      dispatcherContent.includes("Ask First"),
      "Dispatcher should gather Ask First boundaries",
    );
    assert.ok(
      dispatcherContent.includes("footguns"),
      "Dispatcher should gather footgun context",
    );
    assert.ok(
      dispatcherContent.includes("git log --oneline -5"),
      "Dispatcher should gather recent git context",
    );
    assert.ok(
      dispatcherContent.includes("toolchain"),
      "Dispatcher should gather toolchain context",
    );
  });

  it("mentions all 5 specialized skills", () => {
    for (const skill of [
      "goat-debug",
      "goat-review",
      "goat-plan",
      "goat-security",
      "goat-test",
    ]) {
      assert.ok(
        dispatcherContent.includes(skill),
        `${skill} should appear in the dispatcher`,
      );
    }
  });
});

describe("Dispatcher skill content contracts", () => {
  it("has escape hatch for simple questions", () => {
    assert.ok(
      dispatcherContent.includes("Simple Questions"),
      "Dispatcher should have an escape hatch for factual questions",
    );
  });

  it("has disambiguation for ambiguous inputs", () => {
    assert.ok(
      dispatcherContent.includes("Common Ambiguities"),
      "Should have Common Ambiguities table",
    );
    assert.ok(
      dispatcherContent.includes("check the auth code"),
      "Should have auth code disambiguation",
    );
  });

  it("has post-dispatch chaining suggestions", () => {
    assert.ok(
      dispatcherContent.includes("Post-Dispatch Chaining"),
      "Should have chaining section",
    );
  });

  it("has override support", () => {
    assert.ok(
      dispatcherContent.includes("Override"),
      "Should support explicit skill overrides",
    );
    assert.ok(
      dispatcherContent.includes("--debug"),
      "Should support --debug flag",
    );
  });

  it("has bare invocation examples", () => {
    assert.ok(
      dispatcherContent.includes("Bare Invocation"),
      "Should handle /goat with no args",
    );
  });
});
