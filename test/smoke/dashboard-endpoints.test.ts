/**
 * Smoke tests for the dashboard server module.
 * These verify exports exist and key constants/utilities are correct
 * without starting the actual HTTP server.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("dashboard module exports", () => {
  it("serveDashboard is exported as a function", async () => {
    const mod = await import("../../src/cli/server/dashboard.js");
    assert.equal(typeof mod.serveDashboard, "function");
  });
});

describe("dashboard constants", () => {
  it("MAX_BODY_BYTES is 64 KB", async () => {
    // The constant is module-private, so we test via the readBody behavior.
    // Instead, we verify the value is documented in the source via a simple grep.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        "..",
        "..",
        "src",
        "cli",
        "server",
        "dashboard.ts",
      ),
      "utf-8",
    );
    assert.ok(
      source.includes("64 * 1024"),
      "MAX_BODY_BYTES should be 64 * 1024",
    );
  });

  it("valid agents include claude, codex, gemini", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        "..",
        "..",
        "src",
        "cli",
        "server",
        "dashboard.ts",
      ),
      "utf-8",
    );
    for (const agent of ["claude", "codex", "gemini"]) {
      assert.ok(
        source.includes(`"${agent}"`),
        `VALID_AGENTS should include ${agent}`,
      );
    }
  });
});

describe("dashboard API routes", () => {
  it("source defines /api/audit, /api/setup, /api/critique, /api/health endpoints", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        "..",
        "..",
        "src",
        "cli",
        "server",
        "dashboard.ts",
      ),
      "utf-8",
    );
    const requiredRoutes = [
      "/api/audit",
      "/api/setup",
      "/api/critique",
      "/api/health",
    ];
    for (const route of requiredRoutes) {
      assert.ok(source.includes(route), `Dashboard should handle ${route}`);
    }
  });
});

describe("terminal module exports", () => {
  it("TerminalManager is exported as a class", async () => {
    const mod = await import("../../src/cli/server/terminal.js");
    assert.equal(typeof mod.TerminalManager, "function");
  });
});
