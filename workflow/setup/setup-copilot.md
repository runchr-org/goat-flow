# Setup — GitHub Copilot

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

## Copilot specifics

- **Instruction file:** `.github/copilot-instructions.md`
- **Skills directory:** `.github/skills/`
- **No hooks system** — Copilot has no hook mechanism

---

## Phase 1 — Foundation

Read and implement [shared/phase-1.md](shared/phase-1.md) (Phases 1a through 1d).

The instruction file is `.github/copilot-instructions.md` instead of CLAUDE.md. Use `workflow/setup/shared/execution-loop.md` as the template. Keep under 120 lines.

After completing all shared phases:

### Copilot bridge files

For each file in `ai-docs/coding-standards/`, create a matching `.github/instructions/*.instructions.md`:

```yaml
---
applyTo: "src/frontend/**"
---
```
Then inline the content. Copilot needs inline content — it doesn't follow markdown links.

### Copilot CLI skills

If the project uses Copilot CLI, create skills under `.github/skills/`:
- Copy from `workflow/skills/goat-*.md` templates
- Format is identical to `.claude/skills/` SKILL.md files

### Git commit instructions

Create `.github/git-commit-instructions.md` if not exists.

---

## Human Checklist

- [ ] `.github/copilot-instructions.md` has execution loop, autonomy tiers, DoD, router table
- [ ] `ai-docs/` has footguns/, lessons/, coding-standards/
- [ ] `.github/instructions/` bridge files reference `ai-docs/coding-standards/` content
- [ ] `.goat-flow/config.yaml` exists with correct paths
- [ ] Project build/test/lint still passes
- [ ] Open Copilot Chat and verify it picks up the instructions
