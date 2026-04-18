/**
 * Preset launcher definitions for the dashboard workspace panel.
 * Loaded as a classic browser script so `PRESETS` stays available on `window`.
 */
const PRESETS: Preset[] = [
  // === Debug ===
  {
    id: "explore",
    name: "Explore Codebase",
    desc: "Investigate an unfamiliar area",
    prompt: "/goat-debug investigate this codebase - start with an overview",
    cat: "debug",
  },
  {
    id: "error",
    name: "Diagnose Error",
    desc: "Root cause analysis from an error message",
    prompt: "/goat-debug I have an error to diagnose",
    cat: "debug",
  },
  {
    id: "fix-bug",
    name: "Fix Bug",
    desc: "Diagnose and fix a specific bug",
    prompt: "/goat-debug I have a bug to fix",
    cat: "debug",
  },

  // === Review ===
  {
    id: "review",
    name: "Code Review",
    desc: "Review changes with severity-ordered findings",
    prompt: "/goat-review my recent changes",
    cat: "review",
  },
  {
    id: "audit",
    name: "Quality Audit",
    desc: "Systematic quality scan of a codebase area",
    prompt: "/goat-review audit the most-changed files",
    cat: "review",
  },
  {
    id: "uncommitted",
    name: "Review Uncommitted",
    desc: "Quick review of uncommitted changes",
    prompt: "/goat-review my uncommitted changes",
    cat: "review",
  },
  {
    id: "review-instructions",
    name: "Review Instructions",
    desc: "Check instruction files for staleness",
    prompt:
      "/goat-review audit AGENTS.md, CLAUDE.md, and GEMINI.md for staleness, contradictions, and missing verification gates",
    cat: "review",
  },
  {
    id: "quality-check-goatflow",
    name: "Critique GOAT Flow",
    desc: "Deep honest audit of goat-flow setup quality",
    prompt:
      "/goat-review audit the goat-flow setup in this project. Read-only only. Start with `AGENTS.md`, `.goat-flow/config.yaml`, `.goat-flow/skill-reference/`, the installed skills under `.agents/skills/`, `.codex/config.toml`, `.codex/hooks.json`, and `.codex/hooks/`. Then assess setup quality, skill usability, contradictions, stale docs, and the top improvements with evidence. Prefer file analysis unless a live slash-command path is clearly available and still read-only.",
    cat: "review",
  },

  // === Plan ===
  {
    id: "plan",
    name: "Plan Feature",
    desc: "Walk through a feature brief",
    prompt: "/goat plan a new feature",
    cat: "plan",
  },
  {
    id: "milestones",
    name: "Break Into Milestones",
    desc: "Create milestone task files with testing gates",
    prompt: "/goat-plan break this into milestones",
    cat: "plan",
  },
  {
    id: "refactor",
    name: "Plan Refactor",
    desc: "Blast radius analysis for a restructure",
    prompt: "/goat I need to refactor - ask me what to restructure",
    cat: "plan",
  },

  // === Critique ===
  {
    id: "critique-plan",
    name: "Multi-perspective Critique",
    desc: "Multi-perspective critique with 3 sub-agents",
    prompt: "/goat-critique this plan",
    cat: "critique",
  },
  {
    id: "critique-artifact",
    name: "Critique Any Artifact",
    desc: "Multi-perspective critique of any artifact - assessment, strategy, findings",
    prompt: "/goat-critique this artifact",
    cat: "critique",
  },
  {
    id: "skill-quality-test",
    name: "Pressure-Test a Skill",
    desc: "RED/GREEN/REFACTOR skill TDD using skill-quality-testing.md",
    prompt:
      "/goat-critique pressure-test a goat-flow skill using the methodology at `.goat-flow/skill-reference/skill-quality-testing.md`. First ask which skill to test. Then dispatch a fresh Agent sub-agent with a realistic high-pressure scenario (3+ combined pressures, target skill NOT loaded into the sub-agent's context) and capture RED rationalizations verbatim. Propose GREEN inline counters only for rationalization classes that actually reproduced in RED — do NOT pre-seed from example tables. Iterate RED → GREEN → REFACTOR until the skill reaches the bulletproof threshold (3 consecutive passes with zero captured rationalizations from the scenario's class) OR cap at 5 iterations and record Decision Debt in `.goat-flow/decisions/`. Propagate any SKILL.md edits to `.claude/skills/` and `.agents/skills/` with `ls` existence checks, then re-run `goat-flow audit --check-drift`.",
    cat: "critique",
  },

  // === QA ===
  {
    id: "test",
    name: "Testing Gap Analysis",
    desc: "Find undertested risks in recent changes",
    prompt: "/goat-qa analyse my recent changes",
    cat: "qa",
  },
  {
    id: "test-audit",
    name: "Coverage Audit",
    desc: "Audit test coverage for an existing area",
    prompt: "/goat-qa audit mode",
    cat: "qa",
  },
  {
    id: "test-regression",
    name: "Regression Guard",
    desc: "Lock down a bug fix with an invariant",
    prompt: "/goat-qa regression guard for my recent bug fix",
    cat: "qa",
  },
  {
    id: "user-flow",
    name: "User Flow Diagram",
    desc: "Mermaid flow diagram for QA handoff",
    prompt: "/goat-qa I need a flow diagram for a user-visible feature",
    cat: "qa",
  },

  // === Security ===
  {
    id: "security",
    name: "Security Assessment",
    desc: "Threat model for this project",
    prompt: "/goat-security run a threat model on this project",
    cat: "security",
  },
  {
    id: "dep-scan",
    name: "Dependency Scan",
    desc: "Scan for known CVEs and outdated packages",
    prompt: "/goat-security scan dependencies for known vulnerabilities",
    cat: "security",
  },
  {
    id: "security-critique",
    name: "Critique Security Findings",
    desc: "Multi-perspective critique of a security assessment",
    prompt: "/goat-critique this security assessment",
    cat: "security",
  },
];
