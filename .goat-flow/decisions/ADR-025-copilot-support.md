# ADR-025: Copilot Support in Dashboard

**Date:** 2026-04-05
**Status:** Accepted

## Context

GOAT Flow originally supported three AI coding agents: Claude Code, Codex, and Gemini CLI. GitHub Copilot CLI became available and users have it installed alongside the other three. The dashboard's agent detection, terminal, and scanner were hardcoded to three agents.

## Decision

Add Copilot as a fourth supported agent in the dashboard, with partial support:

**Supported:**
- Agent detection via `which copilot` in `/api/agents/installed`
- Terminal sessions via `copilot` binary in RUNNER_BINARIES
- Display in home page agent cards (dimmed when not scanned)
- Display in home page agents table with Terminal button
- Header agent selector includes copilot

**Not supported (yet):**
- Scanner doesn't scan copilot (no `.goat-flow/config.yaml` agents entry, no rubric for copilot-specific instruction files)
- Setup wizard doesn't generate copilot setup prompts (`workflow/setup/agents/copilot.md` exists but VALID_AGENTS excludes copilot)
- VALID_AGENTS for `/api/setup` still excludes copilot

## Consequences

- Copilot shows in the dashboard but with a dimmed "not scanned" state in scanner cards
- Users can open a Copilot terminal session from the home page
- To add full scanner support, create `workflow/setup/agents/copilot.md` and add copilot-specific rubric checks
- The copilot instruction file is `.github/copilot-instructions.md` (detected by `detectAgents()` in dashboard.ts)
