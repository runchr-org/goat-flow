# GOAT Flow v1.0.0 Release Notes

## Highlights

First stable release. CLI scanner + dashboard + setup generator for AI coding agent workflows. Works with Claude Code, Codex, Gemini CLI, Copilot, Cursor — any agent that reads instruction files. 109 checks + 20 anti-patterns. 1,162 tests. Node >=20.11.

## What is GOAT Flow?

GOAT Flow scores how well your project is set up for AI coding agents. It checks for instruction files, execution loops, enforcement hooks, skills, learning loops, and more — then tells you exactly what to fix.

```bash
npm install -g @blundergoat/goat-flow
goat-flow scan .          # Score your project (A-F)
goat-flow setup . --agent claude   # Generate instruction files
goat-flow dashboard .     # Interactive dashboard with embedded terminal
```

## Features

### Scanner (109 checks + 20 anti-patterns)
- **3-tier rubric**: Foundation (instruction file, execution loop, enforcement), Standard (skills, hooks, learning loop, router), Full (evals, CI, handoff)
- **Priority-based grading**: A/B/C/D/F based on required + recommended checks, not raw percentage
- **Behavior verification**: hooks checked for real validation logic (not just existence), router paths verified on disk, duplicate surfaces flagged
- **Guide mode** (`--guide`): prioritized setup instructions instead of scores
- **Multi-agent**: scores Claude Code, Codex, and Gemini CLI independently from one scan
- **JSON, text, HTML, markdown** output formats. GitHub Actions composite action for PR comments.

### Dashboard
- **5 pages**: Home (what to do next), Scanner (drill-down per agent), Workspace (19 prompt presets), Setup Wizard, Config
- **Embedded terminal**: launch Claude, Codex, Gemini, or Copilot directly from the dashboard
- **Action-driven home page**: failing agents get Fix/Details/Workspace cards, passing projects get quick-launch presets
- **Dark/light themes**, live reload dev mode (`npm run dev`)

### Setup Generator
- Generates instruction files (CLAUDE.md, AGENTS.md, GEMINI.md) with execution loops, autonomy tiers, enforcement hooks, router tables
- Auto-detects stack (TypeScript, Python, Go, Rust, PHP, Ruby, Java, C#, Bash) and routes to matching coding standards
- 49 coding standards templates (backend, frontend, security, devops)
- Signal-aware: detects LLM integration, deploy platforms, static analysis tools

### Skills (6 conversational workflows)
- **goat** — dispatcher that routes `/goat fix the login bug` to the right skill
- **goat-debug** — diagnosis-first debugging with hypothesis tracking, investigate/onboard modes
- **goat-plan** — 4-phase planning with complexity routing, kill criteria, SBAO multi-agent critique
- **goat-review** — code review with RFC 2119 severity, diff-aware analysis, simplify/audit modes
- **goat-security** — threat-model-driven assessment with framework-aware verification
- **goat-test** — 3-phase test plan: automated commands, AI verification prompts, human checklists

### Enforcement
- Deny hooks for dangerous commands (rm -rf, force push, chmod 777, pipe-to-shell, lockfile modification)
- Post-turn validation (shellcheck, eslint, tsc on changed files)
- Post-tool formatting with agent config dir skip
- Read/Edit/Write deny for secrets (.env, .ssh, .aws, .pem, credentials)

### Learning Loop
- Category bucket files for lessons and footguns (not one file per incident)
- Scanner validates evidence labels (`ACTUAL_MEASURED`, `DESIGN_TARGET`) and `file:line` references
- Committed (team knowledge) vs local (agent-local, gitignored) split

## Stats

| Metric | Value |
|--------|-------|
| Rubric checks | 109 (+ 24 hidden) |
| Anti-patterns | 20 |
| Tests | 1,162 |
| Skills | 6 (+ SBAO Phase 3) |
| Coding standards templates | 49 |
| Runners | 4 (Claude, Codex, Gemini, Copilot) |
| Dashboard pages | 5 |
| Workspace presets | 19 |

## Changes from v0.10.0

Bumped from v0.10.0 for semver compatibility — `^0.9.x` won't resolve to `0.10.0`.

- Removed `--no-open` flag and browser auto-open logic from dashboard server (-40 lines)
- `ws` moved from optionalDependencies to dependencies (required for dashboard WebSocket)
- Added npm keywords: `ai-agent`, `claude-code`, `copilot`, `dashboard`, `llm`, `scanner`
- Version strings updated across 53 files (skills, configs, fixtures, docs)

See [v0.10.0 release notes](https://github.com/blundergoat/goat-flow/releases/tag/v0.10.0) for the full development changelog.

## How to verify

```bash
npm install -g @blundergoat/goat-flow@1.0.0
goat-flow scan .
goat-flow setup . --agent claude
goat-flow dashboard .
```
