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
    priority: 'recommended',
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
            ? `Found at ${location === 'ai' ? '.goat-flow/coding-standards/' : '.github/instructions/'}`
            : 'No .goat-flow/coding-standards/ or .github/instructions/ directory',
        };
      },
    },
    recommendation:
      'Create .goat-flow/coding-standards/ with project coding guidelines',
    recommendationKey: 'create-instructions-dir',
  },
  {
    id: '2.6.1a',
    name: 'Instruction surfaces are canonical',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
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
  // 2.6.2 (.goat-flow/README.md router exists) removed - ceremony. Agents navigate via the instruction file router table.
  {
    id: '2.6.3',
    name: 'conventions.md exists',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
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
      'Create .goat-flow/coding-standards/conventions.md with project-wide conventions',
    recommendationKey: 'create-conventions-instructions',
  },
  {
    id: '2.6.3a',
    name: 'conventions.md has real content',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
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
  // 2.6.4 (code-review.md exists) removed - optional file should not be a scored check.
  // 2.6.5 (git-commit.md exists) removed - same rationale.
  // 2.6.6 (git-commit-instructions.md in .github/) removed - same rationale.
  {
    id: '2.6.7a',
    name: 'frontend.md exists for projects with a detected frontend/UI stack',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
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
      'Create .goat-flow/coding-standards/frontend.md with frontend coding conventions for the detected UI stack',
    recommendationKey: 'create-frontend-instructions',
  },
  {
    id: '2.6.7b',
    name: 'backend.md exists for backend-language projects',
    tier: 'standard',
    category: 'Local Instructions',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
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
      'Create .goat-flow/coding-standards/backend.md with backend coding conventions',
    recommendationKey: 'create-backend-instructions',
  },
];
