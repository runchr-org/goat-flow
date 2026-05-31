import {
  BUILD_CHECKS,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  mkdir,
  stubFS,
} from "./helpers.js";

describe("build failure howToFix", () => {
  it("footguns failure includes howToFix with mkdir instruction", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "footguns")!;
    const ctx = makeCtx({
      fs: stubFS({
        exists: (path: string) =>
          path !== ".goat-flow/footguns" &&
          path !== ".goat-flow/footguns/README.md",
      }),
    });
    const result = check.run(ctx);
    assertExists(result, "Should fail when footguns dir is missing");
    assertExists(result.howToFix, "Failure should include howToFix");
    assert.ok(
      result.howToFix.includes("mkdir"),
      `howToFix should reference mkdir: ${result.howToFix}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 8: scratchpad is enforced by its dedicated named setup check
// ---------------------------------------------------------------------------
