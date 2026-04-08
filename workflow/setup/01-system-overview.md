# Step 01 — System Overview

Read this first. This is what you're installing and why.

## Before you begin

1. Read your agent config file (`agents/claude.md`, `agents/codex.md`, etc.) for paths and agent-specific setup.
2. This setup is for **ONE agent**. Only modify files belonging to the agent specified in the agent config file. Do not touch other agents' instruction files, skills, hooks, or settings.

## State check

If `.goat-flow/config.yaml` exists and its version matches the current goat-flow release, **STOP**. The project is already configured. Run `goat-flow scan . --agent {agent}` instead and fix any failing checks.

If the version is older, use the upgrade path instead:
- Old skill names (goat-audit, goat-investigate, etc.) → `workflow/setup/upgrade-0.9.x.md`
- Version < current → `workflow/setup/upgrade-1.0.0.md`

## What goat-flow is

A framework that gives AI coding agents extended memory across sessions. Three layers:

1. **Instruction file** (CLAUDE.md / AGENTS.md / GEMINI.md) — The execution loop. Loaded every turn. Hard budget: 150 lines (target 120). Frontier models degrade uniformly when over-instructed.
2. **Skills** (5 functional + 1 dispatcher) — Plan, test, review, secure, debug. Loaded on demand via slash commands.
3. **.goat-flow/ learning loop** — Footguns, lessons, decisions, coding-standards. AI extended memory persisting across sessions.

Every project gets the full system. The components are lightweight infrastructure, not ceremony proportional to codebase size.

## Development Driven Testing (DDT)

goat-flow follows DDT, not TDD. Loop: code → manually verify → preflight checks → decide if automated test is needed. Tests focus on: complex business logic, integration boundaries, regression prevention.

## File ownership

Setup only creates/edits files in `.goat-flow/` and the agent's own directories (see agent config file for "Owns" list). Everything else in the project is hands-off.

## Route to next step

Check if the agent's instruction file already exists:

- **No instruction file exists** → NEXT: proceed to `02-create-instruction-file.md`
- **Instruction file exists** → NEXT: proceed to `03-reorganise-instruction-file.md`

---

**Verification gate:**
- [ ] Agent config file read (paths and ownership understood)
- [ ] State check performed (not already current, not an upgrade)
- [ ] Route determined (02 or 03)

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 01-system-overview
- **What was done:** (state check result, route chosen)
- **Self-critique:** (honest assessment)
