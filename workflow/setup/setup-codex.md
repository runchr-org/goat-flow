# Setup — Codex

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

## Codex specifics

- **Instruction file:** `AGENTS.md`
- **Config file:** `.codex/config.toml`
- **Skills directory:** `.agents/skills/`
- **Hooks:** `.codex/hooks/` + `scripts/`
- **Execpolicy:** `.codex/rules/deny-dangerous.star`

### Codex mechanics

- AGENTS.md is the root instruction file (not CLAUDE.md)
- Hook events: `SessionStart`, `UserPromptSubmit`, `Stop`, `AfterToolUse`, `AfterAgent`
- No PreToolUse — use execpolicy rules for command blocking
- `apply_patch` for edits (not Edit/Write tool)
- No `/compact`, no `/clear` — context is per-task

### Dual-agent repos

If `.claude/` and `CLAUDE.md` exist, leave them untouched. Create Codex equivalents alongside. AGENTS.md MUST reference CLAUDE.md in its router table.

---

## Phase 1 — Foundation

Read and implement [shared/phase-1.md](shared/phase-1.md) (Phases 1a through 1d).

**Codex adaptation notes:**
- Ask First MUST use the explicit 5-item micro-checklist (Codex has weaker guardrails than Claude)
- LOG MUST include dual-agent coordination if Claude files exist

After completing all shared phases, implement these Codex add-ons:

### Hooks + Execpolicy

Copy hook scripts from `workflow/hooks/` to `.codex/hooks/` and `scripts/`.
Apply `workflow/hooks/agent-config/codex.toml` as the base for `.codex/config.toml`.

Create `.codex/rules/deny-dangerous.star` (Starlark execpolicy):
- `forbidden`: rm -rf (unscoped), git push main/master, force push, chmod 777, pipe-to-shell, .env mods, --no-verify
- `prompt`: git commit, git push (non-main), sudo, scoped rm -rf
- `allow`: everything else

Note: Codex has NO PreToolUse equivalent. Execpolicy blocks shell commands only.

### Verification

- `.codex/config.toml` exists with hook registrations
- `.codex/rules/deny-dangerous.star` exists with forbidden patterns
- Hook scripts are executable

---

## What Codex Intentionally Skips

| Claude Feature | Why Codex Skips It |
|---------------|-------------------|
| PreToolUse hooks | Execpolicy for shell only. No pre-gate for file writes. |
| Permission profiles | No native support. Document roles in AGENTS.md. |
| Local CLAUDE.md files | Codex doesn't auto-load per-directory. Use `.github/instructions/`. |
| Permissions deny list | Uses Starlark execpolicy instead. |

---

## Human Checklist

- [ ] AGENTS.md has 6-step loop, autonomy tiers, DoD, router table
- [ ] ACT has state declaration AND mode-transition rule
- [ ] LOG has mechanical trigger + human correction trigger
- [ ] All 6 goat-flow skills in `.agents/skills/` with version tags
- [ ] `.codex/rules/deny-dangerous.star` exists with forbidden patterns
- [ ] Router table references all resolve to real files
- [ ] If dual-agent: no Claude Code files were modified
- [ ] `ai-docs/` has footguns/, lessons/, coding-standards/
- [ ] `.goat-flow/config.yaml` exists with correct paths
- [ ] `goat-flow scan . --agent codex` passes at 100%
- [ ] Project build/test/lint still passes
