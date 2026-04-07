# GOAT Flow

A structured workflow system for AI coding agents. Gives Claude Code, Gemini CLI, Codex, and Copilot an execution loop, autonomy tiers, enforcement hooks, and a learning loop - instead of a wall of rules they half-follow.

## Quick Start

```bash
npm install --save-dev @blundergoat/goat-flow
npx goat-flow dashboard
```

Open the dashboard, click **Scan**, and see your score. Click **Setup** to generate setup instructions, then paste them into your coding agent.

![Dashboard](docs/assets/dashboard-preview.png)

## Install

```bash
# npm
npm install --save-dev @blundergoat/goat-flow

# pnpm
pnpm add -D @blundergoat/goat-flow && pnpm approve-builds

# yarn
yarn add -D @blundergoat/goat-flow

# no-install
npx @blundergoat/goat-flow@latest scan .

# global
npm install -g @blundergoat/goat-flow
```

Requires Node.js 20+.

## Commands

```bash
goat-flow dashboard                    # Visual dashboard with integrated terminal
goat-flow scan .                       # Score your project across 112+ checks
goat-flow setup . --agent claude       # Generate setup prompt for your agent

goat-flow scan . --format json         # JSON output for CI
goat-flow scan . --format markdown     # Markdown report
goat-flow setup . --agent gemini       # Gemini CLI setup
goat-flow setup . --agent codex        # Codex setup
```

## Features

### Execution Loop

**READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG.** Every task follows this loop. READ prevents fabrication. CLASSIFY routes by complexity (hotfix → infrastructure). SCOPE declares blast radius before changes. VERIFY gates block broken code. LOG captures incidents for future sessions.

### Enforcement Hooks

Pre-tool hooks block dangerous commands before execution - `rm -rf`, force push, secret file access, pipe-to-shell. Post-turn hooks run linting and type checking after every change. Format-on-write hooks keep code clean automatically. ~100% block rate vs ~70% for rules-only approaches.

### Skills

Six structured workflows, each with phases and human gates:

```
/goat fix the login bug           → /goat-debug (diagnose mode)
/goat how does the auth work      → /goat-debug (investigate mode)
/goat review the PR               → /goat-review (standard mode)
/goat clean up the naming         → /goat-review (simplify mode)
/goat plan the new feature        → /goat-plan (with complexity routing)
/goat refactor the user service   → /goat-plan (refactor mode)
/goat check for security issues   → /goat-security (threat model)
/goat check for CVEs              → /goat-security (dependency audit)
/goat generate a test plan        → /goat-test (3-phase doer-verifier)
```

The `/goat` dispatcher auto-routes by intent. All skills are also directly invocable.

### Scanner

Scores your project across 112+ checks and 19 anti-patterns, organized in three tiers:

- **Foundation** - instruction file, essential commands, autonomy tiers, Definition of Done
- **Standard** - skills, hooks, learning loop, local context, router table
- **Full** - coding standards, architecture docs, cross-references

Priority-weighted grading - security and correctness checks count more than style. Output formats: text, JSON, markdown, HTML.

### Dashboard

Single-page dashboard with five views:

- **Home** - project overview, agent summary, quick-start presets
- **Scanner** - live scanning with severity-grouped results and fix suggestions
- **Workspace** - split-pane terminal for running agents alongside scan results
- **Settings** - config editor with persona selection and local overrides
- **Setup Wizard** - guided setup prompt generation

19 built-in presets for common tasks (diagnose error, code review, plan feature, security audit, etc.).

### Learning Loop

Captures knowledge from real incidents so agents improve over time:

- **Footguns** (`.goat-flow/footguns/`) - architectural traps in the code with file:line evidence
- **Lessons** (`.goat-flow/lessons/`) - agent behavioral mistakes with root cause analysis
- **Decisions** (`.goat-flow/decisions/`) - ADRs with context and rationale
- **Session logs** (`.goat-flow/logs/sessions/`) - per-session summaries

Category bucket format keeps related entries together. Agents read these before acting to avoid repeating known mistakes.

### Autonomy Tiers

Three-tier permission model built into the instruction file:

- **Always** - read files, lint, edit within scope, append to logs
- **Ask First** - spec changes, boundary files, adding/removing files, 3+ file changes
- **Never** - delete docs without replacement, modify secrets, push to main, force push

### Coding Standards

36 language and framework-specific templates in `workflow/coding-standards/`:

Backend (Python, Go, Rust, PHP, TypeScript/Node), frontend (React, Angular, Vue, TypeScript), security (OWASP, supply chain, PHI compliance, framework-specific), DevOps (Terraform), plus cross-cutting guides for testing, code review, and git commits.

### Complexity Routing

Tasks are classified by complexity, and ceremony scales to match:

| Complexity | Ceremony |
|---|---|
| Hotfix | Skip planning phases, minimal closing |
| Small Feature | Compressed brief, skip elaboration |
| Standard | Full phases, gates at major decisions |
| System Change | Full phases + cross-boundary verification |
| Infrastructure | Full phases + rollback planning |

## Multi-Agent Support

| | Claude Code | Gemini CLI | Codex | Copilot |
|---|---|---|---|---|
| Instruction file | CLAUDE.md | GEMINI.md | AGENTS.md | .github/copilot-instructions.md |
| Skills | .claude/skills/ | .github/skills/ | .agents/skills/ | .github/skills/ |
| Hooks | .claude/hooks/ | .gemini/hooks/ | .codex/hooks/ | - |

All agents share the same execution loop, autonomy tiers, skills, and learning loop. The `setup` command generates agent-specific configuration.

## Troubleshooting

**Terminal not showing in dashboard?**
node-pty didn't compile. Run `pnpm approve-builds` (select node-pty) or `npm rebuild node-pty`.

**Scan shows 0% on a fresh project?**
Expected. Run `npx goat-flow setup . --agent claude` and paste the output into your agent.

## Documentation

| Document | What it covers |
|---|---|
| [Skills Reference](docs/skills/README.md) | All 6 skills: modes, phases, gates, outputs |

## Author

Built by [Matthew Hansen](https://www.blundergoat.com/about).

## License

[MIT](LICENSE)
