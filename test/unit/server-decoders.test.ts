/**
 * Unit tests for server-boundary decoders (M17-9).
 *
 * Every decoder must produce a typed `{ ok: false, error, path }` on malformed
 * input rather than throwing or passing arbitrary shapes through to inner logic.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decodeTerminalCreateBody,
  decodeProjectsListBody,
  decodeClientMessage,
} from "../../src/cli/server/decoders.js";

const RUNNERS = new Set(["claude", "codex", "antigravity", "copilot"]);

describe("decodeTerminalCreateBody", () => {
  it("returns typed body on a valid payload", () => {
    const result = decodeTerminalCreateBody(
      JSON.stringify({
        prompt: "hi",
        projectPath: "/tmp/goat-flow",
        targetPath: "/tmp/a",
        runner: "codex",
      }),
      { validRunners: RUNNERS, defaultRunner: "claude" },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.prompt, "hi");
    assert.equal(result.value.projectPath, "/tmp/goat-flow");
    assert.equal(result.value.targetPath, "/tmp/a");
    assert.equal(result.value.runner, "codex");
  });

  it("defaults runner only when absent", () => {
    const defaultRunnerResult = decodeTerminalCreateBody(
      JSON.stringify({ prompt: "x" }),
      {
        validRunners: RUNNERS,
        defaultRunner: "claude",
      },
    );
    assert.equal(defaultRunnerResult.ok, true);
    if (defaultRunnerResult.ok)
      assert.equal(defaultRunnerResult.value.runner, "claude");

    const invalidRunnerResult = decodeTerminalCreateBody(
      JSON.stringify({ runner: "cursor" }),
      {
        validRunners: RUNNERS,
        defaultRunner: "claude",
      },
    );
    assert.equal(invalidRunnerResult.ok, false);
    if (!invalidRunnerResult.ok) {
      assert.equal(invalidRunnerResult.path, "body.runner");
      assert.match(invalidRunnerResult.error, /unknown runner: cursor/);
    }
  });

  it("rejects non-string runner", () => {
    const result = decodeTerminalCreateBody(JSON.stringify({ runner: 42 }), {
      validRunners: RUNNERS,
      defaultRunner: "claude",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.runner");
  });

  it("rejects non-JSON body with a typed path error", () => {
    const result = decodeTerminalCreateBody("not json", {
      validRunners: RUNNERS,
      defaultRunner: "claude",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body");
    assert.match(result.error, /invalid JSON/);
  });

  it("rejects non-string prompt", () => {
    const result = decodeTerminalCreateBody(JSON.stringify({ prompt: 42 }), {
      validRunners: RUNNERS,
      defaultRunner: "claude",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.prompt");
  });

  it("rejects non-string targetPath", () => {
    const result = decodeTerminalCreateBody(
      JSON.stringify({ targetPath: 42 }),
      {
        validRunners: RUNNERS,
        defaultRunner: "claude",
      },
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.targetPath");
  });
});

describe("decodeProjectsListBody", () => {
  it("returns typed dashboard state on a valid payload", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({
        paths: ["/a", "/b/c"],
        favorites: ["goat-review", "goat-qa"],
        projectTitles: { "/a": "Alpha", "/b/c": "  Beta  " },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepStrictEqual(result.value.paths, ["/a", "/b/c"]);
    assert.deepStrictEqual(result.value.favorites, ["goat-review", "goat-qa"]);
    assert.deepStrictEqual(result.value.projectTitles, {
      "/a": "Alpha",
      "/b/c": "Beta",
    });
  });

  it("defaults favorites and projectTitles to empty when omitted", () => {
    const result = decodeProjectsListBody(JSON.stringify({ paths: ["/a"] }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepStrictEqual(result.value.favorites, []);
    assert.deepStrictEqual(result.value.projectTitles, {});
  });

  it("drops empty-string project titles so clearing round-trips cleanly", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({
        paths: ["/a"],
        projectTitles: { "/a": "", "/b": "   ", "/c": "keep" },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepStrictEqual(result.value.projectTitles, { "/c": "keep" });
  });

  it("rejects non-object projectTitles", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({ paths: ["/a"], projectTitles: ["nope"] }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.projectTitles");
  });

  it("rejects non-string projectTitles entry", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({ paths: ["/a"], projectTitles: { "/a": 42 } }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, 'body.projectTitles["/a"]');
  });

  it("rejects non-object body", () => {
    const result = decodeProjectsListBody(JSON.stringify(["/a"]));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body");
  });

  it("rejects paths missing", () => {
    const result = decodeProjectsListBody(JSON.stringify({}));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.paths");
  });

  it("rejects non-string element", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({ paths: ["/a", 42] }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.paths[1]");
  });

  it("rejects non-string favorite", () => {
    const result = decodeProjectsListBody(
      JSON.stringify({ paths: ["/a"], favorites: ["goat", 42] }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "body.favorites[1]");
  });
});

describe("decodeClientMessage", () => {
  it("decodes input messages", () => {
    const result = decodeClientMessage(
      JSON.stringify({ type: "input", data: "x" }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.type, "input");
    if (result.value.type === "input") assert.equal(result.value.data, "x");
  });

  it("decodes resize messages with numeric cols/rows", () => {
    const result = decodeClientMessage(
      JSON.stringify({ type: "resize", cols: 80, rows: 24 }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    if (result.value.type === "resize") {
      assert.equal(result.value.cols, 80);
      assert.equal(result.value.rows, 24);
    }
  });

  it("rejects unknown message type", () => {
    const result = decodeClientMessage(JSON.stringify({ type: "poke" }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "message.type");
  });

  it("rejects non-string data on input", () => {
    const result = decodeClientMessage(
      JSON.stringify({ type: "input", data: 42 }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "message.data");
  });

  it("rejects non-numeric cols on resize", () => {
    const result = decodeClientMessage(
      JSON.stringify({ type: "resize", cols: "80", rows: 24 }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "message.cols");
  });

  it("rejects non-JSON frames", () => {
    const result = decodeClientMessage("not json");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.path, "message");
  });
});
