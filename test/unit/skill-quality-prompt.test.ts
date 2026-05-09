import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { composeArtifactQualityPrompt } from "../../src/cli/prompt/compose-quality.js";
import type { SkillQualityReport } from "../../src/cli/quality/skill-quality.js";

describe("composeArtifactQualityPrompt", () => {
  it("escapes pipe characters in metric details", () => {
    const report: SkillQualityReport = {
      artifact: {
        id: "skill:test",
        name: "test",
        path: ".claude/skills/test/SKILL.md",
        kind: "skill",
        source: "installed",
      },
      totalScore: 10,
      maxTotalScore: 10,
      profileMax: 10,
      subtype: "workflow",
      recommendation: "keep-skill",
      composedFrom: ["skill-preamble.md", "SKILL.md"],
      fitNotes: [],
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
    };

    const prompt = composeArtifactQualityPrompt(report);
    assert.match(prompt, /Trigger \\\| Clarity/);
    assert.match(prompt, /left \\\| right/);
    assert.match(prompt, /Subtype:\*\* workflow/);
    assert.match(prompt, /Composed from:\*\* skill-preamble\.md, SKILL\.md/);
  });
});
