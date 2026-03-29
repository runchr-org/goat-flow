# GOAT Flow

A structured workflow system for AI coding agents. Gives Claude Code, Gemini CLI, and Codex a 6-step execution loop, autonomy tiers, enforcement hooks, and a learning loop - instead of a wall of rules they half-follow.

## The Problem

AI coding agents are powerful but unreliable without structure. They fabricate file paths, skip verification, expand scope without asking, declare tasks done when they're not, and repeat the same mistakes across sessions.

Rules in instruction files help - but research shows agents follow ~70% of prose instructions. The other 30% is where things break.

## What GOAT Flow Does

**6-step execution loop:** READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG. Every task follows this loop. SCOPE prevents scope creep. VERIFY catches errors before they ship. LOG captures lessons for next time.

**Three autonomy tiers:** Always (safe, reversible), Ask First (boundaries with a 5-item checklist), Never (destructive actions blocked mechanically).

**Enforcement hooks:** Pre-tool hooks block dangerous commands before execution (100% block rate vs ~70% for rules alone). Post-turn hooks lint after every change. Format hooks clean up edits. Ask First hooks warn on boundary file edits.

**Learning loop:** `docs/footguns.md` captures architectural traps with file:line evidence. `docs/lessons.md` captures behavioural mistakes. Real incidents only - no hypotheticals. Agent evals replay past failures as regression tests.

**9 skills (8 specialized + dispatcher):** `/goat` routes to the right skill automatically. `/goat-security`, `/goat-debug`, `/goat-investigate`, `/goat-review`, `/goat-plan`, `/goat-test`, `/goat-refactor`, `/goat-simplify`. Each has a distinct artifact, human gates, and a repeatable structured output.

**CLI scanner + dashboard:** Scores your project across 104 checks + 16 anti-patterns. Interactive dashboard for browsing results, comparing agents, and copying fix prompts. Generates setup prompts that adapt to your project's state.

## Quick Start

### 1. Open the dashboard

```bash
npx @blundergoat/goat-flow dashboard .
```

Opens a local web dashboard - scan your project, browse results by category, compare agents side by side, and copy fix prompts. This is the fastest way to see where your project stands.

### 2. Or scan from the CLI

```bash
npx @blundergoat/goat-flow scan .
```

```
--- Claude Code ---

Grade: A (100%)

  Foundation:   43/43  ████████████████████  100%
  Standard:     64/64  ████████████████████  100%
  Full:         17/17  ████████████████████  100%
  Deductions:   0
```

Detects your stack, scores any existing GOAT Flow setup, and shows what's missing. No installation required - runs via npx.

### 3. Generate a setup prompt

```bash
npx @blundergoat/goat-flow setup . --agent claude
```

Generates a setup prompt adapted to your project's current state. Paste it into your agent - it reads the templates and builds the system for your project.

Available agents: `claude`, `codex`, `gemini`

### 4. Verify

```bash
npx @blundergoat/goat-flow scan . --agent claude
```

Target: Grade A. The scanner checks 104 items across foundation (instruction file, execution loop, autonomy, DoD, enforcement), standard (skills, hooks, learning loop, router, architecture, local instructions), and full (evals, CI, hygiene) tiers.

### CI Gate

```bash
npx @blundergoat/goat-flow scan . --min-score 75
# Exit code 1 if any agent scores below 75%
```

### Output Formats

```bash
npx @blundergoat/goat-flow scan . --format json       # Machine-readable
npx @blundergoat/goat-flow scan . --format markdown    # PR comment friendly
npx @blundergoat/goat-flow scan . --format html        # Standalone HTML report
npx @blundergoat/goat-flow scan . --output report.json # Write to file
```

## Skills

Type `/goat` followed by what you need. The dispatcher routes to the right skill automatically.

```
/goat fix the login bug           → /goat-debug
/goat review the PR               → /goat-review
/goat plan the new feature        → /goat-plan
/goat check for security issues   → /goat-security
/goat how does the auth work      → /goat-investigate
/goat generate a test plan        → /goat-test
/goat rename across files         → /goat-refactor
/goat clean up this messy code    → /goat-simplify
```

Every skill pauses at Step 0 to confirm context before starting, has human gates between phases, and produces a structured output. Skills stay out of the instruction budget until invoked.

All 9 skills are also directly invocable: `/goat-debug`, `/goat-security`, etc.

Details: [docs/system/skills.md](docs/system/skills.md)

## Architecture

```
Layer 1 - Runtime         Instruction file (~120 lines), hooks, settings
Layer 2 - Local Context   Per-directory instruction files for high-risk areas
Layer 3 - Skills          9 on-demand capabilities loaded via slash commands
Layer 4 - Playbooks       Planning methodology templates
Layer 5 - Evaluation      Agent evals, CI validation, learning loop
```

Only Layer 1 loads every session. Everything else loads on demand via the router table.

Details: [docs/system/five-layers.md](docs/system/five-layers.md)

## Multi-Agent Support

| | Claude Code | Gemini CLI | Codex |
|---|---|---|---|
| Instruction file | CLAUDE.md | GEMINI.md | AGENTS.md |
| Skills | .claude/skills/ | .github/skills/ | .agents/skills/ |
| Hooks | .claude/hooks/ | .gemini/hooks/ | .codex/hooks/ |
| Settings | .claude/settings.json | .gemini/settings.json | .codex/config.toml |
| Scanner | Yes | Yes | Yes |

All agents share the same execution loop, autonomy tiers, definition of done, and learning loop files. Agent-specific differences are in file locations and hook mechanisms.

## Project Structure

```
src/cli/                CLI scanner, prompt generator, scoring engine
setup/                  Setup guides + shared templates
  shared/               Cross-agent templates (execution loop, docs seed)
  setup-claude.md       Claude Code setup phases
  setup-gemini.md       Gemini CLI setup phases
  setup-codex.md        Codex setup phases
workflow/               Templates for skills, coding standards, evaluation
  skills/               9 skill templates (8 specialized + /goat dispatcher)
  coding-standards/     55 templates (backend, frontend, security, devops)
  evaluation/           Eval format, footguns, lessons, handoff templates
  runtime/              Enforcement, architecture, code-map templates
src/dashboard/          Single-page HTML dashboard (Alpine.js + Tailwind via CDN)
docs/                   System design + reference documentation
scripts/                Preflight, validation, enforcement scripts
agent-evals/            Regression tests from real incidents
```

## Documentation

| Document | What it covers |
|----------|---------------|
| [Getting Started](docs/getting-started.md) | Reading order, setup checklist, adoption tiers |
| [System Spec](docs/system-spec.md) | Full technical specification (canonical source of truth) |
| [5-Layer Architecture](docs/system/five-layers.md) | Runtime, Local Context, Skills, Playbooks, Evaluation |
| [6-Step Execution Loop](docs/system/six-steps.md) | READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG |
| [Skills Reference](docs/system/skills.md) | All 9 skills: when to use, gates, output formats |
| [Design Rationale](docs/reference/design-rationale.md) | Why behind every design decision |

## Author

Built by [Matthew Hansen](https://www.blundergoat.com/about).

## License

[MIT](LICENSE)
