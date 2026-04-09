import type { CheckDef, FactContext, CheckResult } from "../../types.js";

/** Standard-tier checks for local instructions and coding standards (2.6.x). */
export const localContextChecks: CheckDef[] = [
  {
    id: "2.6.1",
    name: "Instructions directory exists",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { dirExists, location } = ctx.facts.shared.localInstructions;
        return {
          id: "2.6.1",
          name: "Instructions directory exists",
          tier: "standard",
          category: "Local Instructions",
          status: dirExists ? "pass" : "fail",
          points: dirExists ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: dirExists
            ? `Found at ${location === "ai" ? ".goat-flow/coding-standards/" : ".github/instructions/"}`
            : "No .goat-flow/coding-standards/ or .github/instructions/ directory",
        };
      },
    },
    recommendation:
      "Without a coding-standards directory, agents apply their own conventions -- inconsistent naming, different error handling patterns, varying import styles. A shared coding-standards directory gives agents project-specific rules so every session produces code that matches your team's standards.",
    recommendationKey: "create-instructions-dir",
  },
  {
    id: "2.6.1a",
    name: "Instruction surfaces are canonical",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "optional",
    na: (ctx) => ctx.facts.shared.localInstructions.dirExists === false,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { duplicateSurfacePaths } = ctx.facts.shared.localInstructions;
        const hasDuplicateSurfaces = duplicateSurfacePaths.length > 0;
        return {
          id: "2.6.1a",
          name: "Instruction surfaces are canonical",
          tier: "standard",
          category: "Local Instructions",
          status: hasDuplicateSurfaces ? "fail" : "pass",
          points: hasDuplicateSurfaces ? 0 : 1,
          maxPoints: 1,
          confidence: "high",
          message: hasDuplicateSurfaces
            ? `Duplicate instruction surfaces found: ${duplicateSurfacePaths.join(", ")}. Keep one canonical local-instructions surface instead of maintaining both.`
            : "Exactly one local-instructions surface is in use",
          evidence: hasDuplicateSurfaces
            ? duplicateSurfacePaths.join(", ")
            : undefined,
        };
      },
    },
    recommendation:
      "Duplicate instruction surfaces (.goat-flow/coding-standards/ and .github/instructions/) will inevitably drift out of sync, giving agents contradictory rules depending on which one they read. Keep one canonical surface and remove the duplicate so there's a single source of truth.",
    recommendationKey: "fix-duplicate-instruction-surfaces",
  },
  // 2.6.2 (.goat-flow/README.md router exists) removed - ceremony. Agents navigate via the instruction file router table.
  {
    id: "2.6.3",
    name: "conventions.md exists",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { hasConventions, dirExists } =
          ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: "2.6.3",
            name: "conventions.md exists",
            tier: "standard",
            category: "Local Instructions",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "high",
            message: "No instructions directory",
          };
        }
        return {
          id: "2.6.3",
          name: "conventions.md exists",
          tier: "standard",
          category: "Local Instructions",
          status: hasConventions ? "pass" : "fail",
          points: hasConventions ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: hasConventions
            ? "conventions.md found"
            : "conventions.md not found - project needs a universal coding contract",
        };
      },
    },
    recommendation:
      "Without conventions.md, there's no universal coding contract -- agents in different sessions will use different naming conventions, error handling patterns, and code organization styles. A conventions.md establishes the project-wide rules that every agent and human contributor follows.",
    recommendationKey: "create-conventions-instructions",
  },
  {
    id: "2.6.3a",
    name: "conventions.md has real content",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.facts.shared.localInstructions.hasConventions === false) {
          return {
            id: "2.6.3a",
            name: "conventions.md has real content",
            tier: "standard",
            category: "Local Instructions",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No conventions.md",
          };
        }
        return {
          id: "2.6.3a",
          name: "conventions.md has real content",
          tier: "standard",
          category: "Local Instructions",
          status: ctx.facts.shared.localInstructions.conventionsHasContent
            ? "pass"
            : "fail",
          points: ctx.facts.shared.localInstructions.conventionsHasContent
            ? 1
            : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.facts.shared.localInstructions.conventionsHasContent
            ? "conventions.md has commands and conventions"
            : "conventions.md exists but lacks commands or conventions - a stub is not useful",
        };
      },
    },
    recommendation:
      "A stub conventions.md with only a heading provides no guidance -- agents fall back to generic defaults. Include real build/test/lint commands, concrete DO/DON'T examples, and dangerous operations to avoid so agents have actionable rules instead of an empty placeholder.",
    recommendationKey: "improve-conventions-instructions",
  },
  // 2.6.4 (code-review.md exists) removed - optional file should not be a scored check.
  // 2.6.5 (git-commit.md exists) removed - same rationale.
  // 2.6.6 (git-commit-instructions.md in .github/) removed - same rationale.
  {
    id: "2.6.7a",
    name: "frontend.md exists for projects with a detected frontend/UI stack",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const checkName =
          "frontend.md exists for projects with a detected frontend/UI stack";
        const { hasFrontend, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: "2.6.7a",
            name: checkName,
            tier: "standard",
            category: "Local Instructions",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No instructions directory",
          };
        }
        const langs = ctx.facts.stack.languages.map((l) => l.toLowerCase());
        const frontendSignals = [
          "typescript",
          "javascript",
          "react",
          "vue",
          "angular",
          "svelte",
        ];
        const needsFrontend = langs.some((l) => frontendSignals.includes(l));
        if (!needsFrontend) {
          return {
            id: "2.6.7a",
            name: checkName,
            tier: "standard",
            category: "Local Instructions",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No frontend/UI stack detected",
          };
        }
        return {
          id: "2.6.7a",
          name: checkName,
          tier: "standard",
          category: "Local Instructions",
          status: hasFrontend ? "pass" : "fail",
          points: hasFrontend ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: hasFrontend
            ? "frontend.md found"
            : "Project with frontend/UI stack should have frontend.md",
        };
      },
    },
    recommendation:
      "Frontend code has unique conventions (component structure, state management, CSS methodology, accessibility) that generic coding standards don't cover. Without a frontend.md, agents make inconsistent UI decisions -- mixing class and functional components, using different state patterns, or ignoring accessibility. Create frontend.md for the detected UI stack.",
    recommendationKey: "create-frontend-instructions",
  },
  {
    id: "2.6.7b",
    name: "backend.md exists for backend-language projects",
    tier: "standard",
    category: "Local Instructions",
    pts: 1,
    confidence: "high",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { hasBackend, dirExists } = ctx.facts.shared.localInstructions;
        if (dirExists === false) {
          return {
            id: "2.6.7b",
            name: "backend.md exists for backend-language projects",
            tier: "standard",
            category: "Local Instructions",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No instructions directory",
          };
        }
        const langs = ctx.facts.stack.languages.map((l) => l.toLowerCase());
        const backendLangs = ["go", "python", "rust", "php"];
        const needsBackend = langs.some((l) => backendLangs.includes(l));
        if (!needsBackend) {
          return {
            id: "2.6.7b",
            name: "backend.md exists for backend-language projects",
            tier: "standard",
            category: "Local Instructions",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No backend language detected",
          };
        }
        const detectedLang = langs.find((l) => backendLangs.includes(l));
        return {
          id: "2.6.7b",
          name: "backend.md exists for backend-language projects",
          tier: "standard",
          category: "Local Instructions",
          status: hasBackend ? "pass" : "fail",
          points: hasBackend ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: hasBackend
            ? "backend.md found"
            : `${detectedLang} project should have backend.md`,
        };
      },
    },
    recommendation:
      "Backend code has language-specific conventions (error handling, concurrency patterns, database access, API design) that generic coding standards don't cover. Without a backend.md, agents use default patterns that may violate your project's established practices for the detected backend language.",
    recommendationKey: "create-backend-instructions",
  },
];
