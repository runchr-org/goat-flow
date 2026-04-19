# GOAT Flow

**Guardrails and memory for your AI coding agent.**

AI coding agents are fast and unreliable. They skip verification, duplicate files instead of editing in place, ignore project conventions, and repeat the same mistakes every session. GOAT Flow is an opinionated harness that fixes this: a READ → SCOPE → ACT → VERIFY execution loop, seven structured skills, hooks that block dangerous commands, and a learning loop that captures lessons so mistakes don't recur.

Works with Claude Code, Codex, Gemini CLI, and Copilot CLI.

[![npm version](https://img.shields.io/npm/v/@blundergoat/goat-flow.svg)](https://www.npmjs.com/package/@blundergoat/goat-flow) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) 

## Before and after

A fresh repo fails the audit. That's the baseline:

```
$ npx @blundergoat/goat-flow@latest audit .
GOAT Flow Audit: .

GOAT Flow Setup:         FAIL
  Skills:                7/7 installed
  Config:                invalid or missing
  InstructionFile:       0 lines (max across agents)
  x Lessons: Missing: .goat-flow/lessons/
  x Footguns: Missing: .goat-flow/footguns/
  x Architecture: Missing: .goat-flow/architecture.md
  ... 9 more failures

Result: FAIL
```

Run setup, paste the prompt into your agent, re-audit:

```
$ npx goat-flow audit .
GOAT Flow Audit: /your/project

GOAT Flow Setup:         PASS
  Skills:                7/7 installed
  Config:                valid, version 1.2.0
  InstructionFile:       118 lines (max across agents)

Agent Setup:             PASS
  Hooks:                 claude:deny installed

Result: PASS
```

Takes about 30 seconds. The rest of this README explains what changed.

## What you get

| Concept | What it prevents |
|---|---|
| **Execution Loop** — READ → SCOPE → ACT → VERIFY | Guessing at unread code, shipping without checks |
| **Skills** — seven `/goat-*` commands plus a `/goat` dispatcher | Free-form prompting that drifts mid-task |
| **Enforcement Hooks** — `deny-dangerous.sh` ships by default | `rm -rf`, force-push, secret file access |
| **Learning Loop** — footguns, lessons, decisions, session logs in `.goat-flow/` | Same mistake recurring next session |
| **Autonomy Tiers** — Always / Ask First / Never | Agent overreach, missed approvals |
| **Reference Templates** — planning, security, compliance | Generic output when the domain has specifics |

Each row maps to a concrete failure mode that free-running agents reliably hit. Skills have phases and human gates. Hooks intercept tool calls before they execute. The learning loop gets read at session start so mistakes compound into context, not repetition.

## Getting started

Requires Node.js 20+.

### 1. Install

```bash
# Recommended: local dev dependency (pin the version per project)
npm install --save-dev @blundergoat/goat-flow

# Or install globally to use goat-flow from any directory
npm install -g @blundergoat/goat-flow

# Or use without installing
npx @blundergoat/goat-flow@latest audit .
```

After a local install, run the CLI with `npx goat-flow ...` from the project root. With a global install, drop the `npx` prefix from the examples below.

### 2. Open the dashboard

```bash
npx goat-flow dashboard .
```

A local web UI opens with auditing, setup, and an integrated terminal.

![Dashboard](docs/assets/dashboard-preview.png)

*Dashboard home: audit status per agent, setup entry points, and a terminal wired to the project root.*

### 3. Audit your project

```bash
npx goat-flow audit .
```

Validates setup correctness across two scopes (GOAT Flow Setup and Agent Setup) and prints pass/fail per scope with actionable fix hints. A fresh project fails; that's the baseline you saw above. Audit checks setup files, config, skills, and hooks. It doesn't check code quality, so run your project's lint and test commands separately.

### 4. Generate setup for your agent

```bash
npx goat-flow setup . --agent claude
```

Prints a setup prompt. Paste it into Claude Code and let the agent configure your project: instruction file, skills, hooks, and learning loop.

### 5. Re-audit

```bash
npx goat-flow audit .
```

Now passes. Add `--harness` to see advisory scoring across the 5 harness concerns (Context, Constraints, Verification, Recovery, Feedback Loop).

### 6. Try a skill

```
/goat review src/auth.ts
```

Skills are structured workflows the agent follows. `/goat` auto-routes to the right one: debug, review, plan, security audit, test gap analysis, or multi-perspective critique (`/goat-critique`).

## A real session

Captured trace from `.goat-flow/logs/sessions/2026-04-16-v1.1.0-review-and-cold-path-fixes.md`:

```
READ    → 89-file diff, 4 independent agent critiques cross-referenced
SCOPE   → "review" mode, no edits; fix scope declared after triage
ACT     → Fixed 3 broken cross-references:
          - 03-install-skills.md (stale flat file names)
          - code-map.md (wrong harness count 15→16, stale skill tree)
          - legacy upgrade guide entry (goat-debug.md → goat-debug/SKILL.md)
          Marked 6 stale footgun entries resolved.
VERIFY  → Preflight: 33 checks, 0 errors, 9 warnings. Tests: 92/92 passing.
```

Every edit is auditable against the loop, after the fact, from the log alone. This is what the Learning Loop records for every non-trivial session.

## The five harness concerns

Every major source in the harness engineering field (Hashimoto, Fowler/Böckeler, Anthropic, HumanLayer) converges on roughly the same concerns: is the agent's context any good, are there rules that catch failures before the model runs, can the agent verify its work, can it resume after a crash, and does the system learn over time. GOAT Flow audits all five.

| Concern | Question | What GOAT Flow checks |
|---------|----------|----------------------|
| **Context** | Is the agent's context accurate, lean, and useful? | Instruction file line count vs target, router table path resolution, footgun file:line evidence freshness, architecture doc existence (10+ lines) |
| **Constraints** | Do deterministic rules catch failures before the LLM runs? | Deny patterns cover secrets and dangerous commands, Ask First boundary count |
| **Verification** | Can the agent verify its work, and does failure feed back? | Test command configured, hook registrations in sync with hook files, commit guidance present |
| **Recovery** | Can the agent resume after crash or interruption? | Milestone file count in `.goat-flow/tasks/`, session log count in `.goat-flow/logs/sessions/` |
| **Feedback Loop** | Is the harness getting smarter from failures over time? | Footgun entry count (3+ threshold), lesson entry count (3+ threshold), decisions directory activity |

Run the check:

```bash
npx goat-flow audit . --harness
```

These aren't a proprietary model, they're a synthesis of consensus across the field. See [docs/audit-and-quality.md](docs/audit-and-quality.md) for the full framework and sources.

## Commands

The two commands you'll use 90% of the time:

```bash
npx goat-flow audit .                      # Am I set up?
npx goat-flow setup . --agent claude       # Set me up
```

Everything else:

```bash
npx goat-flow audit . --harness            # Add advisory harness-quality scoring
npx goat-flow audit . --format json        # JSON output for CI
npx goat-flow quality . --agent claude     # Generate agent quality-assessment prompt
npx goat-flow setup . --agent gemini       # Gemini CLI setup
npx goat-flow setup . --agent codex        # Codex setup
npx goat-flow status .                     # Show project state (bare/partial/v0.9/v1.0/v1.1)
npx goat-flow dashboard .                  # Visual dashboard with integrated terminal
```

See [docs/cli.md](docs/cli.md) for the full command reference.

## Multi-agent support

goat-flow v1.2.0 supports **Claude Code, Codex, Gemini CLI, and Copilot CLI**. All agents share the same execution loop, autonomy tiers, skills, and learning loop. Only the instruction filename, skills root, and hook/config surfaces differ.

Run `goat-flow manifest` to inspect the live agent matrix that drives CLI validation, installer paths, and dashboard labels.

*Implementation note: support metadata lives in `workflow/manifest.json`, resolved through `src/cli/agents/registry.ts`.*

## Troubleshooting

**Terminal not showing in dashboard?**
node-pty didn't compile. Run `npm rebuild node-pty`. If using pnpm: `pnpm approve-builds` (select node-pty).

**Audit fails on a fresh project?**
Expected. Run `npx goat-flow setup . --agent claude` and paste the output into your agent.

**Audit still fails after setup?**
Re-run `npx goat-flow audit . --verbose` to see which check failed. The `howToFix` hint on each failure points at the missing file or config key. If hooks show as uninstalled, check `.claude/hooks/` (or `.gemini/hooks/`, `.codex/hooks/`) exists and contains `deny-dangerous.sh`.

**Agent isn't following the execution loop?**
Restart the agent session after setup so it re-reads the instruction file (CLAUDE.md, GEMINI.md, AGENTS.md, or `.github/copilot-instructions.md`). Agents only pick up instruction-file changes on session start.

**Setup prompt looks wrong or incomplete?**
Re-run with `--verbose` for diagnostics, or regenerate from the dashboard Setup page which shows detected stack info alongside the prompt.

**Not sure which agent to pick?**
Pick the one you're already using. All supported agents share the same skills, execution loop, and learning loop. Only the instruction filename, skills root, and hook/config surfaces differ. See [Multi-agent support](#multi-agent-support) above.

## Documentation

| Document | What it covers |
|---|---|
| [CLI Reference](docs/cli.md) | All commands, flags, and output formats |
| [Dashboard](docs/dashboard.md) | Views, terminal, API endpoints |
| [Skills Reference](docs/skills.md) | All 7 skills: modes, phases, gates, outputs |
| [Audit & Quality](docs/audit-and-quality.md) | The two evaluation commands, 5 harness concerns, and when to use each |

## Author

Built by [Matthew Hansen](https://www.blundergoat.com/about).

## License

[MIT](LICENSE)
