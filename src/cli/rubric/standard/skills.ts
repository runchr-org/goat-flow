import type { CheckDef, FactContext, CheckResult } from '../../types.js';
import { SKILL_NAMES } from '../../constants.js';
/** Minimum ratio of quality signals required for a skill to pass quality checks. */
const SKILL_QUALITY_THRESHOLD = 0.8;

/** Standard-tier checks for skill presence and quality (2.1.x). */
export const skillChecks: CheckDef[] = [
  ...SKILL_NAMES.map((skill, i) => ({
    id: `2.1.${i + 1}`,
    name: `${skill} skill`,
    tier: 'standard' as const,
    category: 'Skills',
    pts: 2,
    confidence: 'high' as const,
    detect: {
      type: 'file_exists' as const,
      path: `{skills_dir}/${skill}/SKILL.md`,
    },
    recommendation: `Create ${skill} skill`,
    recommendationKey: `create-skill-${skill.replace('goat-', '')}`,
    priority: 'recommended' as const,
    hidden: true as const,
  })),
  {
    id: '2.1.11',
    name: 'All 6 skills present',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '2.1.11',
        name: 'All 6 skills present',
        tier: 'standard',
        category: 'Skills',
        status: ctx.agentFacts.skills.allPresent ? 'pass' : 'fail',
        points: ctx.agentFacts.skills.allPresent ? 1 : 0,
        maxPoints: 1,
        confidence: 'high',
        message: ctx.agentFacts.skills.allPresent
          ? 'All 6 skills present'
          : `Missing: ${ctx.agentFacts.skills.missing.join(', ')}`,
      }),
    },
    recommendation:
      'Create all 6 goat-flow skills (5 specialized + goat dispatcher)',
    recommendationKey: 'create-all-skills',
  },

  // === 2.1.12-2.1.18 Skill Content Quality (7 pts) ===
  {
    id: '2.1.12',
    name: 'Skills gather context with scope (Step 0)',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: '2.1.12',
          name: 'Skills gather context with scope (Step 0)',
          tier: 'standard' as const,
          category: 'Skills',
          confidence: 'medium' as const,
        };
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return { ...base, status: 'fail', points: 0, maxPoints: 1, message: 'No skills found' };
        }
        const step0Ratio = quality.withStep0 / quality.total;
        const constraintsRatio = quality.withConstraints / quality.total;
        // Tightened: Step 0 must be paired with constraints (scope confirmation proxy)
        if (step0Ratio >= SKILL_QUALITY_THRESHOLD && constraintsRatio >= SKILL_QUALITY_THRESHOLD) {
          return { ...base, status: 'pass', points: 1, maxPoints: 1, message: `${quality.withStep0}/${quality.total} skills gather context and ${quality.withConstraints}/${quality.total} define scope constraints` };
        }
        if (step0Ratio >= SKILL_QUALITY_THRESHOLD) {
          return { ...base, status: 'fail', points: 0, maxPoints: 1, message: `${quality.withStep0}/${quality.total} skills have Step 0, but only ${quality.withConstraints}/${quality.total} define constraints. Step 0 should include scope boundaries (what's in/out).` };
        }
        return { ...base, status: 'fail', points: 0, maxPoints: 1, message: `Only ${quality.withStep0}/${quality.total} skills gather context - most should ask before acting with scope constraints` };
      },
    },
    recommendation:
      'Skills should ask clarifying questions before acting (Step 0) AND define scope constraints (what to do/not do)',
    recommendationKey: 'add-skill-step0',
  },
  {
    id: '2.1.13',
    name: 'Skills have human gates',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.13',
            name: 'Skills have human gates',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withHumanGate / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.13',
            name: 'Skills have human gates',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withHumanGate}/${quality.total} skills include human gates`,
          };
        }
        return {
          id: '2.1.13',
          name: 'Skills have human gates',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withHumanGate}/${quality.total} skills have human gates - agents should pause for review`,
        };
      },
    },
    recommendation:
      'Skills should include HUMAN GATE checkpoints where the agent pauses for human review',
    recommendationKey: 'add-skill-human-gates',
  },
  {
    id: '2.1.14',
    name: 'Skills have MUST/MUST NOT constraints',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.14',
            name: 'Skills have MUST/MUST NOT constraints',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withConstraints / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.14',
            name: 'Skills have MUST/MUST NOT constraints',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withConstraints}/${quality.total} skills have RFC 2119 constraints`,
          };
        }
        return {
          id: '2.1.14',
          name: 'Skills have MUST/MUST NOT constraints',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withConstraints}/${quality.total} skills have MUST/MUST NOT constraints`,
        };
      },
    },
    recommendation:
      'Skills should use MUST/MUST NOT constraints to enforce boundaries',
    recommendationKey: 'add-skill-constraints',
  },
  {
    id: '2.1.15',
    name: 'Skills have phased process',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.15',
            name: 'Skills have phased process',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withPhases / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.15',
            name: 'Skills have phased process',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withPhases}/${quality.total} skills have phased execution`,
          };
        }
        return {
          id: '2.1.15',
          name: 'Skills have phased process',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withPhases}/${quality.total} skills have phased execution - structure prevents skipping steps`,
        };
      },
    },
    recommendation:
      'Skills should have a phased process (Phase 1, Phase 2, etc.) to prevent step-skipping',
    recommendationKey: 'add-skill-phases',
  },
  // 2.1.16 (Skills are conversational) removed - "conversational" is unverifiable. Already covered by 2.1.13 (human gates) + 2.1.18 (structured choices).
  {
    id: '2.1.17',
    name: 'Skills have chaining',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.17',
            name: 'Skills have chaining',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withChaining / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.17',
            name: 'Skills have chaining',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withChaining}/${quality.total} skills link to related skills`,
          };
        }
        return {
          id: '2.1.17',
          name: 'Skills have chaining',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withChaining}/${quality.total} skills have chaining - skills should link to related skills`,
        };
      },
    },
    recommendation:
      'Skills should include a "Chains with" footer linking to related skills',
    recommendationKey: 'add-skill-chaining',
  },
  {
    id: '2.1.18',
    name: 'Skills have structured choices',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.18',
            name: 'Skills have structured choices',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withChoices / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.18',
            name: 'Skills have structured choices',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withChoices}/${quality.total} skills offer choices at phase transitions`,
          };
        }
        return {
          id: '2.1.18',
          name: 'Skills have structured choices',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withChoices}/${quality.total} skills have structured choices - use (a)/(b)/(c) options, not yes/no gates`,
        };
      },
    },
    recommendation:
      'Skills should offer choices at phase transitions, not just yes/no gates',
    recommendationKey: 'add-skill-choices',
  },

  {
    id: '2.1.19',
    name: 'Skills have output format',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { quality } = ctx.agentFacts.skills;
        if (quality.total === 0) {
          return {
            id: '2.1.19',
            name: 'Skills have output format',
            tier: 'standard',
            category: 'Skills',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No skills found',
          };
        }
        const ratio = quality.withOutputFormat / quality.total;
        if (ratio >= SKILL_QUALITY_THRESHOLD) {
          return {
            id: '2.1.19',
            name: 'Skills have output format',
            tier: 'standard',
            category: 'Skills',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: `${quality.withOutputFormat}/${quality.total} skills define an output format`,
          };
        }
        return {
          id: '2.1.19',
          name: 'Skills have output format',
          tier: 'standard',
          category: 'Skills',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Only ${quality.withOutputFormat}/${quality.total} skills define an output format - skills should specify what the agent produces`,
        };
      },
    },
    recommendation:
      'Skills should include an ## Output or ## Output Format section that defines the expected deliverable format',
    recommendationKey: 'add-skill-output-format',
  },
  {
    id: '2.1.20',
    name: 'Dispatcher skill (goat) installed',
    tier: 'standard',
    category: 'Skills',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '2.1.20',
        name: 'Dispatcher skill (goat) installed',
        tier: 'standard',
        category: 'Skills',
        status: ctx.agentFacts.skills.hasDispatcher ? 'pass' : 'fail',
        points: ctx.agentFacts.skills.hasDispatcher ? 1 : 0,
        maxPoints: 1,
        confidence: 'high',
        message: ctx.agentFacts.skills.hasDispatcher
          ? `${ctx.agentFacts.agent.skillsDir}/goat/SKILL.md exists`
          : `${ctx.agentFacts.agent.skillsDir}/goat/SKILL.md not found`,
      }),
    },
    recommendation:
      'Install the goat dispatcher skill - the 6th canonical skill that routes /goat commands to the right skill',
    recommendationKey: 'create-skill-goat',
  },
  // 2.1.21 (Shared Conventions block) removed - 5 critiques called this "copy-paste debt." Skills are self-contained.
];
