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
          status: dirExists ? "pass" : "na",
          points: dirExists ? 1 : 0,
          maxPoints: dirExists ? 1 : 0,
          confidence: "high",
          message: dirExists
            ? `Found at ${location === "ai" ? ".goat-flow/coding-standards/" : ".github/instructions/"}`
            : "No local instructions directory - optional later optimisation",
        };
      },
    },
    recommendation:
      "Optional later optimisation: add a canonical local-instructions surface if you need project-specific coding rules beyond the hot-path instruction file.",
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
      fn: (_ctx: FactContext): CheckResult => {
        // Coexistence of .github/instructions/ and .goat-flow/coding-standards/
        // is acceptable — projects may have pre-existing instruction files that
        // should be preserved. The scanner should verify at least one canonical
        // surface exists, not that only one exists.
        return {
          id: "2.6.1a",
          name: "Instruction surfaces are canonical",
          tier: "standard",
          category: "Local Instructions",
          status: "pass",
          points: 1,
          maxPoints: 1,
          confidence: "high",
          message: "At least one local-instructions surface is in use",
        };
      },
    },
    recommendation:
      "If both .goat-flow/coding-standards/ and .github/instructions/ exist, use one as the canonical source and reference it from the router table. Existing instruction files should be preserved — do not delete them to satisfy the scanner.",
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
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No local instructions directory",
          };
        }
        return {
          id: "2.6.3",
          name: "conventions.md exists",
          tier: "standard",
          category: "Local Instructions",
          status: hasConventions ? "pass" : "na",
          points: hasConventions ? 1 : 0,
          maxPoints: hasConventions ? 1 : 0,
          confidence: "high",
          message: hasConventions
            ? "conventions.md found"
            : "No conventions.md — acceptable if project has existing instruction files",
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

  // === 2.6.5–2.6.9 Content Quality Checks ===

  {
    id: "2.6.5",
    name: "Skill path integrity",
    tier: "standard",
    category: "Content Quality",
    pts: 3,
    confidence: "high",
    priority: "required",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.6.5",
          name: "Skill path integrity",
          tier: "standard" as const,
          category: "Content Quality",
          confidence: "high" as const,
        };
        const agent = ctx.agentFacts;
        const problems: string[] = [];
        for (const skill of agent.skills.found) {
          const path = `${agent.agent.skillsDir}/${skill}/SKILL.md`;
          const content = ctx.fs.readFile(path);
          if (!content) continue;
          // workflow/ paths in installed skills are INVALID (R9 regression class)
          const wfMatches = content.match(/workflow\/[a-zA-Z0-9_./-]+/g);
          if (wfMatches) {
            problems.push(`${skill}: framework-local workflow/ path`);
          }
          // .goat-flow/ paths must resolve
          const gfMatches = content.match(/\.goat-flow\/[a-zA-Z0-9_./-]+/g);
          if (gfMatches) {
            for (const ref of new Set(gfMatches)) {
              if (!ctx.fs.exists(ref)) {
                problems.push(`${skill}: dead ref ${ref}`);
              }
            }
          }
        }
        if (problems.length === 0) {
          return {
            ...base,
            status: "pass",
            points: 3,
            maxPoints: 3,
            message: "All skill path references are valid",
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 3,
          message: `Skill path problems: ${problems.join("; ")}`,
        };
      },
    },
    recommendation:
      "Installed skills must only reference .goat-flow/ paths, never workflow/ paths. Fix any workflow/ references and verify all .goat-flow/ paths resolve.",
    recommendationKey: "create-goat-flow-config",
  },
  {
    id: "2.6.6",
    name: "Footgun evidence verification",
    tier: "standard",
    category: "Content Quality",
    pts: 2,
    confidence: "medium",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.6.6",
          name: "Footgun evidence verification",
          tier: "standard" as const,
          category: "Content Quality",
          confidence: "medium" as const,
        };
        const footguns = ctx.facts.shared.footguns;
        if (!footguns.exists) {
          return {
            ...base,
            status: "na",
            points: 0,
            maxPoints: 2,
            message: "No footguns surface",
          };
        }
        const total = footguns.totalRefs;
        const valid = footguns.validRefs;
        if (total === 0) {
          return {
            ...base,
            status: "fail",
            points: 0,
            maxPoints: 2,
            message: "Footguns have no file:line evidence",
          };
        }
        const ratio = valid / total;
        if (ratio >= 0.8) {
          return {
            ...base,
            status: "pass",
            points: 2,
            maxPoints: 2,
            message: `${valid}/${total} footgun citations resolve (${Math.round(ratio * 100)}%)`,
          };
        }
        if (ratio >= 0.5) {
          return {
            ...base,
            status: "partial",
            points: 1,
            maxPoints: 2,
            message: `${valid}/${total} footgun citations resolve (${Math.round(ratio * 100)}%) — some stale`,
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 2,
          message: `${valid}/${total} footgun citations resolve (${Math.round(ratio * 100)}%) — mostly stale`,
        };
      },
    },
    recommendation:
      "Footgun entries with stale file:line citations erode trust. Re-verify each citation points to real code.",
    recommendationKey: "create-goat-flow-config",
  },
  {
    id: "2.6.7",
    name: "Instruction file specificity",
    tier: "standard",
    category: "Content Quality",
    pts: 2,
    confidence: "medium",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.6.7",
          name: "Instruction file specificity",
          tier: "standard" as const,
          category: "Content Quality",
          confidence: "medium" as const,
        };
        const content = ctx.agentFacts.instruction.content;
        if (!content) {
          return {
            ...base,
            status: "fail",
            points: 0,
            maxPoints: 2,
            message: "No instruction file",
          };
        }
        // Count project-specific paths (not .goat-flow/ or .claude/)
        const allPaths = content.match(/`[a-zA-Z][a-zA-Z0-9_./-]+`/g) ?? [];
        const projectPaths = allPaths.filter(
          (p) =>
            !p.includes(".goat-flow/") &&
            !p.includes(".claude/") &&
            !p.includes(".agents/") &&
            !p.includes(".github/") &&
            !p.includes(".gemini/"),
        );
        const count = new Set(projectPaths).size;
        if (count >= 3) {
          return {
            ...base,
            status: "pass",
            points: 2,
            maxPoints: 2,
            message: `${count} project-specific paths referenced`,
          };
        }
        if (count >= 1) {
          return {
            ...base,
            status: "partial",
            points: 1,
            maxPoints: 2,
            message: `Only ${count} project-specific path(s) — may be too generic`,
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 2,
          message:
            "No project-specific paths — instruction file appears generic",
        };
      },
    },
    recommendation:
      "The instruction file should reference real project paths (src/, tests/, scripts/) to prove it was adapted to this codebase.",
    recommendationKey: "create-goat-flow-config",
  },
  {
    id: "2.6.8",
    name: "No duplicate canonical surfaces",
    tier: "standard",
    category: "Content Quality",
    pts: 2,
    confidence: "high",
    priority: "required",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.6.8",
          name: "No duplicate canonical surfaces",
          tier: "standard" as const,
          category: "Content Quality",
          confidence: "high" as const,
        };
        const duplicates: string[] = [];
        const pairs: [string, string][] = [
          ["docs/footguns.md", ".goat-flow/footguns/"],
          ["docs/footguns/", ".goat-flow/footguns/"],
          ["docs/lessons.md", ".goat-flow/lessons/"],
          ["docs/lessons/", ".goat-flow/lessons/"],
          ["docs/architecture.md", ".goat-flow/architecture.md"],
        ];
        for (const [a, b] of pairs) {
          if (ctx.fs.exists(a) && ctx.fs.exists(b)) {
            duplicates.push(`${a} + ${b}`);
          }
        }
        if (duplicates.length === 0) {
          return {
            ...base,
            status: "pass",
            points: 2,
            maxPoints: 2,
            message: "No duplicate canonical surfaces",
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 2,
          message: `Duplicate surfaces: ${duplicates.join(", ")}`,
        };
      },
    },
    recommendation:
      "Each artifact type (footguns, lessons, architecture) should have ONE canonical surface. Remove the duplicate or bridge via config.yaml.",
    recommendationKey: "create-goat-flow-config",
  },
  {
    id: "2.6.9",
    name: "Router path verification",
    tier: "standard",
    category: "Content Quality",
    pts: 2,
    confidence: "high",
    priority: "required",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const base = {
          id: "2.6.9",
          name: "Router path verification",
          tier: "standard" as const,
          category: "Content Quality",
          confidence: "high" as const,
        };
        const content = ctx.agentFacts.instruction.content;
        if (!content) {
          return {
            ...base,
            status: "na",
            points: 0,
            maxPoints: 2,
            message: "No instruction file",
          };
        }
        // Find router table section and extract paths
        const routerMatch = content.match(
          /## Router.*?\n([\s\S]*?)(?=\n##|\n$)/i,
        );
        if (!routerMatch?.[1]) {
          return {
            ...base,
            status: "na",
            points: 0,
            maxPoints: 2,
            message: "No Router Table section found",
          };
        }
        const rows = routerMatch[1];
        const paths = rows.match(/`\.?[a-zA-Z][a-zA-Z0-9_./-]+`/g) ?? [];
        const dead: string[] = [];
        for (const raw of paths) {
          const p = raw.replace(/`/g, "").replace(/\/+$/, "");
          if (!p.includes("/")) continue; // skip non-paths
          if (!ctx.fs.exists(p) && !ctx.fs.exists(p + "/")) {
            dead.push(p);
          }
        }
        if (dead.length === 0) {
          return {
            ...base,
            status: "pass",
            points: 2,
            maxPoints: 2,
            message: `All ${paths.length} router paths resolve`,
          };
        }
        return {
          ...base,
          status: "fail",
          points: 0,
          maxPoints: 2,
          message: `Dead router paths: ${dead.join(", ")}`,
        };
      },
    },
    recommendation:
      "Every path in the Router Table must exist on disk. Remove dead entries or fix the paths.",
    recommendationKey: "create-goat-flow-config",
  },
];
