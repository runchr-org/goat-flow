# Setup — Gemini CLI

**Before you start:** Read [shared/system-overview.md](shared/system-overview.md) to understand the design intent behind goat-flow.

**Scope:** Only touch `.gemini/`, `.agents/skills/`, `GEMINI.md`, and shared `ai-docs/` / `.goat-flow/`. Do NOT modify `.claude/` or other agent files.

## Gemini CLI specifics

- **Instruction file:** `GEMINI.md`
- **Settings file:** `.gemini/settings.json`
- **Skills directory:** `.agents/skills/`
- **Hooks directory:** `.gemini/hooks/`
- **Hook events:** `BeforeTool`, `AfterTool`, `AfterAgent`, `SessionEnd`

---

## Phase 1 — Foundation

Read and implement [shared/phase-1.md](shared/phase-1.md) (Phases 1a through 1d).

After completing all shared phases:

### Hooks

Copy scripts from `workflow/hooks/` to `.gemini/hooks/`.
Copy `workflow/hooks/agent-config/gemini.json` as base for `.gemini/settings.json`.
Create `.geminiignore` with secret patterns: `.env*`, `**/secrets/`, `**/*.pem`, `**/*.key`.

### Verification

- `.gemini/settings.json` is valid JSON
- `bash -n` passes on each hook script
- stop-lint.sh exits 0 even when errors found

---

## Human Checklist

- [ ] GEMINI.md has 6-step loop, autonomy tiers, DoD, router table
- [ ] All 6 goat-flow skills in `.agents/skills/` with version tags
- [ ] Hooks wired with Gemini event names (BeforeTool, AfterAgent, AfterTool)
- [ ] Router table references all resolve to real files
- [ ] `ai-docs/` has footguns/, lessons/, coding-standards/
- [ ] `.goat-flow/config.yaml` exists with correct paths
- [ ] `goat-flow scan . --agent gemini` passes at 100%
- [ ] Project build/test/lint still passes
