/**
 * Integration tests for `goat-flow stats` and `goat-flow stats --check` (M09).
 * Exercises the extractor + report + render pipeline end-to-end against
 * temp-dir fixtures so the live repo's learning-loop content does not leak in.
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFS } from "../../src/cli/facts/fs.js";
import {
  extractFootgunFacts,
  extractLessonsFacts,
} from "../../src/cli/facts/shared/learning-loop.js";
import { buildStatsReport, checkStats } from "../../src/cli/stats/stats.js";
import {
  renderStatsText,
  renderStatsJson,
} from "../../src/cli/stats/render.js";
import type {
  LoadedConfig,
  GoatFlowConfig,
} from "../../src/cli/config/types.js";

function stubConfig(overrides: Partial<GoatFlowConfig> = {}): LoadedConfig {
  return {
    exists: true,
    valid: true,
    config: {
      version: "1.2.0",
      footguns: { path: ".goat-flow/footguns/" },
      lessons: { path: ".goat-flow/lessons/" },
      decisions: { path: ".goat-flow/decisions/" },
      tasks: { path: ".goat-flow/tasks/" },
      logs: { path: ".goat-flow/logs/" },
      agents: null,
      skills: { install: "all" },
      lineLimits: { target: 120, limit: 150 },
      toolchain: {
        test: [],
        lint: [],
        build: [],
        package: [],
        format: [],
      },
      userRole: "developer",
      telemetry: false,
      knownGaps: [],
      skillOverrides: {},
      harness: { acknowledge: [] },
      ...overrides,
    },
    warnings: [],
    errors: [],
    parseError: null,
  };
}

/** Build a throw-away repo containing footgun + lesson buckets and return its root path. */
function makeFixtureRepo(spec: {
  footguns: Record<string, string>;
  lessons: Record<string, string>;
}): string {
  const root = mkdtempSync(join(tmpdir(), "goatflow-stats-"));
  const footgunsDir = join(root, ".goat-flow/footguns");
  const lessonsDir = join(root, ".goat-flow/lessons");
  mkdirSync(footgunsDir, { recursive: true });
  mkdirSync(lessonsDir, { recursive: true });
  for (const [name, body] of Object.entries(spec.footguns)) {
    writeFileSync(join(footgunsDir, name), body);
  }
  for (const [name, body] of Object.entries(spec.lessons)) {
    writeFileSync(join(lessonsDir, name), body);
  }
  return root;
}

const pinnedNow = new Date("2026-04-18T12:00:00Z");
const disposables: string[] = [];

after(() => {
  for (const dir of disposables) rmSync(dir, { recursive: true, force: true });
});

function loadReport(spec: Parameters<typeof makeFixtureRepo>[0]) {
  const root = makeFixtureRepo(spec);
  disposables.push(root);
  const fs = createFS(root);
  const config = stubConfig();
  return buildStatsReport({
    footguns: extractFootgunFacts(fs, config, pinnedNow),
    lessons: extractLessonsFacts(fs, config, pinnedNow),
  });
}

describe("goat-flow stats — happy path", () => {
  it("reports per-bucket freshness and live entry counts", () => {
    const report = loadReport({
      footguns: {
        "hooks.md":
          "---\ncategory: hooks\nlast_reviewed: 2026-04-18\n---\n\n## Footgun: alpha\n\n**Evidence:** ACTUAL_MEASURED\n\nBody with `src/alpha.ts` ref.\n\n## Footgun: beta\n\n**Evidence:** ACTUAL_MEASURED\n\nBody.\n",
      },
      lessons: {
        "verification.md":
          "---\ncategory: verification\nlast_reviewed: 2026-03-19\n---\n\n## Lesson: gamma\n\nBody.\n",
      },
    });

    assert.equal(report.footguns.totalEntries, 2);
    assert.equal(report.footguns.buckets[0]!.freshnessBand, "fresh");
    assert.equal(report.footguns.buckets[0]!.freshnessDays, 0);
    assert.equal(report.lessons.totalEntries, 1);
    assert.equal(report.lessons.buckets[0]!.freshnessDays, 30);
    assert.equal(report.lessons.buckets[0]!.freshnessBand, "fresh");

    const text = renderStatsText(report);
    assert.ok(text.includes("Footguns"));
    assert.ok(text.includes("hooks.md"));
    assert.ok(text.includes("verification.md"));

    const json = JSON.parse(renderStatsJson(report));
    assert.equal(json.footguns.totalEntries, 2);
  });
});

describe("goat-flow stats --check", () => {
  it("passes when every bucket has valid last_reviewed and no stale refs", () => {
    const report = loadReport({
      footguns: {
        "hooks.md":
          "---\ncategory: hooks\nlast_reviewed: 2026-04-18\n---\n\n## Footgun: alpha\n\n**Evidence:** ACTUAL_MEASURED\n\nBody.\n",
      },
      lessons: {
        "verification.md":
          "---\ncategory: verification\nlast_reviewed: 2026-04-18\n---\n\n## Lesson: beta\n\nBody.\n",
      },
    });
    const verdict = checkStats(report);
    assert.equal(verdict.status, "pass");
    assert.deepEqual(verdict.findings, []);
  });

  it("fails when a bucket is missing last_reviewed", () => {
    const report = loadReport({
      footguns: {
        "hooks.md": "---\ncategory: hooks\n---\n\n## Footgun: alpha\n\nBody.\n",
      },
      lessons: {},
    });
    const verdict = checkStats(report);
    assert.equal(verdict.status, "fail");
    const finding = verdict.findings.find(
      (f) => f.rule === "missing-last-reviewed",
    );
    assert.ok(finding, "expected a missing-last-reviewed finding");
    assert.ok(finding!.message.includes("hooks.md"));
  });

  it("fails when last_reviewed has an invalid format", () => {
    const report = loadReport({
      footguns: {
        "hooks.md":
          "---\ncategory: hooks\nlast_reviewed: April 18 2026\n---\n\n## Footgun: alpha\n\nBody.\n",
      },
      lessons: {},
    });
    const verdict = checkStats(report);
    assert.equal(verdict.status, "fail");
    assert.ok(
      verdict.findings.some(
        (f) =>
          f.rule === "missing-last-reviewed" ||
          f.rule === "invalid-last-reviewed",
      ),
      "expected a missing-or-invalid last_reviewed finding",
    );
  });

  it("fails when a bucket contains stale refs", () => {
    const report = loadReport({
      footguns: {
        "hooks.md":
          "---\ncategory: hooks\nlast_reviewed: 2026-04-18\n---\n\n## Footgun: alpha\n\n**Evidence:** ACTUAL_MEASURED\n\nSee `src/gone.ts:42` for details.\n",
      },
      lessons: {},
    });
    const verdict = checkStats(report);
    assert.equal(verdict.status, "fail");
    const finding = verdict.findings.find((f) => f.rule === "stale-ref");
    assert.ok(finding, "expected a stale-ref finding");
    assert.ok(finding!.message.includes("src/gone.ts:42"));
  });
});
