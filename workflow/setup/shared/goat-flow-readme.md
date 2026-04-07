# .goat-flow/

Local goat-flow runtime directory. This directory is project-specific and not shared across agents.

## Directories

| Directory | Purpose |
|-----------|---------|
| `tasks/` | Milestone files, plans, and working notes for multi-turn tasks. Content accumulates through real work. |
| `logs/sessions/` | Session summaries written on `/compact`, at session end, or after significant work |

## Files

| File | Purpose |
|------|---------|
| `config.yaml` | Project configuration — version, agents, paths, scanner thresholds |
| `config.local.yaml` | Local overrides (userRole, personal preferences). Gitignored. |
| `skill-conventions.md` | Shared conventions loaded by all 6 goat-flow skills at invocation |
| `README.md` | This file |

## Learning Loop

- `.goat-flow/footguns/` stores architectural traps with `file:line` evidence
- `.goat-flow/lessons/` stores behavioural lessons from real incidents
- Both use category bucket files (e.g. `hooks.md`, `verification.md`)
