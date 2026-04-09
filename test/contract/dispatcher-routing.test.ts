import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load the dispatcher SKILL.md to extract the routing table
const dispatcherContent = readFileSync(
  join(import.meta.dirname, "../../.claude/skills/goat/SKILL.md"),
  "utf-8",
);

// Extract intent mapping rows from the markdown table
function extractRoutingTable(
  content: string,
): Array<{ keywords: string; skill: string; mode: string }> {
  const tableMatch = content.match(/\| If the input mentions[\s\S]*?\n\n/);
  if (!tableMatch) return [];
  const lines = tableMatch[0]
    .split("\n")
    .filter(
      (l) =>
        l.startsWith("|") && !l.includes("---") && !l.includes("If the input"),
    );
  return lines.map((line) => {
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    return {
      keywords: cols[0] ?? "",
      skill: cols[1] ?? "",
      mode: cols[2] ?? "",
    };
  });
}

const routes = extractRoutingTable(dispatcherContent);

describe("Dispatcher routing table", () => {
  it("has at least 10 routing rows", () => {
    assert.ok(routes.length >= 10, `Expected ≥10 routes, got ${routes.length}`);
  });

  it("investigation verbs route to investigate mode", () => {
    const investigateRow = routes.find((r) =>
      r.keywords.includes("understand"),
    );
    assert.ok(investigateRow, "Should have an understand/investigate row");
    assert.ok(
      investigateRow.mode.includes("Investigate"),
      `Investigate should route to Investigate mode, got: ${investigateRow.mode}`,
    );
  });

  it("build/create routes to goat-plan", () => {
    const buildRow = routes.find((r) => r.keywords.includes("build"));
    assert.ok(buildRow, "Should have a build/create row");
    assert.ok(
      buildRow.skill.includes("goat-plan"),
      `Build should route to goat-plan, got: ${buildRow.skill}`,
    );
  });

  it("review routes to goat-review", () => {
    const reviewRow = routes.find((r) => r.keywords.includes("review"));
    assert.ok(reviewRow, "Should have a review row");
    assert.ok(
      reviewRow.skill.includes("goat-review"),
      `Review should route to goat-review, got: ${reviewRow.skill}`,
    );
  });

  it("security routes to goat-security", () => {
    const secRow = routes.find((r) => r.keywords.includes("security"));
    assert.ok(secRow, "Should have a security row");
    assert.ok(
      secRow.skill.includes("goat-security"),
      `Security should route to goat-security, got: ${secRow.skill}`,
    );
  });

  it("has escape hatch for simple questions", () => {
    assert.ok(
      dispatcherContent.includes("Simple Questions") ||
        dispatcherContent.includes("escape hatch"),
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

  it("all 5 specialized skills appear in routing table", () => {
    const tableText = routes.map((r) => r.skill).join(" ");
    assert.ok(
      tableText.includes("goat-debug"),
      "goat-debug should be in routing",
    );
    assert.ok(
      tableText.includes("goat-review"),
      "goat-review should be in routing",
    );
    assert.ok(
      tableText.includes("goat-plan"),
      "goat-plan should be in routing",
    );
    assert.ok(
      tableText.includes("goat-test"),
      "goat-test should be in routing",
    );
    assert.ok(
      tableText.includes("goat-security"),
      "goat-security should be in routing",
    );
  });
});

describe("Dispatcher skill content contracts", () => {
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
