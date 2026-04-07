import type { CheckDef, FactContext, CheckResult } from '../../types.js';

/** Standard-tier checks for lessons and footguns infrastructure (2.3.x). */
export const learningLoopChecks: CheckDef[] = [
  {
    id: '2.3.1',
    name: 'Lessons directory exists',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: { type: 'dir_exists', path: '{lessons_committed_dir}' },
    recommendation: 'Create the committed lessons directory',
    recommendationKey: 'create-lessons',
  },
  // 2.3.2 removed - duplicate of 2.3.2a (hasEntries === entryCount >= 1)
  {
    id: '2.3.3',
    name: 'Footguns directory exists',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 2,
    confidence: 'high',
    priority: 'recommended',
    detect: { type: 'dir_exists', path: '{footguns_committed_dir}' },
    recommendation: 'Create the committed footguns directory',
    recommendationKey: 'create-footguns',
  },
  {
    id: '2.3.4',
    name: 'Footguns have file:line evidence',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 2,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasEvidence, staleRefs, invalidLineRefs, formatDiagnostic } =
          ctx.facts.shared.footguns;

        if (hasEvidence === false) {
          return {
            id: '2.3.4',
            name: 'Footguns have file:line evidence',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'fail',
            points: 0,
            maxPoints: 2,
            confidence: 'high',
            message:
              formatDiagnostic ??
              'Footguns are missing file:line evidence. Expected backtick-wrapped refs like `src/auth.ts:42` or `src/auth.ts:42-50`; bare paths, URLs, and prose-only incidents do not count.',
          };
        }

        if (staleRefs.length > 0) {
          return {
            id: '2.3.4',
            name: 'Footguns have file:line evidence',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'fail',
            points: 0,
            maxPoints: 2,
            confidence: 'high',
            message: `Footgun evidence cites missing files: ${staleRefs.slice(0, 3).join(', ')}. Update the cited paths or remove the stale incident.`,
          };
        }

        if (invalidLineRefs.length > 0) {
          return {
            id: '2.3.4',
            name: 'Footguns have file:line evidence',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'fail',
            points: 0,
            maxPoints: 2,
            confidence: 'high',
            message: `Footgun evidence cites out-of-range lines: ${invalidLineRefs.slice(0, 3).join(', ')}. Update the line numbers so they point at real lines in the cited file.`,
          };
        }

        return {
          id: '2.3.4',
          name: 'Footguns have file:line evidence',
          tier: 'standard',
          category: 'Learning Loop',
          status: 'pass',
          points: 2,
          maxPoints: 2,
          confidence: 'high',
          message: 'Footguns have file:line evidence',
        };
      },
    },
    recommendation: 'Add file:line evidence to footgun entries',
    recommendationKey: 'add-footgun-evidence',
  },
  {
    id: '2.3.2a',
    name: 'lessons.md has at least 1 entry',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 1,
    partialPts: 0,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { exists, entryCount } = ctx.facts.shared.lessons;
        if (!exists)
          return {
            id: '2.3.2a',
            name: 'lessons.md has at least 1 entry',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No lesson directories',
          };
        if (entryCount >= 1) {
          return {
            id: '2.3.2a',
            name: 'lessons.md has at least 1 entry',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'high',
            message: `${entryCount} lesson entries in .goat-flow/lessons/`,
          };
        }
        const diagnostic = ctx.facts.shared.lessons.formatDiagnostic;
        return {
          id: '2.3.2a',
          name: 'lessons.md has at least 1 entry',
          tier: 'standard',
          category: 'Learning Loop',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'high',
          message:
            diagnostic ??
            'No lesson entries found in `.goat-flow/lessons/`. Add at least one real incident from git history, or a placeholder explaining why none apply yet.',
        };
      },
    },
    recommendation:
      'Seed the lessons directories with at least 1 real incident from git history (3-5 is ideal)',
    recommendationKey: 'seed-lessons-minimum',
  },
  // 2.3.5 removed - duplicate of AP12 (stale footgun refs)
  // 2.3.5a (Footguns have evidence labels) removed - ceremony check. Evidence presence is already checked by 2.3.4.
  // 2.3.5b (Learning-loop surfaces are canonical) removed - duplicate of AP22 anti-pattern.

  {
    id: '2.3.6',
    name: 'Lessons file references resolve',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    na: (ctx) =>
      !ctx.facts.shared.lessons.exists ||
      ctx.facts.shared.lessons.staleRefs.length === 0,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { staleRefs } = ctx.facts.shared.lessons;
        if (staleRefs.length === 0) {
          return {
            id: '2.3.6',
            name: 'Lessons file references resolve',
            tier: 'standard',
            category: 'Learning Loop',
            status: 'pass',
            points: 1,
            maxPoints: 1,
            confidence: 'medium',
            message: 'All lesson file references resolve',
          };
        }
        return {
          id: '2.3.6',
          name: 'Lessons file references resolve',
          tier: 'standard',
          category: 'Learning Loop',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `${staleRefs.length} stale refs in lesson entries: ${staleRefs.slice(0, 3).join(', ')}`,
        };
      },
    },
    recommendation:
      'Update or remove stale file path references in lesson entries',
    recommendationKey: 'fix-lesson-stale-refs',
  },

  {
    id: '2.3.7',
    name: 'Session logs referenced',
    tier: 'standard',
    category: 'Learning Loop',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'grep',
      path: '{instruction_file}',
      pattern: 'logs/sessions|session.log|session.*summary',
    },
    recommendation:
      'Add session log path to the LOG step and router table: `.goat-flow/logs/sessions/YYYY-MM-DD-slug.md`',
    recommendationKey: 'add-session-logs',
  },
];
