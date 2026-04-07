# Setup — Claude Code

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

## Claude Code specifics

- **Instruction file:** `CLAUDE.md`
- **Settings file:** `.claude/settings.json`
- **Skills directory:** `.claude/skills/`
- **Hooks directory:** `.claude/hooks/`

---

## Phase 1 — Foundation

Read and implement [shared/phase-1.md](shared/phase-1.md) (Phases 1a through 1d).

After completing all shared phases, implement these Claude Code add-ons:

### Hooks

Copy scripts from `workflow/hooks/` to `.claude/hooks/`:
- `deny-dangerous.sh` (required)
- `stop-lint.sh` (required)

Copy `workflow/hooks/agent-config/claude.json` as the base for `.claude/settings.json`. Customize deny patterns and hook paths for this project.

If hooks already exist in `.claude/settings.json`, migrate inline commands to external scripts under `.claude/hooks/` before adding new hooks.

### Claude-specific: conditional rules

For large codebases, add `<important if="...">` tags to CLAUDE.md to scope rules to relevant contexts:
```
<important if="editing PHP files">
PHPStan level 10 must pass. Run: vendor/bin/phpstan analyse
</important>
```
Only Claude Code supports this syntax. Do not add to AGENTS.md or GEMINI.md.

### Verification

- `.claude/settings.json` is valid JSON
- `bash -n` passes on each hook script
- deny-dangerous.sh blocks: rm -rf, git push main, --force, chmod 777
- stop-lint.sh exits 0 even when errors found

---

## Human Checklist

- [ ] Instruction file has 6-step loop, autonomy tiers, DoD, router table
- [ ] ACT has state declaration AND mode-transition rule
- [ ] LOG has mechanical trigger + human correction trigger
- [ ] All 6 goat-flow skills in `.claude/skills/` with version tags
- [ ] Hooks wired and deny-dangerous blocks expected commands
- [ ] Router table references all resolve to real files
- [ ] `.goat-flow/` has footguns/, lessons/, coding-standards/
- [ ] `.goat-flow/config.yaml` exists with correct paths
- [ ] `goat-flow scan . --agent claude` passes at 100%
- [ ] Project build/test/lint still passes
