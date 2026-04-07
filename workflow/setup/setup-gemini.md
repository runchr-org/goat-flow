# Setup — Gemini CLI

**Before you start:** Read [shared/system-overview.md](shared/system-overview.md) to understand the design intent behind goat-flow.

## Step 0 — Check project state

Before doing anything else, check if this project already has goat-flow:
1. Does `.goat-flow/config.yaml` exist? Read it.
2. If the version matches the current goat-flow release → **STOP.** This project is current. Run `goat-flow scan .` and fix any failing checks. Do not run setup.
3. If version exists but is older → this is an upgrade, not a fresh setup. Read the appropriate upgrade guide:
   - Old skill names (goat-audit, goat-investigate, etc.) → `workflow/setup/upgrade-0.9.x.md`
   - Version < current → `workflow/setup/upgrade-1.0.0.md`
4. If no config exists → continue with setup below.

---

**Scope:** Only touch `.gemini/`, `.agents/skills/`, `GEMINI.md`, and shared `.goat-flow/`. Do NOT modify `.claude/` or other agent files.

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
- [ ] `.goat-flow/` has footguns/, lessons/, coding-standards/
- [ ] `.goat-flow/config.yaml` exists with correct paths
- [ ] `goat-flow scan . --agent gemini` passes at 100%
- [ ] Project build/test/lint still passes
