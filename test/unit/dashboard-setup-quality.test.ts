/**
 * Unit tests for browser-local setup and quality helpers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { ScriptTarget, transpileModule } from "typescript";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const SETUP_QUALITY_PATH = resolve(
  PROJECT_ROOT,
  "src",
  "dashboard",
  "dashboard-setup-quality.ts",
);

type TestContext = {
  projectPath: string;
  qualityAgent: string;
  selectedQualityModeId: string;
  qualityHistoryLoading: boolean;
  qualityHistoryRows: unknown[];
  qualityHistoryLatest: unknown;
  qualityHistoryWarnings: string[];
  presets: unknown[];
  toast: string | null;
  toastError: boolean;
  showToast(msg: string, isError?: boolean): void;
};

type HelperContext = {
  dashboardGenerateQualityHistory(ctx: TestContext): Promise<void>;
};

function loadHelpers(fetchImpl: typeof fetch): HelperContext {
  const source = readFileSync(SETUP_QUALITY_PATH, "utf-8");
  const js = transpileModule(source, {
    compilerOptions: { target: ScriptTarget.ES2023 },
  }).outputText;
  const context = createContext({
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    readRecord(value: unknown): Record<string, unknown> {
      return typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    },
    readErrorMessage(value: Record<string, unknown>): string | null {
      return typeof value.error === "string" ? value.error : null;
    },
    readStringArray(value: unknown): string[] {
      return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
    },
    readQualityHistoryRow(value: unknown): unknown {
      return value;
    },
    readQualityHistoryLatest(value: unknown): unknown {
      return value ?? null;
    },
  });
  runInContext(
    `${js}
globalThis.__helpers = {
  dashboardGenerateQualityHistory,
};`,
    context,
  );
  return (context as typeof context & { __helpers: HelperContext }).__helpers;
}

function makeContext(): TestContext {
  return {
    projectPath: "/repo",
    qualityAgent: "claude",
    selectedQualityModeId: "agent-setup",
    qualityHistoryLoading: false,
    qualityHistoryRows: [{ date: "old" }],
    qualityHistoryLatest: { date: "old" },
    qualityHistoryWarnings: ["old warning"],
    presets: [],
    toast: null,
    toastError: false,
    showToast(msg: string, isError = false): void {
      this.toast = msg;
      this.toastError = isError;
    },
  };
}

describe("dashboardGenerateQualityHistory", () => {
  it("clears stale history when the history endpoint returns an error", async () => {
    const helpers = loadHelpers(
      async () =>
        new Response(JSON.stringify({ error: "history failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
    );
    const ctx = makeContext();

    await helpers.dashboardGenerateQualityHistory(ctx);

    assert.equal(ctx.qualityHistoryRows.length, 0);
    assert.equal(ctx.qualityHistoryLatest, null);
    assert.equal(ctx.qualityHistoryWarnings.length, 0);
    assert.equal(ctx.qualityHistoryLoading, false);
    assert.equal(ctx.toast, "history failed");
    assert.equal(ctx.toastError, true);
  });
});
