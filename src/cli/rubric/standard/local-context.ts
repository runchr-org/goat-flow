import type { CheckDef, FactContext, CheckResult } from '../../types.js';

/** Standard-tier checks for local instructions and coding standards (2.6.x). */
export const localContextChecks: CheckDef[] = [
  {
    id: '2.6.1',
    name: 'Instructions directory exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { dirExists, location } = ctx.facts.shared.localInstructions;
        return {
          id: '2.6.1',
          name: 'Instructions directory exists',
          tier: 'standard',
          category: 'Local Instructions',
          status: dirExists ? 'pass' : 'fail',
          points: dirExists ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: dirExists
            ? `Found at ${location === 'ai' ? 'ai-docs/coding-standards/' : '.github/instructions/'}`
            : 'No ai-docs/coding-standards/ or .github/instructions/ directory',
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/ with project coding guidelines',
    recommendationKey: 'create-instructions-dir',
  },
  {
    id: '2.6.1a',
    name: 'Instruction surfaces are canonical',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    na: (ctx) => ctx.facts.shared.localInstructions.dirExists === false,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { duplicateSurfacePaths } = ctx.facts.shared.localInstructions;
        const hasDuplicateSurfaces = duplicateSurfacePaths.length > 0;
        return {
          id: '2.6.1a',
          name: 'Instruction surfaces are canonical',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasDuplicateSurfaces ? 'fail' : 'pass',
          points: hasDuplicateSurfaces ? 0 : 1,
          maxPoints: 1,
          confidence: 'high',
          message: hasDuplicateSurfaces
            ? `Duplicate instruction surfaces found: ${duplicateSurfacePaths.join(', ')}. Keep one canonical local-instructions surface instead of maintaining both.`
            : 'Exactly one local-instructions surface is in use',
          evidence: hasDuplicateSurfaces
            ? duplicateSurfacePaths.join(', ')
            : undefined,
        };
      },
    },
    recommendation:
      'Keep one canonical local-instructions surface and remove the duplicate copy',
    recommendationKey: 'fix-duplicate-instruction-surfaces',
  },
  {
    id: '2.6.2',
    name: 'Router exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasRouter, hasValidRouter, routerNeedsFix, dirExists } =
          ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.2',
            name: 'Router exists',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message:
              'No local instructions directory found. Expected `ai-docs/` with an `ai-docs/README.md` router when project instruction files exist.',
          };
        }
        if (!hasValidRouter && routerNeedsFix !== null) {
          return {
            id: '2.6.2',
            name: 'Router exists',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message: routerNeedsFix,
          };
        }
        return {
          id: '2.6.2',
          name: 'Router exists',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasRouter ? 'pass' : 'fail',
          points: hasRouter ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasRouter
            ? 'ai-docs/README.md exists and router links are valid'
            : 'ai-docs/README.md not found. Create a router file so agents can discover instruction files under `ai-docs/`.',
        };
      },
    },
    recommendation: 'Create ai-docs/README.md as routing map for instruction files',
    recommendationKey: 'create-instructions-router',
  },
  {
    id: '2.6.3',
    name: 'conventions.md exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasConventions, dirExists } =
          ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.3',
            name: 'conventions.md exists',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message: 'No instructions directory',
          };
        }
        return {
          id: '2.6.3',
          name: 'conventions.md exists',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasConventions ? 'pass' : 'fail',
          points: hasConventions ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasConventions
            ? 'conventions.md found'
            : 'conventions.md not found - project needs a universal coding contract',
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/conventions.md with project-wide conventions',
    recommendationKey: 'create-conventions-instructions',
  },
  {
    id: '2.6.3a',
    name: 'conventions.md has real content',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.facts.shared.localInstructions.hasConventions === false) {
          return {
            id: '2.6.3a',
            name: 'conventions.md has real content',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No conventions.md',
          };
        }
        return {
          id: '2.6.3a',
          name: 'conventions.md has real content',
          tier: 'standard',
          category: 'Local Instructions',
          status: ctx.facts.shared.localInstructions.conventionsHasContent
            ? 'pass'
            : 'fail',
          points: ctx.facts.shared.localInstructions.conventionsHasContent
            ? 1
            : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.facts.shared.localInstructions.conventionsHasContent
            ? 'conventions.md has commands and conventions'
            : 'conventions.md exists but lacks commands or conventions - a stub is not useful',
        };
      },
    },
    recommendation:
      "conventions.md should include: build/test/lint commands, coding conventions (DO/DON'T), and dangerous operations",
    recommendationKey: 'improve-conventions-instructions',
  },
  {
    id: '2.6.4',
    name: 'code-review.md exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasCodeReview, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.4',
            name: 'code-review.md exists',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message: 'No instructions directory',
          };
        }
        return {
          id: '2.6.4',
          name: 'code-review.md exists',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasCodeReview ? 'pass' : 'fail',
          points: hasCodeReview ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasCodeReview
            ? 'code-review.md found'
            : 'code-review.md not found - project needs review standards',
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/code-review.md with review standards',
    recommendationKey: 'create-code-review-instructions',
  },
  {
    id: '2.6.5',
    name: 'git-commit.md exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasGitCommit, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.5',
            name: 'git-commit.md exists',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'fail',
            points: 0,
            maxPoints: 1,
            confidence: 'high',
            message: 'No instructions directory',
          };
        }
        return {
          id: '2.6.5',
          name: 'git-commit.md exists',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasGitCommit ? 'pass' : 'fail',
          points: hasGitCommit ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasGitCommit
            ? 'git-commit.md found'
            : 'git-commit.md not found - project needs commit conventions',
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/git-commit.md with commit format and PR workflow',
    recommendationKey: 'create-git-commit-instructions',
  },
  {
    id: '2.6.6',
    name: 'git-commit-instructions.md in .github/',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '2.6.6',
        name: 'git-commit-instructions.md in .github/',
        tier: 'standard',
        category: 'Local Instructions',
        status: ctx.facts.shared.gitCommitInstructions.exists ? 'pass' : 'fail',
        points: ctx.facts.shared.gitCommitInstructions.exists ? 1 : 0,
        maxPoints: 1,
        confidence: 'high',
        message: ctx.facts.shared.gitCommitInstructions.exists
          ? '.github/git-commit-instructions.md found'
          : '.github/git-commit-instructions.md not found',
      }),
    },
    recommendation:
      'Create .github/git-commit-instructions.md for universal commit guidance',
    recommendationKey: 'create-github-git-commit',
  },
  {
    id: '2.6.7a',
    name: 'frontend.md exists for projects with a detected frontend/UI stack',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const checkName =
          'frontend.md exists for projects with a detected frontend/UI stack';
        const { hasFrontend, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.7a',
            name: checkName,
            tier: 'standard',
            category: 'Local Instructions',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No instructions directory',
          };
        }
        const langs = ctx.facts.stack.languages.map((l) => l.toLowerCase());
        const frontendSignals = [
          'typescript',
          'javascript',
          'react',
          'vue',
          'angular',
          'svelte',
        ];
        const needsFrontend = langs.some((l) => frontendSignals.includes(l));
        if (!needsFrontend) {
          return {
            id: '2.6.7a',
            name: checkName,
            tier: 'standard',
            category: 'Local Instructions',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No frontend/UI stack detected',
          };
        }
        return {
          id: '2.6.7a',
          name: checkName,
          tier: 'standard',
          category: 'Local Instructions',
          status: hasFrontend ? 'pass' : 'fail',
          points: hasFrontend ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasFrontend
            ? 'frontend.md found'
            : 'Project with frontend/UI stack should have frontend.md',
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/frontend.md with frontend coding conventions for the detected UI stack',
    recommendationKey: 'create-frontend-instructions',
  },
  {
    id: '2.6.7b',
    name: 'backend.md exists for backend-language projects',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { hasBackend, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: '2.6.7b',
            name: 'backend.md exists for backend-language projects',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No instructions directory',
          };
        }
        const langs = ctx.facts.stack.languages.map((l) => l.toLowerCase());
        const backendLangs = ['go', 'python', 'rust', 'php'];
        const needsBackend = langs.some((l) => backendLangs.includes(l));
        if (!needsBackend) {
          return {
            id: '2.6.7b',
            name: 'backend.md exists for backend-language projects',
            tier: 'standard',
            category: 'Local Instructions',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No backend language detected',
          };
        }
        const detectedLang = langs.find((l) => backendLangs.includes(l));
        return {
          id: '2.6.7b',
          name: 'backend.md exists for backend-language projects',
          tier: 'standard',
          category: 'Local Instructions',
          status: hasBackend ? 'pass' : 'fail',
          points: hasBackend ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasBackend
            ? 'backend.md found'
            : `${detectedLang} project should have backend.md`,
        };
      },
    },
    recommendation:
      'Create ai-docs/coding-standards/backend.md with backend coding conventions',
    recommendationKey: 'create-backend-instructions',
  },
];
