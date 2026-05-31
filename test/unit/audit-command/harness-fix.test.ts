import {
  HARNESS_CHECKS,
  assert,
  describe,
  it,
  join,
  makeCtx,
  resolve,
} from "./helpers.js";

describe("harness check howToFix", () => {
  it("doc-paths-resolve findings mention architecture.md when missing", () => {
    const check = HARNESS_CHECKS.find((c) => c.id === "doc-paths-resolve")!;
    const ctx = makeCtx({
      facts: {
        ...makeCtx().facts,
        shared: {
          ...makeCtx().facts.shared,
          architecture: { exists: false, lineCount: 0 },
        },
      },
    });
    const result = check.run(ctx);
    assert.ok(
      result.findings.some((f) => f.includes("architecture.md")),
      `Findings should mention architecture.md: ${result.findings.join(", ")}`,
    );
  });

  it("feedback-loop-active remediation uses the public stats command", () => {
    const check = HARNESS_CHECKS.find((c) => c.id === "feedback-loop-active")!;
    const baseFacts = makeCtx().facts;
    const ctx = makeCtx({
      facts: {
        ...baseFacts,
        shared: {
          ...baseFacts.shared,
          footguns: {
            ...baseFacts.shared.footguns,
            staleRefs: [".goat-flow/footguns/hooks.md (search: `missing`)"],
          },
        },
      },
    });
    const result = check.run(ctx);
    assert.equal(result.status, "fail");
    assert.ok(
      result.howToFix?.some((fix) =>
        fix.includes("npx goat-flow stats . --check"),
      ),
      `howToFix should use public CLI: ${result.howToFix?.join(", ") ?? ""}`,
    );
    assert.ok(
      !result.howToFix?.some((fix) =>
        fix.includes("node --import tsx src/cli/cli.ts stats"),
      ),
      `howToFix should not use source-mode CLI: ${result.howToFix?.join(", ") ?? ""}`,
    );
  });
});
