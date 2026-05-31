import { HARNESS_CHECKS, assert, describe, it } from "./helpers.js";

describe("project-specific validation command policy", () => {
  it("does not include test-command proof as a deterministic harness check", () => {
    assert.equal(
      HARNESS_CHECKS.some((c) => c.id === "test-runner-configured"),
      false,
    );
  });
});
