import type { CheckDef, FactContext, CheckResult } from "../../types.js";
import { SKILL_NAMES } from "../../constants.js";
/** Minimum ratio of quality signals required for a skill to pass quality checks. */
const SKILL_QUALITY_THRESHOLD = 0.8;

/** Standard-tier checks for skill presence and quality (2.1.x). */
export const skillChecks: CheckDef[] = [
  ...SKILL_NAMES.map((skill, i) => ({
    id: `2.1.${i + 1}`,
    name: `${skill} skill`,
    tier: "standard" as const,
    category: "Skills",
    pts: 2,
    confidence: "high" as const,
    detect: {
      type: "file_exists" as const,
      path: `{skills_dir}/${skill}/SKILL.md`,
    },
    recommendation: `Missing ${skill} skill means agents must improvise that workflow from scratch each session, producing inconsistent and unrepeatable results. Create the skill so the process is encoded and reusable.`,
    recommendationKey: `create-skill-${skill.replace("goat-", "")}`,
    priority: "recommended" as const,
    hidden: true as const,
  })),
  {
    id: "2.1.11",
    name: "All 6 skills present",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => ({
        id: "2.1.11",
        name: "All 6 skills present",
        tier: "standard",
        category: "Skills",
        status: ctx.agentFacts.skills.allPresent ? "pass" : "fail",
        points: ctx.agentFacts.skills.allPresent ? 1 : 0,
        maxPoints: 1,
        confidence: "high",
        message: ctx.agentFacts.skills.allPresent
          ? "All 6 skills present"
          : `Missing: ${ctx.agentFacts.skills.missing.join(", ")}`,
      }),
    },
    recommendation:
      "Missing skills force agents to improvise workflows from scratch every time, producing inconsistent results. The 6 canonical skills (5 specialized + goat dispatcher) encode your team's best practices into repeatable processes that produce consistent output regardless of which agent or session runs them.",
    recommendationKey: "create-all-skills",
  },

  // === 2.1.12-2.1.18 Skill Content Quality (7 pts) ===
  {
    id: "2.1.12",
    name: "Skills gather context with scope (Step 0)",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.1.12",
          name: "Skills gather context with scope (Step 0)",
          tier: "standard" as const,
          category: "Skills",
          confidence: "medium" as const,
        };
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            ...base,
            status: "fail",
            points: 0,
            maxPoints: 1,
            message: "No skills found",
          };
        }
        const step0Ratio = quality.withStep0 / quality.total;
        const constraintsRatio = quality.withConstraints / quality.total;
        // Tightened: Step 0 must be paired with constraints (scope confirmation proxy)
        if (
          step0Ratio >= SKILL_QUALITY_THRESHOLD &&
          constraintsRatio >= SKILL_QUALITY_THRESHOLD
        ) {
          return {
            ...base,
            status: "pass",
            points: 1,
            maxPoints: 1,
            message: `${quality.withStep0}/${quality.total} skills gather context and ${quality.withConstraints}/${quality.total} define scope constraints`,
          };
        }
        if (step0Ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            ...base,
            status: "fail",
            points: 0,
            maxPoints: 1,
            message: `${quality.withStep0}/${quality.total} skills have Step 0, but only ${quality.withConstraints}/${quality.total} define constraints. Step 0 should include scope boundaries (what's in/out).`,
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 1,
          message: `Only ${quality.withStep0}/${quality.total} skills gather context - most should ask before acting with scope constraints`,
        };
      },
    },
    recommendation:
      "Without Step 0 context gathering, skills jump straight into action on assumptions -- planning for the wrong component, reviewing the wrong files, or debugging the wrong symptom. Step 0 with scope constraints forces the agent to confirm what's in and out of scope before spending tokens on work that might miss the target.",
    recommendationKey: "add-skill-step0",
  },
  {
    id: "2.1.13",
    name: "Skills have human gates",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.13",
            name: "Skills have human gates",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withHumanGate / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.13",
            name: "Skills have human gates",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withHumanGate}/${quality.total} skills include human gates`,
          };
        }
        return {
          id: "2.1.13",
          name: "Skills have human gates",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withHumanGate}/${quality.total} skills have human gates - agents should pause for review`,
        };
      },
    },
    recommendation:
      "Without human gates, skills run to completion autonomously -- you only see the output after all decisions are made. By then, correcting a wrong turn at Phase 1 means re-doing Phases 2-4. Human gates at phase transitions let you catch misunderstandings early, before wasted work compounds.",
    recommendationKey: "add-skill-human-gates",
  },
  {
    id: "2.1.14",
    name: "Skills have MUST/MUST NOT constraints",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    // N/A when 2.1.12 already covers constraints (both gate on withConstraints ratio)
    na: (ctx) => {
      const { quality } = ctx.agentFacts.skills;
      if (quality.total === 0) return false;
      const step0Ratio = quality.withStep0 / quality.total;
      const constraintsRatio = quality.withConstraints / quality.total;
      return (
        step0Ratio >= SKILL_QUALITY_THRESHOLD &&
        constraintsRatio >= SKILL_QUALITY_THRESHOLD
      );
    },
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.14",
            name: "Skills have MUST/MUST NOT constraints",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withConstraints / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.14",
            name: "Skills have MUST/MUST NOT constraints",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withConstraints}/${quality.total} skills have RFC 2119 constraints`,
          };
        }
        return {
          id: "2.1.14",
          name: "Skills have MUST/MUST NOT constraints",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withConstraints}/${quality.total} skills have MUST/MUST NOT constraints`,
        };
      },
    },
    recommendation:
      'Without MUST/MUST NOT constraints, skills rely on soft language ("try to", "consider") that agents interpret loosely or ignore. RFC 2119 keywords create unambiguous boundaries -- MUST means the agent cannot skip the step, MUST NOT means the action is forbidden. This eliminates the gray area where agents make bad judgment calls.',
    recommendationKey: "add-skill-constraints",
  },
  {
    id: "2.1.15",
    name: "Skills have phased process",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.15",
            name: "Skills have phased process",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withPhases / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.15",
            name: "Skills have phased process",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withPhases}/${quality.total} skills have phased execution`,
          };
        }
        return {
          id: "2.1.15",
          name: "Skills have phased process",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withPhases}/${quality.total} skills have phased execution - structure prevents skipping steps`,
        };
      },
    },
    recommendation:
      "Without explicit phases, agents collapse multi-step workflows into a single pass -- skipping investigation before planning, or jumping to implementation before the design is approved. Phased execution (Phase 1, Phase 2, etc.) creates natural checkpoints where each phase's output feeds the next, preventing critical steps from being skipped.",
    recommendationKey: "add-skill-phases",
  },
  // 2.1.16 (Skills are conversational) removed - "conversational" is unverifiable. The concrete proxy is steering choices at key transitions.
  {
    id: "2.1.17",
    name: "Skills have chaining",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.17",
            name: "Skills have chaining",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withChaining / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.17",
            name: "Skills have chaining",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withChaining}/${quality.total} skills link to related skills`,
          };
        }
        return {
          id: "2.1.17",
          name: "Skills have chaining",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withChaining}/${quality.total} skills have chaining - skills should link to related skills`,
        };
      },
    },
    recommendation:
      'Without skill chaining, agents finish one workflow and stop -- the user must manually figure out which skill to invoke next. A "Chains with" footer tells the agent (and the user) the natural next step, e.g., /goat-plan chains into /goat-review, so workflows flow without manual routing.',
    recommendationKey: "add-skill-chaining",
  },
  {
    id: "2.1.18",
    name: "Skills have structured choices",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.18",
            name: "Skills have structured choices",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withChoices / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.18",
            name: "Skills have structured choices",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withChoices}/${quality.total} skills offer steering choices at key transitions`,
          };
        }
        return {
          id: "2.1.18",
          name: "Skills have structured choices",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withChoices}/${quality.total} skills offer steering choices - add quick/full depth choices or plain-language next-step options instead of binary yes/no gates`,
        };
      },
    },
    recommendation:
      'Binary yes/no gates create a bottleneck where the only options are "continue" or "abort" -- there is no way to redirect. Give the human real steering power with quick/full depth choices up front or plain-language next-step options like "drill deeper", "check a related area", or "close" at phase transitions.',
    recommendationKey: "add-skill-choices",
  },

  {
    id: "2.1.19",
    name: "Skills have output format",
    tier: "standard",
    category: "Skills",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: "2.1.19",
            name: "Skills have output format",
            tier: "standard",
            category: "Skills",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "medium",
            message: "No skills found",
          };
        }
        const ratio = quality.withOutputFormat / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: "2.1.19",
            name: "Skills have output format",
            tier: "standard",
            category: "Skills",
            status: "pass",
            points: 1,
            maxPoints: 1,
            confidence: "medium",
            message: `${quality.withOutputFormat}/${quality.total} skills define an output format`,
          };
        }
        return {
          id: "2.1.19",
          name: "Skills have output format",
          tier: "standard",
          category: "Skills",
          status: "fail",
          points: 0,
          maxPoints: 1,
          confidence: "medium",
          message: `Only ${quality.withOutputFormat}/${quality.total} skills define an output format - skills should specify what the agent produces`,
        };
      },
    },
    recommendation:
      "Without a defined output format, each skill invocation produces differently structured results -- sometimes a plan doc, sometimes inline edits, sometimes just prose. An ## Output section standardizes the deliverable format so downstream consumers (other skills, humans, CI) know exactly what to expect.",
    recommendationKey: "add-skill-output-format",
  },
  // 2.1.20 (Dispatcher skill installed) removed - redundant with hidden 2.1.1 (goat skill, 2pts) and 2.1.11 (all 6 skills present).
  // 2.1.21 (Shared Conventions block) removed - 5 critiques called this "copy-paste debt." Skills are self-contained.
];
