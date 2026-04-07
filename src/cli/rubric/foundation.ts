/**
 * Foundation-tier rubric checks.
 * These are the baseline requirements every GOAT Flow project must satisfy before higher-level workflow checks matter.
 */
import type { CheckDef, FactContext, CheckResult } from '../types.js';

// Confidence criteria:
//   high   = deterministic (file exists, line count, JSON valid, exact match)
//   medium = heuristic (regex pattern, ratio threshold, keyword detection)
//   low    = semantic inference (content quality judgment)

/**
 * Tier 1 - Foundation (48 points)
 * Instruction file, execution loop, autonomy tiers, DoD, enforcement.
 * These are baseline requirements every GOAT Flow project must satisfy.
 */
export const foundationChecks: CheckDef[] = [
  // === 1.1 Instruction File (9 pts) ===
  {
    id: '1.1.1',
    name: 'Instruction file exists',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: { type: 'file_exists', path: '{instruction_file}' },
    recommendation: 'Create the root instruction file for this agent',
    recommendationKey: 'create-instruction-file',
  },
  {
    id: '1.1.2',
    name: 'Under line target',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 3,
    partialPts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const lines = ctx.agentFacts.instruction.lineCount;
        const { target, limit } = ctx.facts.shared.config.lineLimits;
        const base = {
          id: '1.1.2',
          name: 'Under line target',
          tier: 'foundation' as const,
          category: 'Instruction File',
          confidence: 'high' as const,
        };
        if (lines <= target)
          return {
            ...base,
            status: 'pass',
            points: 3,
            maxPoints: 3,
            message: `${lines} lines (under ${target} target)`,
          };
        if (lines <= limit)
          return {
            ...base,
            status: 'partial',
            points: 1,
            maxPoints: 3,
            message: `${lines} lines found. Expected at or under ${target}; currently still under the ${limit}-line hard limit. Trim ${lines - target} lines to get back under target.`,
          };
        return {
          ...base,
          status: 'fail',
          points: 0,
          maxPoints: 3,
          message: `${lines} lines found. Expected at or under ${limit} hard limit (${target} target). Trim at least ${lines - limit} lines.`,
        };
      },
    },
    recommendation:
      'Compress instruction file below the line target. Adjust in .goat-flow/config.yaml line-limits if needed.',
    recommendationKey: 'compress-instruction-file',
  },
  {
    id: '1.1.3',
    name: 'Version header',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'v[0-9]|\\d{4}-\\d{2}-\\d{2}',
    },
    recommendation:
      'Add a version header (e.g., "v1.0 - 2026-03-21") to the instruction file',
    recommendationKey: 'add-version-header',
  },
  {
    id: '1.1.4',
    name: 'Essential commands section',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'essential commands|## Commands',
    },
    recommendation:
      'Add an Essential Commands section with build, test, lint commands',
    recommendationKey: 'add-essential-commands',
  },

  {
    id: '1.1.5',
    name: 'Instruction file has concrete examples',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 1,
    confidence: 'medium',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: '1.1.5',
          name: 'Instruction file has concrete examples',
          tier: 'foundation' as const,
          category: 'Instruction File',
          confidence: 'medium' as const,
        };
        const content = ctx.agentFacts.instruction.content;
        if (content === null) {
          return { ...base, status: 'fail', points: 0, maxPoints: 1, message: 'No instruction file content' };
        }
        const matches =
          content.match(/\bBAD\b|\bGOOD\b|\bDON'T\b|\bexample:/gi) ?? [];
        if (matches.length < 2) {
          return { ...base, status: 'fail', points: 0, maxPoints: 1, message: 'No concrete examples found (need 2+ BAD/GOOD/DON\'T/example: markers)' };
        }
        // Tightened: examples must reference project paths (backtick-wrapped with /)
        // This catches generic text like "the function" vs real refs like `src/cli/rubric/foundation.ts:42`
        const hasProjectPaths = /`[^`]*\/[^`]+`/.test(content);
        if (hasProjectPaths) {
          return { ...base, status: 'pass', points: 1, maxPoints: 1, message: `Concrete examples with project path references (${matches.length} markers)` };
        }
        return { ...base, status: 'fail', points: 0, maxPoints: 1, message: `Found ${matches.length} BAD/GOOD markers but no backtick-wrapped project paths. Examples should reference real files like \`src/auth.ts\` not generic text.` };
      },
    },
    recommendation:
      "Add concrete BAD/GOOD or DO/DON'T examples that reference real project paths (e.g., `src/auth.ts:42`) - not generic placeholder text",
    recommendationKey: 'add-concrete-examples',
  },

  {
    id: '1.1.5a',
    name: 'Instruction file paths resolve on disk',
    tier: 'foundation',
    category: 'Instruction File',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: '1.1.5a',
          name: 'Instruction file paths resolve on disk',
          tier: 'foundation' as const,
          category: 'Instruction File',
          confidence: 'high' as const,
        };
        const routerResolved = ctx.agentFacts.router.resolved;
        const askFirstResolved = ctx.agentFacts.askFirst.resolved;
        const totalResolved = routerResolved + askFirstResolved;
        if (totalResolved >= 2) {
          return { ...base, status: 'pass', points: 1, maxPoints: 1, message: `${totalResolved} project-specific paths resolve (router: ${routerResolved}, Ask First: ${askFirstResolved})` };
        }
        if (totalResolved === 1) {
          return { ...base, status: 'fail', points: 0, maxPoints: 1, message: `Only ${totalResolved} project path resolves (need 2+). Add backtick-wrapped paths in the Router Table or Ask First section that point to real files/dirs.` };
        }
        return { ...base, status: 'fail', points: 0, maxPoints: 1, message: 'No project-specific paths resolve on disk. Add backtick-wrapped paths in the Router Table or Ask First section that point to real files/dirs.' };
      },
    },
    recommendation:
      'Reference at least 2 real project file paths (in Router Table or Ask First section) that exist on disk - e.g., `.goat-flow/architecture.md`, `src/cli/`',
    recommendationKey: 'add-resolvable-paths',
  },

  // === 1.2 Execution Loop (13 pts) ===
  {
    id: '1.2.1',
    name: 'READ step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'read.*first|never fabricate|MUST read',
    },
    recommendation:
      'Add READ step: "MUST read relevant files before changes. Never fabricate codebase facts."',
    recommendationKey: 'add-read-step',
  },
  {
    id: '1.2.2',
    name: 'CLASSIFY step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'classify|complexity.*budget|Hotfix.*Standard',
    },
    recommendation:
      'Add CLASSIFY step with complexity budgets (Hotfix/Standard/System/Infrastructure)',
    recommendationKey: 'add-classify-step',
  },
  {
    id: '1.2.2a',
    name: 'CLASSIFY has budgets',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 1,
    confidence: 'medium',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const content = ctx.agentFacts.instruction.content;
        if (content === null) {
          return {
            id: '1.2.2a',
            name: 'CLASSIFY has budgets',
            tier: 'foundation',
            category: 'Execution Loop',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'medium',
            message: 'No instruction file content',
          };
        }
        const hasComplexityTiers =
          /Hotfix|Standard|System.*Change|Infrastructure|re-classify|re-scope|3x.*estimate/i.test(
            content,
          );
        if (hasComplexityTiers) {
          return {
            id: '1.2.2a',
            name: 'CLASSIFY has complexity tiers',
            tier: 'foundation',
            category: 'Execution Loop',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message:
              'CLASSIFY section includes complexity tiers with re-classification trigger',
          };
        }
        return {
          id: '1.2.2a',
          name: 'CLASSIFY has complexity tiers',
          tier: 'foundation',
          category: 'Execution Loop',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: 'CLASSIFY section has no complexity tiers',
        };
      },
    },
    recommendation:
      'Add complexity tiers to the CLASSIFY step (Hotfix / Small Feature / Standard / System / Infrastructure) with a re-classification trigger',
    recommendationKey: 'add-classify-budgets',
  },
  {
    id: '1.2.3',
    name: 'SCOPE step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'scope.*declare|blast radius|non-goals|files allowed to change',
    },
    recommendation:
      'Add SCOPE step: "MUST declare before acting: files allowed to change, non-goals, max blast radius."',
    recommendationKey: 'add-scope-step',
  },
  {
    id: '1.2.4',
    name: 'ACT step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'State:.*\\|.*Goal:|mode.*behaviour|Plan.*Implement.*Debug',
    },
    recommendation: 'Add ACT step with state declaration format and mode table',
    recommendationKey: 'add-act-step',
  },
  {
    id: '1.2.5',
    name: 'VERIFY step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern:
        'verify|stop.the.line|two corrections|MUST run.*shellcheck|MUST check cross-ref',
    },
    recommendation:
      'Add VERIFY step with stop-the-line escalation and revert-and-rescope',
    recommendationKey: 'add-verify-step',
  },
  {
    id: '1.2.6',
    name: 'LOG step',
    tier: 'foundation',
    category: 'Execution Loop',
    pts: 2,
    confidence: 'medium',
    priority: 'required',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: '1.2.6',
          name: 'LOG step',
          tier: 'foundation' as const,
          category: 'Execution Loop',
          confidence: 'medium' as const,
        };
        const content = ctx.agentFacts.instruction.content;
        if (content === null) {
          return { ...base, status: 'fail', points: 0, maxPoints: 2, message: 'No instruction file content' };
        }
        const hasLogMention = /lessons\/|footguns\/|MUST update when tripped/i.test(content);
        if (!hasLogMention) {
          return { ...base, status: 'fail', points: 0, maxPoints: 2, message: 'LOG step not found. Expected references to lessons/ or footguns/ directories.' };
        }
        // Tightened: verify at least one referenced learning-loop directory exists
        const footgunsExist = ctx.facts.shared.footguns.exists;
        const lessonsExist = ctx.facts.shared.lessons.exists;
        if (footgunsExist && lessonsExist) {
          return { ...base, status: 'pass', points: 2, maxPoints: 2, message: 'LOG step references learning-loop paths that exist on disk' };
        }
        const missing = [
          !footgunsExist ? `footguns (${ctx.facts.shared.footguns.path})` : '',
          !lessonsExist ? `lessons (${ctx.facts.shared.lessons.path})` : '',
        ].filter(Boolean).join(' and ');
        return { ...base, status: 'fail', points: 0, maxPoints: 2, message: `LOG step references learning-loop paths but ${missing} directory does not exist. Create it or update the paths.` };
      },
    },
    recommendation: 'Add LOG step referencing lessons and footguns directories - and create those directories so the paths resolve',
    recommendationKey: 'add-log-step',
  },

  // === 1.3 Autonomy Tiers (10 pts) ===
  {
    id: '1.3.1',
    name: 'Three tiers present',
    tier: 'foundation',
    category: 'Autonomy Tiers',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'composite',
      mode: 'all',
      checks: [
        { type: 'grep', path: '{instruction_file}', pattern: '\\bAlways\\b' },
        { type: 'grep', path: '{instruction_file}', pattern: 'Ask First' },
        { type: 'grep', path: '{instruction_file}', pattern: '\\bNever\\b' },
      ],
    },
    recommendation: 'Add three autonomy tiers: Always, Ask First, Never',
    recommendationKey: 'add-autonomy-tiers',
  },
  {
    id: '1.3.2',
    name: 'Ask First project-specific',
    tier: 'foundation',
    category: 'Autonomy Tiers',
    pts: 3,
    confidence: 'medium',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        // Search section headings first, then fall back to body content
        let section = findSection(ctx, 'ask first');
        if (section === null) {
          // Try finding "Ask First" as bold text in the full content
          const content = ctx.agentFacts.instruction.content;
          if (content !== null) {
            const match = content.match(
              /\*\*Ask First\*\*[\s\S]*?(?=\n\*\*Never\*\*|\n##\s|$)/i,
            );
            if (match) section = match[0];
          }
        }
        if (section === null) {
          return {
            id: '1.3.2',
            name: 'Ask First project-specific',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'fail',
            points: 0,
            maxPoints: 3,
            confidence: 'medium',
            message:
              'No Ask First section found. Expected a `**Ask First**` block with project-specific boundaries and backtick-wrapped repo paths.',
          };
        }
        const lines = section.split('\n').filter((l) => l.trim()).length;
        // Require concrete project paths, not just generic policy text.
        const hasProjectPaths = /`[^`]*[./][^`]*`/.test(section);
        if (lines > 5 && hasProjectPaths) {
          return {
            id: '1.3.2',
            name: 'Ask First project-specific',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'pass',
            points: 3,
            maxPoints: 3,
            confidence: 'medium',
            message: `Ask First has ${lines} lines with project-specific content`,
            evidence: 'Ask First section',
          };
        }
        if (lines > 5) {
          return {
            id: '1.3.2',
            name: 'Ask First project-specific',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'partial',
            points: 1,
            maxPoints: 3,
            confidence: 'medium',
            message: `Ask First has ${lines} non-empty lines, but no project-specific backtick paths were found. Add concrete boundaries like \`.goat-flow/decisions/\` or \`.github/workflows/\`.`,
          };
        }
        return {
          id: '1.3.2',
          name: 'Ask First project-specific',
          tier: 'foundation',
          category: 'Autonomy Tiers',
          status: 'fail',
          points: 0,
          maxPoints: 3,
          confidence: 'medium',
          message: `Ask First section is too short (${lines} non-empty lines). Expected more than 5 lines plus concrete repo-specific boundaries.`,
        };
      },
    },
    recommendation:
      'Make Ask First boundaries project-specific with actual file paths and domain terms',
    recommendationKey: 'project-specific-ask-first',
  },
  {
    id: '1.3.2a',
    name: 'Ask First paths resolve',
    tier: 'foundation',
    category: 'Autonomy Tiers',
    pts: 2,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { paths, resolved, unresolved } = ctx.agentFacts.askFirst;
        if (paths.length === 0) {
          return {
            id: '1.3.2a',
            name: 'Ask First paths resolve',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message:
              'No backtick-wrapped paths in Ask First section. Add concrete repo paths like `.goat-flow/decisions/` or `.github/workflows/` so the boundary can be verified.',
          };
        }
        if (unresolved.length === 0) {
          return {
            id: '1.3.2a',
            name: 'Ask First paths resolve',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'pass',
            points: 2,
            maxPoints: 2,
            confidence: 'high',
            message: `All ${resolved} Ask First paths resolve`,
          };
        }
        if (resolved > 0) {
          return {
            id: '1.3.2a',
            name: 'Ask First paths resolve',
            tier: 'foundation',
            category: 'Autonomy Tiers',
            status: 'partial',
            points: 1,
            maxPoints: 2,
            confidence: 'high',
            message: `${resolved}/${paths.length} Ask First paths resolve. Broken paths: ${unresolved.join(', ')}. Update the section so every referenced file or directory exists.`,
            evidence: unresolved.join(', '),
          };
        }
        return {
          id: '1.3.2a',
          name: 'Ask First paths resolve',
          tier: 'foundation',
          category: 'Autonomy Tiers',
          status: 'fail',
          points: 0,
          maxPoints: 2,
          confidence: 'high',
          message: `None of the ${paths.length} Ask First paths resolve. Broken paths: ${unresolved.join(', ')}. Replace them with real repo locations.`,
          evidence: unresolved.join(', '),
        };
      },
    },
    recommendation:
      'Fix broken paths in Ask First section - every referenced file/directory must exist on disk',
    recommendationKey: 'fix-ask-first-paths',
  },
  {
    id: '1.3.3',
    name: 'Never tier destructive guards',
    tier: 'foundation',
    category: 'Autonomy Tiers',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern:
        'delete.*without|\\.\\.env|secrets|push.*main|force push|overwrite.*without',
    },
    recommendation:
      'Add destructive guards to Never tier: delete, .env, secrets, push to main, force push',
    recommendationKey: 'add-never-guards',
  },
  {
    id: '1.3.4',
    name: 'Micro-checklist present',
    tier: 'foundation',
    category: 'Autonomy Tiers',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern:
        'boundary.*touched|rollback.*command|\\[\\s*\\].*boundary|footgun.*checked',
    },
    recommendation:
      'Add 5-item micro-checklist for Ask First items (boundary, related code, footgun, local instruction, rollback)',
    recommendationKey: 'add-micro-checklist',
  },

  // === 1.4 Definition of Done (7 pts) ===
  {
    id: '1.4.1',
    name: 'DoD section exists',
    tier: 'foundation',
    category: 'Definition of Done',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'definition of done|done.*until|MUST confirm ALL',
    },
    recommendation: 'Add a Definition of Done section with explicit gates',
    recommendationKey: 'add-dod',
  },
  {
    id: '1.4.2',
    name: '4+ explicit gates',
    tier: 'foundation',
    category: 'Definition of Done',
    pts: 2,
    partialPts: 1,
    confidence: 'medium',
    priority: 'required',
    detect: {
      type: 'count_items',
      path: '{instruction_file}',
      section: 'definition of done',
      // Match numbered lists, checkboxes, OR semicolon-separated items in prose.
      // Prose format: "MUST confirm all 6 gates: lint; verified; no Ask First; logs; notes; rg"
      // The semicolons act as list delimiters in single-line DoD declarations.
      pattern: '\\(\\d+\\)|^\\d+\\.|^- \\[|;(?=[^;]*\\S)',
      pass: 6,
      partial: 4,
    },
    recommendation:
      'Add 6 DoD gates: tests green, preflight passes, no boundary violations, logs updated, working notes current, grep after renames',
    recommendationKey: 'add-dod-gates',
  },
  {
    id: '1.4.3',
    name: 'Grep-after-rename gate',
    tier: 'foundation',
    category: 'Definition of Done',
    pts: 2,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      section: 'definition of done',
      pattern:
        'grep.*old.*pattern|zero.*remaining|grep.*rename|rg.*stale|rg.*rename|stale.*reference',
    },
    recommendation: 'Add grep-after-rename gate to DoD',
    recommendationKey: 'add-grep-gate',
  },
  {
    id: '1.4.4',
    name: 'Log-update gate',
    tier: 'foundation',
    category: 'Definition of Done',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern:
        'logs? updated|lessons.*updated|footguns.*updated|update.*log|log.*update|MUST.*log',
    },
    recommendation: 'Add log-update gate to DoD',
    recommendationKey: 'add-log-gate',
  },

  // === 1.5 Enforcement Baseline (8 pts) ===
  {
    id: '1.5.1',
    name: 'Deny mechanism has 3+ patterns',
    tier: 'foundation',
    category: 'Enforcement',
    pts: 3,
    partialPts: 1,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: '1.5.1',
          name: 'Deny mechanism has 3+ patterns',
          tier: 'foundation' as const,
          category: 'Enforcement',
          confidence: 'high' as const,
        };
        const patternCount = countDenyPatterns(ctx);
        const evidence = getDenyEvidence(ctx);

        if (patternCount >= 3) {
          return { ...base, status: 'pass', points: 3, maxPoints: 3, message: `Deny mechanism has ${patternCount} distinct patterns at ${evidence}`, evidence };
        }
        if (patternCount >= 1) {
          return { ...base, status: 'partial', points: 1, maxPoints: 3, message: `Deny mechanism has ${patternCount} pattern${patternCount === 1 ? '' : 's'} (need 3+). Add blocks for rm -rf, force push, chmod 777, or pipe-to-shell.`, evidence };
        }
        return { ...base, status: 'fail', points: 0, maxPoints: 3, message: 'No deny mechanism found. Add permissions.deny in settings.json or a deny-dangerous.sh script with 3+ blocked patterns.', evidence };
      },
    },
    recommendation:
      'Add a deny mechanism with at least 3 patterns (e.g., git commit, git push, rm -rf). Use permissions.deny in settings.json or deny-dangerous.sh.',
    recommendationKey: 'add-deny-mechanism',
  },
  {
    id: '1.5.2',
    name: 'git commit blocked',
    tier: 'foundation',
    category: 'Enforcement',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '1.5.2',
        name: 'git commit blocked',
        tier: 'foundation',
        category: 'Enforcement',
        status: ctx.agentFacts.deny.gitCommitBlocked ? 'pass' : 'fail',
        points: ctx.agentFacts.deny.gitCommitBlocked ? 1 : 0,
        maxPoints: 1,
        confidence: 'high',
        message: ctx.agentFacts.deny.gitCommitBlocked
          ? 'git commit is blocked'
          : 'git commit is not blocked',
      }),
    },
    recommendation: 'Block git commit in deny mechanism',
    recommendationKey: 'block-git-commit',
  },
  {
    id: '1.5.3',
    name: 'git push blocked',
    tier: 'foundation',
    category: 'Enforcement',
    pts: 2,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '1.5.3',
        name: 'git push blocked',
        tier: 'foundation',
        category: 'Enforcement',
        status: ctx.agentFacts.deny.gitPushBlocked ? 'pass' : 'fail',
        points: ctx.agentFacts.deny.gitPushBlocked ? 2 : 0,
        maxPoints: 2,
        confidence: 'high',
        message: ctx.agentFacts.deny.gitPushBlocked
          ? 'git push is blocked'
          : 'git push is not blocked',
      }),
    },
    recommendation: 'Block git push in deny mechanism',
    recommendationKey: 'block-git-push',
  },
  {
    id: '1.5.4',
    name: 'Deny hook/script exists',
    tier: 'foundation',
    category: 'Enforcement',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        // Config-based deny (settings.json permissions.deny) is a valid alternative to a script
        if (
          ctx.agentFacts.hooks.denyIsConfigBased &&
          !ctx.agentFacts.hooks.denyExists
        ) {
          return {
            id: '1.5.4',
            name: 'Deny hook/script exists',
            tier: 'foundation',
            category: 'Enforcement',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message:
              'Deny is config-based (settings.json permissions.deny) - script not required',
          };
        }
        const exists = ctx.agentFacts.hooks.denyExists;
        return {
          id: '1.5.4',
          name: 'Deny hook/script exists',
          tier: 'foundation',
          category: 'Enforcement',
          status: exists ? 'pass' : 'fail',
          points: exists ? 2 : 0,
          maxPoints: 2,
          confidence: 'high',
          message: exists
            ? 'Deny hook/script exists'
            : 'No deny hook/script found',
        };
      },
    },
    recommendation:
      'Create deny-dangerous.sh hook/script or use settings.json permissions.deny',
    recommendationKey: 'create-deny-script',
  },
  {
    id: '1.5.5',
    name: '.goat-flow/config.yaml exists',
    tier: 'foundation',
    category: 'Project Config',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    detect: { type: 'file_exists', path: '.goat-flow/config.yaml' },
    recommendation: 'Create .goat-flow/config.yaml in the project root',
    recommendationKey: 'create-goat-flow-config',
  },
  {
    id: '1.5.6',
    name: '.goat-flow/config.yaml is valid',
    tier: 'foundation',
    category: 'Project Config',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    na: (ctx) => ctx.facts.shared.config.exists === false,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { valid, parseError, errorCount, warningCount } =
          ctx.facts.shared.config;
        return {
          id: '1.5.6',
          name: '.goat-flow/config.yaml is valid',
          tier: 'foundation',
          category: 'Project Config',
          status: valid ? 'pass' : 'fail',
          points: valid ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: valid
            ? `.goat-flow/config.yaml parsed successfully${warningCount > 0 ? ` (${warningCount} warning${warningCount === 1 ? '' : 's'})` : ''}`
            : `.goat-flow/config.yaml invalid${parseError ? `: ${parseError}` : ` (${errorCount} error${errorCount === 1 ? '' : 's'})`}`,
        };
      },
    },
    recommendation:
      'Fix .goat-flow/config.yaml so it parses and validates cleanly',
    recommendationKey: 'fix-goat-flow-config',
  },
  // 1.5.7 (config.local.yaml exists) removed - personal preference file, not a project quality signal.
];

