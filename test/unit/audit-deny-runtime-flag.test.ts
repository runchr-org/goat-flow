/**
 * Locks the security-relevant default for `goat-flow audit`: the deny-mechanism
 * runtime smoke executes the target checkout's own hook code (the configured
 * launcher string and the managed deny script), so it is opt-in and the parser
 * must default it off. `handleAuditCommand` maps `denyRuntimeSmoke` to the
 * "full" vs "static" deny-mechanism evidence level, so a regression that
 * defaulted this on would run untrusted target code during an ordinary audit.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCLIArgs } from "../../src/cli/cli.js";

describe("audit --deny-runtime-smoke flag", () => {
  it("defaults off so the audit does not execute target hook code", () => {
    assert.equal(parseCLIArgs(["audit", "."]).denyRuntimeSmoke, false);
  });

  it("turns on when explicitly requested for a trusted checkout", () => {
    assert.equal(
      parseCLIArgs(["audit", ".", "--deny-runtime-smoke"]).denyRuntimeSmoke,
      true,
    );
  });
});
