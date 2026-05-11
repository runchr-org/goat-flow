import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { composeArtifactQualityPrompt } from "../../src/cli/prompt/compose-quality.js";
import type { SkillQualityReport } from "../../src/cli/quality/skill-quality.js";

function makeReport(
  overrides: Partial<SkillQualityReport> = {},
): SkillQualityReport {
  return {
    artifact: {
      id: "skill:test",
      name: "test",
      path: ".claude/skills/test/SKILL.md",
      kind: "skill",
      source: "installed",
      ...overrides.artifact,
    },
    totalScore: 90,
    maxTotalScore: 100,
    profileMax: 100,
    subtype: "workflow",
    detectedShape: "workflow",
    shapeConfidence: 1,
    shapeMismatch: false,
    recommendation: "keep-skill",
    composedFrom: ["skill-preamble.md", "skill-conventions.md", "SKILL.md"],
    fitNotes: [],
    metrics: [
      {
        metric: "trigger-clarity",
        label: "Trigger Clarity",
        score: 15,
        maxScore: 15,
        severity: "ok",
        detail: "strong",
      },
    ],
    ...overrides,
  };
}

describe("composeArtifactQualityPrompt", () => {
  it("escapes pipe characters in metric details", () => {
    const report = makeReport({
      metrics: [
        {
          metric: "trigger-clarity",
          label: "Trigger | Clarity",
          score: 10,
          maxScore: 10,
          severity: "ok",
          detail: "left | right",
        },
      ],
    });

    const prompt = composeArtifactQualityPrompt(report);
    assert.match(prompt, /Trigger \\\| Clarity/);
    assert.match(prompt, /left \\\| right/);
    assert.match(prompt, /Subtype:\*\* workflow/);
    assert.match(
      prompt,
      /Composed from:\*\* skill-preamble\.md, skill-conventions\.md, SKILL\.md/,
    );
  });

  it("includes the anti-bias guidance section", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /## Anti-Bias Guidance/);
    assert.match(prompt, /halo/i);
    assert.match(prompt, /round down/i);
  });

  it("includes the four scored semantic dimensions", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /## Semantic Dimensions/);
    assert.match(prompt, /\*\*Clarity \(1-5\)\*\*/);
    assert.match(prompt, /\*\*Examples \(1-5\)\*\*/);
    assert.match(prompt, /\*\*Focus \(1-5\)\*\*/);
    assert.match(prompt, /\*\*Coherence \(1-5\)\*\*/);
    assert.match(prompt, /semanticPct = semanticTotal \/ semanticMax/);
  });

  it("requires explicit composedFrom file reading when bundle is non-empty", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /Read every file in \*\*Composed from\*\* below/);
    assert.match(
      prompt,
      /skill-preamble\.md.*skill-conventions\.md.*SKILL\.md/,
    );
  });

  it("falls back to single-file instruction when no composition", () => {
    const prompt = composeArtifactQualityPrompt(
      makeReport({ composedFrom: [] }),
    );
    assert.match(prompt, /single-file scoring path/);
    assert.doesNotMatch(prompt, /Read every file in \*\*Composed from\*\*/);
  });

  it("adds the scope-check question 6", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /6\. \*\*Scope check:\*\*/);
    assert.match(prompt, /one-sentence summary/);
    assert.match(prompt, /3\+ distinct concerns/);
  });

  it("adds the final gate decision section with all three outcomes", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /## Final Gate/);
    assert.match(prompt, /\*\*ship\*\*/);
    assert.match(prompt, /\*\*revise\*\*/);
    assert.match(prompt, /\*\*block\*\*/);
    assert.match(prompt, /semanticPct >= 0\.8/);
    assert.match(prompt, /semanticPct < 0\.5/);
  });

  it("requires a fenced JSON verdict block matching the schema", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /## Required JSON Verdict/);
    assert.match(prompt, /```json/);
    assert.match(prompt, /"semanticScores":/);
    assert.match(prompt, /"clarity":/);
    assert.match(prompt, /"gateDecision":/);
    assert.match(prompt, /"improvements":/);
  });

  it("weights Examples higher for playbook subtype", () => {
    const prompt = composeArtifactQualityPrompt(
      makeReport({ subtype: "playbook" }),
    );
    assert.match(prompt, /weight Examples HIGHER/);
  });

  it("permits Examples = n/a for meta subtype with justification", () => {
    const prompt = composeArtifactQualityPrompt(
      makeReport({ subtype: "meta" }),
    );
    assert.match(prompt, /Meta subtype: Examples may legitimately be `n\/a`/);
    assert.match(prompt, /exclude it from `semanticMax`/);
  });

  it("requires workflow walkthrough criterion for workflow subtype", () => {
    const prompt = composeArtifactQualityPrompt(makeReport());
    assert.match(prompt, /at least one full phase walked through/);
  });
});
