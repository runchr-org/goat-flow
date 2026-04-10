import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface Scenario {
  vagueInput: string;
  expectedQuestions: string[];
  idealSpecificInput: string;
}

interface ScenarioFile {
  skill: string;
  scenarios: Scenario[];
}

const SCENARIO_DIR = join(import.meta.dirname, "../fixtures/scenarios");
const SKILL_DIR = join(import.meta.dirname, "..", "..", ".claude", "skills");

/** Load all scenario JSON files from the conversational test directory. */
function loadScenarios(): ScenarioFile[] {
  const files = readdirSync(SCENARIO_DIR).filter((f) =>
    f.endsWith(".scenarios.json"),
  );
  return files.map((f) => {
    const content = readFileSync(join(SCENARIO_DIR, f), "utf-8");
    return JSON.parse(content) as ScenarioFile;
  });
}

/** Extract the Step 0 section from a SKILL.md file. */
function extractStep0(skillName: string): string {
  const skillPath = join(SKILL_DIR, skillName, "SKILL.md");
  const content = readFileSync(skillPath, "utf-8");
  // Step 0 starts with "## Step 0" and ends at the next "## " heading
  const step0Match = content.match(
    /## Step 0[^\n]*\n([\s\S]*?)(?=\n## (?!Step 0)|$)/,
  );
  assert.ok(step0Match, `${skillName}/SKILL.md must have a Step 0 section`);
  return step0Match[1];
}

/**
 * Check whether Step 0 text contains question patterns that would
 * elicit the given topic from a user.
 */
function hasQuestionPattern(step0: string, topic: string): boolean {
  const lower = step0.toLowerCase();
  const topicLower = topic.toLowerCase();
  // Direct mention of the topic in a question context
  if (lower.includes(topicLower)) return true;
  // Map common topic aliases to patterns found in Step 0 text
  const aliases: Record<string, string[]> = {
    symptom: [
      "symptom",
      "error",
      "what happened",
      "what's wrong",
      "behaviour",
      "behavior",
    ],
    area: ["area", "which file", "which area", "where", "module", "component"],
    when: ["when", "since", "start", "recently", "after"],
    error: ["error", "message", "stack trace", "exception", "symptom"],
    "what were you doing": [
      "what were you",
      "reproduce",
      "steps",
      "trying",
      "tried",
    ],
    "which files": ["file", "area", "which", "what should i review", "scope"],
    concern: ["concern", "worried", "specific", "focus", "looking for"],
    scope: ["scope", "area", "boundary", "depth", "audit", "standard"],
    "what problem": [
      "problem",
      "what are we",
      "what are you",
      "goal",
      "building",
    ],
    "who affected": ["affected", "who", "users", "stakeholders"],
    "done criteria": [
      "done",
      "success",
      "criteria",
      "definition",
      "complete",
      "exit",
    ],
    "what specifically": ["specific", "which", "what exactly", "clarif"],
    motivation: ["why", "motivation", "reason", "riskiest"],
    component: ["component", "which", "area", "module", "target"],
    "threat model": ["threat", "model", "attack", "surface"],
    "threat concern": ["threat", "concern", "worried", "vulnerab"],
    deployment: ["deploy", "context", "environment", "infra", "hosting"],
    framework: ["framework", "using", "stack", "package"],
    "what changed": [
      "what changed",
      "what to test",
      "change",
      "diff",
      "recent",
    ],
    risk: ["risk", "level", "critical", "impact", "priority"],
    "what tested": ["tested", "coverage", "existing", "already"],
    goal: ["goal", "what's the goal", "objective", "trying to"],
    complexity: [
      "complexity",
      "hotfix",
      "standard",
      "system",
      "infrastructure",
    ],
    "what building": ["building", "what are we", "feature", "doing"],
    "kill criteria": ["kill", "abandon", "criteria"],
    restructure: ["restructure", "refactor", "rename", "extract", "move"],
  };
  const keys = aliases[topicLower] ?? [topicLower];
  return keys.some((k) => lower.includes(k));
}

/**
 * Check whether Step 0 has adaptive behavior - it should not ask
 * unnecessary questions when specific input is already provided.
 * We verify this by checking for auto-detect or conditional patterns.
 */
function hasAdaptiveBehavior(step0: string): boolean {
  const lower = step0.toLowerCase();
  return (
    lower.includes("auto-detect") ||
    lower.includes("if provided") ||
    lower.includes("confirm") ||
    lower.includes("already") ||
    lower.includes("unless user") ||
    lower.includes("if the user") ||
    lower.includes("if found") ||
    lower.includes("checkpoint") ||
    lower.includes("scope detection priority")
  );
}

const allScenarios = loadScenarios();

describe("vague-input scenarios: Step 0 elicitation", () => {
  for (const scenarioFile of allScenarios) {
    describe(scenarioFile.skill, () => {
      const step0 = extractStep0(scenarioFile.skill);

      for (const scenario of scenarioFile.scenarios) {
        it(`asks about expected topics for: "${scenario.vagueInput}"`, () => {
          for (const question of scenario.expectedQuestions) {
            assert.ok(
              hasQuestionPattern(step0, question),
              `Step 0 should contain patterns to elicit "${question}" ` +
                `(needed for vague input: "${scenario.vagueInput}")`,
            );
          }
        });
      }

      it("has adaptive Step 0 behavior (skips questions when input is specific)", () => {
        assert.ok(
          hasAdaptiveBehavior(step0),
          `${scenarioFile.skill} Step 0 should have adaptive behavior ` +
            "(auto-detect, conditional questions, or scope detection)",
        );
      });
    });
  }
});
