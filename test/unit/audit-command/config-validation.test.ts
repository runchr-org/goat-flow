import {
  BUILD_CHECKS,
  assert,
  assertExists,
  describe,
  it,
  makeCtx,
  stubConfig,
} from "./helpers.js";

describe("config validation failures", () => {
  it("fails config-parses when config.yaml has schema validation errors", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "config-parses")!;
    const ctx = makeCtx({
      config: {
        ...stubConfig({ agents: ["cursor"] }),
        valid: false,
        errors: [
          {
            level: "error",
            path: "toolchain.test[0]",
            message: "must be a string",
          },
        ],
      },
    });
    const result = check.run(ctx);
    assertExists(result, "config-parses should fail on invalid config");
    assert.match(result.message, /Validation error: toolchain\.test\[0\]/);
    assert.equal(result.evidence, ".goat-flow/config.yaml");
  });
});
