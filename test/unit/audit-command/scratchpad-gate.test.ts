import {
  BUILD_CHECKS,
  assert,
  describe,
  it,
  makeCtx,
  stubFS,
} from "./helpers.js";

describe("scratchpad setup gate", () => {
  it("fails on missing scratchpad because it is part of the setup contract", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "scratchpad")!;
    const ctx = makeCtx({
      fs: stubFS({
        exists: (path: string) => path !== ".goat-flow/scratchpad",
      }),
    });
    const result = check.run(ctx);
    assert.notEqual(
      result,
      null,
      "scratchpad should be enforced by its named setup check",
    );
  });

  it("fails on missing scratchpad README because the dir is local-by-design", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "scratchpad")!;
    const ctx = makeCtx({
      fs: stubFS({
        exists: (path: string) => path !== ".goat-flow/scratchpad/README.md",
      }),
    });
    const result = check.run(ctx);
    assert.notEqual(
      result,
      null,
      "missing scratchpad/README.md should be flagged - it signals local-by-design intent",
    );
  });
});

// ---------------------------------------------------------------------------
// Test 9: project-specific validation commands belong to quality, not audit
// ---------------------------------------------------------------------------
