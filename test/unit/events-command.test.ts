/**
 * Unit tests for the evidence-events CLI command parser.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { parseCLIArgs } from "../../src/cli/cli.js";

describe("events command parsing", () => {
  it("parses events tail with a project path and limit", () => {
    const parsed = parseCLIArgs([
      "events",
      "tail",
      ".",
      "--limit",
      "5",
      "--format",
      "json",
    ]);

    assert.equal(parsed.command, "events");
    assert.equal(parsed.eventsSubcommand, "tail");
    assert.equal(parsed.projectPath, resolve("."));
    assert.equal(parsed.eventsLimit, 5);
    assert.equal(parsed.format, "json");
  });

  it("rejects --limit outside the events command", () => {
    assert.throws(
      () => parseCLIArgs(["audit", ".", "--limit", "5"]),
      /--limit is only valid for the events command/i,
    );
  });

  it("rejects unknown events subcommands", () => {
    assert.throws(
      () => parseCLIArgs(["events", "watch", "."]),
      /requires subcommand "tail"/i,
    );
  });
});
