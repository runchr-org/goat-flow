import {
  BUILD_CHECKS,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  stubFS,
} from "./helpers.js";

describe("audit fails on missing footguns directory", () => {
  it("fails footguns check when directory is missing", () => {
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
    assert.ok(
      result.message.includes("footguns"),
      `Failure should mention missing dir: ${result.message}`,
    );
  });
});
