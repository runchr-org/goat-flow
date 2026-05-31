import {
  describe,
  it,
  assert,
  composeQuality,
  parseQualityReport,
  PROJECT_ROOT,
  extractExampleJson,
} from "./helpers.js";

describe("quality prompt JSON example parses through schema", () => {
  it("no-prior-report example is schema-valid and uses delta_tag:null", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      runDate: "2026-04-20",
    });
    const json = extractExampleJson(result.prompt);
    assert.match(
      json,
      /"delta_tag":\s*null/,
      "no-prior-report example must use delta_tag: null",
    );
    assert.match(
      json,
      /"prior_report_id":\s*null/,
      "no-prior-report example must include prior_report_id: null",
    );
    const parsed = parseQualityReport(JSON.parse(json));
    assert.ok(
      parsed.ok,
      `no-prior-report example must parse: ${parsed.ok ? "" : parsed.error}`,
    );
  });

  it("JSON example emits a concrete scope enum, not a union placeholder", () => {
    const consumerResult = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      runDate: "2026-04-20",
    });
    const consumerJson = extractExampleJson(consumerResult.prompt);
    assert.doesNotMatch(consumerJson, /framework-self \| consumer/);
    assert.match(consumerJson, /"scope":\s*"consumer"/);

    const frameworkResult = composeQuality({
      agent: "claude",
      projectPath: PROJECT_ROOT,
      auditReport: null,
      qualityMode: "process",
      runDate: "2026-04-20",
    });
    const frameworkJson = extractExampleJson(frameworkResult.prompt);
    assert.match(frameworkJson, /"scope":\s*"framework-self"/);
    const parsed = parseQualityReport(JSON.parse(frameworkJson));
    assert.ok(
      parsed.ok,
      `framework-self example must parse: ${parsed.ok ? "" : parsed.error}`,
    );
  });

  it("with-prior-report example is schema-valid and uses delta_tag:new", () => {
    const priorReport: QualityHistoryEntry = {
      id: "2026-04-15-1000-claude-bbbbb",
      path: "/tmp/test-project/.goat-flow/logs/quality/2026-04-15-1000-claude-bbbbb.json",
      date: "2026-04-15",
      time: "1000",
      agent: "claude",
      randomId: "bbbbb",
      report: {
        report_kind: "goat-flow-quality-report",
        goat_flow_version: "1.2.1",
        agent: "claude",
        project_path: "/tmp/test-project",
        run_date: "2026-04-15",
        audit_status: "pass",
        scores: {
          setup: {
            total: 80,
            accuracy: 20,
            relevance: 20,
            completeness: 20,
            friction: 20,
          },
          system: {
            total: 75,
            usefulness: 20,
            signal_to_noise: 20,
            adaptability: 20,
            learnability: 15,
          },
        },
        findings: [],
      },
    };
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      priorReport,
      runDate: "2026-04-20",
    });
    const json = extractExampleJson(result.prompt);
    assert.match(
      json,
      /"delta_tag":\s*"new"/,
      'with-prior-report example must use delta_tag: "new"',
    );
    assert.match(
      json,
      /"prior_report_id":\s*"2026-04-15-1000-claude-bbbbb"/,
      "with-prior-report example must name the delta baseline",
    );
    const parsed = parseQualityReport(JSON.parse(json));
    assert.ok(
      parsed.ok,
      `with-prior-report example must parse: ${parsed.ok ? "" : parsed.error}`,
    );
  });

  it("JSON-escapes Windows project paths in the example block", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "C:\\repo\\app",
      auditReport: null,
      runDate: "2026-04-20",
    });
    const json = extractExampleJson(result.prompt);
    assert.match(
      json,
      /"project_path": "C:\\\\repo\\\\app"/,
      "Windows backslashes should be escaped in the JSON example",
    );
    const parsed = JSON.parse(json) as { project_path: string };
    assert.equal(parsed.project_path, "C:\\repo\\app");
  });

  it("shell-quotes quality report paths in agent-setup prompt snippets", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/app $repo/`bad`/bob's app",
      auditReport: null,
      runDate: "2026-04-20",
    });

    assert.match(
      result.prompt,
      /QUALITY_DIR='\/tmp\/app \$repo\/`bad`\/bob'\\''s app\/\.goat-flow\/logs\/quality'/,
    );
    assert.doesNotMatch(result.prompt, /FILE="\/tmp\/app \$repo/);
  });

  it("shell-quotes quality report paths in focused prompt snippets", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/app $repo/`bad`/bob's app",
      auditReport: null,
      qualityMode: "skills",
      runDate: "2026-04-20",
    });

    assert.match(
      result.prompt,
      /QUALITY_DIR='\/tmp\/app \$repo\/`bad`\/bob'\\''s app\/\.goat-flow\/logs\/quality'/,
    );
    assert.doesNotMatch(result.prompt, /FILE="\/tmp\/app \$repo/);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Machine-readable payload has correct shape
// ---------------------------------------------------------------------------
