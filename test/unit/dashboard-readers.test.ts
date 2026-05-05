/**
 * Unit tests for browser-local dashboard payload readers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { ScriptTarget, transpileModule } from "typescript";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const READERS_PATH = resolve(
  PROJECT_ROOT,
  "src",
  "dashboard",
  "dashboard-readers.ts",
);

type HelperContext = {
  readDashboardReport(value: unknown): {
    scopes: {
      setup: {
        checks: {
          status: string;
          displayStatus: string;
          impact: string;
          type?: string;
          acknowledged?: boolean;
          evidenceKind?: string;
          assurance?: string;
          provenance: {
            framework_evidence_paths?: string[];
            target_evidence_paths?: string[];
          };
        }[];
      };
    };
    agentScores: {
      harness: {
        checks: {
          status: string;
          displayStatus: string;
          impact: string;
          type?: string;
          acknowledged?: boolean;
          evidenceKind?: string;
          assurance?: string;
          provenance: {
            framework_evidence_paths?: string[];
            target_evidence_paths?: string[];
          };
        }[];
      } | null;
    }[];
  };
};

function loadHelpers(): HelperContext {
  const source = readFileSync(READERS_PATH, "utf-8");
  const js = transpileModule(source, {
    compilerOptions: { target: ScriptTarget.ES2023 },
  }).outputText;
  const context = createContext({
    URL,
    window: {
      location: { href: "http://127.0.0.1:1234/?token=test-token" },
      history: { replaceState: () => undefined },
      __GOAT_FLOW_RUNNER_IDS__: ["claude"],
      __GOAT_FLOW_REPORT__: null,
      __GOAT_FLOW_AGENTS__: [{ id: "claude", name: "Claude Code" }],
    },
  });
  runInContext(
    `${js}
globalThis.__helpers = {
  readDashboardReport,
};`,
    context,
  );
  return (context as typeof context & { __helpers: HelperContext }).__helpers;
}

function provenance(): Record<string, unknown> {
  return {
    source_type: "spec",
    source_urls: [],
    verified_on: "2026-05-01",
    normative_level: "MUST",
  };
}

function check(
  id: string,
  status: "pass" | "fail" | "skipped",
  type: "integrity" | "advisory" | "metric",
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name: id,
    status,
    type,
    provenance: provenance(),
    ...extra,
  };
}

function scope(
  checks: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return {
    status: "pass",
    checks,
    failures: [],
    summary: {},
  };
}

describe("dashboard payload readers", () => {
  it("preserves skipped setup checks so Home totals match the audit API", () => {
    const helpers = loadHelpers();

    const report = helpers.readDashboardReport({
      status: "fail",
      target: "/repo",
      overall: { status: "fail" },
      scopes: {
        setup: {
          status: "fail",
          checks: [
            check("config-parses", "fail", "integrity"),
            check("config-version", "skipped", "integrity", {
              displayStatus: "skipped",
              impact: "none",
            }),
          ],
          failures: [],
          summary: {},
        },
        agent: scope(),
        harness: scope(),
      },
      learningLoop: null,
      recentLessons: [],
      agentScores: [],
    });

    assert.deepEqual(
      report.scopes.setup.checks.map((entry) => entry.status),
      ["fail", "skipped"],
    );
  });

  it("preserves harness check type so metric failures can be shown as non-gating score evidence", () => {
    const helpers = loadHelpers();

    const report = helpers.readDashboardReport({
      status: "pass",
      target: "/repo",
      overall: { status: "pass" },
      scopes: {
        setup: scope(),
        agent: scope(),
        harness: scope(),
      },
      learningLoop: null,
      recentLessons: [],
      agentScores: [
        {
          id: "claude",
          name: "Claude Code",
          agent: scope(),
          harness: scope([
            check("integrity-ok", "pass", "integrity"),
            check("limited-pass", "pass", "integrity", {
              displayStatus: "info",
              assurance: "limited",
              provenance: {
                ...provenance(),
                framework_evidence_paths: ["docs/harness-audit.md"],
                target_evidence_paths: ["CLAUDE.md"],
              },
            }),
            check("advisory-ack", "fail", "advisory", {
              acknowledged: true,
              displayStatus: "warn",
              impact: "score-only",
            }),
            check("metric-info", "fail", "metric", {
              displayStatus: "warn",
              impact: "score-only",
              evidenceKind: "structural",
            }),
          ]),
          concerns: null,
        },
      ],
    });

    const checks = report.agentScores[0]?.harness?.checks ?? [];
    assert.deepEqual(
      checks.map((entry) => entry.type),
      ["integrity", "integrity", "advisory", "metric"],
    );
    assert.deepEqual(
      checks.map((entry) => entry.displayStatus),
      ["pass", "info", "warn", "warn"],
    );
    assert.deepEqual(
      checks.map((entry) => entry.impact),
      ["none", "none", "score-only", "score-only"],
    );
    assert.equal(checks[1]?.assurance, "limited");
    assert.deepEqual(checks[1]?.provenance.framework_evidence_paths, [
      "docs/harness-audit.md",
    ]);
    assert.deepEqual(checks[1]?.provenance.target_evidence_paths, [
      "CLAUDE.md",
    ]);
    assert.equal(checks[2]?.acknowledged, true);
    assert.equal(checks[3]?.evidenceKind, "structural");

    const score = Math.round(
      (checks.filter((entry) => entry.status === "pass").length /
        checks.length) *
        100,
    );
    assert.equal(score, 50);
  });
});