/**
 * Search the instruction file sections for a heading containing the given name.
 * Returns the section body text, or null if no matching heading is found.
 */
function findSection(ctx: FactContext, name: string): string | null {
  // Iterate over all parsed section headings in the instruction file
  for (const [heading, content] of ctx.agentFacts.instruction.sections) {
    if (heading.includes(name.toLowerCase())) return content;
  }
  return null;
}

/** Count distinct deny patterns from settings-based deny and/or script-based deny. */
function countDenyPatterns(ctx: FactContext): number {
  // Settings-based: count permissions.deny array entries
  let settingsCount = 0;
  if (ctx.agentFacts.settings.hasDenyPatterns && ctx.agentFacts.settings.parsed) {
    const perms = (ctx.agentFacts.settings.parsed as Record<string, unknown>).permissions as Record<string, unknown> | undefined;
    const denyArr = perms?.deny;
    if (Array.isArray(denyArr)) settingsCount = denyArr.length;
  }
  if (settingsCount >= 3) return settingsCount;

  // Script-based: count distinct blocking behaviors detected in the deny hook
  const h = ctx.agentFacts.hooks;
  const scriptBehaviors = [
    h.denyBlocksRmRf,
    h.denyBlocksForcePush,
    h.denyBlocksChmod,
    h.denyBlocksPipeToShell,
    h.denyBlocksCloudDestructive,
    ctx.agentFacts.deny.gitCommitBlocked,
    ctx.agentFacts.deny.gitPushBlocked,
  ].filter(Boolean).length;

  return Math.max(settingsCount, scriptBehaviors);
}

/** Return a human-readable evidence string for the deny mechanism location. */
function getDenyEvidence(ctx: FactContext): string {
  const deny = ctx.agentFacts.agent.denyMechanism;
  if (deny.type === 'settings-deny') return deny.path;
  if (deny.type === 'deny-script') return deny.path;
  return `${deny.settingsPath} + ${deny.scriptPath}`;
}
