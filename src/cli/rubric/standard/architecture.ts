import type { CheckDef, FactContext, CheckResult } from "../../types.js";

/** Standard-tier checks for architecture documentation (2.5.x). */
export const architectureChecks: CheckDef[] = [
  {
    id: "2.5.1",
    name: "architecture.md exists",
    tier: "standard",
    category: "Architecture",
    pts: 1,
    confidence: "high",
    priority: "recommended",
    detect: { type: "file_exists", path: ".goat-flow/architecture.md" },
    recommendation:
      "Without an architecture.md, agents making structural changes have no source of truth for system boundaries, component relationships, or invariants. They'll guess at the architecture and introduce cross-boundary violations, circular dependencies, or broken abstractions that compound over time.",
    recommendationKey: "create-architecture",
  },
  // 2.5.2 (architecture.md under 100 lines) removed - arbitrary line limit contradicts real-world needs.
  {
    id: "2.5.3",
    name: "decisions dir has real ADR content",
    tier: "standard",
    category: "Architecture",
    pts: 1,
    confidence: "high",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { dirExists, fileCount, hasRealContent } =
          ctx.facts.shared.decisions;
        if (!dirExists || fileCount === 0) {
          return {
            id: "2.5.3",
            name: "decisions dir has real ADR content",
            tier: "standard",
            category: "Architecture",
            status: "fail",
            points: 0,
            maxPoints: 1,
            confidence: "high",
            message: dirExists
              ? "Directory exists but no ADR files"
              : "No decisions directory",
          };
        }
        return {
          id: "2.5.3",
          name: "decisions dir has real ADR content",
          tier: "standard",
          category: "Architecture",
          status: hasRealContent ? "pass" : "fail",
          points: hasRealContent ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: hasRealContent
            ? `${fileCount} ADR files, real content found`
            : `${fileCount} ADR files but none have real Context + Decision sections (≥50 chars, not TODO/TBD)`,
        };
      },
    },
    recommendation:
      "Without an ADR (Architecture Decision Record) directory, the reasoning behind past technical decisions is lost. Agents and new team members will question or reverse decisions without understanding the original context and tradeoffs. Create .goat-flow/decisions/ with at least 1 real ADR containing Context and Decision sections so rationale persists.",
    recommendationKey: "create-decisions-dir",
  },
];
