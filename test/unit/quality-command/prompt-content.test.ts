import {
  describe,
  it,
  assert,
  withStubbedDate,
  composeQuality,
  parseQualityReport,
  makeSharedFacts,
  PROJECT_ROOT,
  extractExampleJson,
  qualityContextEntry,
} from "./helpers.js";

describe("quality prompt content", () => {
  it("states the assessment is reporting-only", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.ok(
      result.prompt.includes("REPORTING-ONLY ASSESSMENT MODE."),
      "Should explicitly mark assessment mode as reporting-only",
    );
    assert.ok(
      result.prompt.includes("Do not edit any tracked file."),
      "Should end with a strong do-not-edit instruction",
    );
    assert.ok(
      result.prompt.includes(".goat-flow/logs/quality/"),
      "Should instruct the agent to write its JSON report to the gitignored quality log path",
    );
    assert.ok(
      result.prompt.includes("Do NOT apply patches or implement fixes."),
      "Should forbid patches and implementation",
    );
    assert.ok(
      result.prompt.includes(
        "Do NOT use /goat-review or any goat skill as the wrapper for this assessment",
      ),
      "Should forbid wrapping agent-setup assessment in a goat skill",
    );
    assert.ok(
      result.prompt.includes("tracked files"),
      "Should scope the restriction to tracked files (gitignored build output is allowed)",
    );
    assert.ok(
      result.prompt.includes("gitignored"),
      "Should explicitly carve out gitignored build directories as permitted writes",
    );
    assert.ok(
      result.prompt.includes("do not count as writes"),
      "Should say gitignored local workflow artifacts do not count as writes",
    );
    assert.ok(
      !result.prompt.includes("strict no-write"),
      "Should not revive a strict no-write vocabulary that misclassifies gitignored logs",
    );
    assert.ok(
      !result.prompt.includes("milestone task files"),
      "Should not ask assessment to create milestone task files",
    );
    assert.ok(
      result.prompt.includes(
        "Do NOT report them as quality findings by themselves",
      ),
      "Should not let unchecked task or milestone progress become a quality finding",
    );
  });

  it("contains skill testing section", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.ok(
      result.prompt.includes("Skill testing"),
      "Should contain skill testing section",
    );
    assert.ok(
      result.prompt.includes("/goat-debug"),
      "Should reference goat-debug skill",
    );
    assert.ok(
      result.prompt.includes("/goat-plan"),
      "Should reference goat-plan skill",
    );
    assert.ok(
      result.prompt.includes("/goat-review"),
      "Should reference goat-review skill",
    );
    assert.ok(
      result.prompt.includes("/goat-critique"),
      "Should reference goat-critique skill",
    );
    assert.ok(
      result.prompt.includes("/goat-security"),
      "Should reference goat-security skill",
    );
    assert.ok(
      result.prompt.includes("/goat-qa"),
      "Should reference goat-qa skill",
    );
    assert.ok(
      result.prompt.includes("bare `.goat-flow/tasks/<name>` path"),
      "Should keep goat-plan probe reporting-only without requiring task-file writes",
    );
  });

  it("uses generic legacy task-state wording without naming removed files", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });
    const removedLegacyNames = [
      "to" + "do.md",
      "han" + "doff.md",
      "han" + "doff-template.md",
    ];

    assert.ok(
      result.prompt.includes("removed legacy task-state surfaces"),
      "Should keep generic wording for stale-concept checks",
    );
    assert.ok(
      removedLegacyNames.every((name) => !result.prompt.includes(name)),
      "Should not mention the removed filenames in the live quality prompt",
    );
  });

  it("contains ratings request with sub-scores", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
    });

    assert.ok(
      result.prompt.includes("### Ratings"),
      "Should contain ratings section",
    );
    assert.ok(
      result.prompt.includes("Setup: __/100"),
      "Should request setup rating",
    );
    assert.ok(
      result.prompt.includes("System: __/100"),
      "Should request system rating",
    );
    assert.ok(
      result.prompt.includes("Accuracy __/25"),
      "Should have accuracy sub-score",
    );
    assert.ok(
      result.prompt.includes("Usefulness __/25"),
      "Should have usefulness sub-score",
    );
  });

  it("generates mode-specific skills prompts with a mode-aware JSON contract", () => {
    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      qualityMode: "skills",
      runDate: "2026-04-25",
    });

    assert.match(result.prompt, /# GOAT Flow Skills Assessment - Claude Code/);
    assert.match(result.prompt, /Assess all seven goat-flow skills/);
    assert.match(result.prompt, /"quality_mode": "skills"/);
    assert.match(
      result.prompt,
      /No prior same-agent skills quality report exists/,
    );
    const parsed = parseQualityReport(
      JSON.parse(extractExampleJson(result.prompt)),
    );
    assert.ok(
      parsed.ok,
      `skills-mode JSON example must parse: ${parsed.ok ? "" : parsed.error}`,
    );
  });

  it("generates focused process prompts without duplicate title lines", () => {
    const result = composeQuality({
      agent: "codex",
      projectPath: PROJECT_ROOT,
      auditReport: null,
      qualityMode: "process",
      runDate: "2026-05-19",
    });
    const firstLines = result.prompt.split("\n").slice(0, 4);
    assert.deepEqual(firstLines, [
      "# GOAT Flow Process Assessment - Codex",
      "",
      "REPORTING-ONLY ASSESSMENT MODE. Do not edit tracked files. Do not use /goat-review or any goat skill as the wrapper for this assessment; this prompt is the full assessment contract. You may read files, run read-only validation commands, and write normal gitignored reporting/local-state artifacts if the runner requires them. In this contract, gitignored logs, scratchpad notes, critique snapshots, quality reports, and task-local state do not count as writes; do not report them as read-only violations.",
      "",
    ]);
    assert.doesNotMatch(result.prompt, /GOAT Flow Process Quality Assessment/);
  });

  it("adds bounded learning-loop context only to setup and harness quality prompts", () => {
    const sharedFacts = {
      ...makeSharedFacts(),
      learningLoopEntries: [
        qualityContextEntry({ title: "active prompt trap" }),
        qualityContextEntry({
          title: "resolved prompt trap",
          status: "resolved",
          resolved: "2026-05-16",
        }),
      ],
    };
    const harness = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      qualityMode: "harness",
      sharedFacts,
    });
    const skills = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      qualityMode: "skills",
      sharedFacts,
    });

    assert.match(harness.prompt, /<goat-learning-loop budget="\d+ bytes"/);
    assert.match(harness.prompt, /active prompt trap/);
    assert.doesNotMatch(harness.prompt, /resolved prompt trap/);
    assert.doesNotMatch(skills.prompt, /<goat-learning-loop/);
  });

  it("defaults run_date from local calendar getters, not UTC ISO date", () => {
    const RealDate = Date;
    class FakeDate extends RealDate {
      /** Freeze construction at a UTC boundary that differs from local date math. */
      constructor(value?: string | number | Date) {
        super(value ?? "2026-04-19T00:00:00.000Z");
      }

      override getFullYear(): number {
        return 2026;
      }

      override getMonth(): number {
        return 3;
      }

      override getDate(): number {
        return 18;
      }

      override toISOString(): string {
        return "2026-04-19T00:00:00.000Z";
      }

      static override now(): number {
        return new RealDate("2026-04-19T00:00:00.000Z").getTime();
      }
    }

    withStubbedDate(FakeDate as DateConstructor, () => {
      const result = composeQuality({
        agent: "claude",
        projectPath: "/tmp/test-project",
        auditReport: null,
      });
      assert.ok(
        result.prompt.includes('"run_date": "2026-04-18"'),
        "Default run_date should use local calendar getters",
      );
      assert.ok(
        !result.prompt.includes('"run_date": "2026-04-19"'),
        "Default run_date should not fall back to UTC ISO day",
      );
    });
  });

  it("includes prior-report context and json contract guidance when history exists", () => {
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
        findings: [
          {
            id: "framework_flaw:src-cli-prompt-compose-quality-ts:600",
            type: "framework_flaw",
            severity: "BLOCKER",
            file: "src/cli/prompt/compose-quality.ts",
            line: 600,
            summary: "Prompt still asks for resolved findings",
            detail: "Resolved findings belong in diff output.",
            evidence_quality: "OBSERVED",
            delta_tag: "new",
          },
          {
            id: "skill_flaw:agents-skills-goat-critique-skill-md:131",
            type: "skill_flaw",
            severity: "MAJOR",
            file: ".agents/skills/goat-critique/SKILL.md",
            line: 131,
            summary:
              "goat-critique unconditionally persists critique snapshots with no strict no-write branch.",
            detail:
              "The finding treats gitignored critique logs as a write violation.",
            evidence_quality: "OBSERVED",
            delta_tag: "new",
          },
          {
            id: "framework_flaw:src-cli-prompt-compose-quality-ts:700",
            type: "framework_flaw",
            severity: "MAJOR",
            file: "src/cli/prompt/compose-quality.ts",
            line: 700,
            summary:
              "Tracked-file edit violates strict no-write assessment mode.",
            detail:
              "The agent modified src/cli/prompt/compose-quality.ts during reporting-only assessment.",
            evidence_quality: "OBSERVED",
            delta_tag: "new",
          },
        ],
      },
    };

    const result = composeQuality({
      agent: "claude",
      projectPath: "/tmp/test-project",
      auditReport: null,
      priorReport,
      runDate: "2026-04-18",
    });

    assert.ok(
      result.prompt.includes(
        "Latest same-agent report: `2026-04-15-1000-claude-bbbbb` (2026-04-15)",
      ),
      "Should surface prior-report identity and date",
    );
    assert.ok(
      result.prompt.includes("Omitted 1 prior local-artifact write finding(s)"),
      "Should not carry forward old gitignored-log write findings",
    );
    assert.ok(
      !result.prompt.includes("strict no-write"),
      "Should not leak stale strict no-write wording from prior reports into new prompts",
    );
    assert.ok(
      result.prompt.includes(
        "Tracked-file edit violates tracked-file write restriction assessment mode.",
      ),
      "Should keep real tracked-file write findings while neutralizing stale wording",
    );
    assert.ok(
      result.prompt.includes("Do NOT emit `resolved` in current findings"),
      "Should keep resolved in derived diff output",
    );
    assert.ok(
      result.prompt.includes(
        "Set top-level `prior_report_id` to `2026-04-15-1000-claude-bbbbb`",
      ),
      "Should make delta_tag baseline explicit",
    );
    assert.ok(
      result.prompt.includes(
        '`delta_tag` is REQUIRED on every current finding and must be either `"new"` or `"persisted"`.',
      ),
      "Should tighten the JSON contract when prior history exists",
    );
    assert.ok(
      result.prompt.includes('"report_kind": "goat-flow-quality-report"'),
      "Should embed the report_kind-driven JSON contract",
    );
    assert.ok(
      result.prompt.includes('"run_date": "2026-04-18"'),
      "Should freeze the requested run date in the JSON contract example",
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4: Generated prompt contains audit summary when audit data is available
// ---------------------------------------------------------------------------
