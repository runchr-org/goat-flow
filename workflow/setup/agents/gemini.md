# Agent Config - Gemini CLI

> Canonical machine-readable source for these paths: `workflow/manifest.json` via `src/cli/agents/registry.ts`. If this doc drifts, the manifest-backed registry wins.

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `GEMINI.md` |
| Settings | `.gemini/settings.json` |
| Skills directory | `.agents/skills/` |
| Hooks directory | `.gemini/hooks/` |
| Hook events | `BeforeTool`, `AfterTool`, `AfterAgent`, `SessionEnd` |

## Owns

GEMINI.md, `.gemini/`, and shared `.goat-flow/`.

`.agents/skills/` is a **shared surface** - both Codex and Gemini use it as their skills directory. Either agent's setup can create/update skills here.

## Hands off

CLAUDE.md, AGENTS.md, `.claude/`, `.codex/`.

## Agent-specific setup

### Hooks

After completing step 03 (skills):
- Copy scripts from `workflow/hooks/` to `.gemini/hooks/`: `deny-dangerous.sh` (required)
- Copy `workflow/hooks/agent-config/gemini.json` as base for `.gemini/settings.json`
- Create `.geminiignore` with secret patterns: `.env*`, `**/secrets/`, `**/*.pem`, `**/*.key`

### Verification

- `.gemini/settings.json` is valid JSON
- `bash -n` passes on each hook script

---

Begin setup: proceed to `01-system-overview.md`
