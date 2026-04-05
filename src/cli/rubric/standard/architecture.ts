import type { CheckDef, FactContext, CheckResult } from '../../types.js';

/** Standard-tier checks for architecture documentation (2.5.x). */
export const architectureChecks: CheckDef[] = [
  {
    id: '2.5.1',
    name: 'architecture.md exists',
    tier: 'standard',
    category: 'Architecture',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: { type: 'file_exists', path: 'ai-docs/architecture.md' },
    recommendation: 'Create ai-docs/architecture.md',
    recommendationKey: 'create-architecture',
  },
  {
    id: '2.5.2',
    name: 'architecture.md under 100 lines',
    tier: 'standard',
    category: 'Architecture',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    na: (ctx) => ctx.facts.shared.architecture.exists === false,
    detect: {
      type: 'line_count',
      path: 'ai-docs/architecture.md',
      pass: 100,
      fail: 150,
    },
    recommendation: 'Compress ai-docs/architecture.md below 100 lines',
    recommendationKey: 'compress-architecture',
  },
  {
    id: '2.5.3',
    name: 'decisions dir has real ADR content',
    tier: 'standard',
    category: 'Architecture',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { dirExists, fileCount, hasRealContent } =
          ctx.facts.shared.decisions;
        if (!dirExists || fileCount === 0) {
          return {
            id: '2.5.3',
            name: 'decisions dir has real ADR content',
            tier: 'standard',
            category: 'Architecture',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message: dirExists
              ? 'Directory exists but no ADR files'
              : 'No decisions directory',
          };
        }
        return {
          id: '2.5.3',
          name: 'decisions dir has real ADR content',
          tier: 'standard',
          category: 'Architecture',
          status: hasRealContent ? 'pass' : 'fail',
          points: hasRealContent ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasRealContent
            ? `${fileCount} ADR files, real content found`
            : `${fileCount} ADR files but none have real Context + Decision sections (≥50 chars, not TODO/TBD)`,
        };
      },
    },
    recommendation:
      'Create ai-docs/decisions/ with at least 1 ADR containing real Context and Decision sections',
    recommendationKey: 'create-decisions-dir',
  },
];
