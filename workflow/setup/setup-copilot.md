# Setup — GitHub Copilot

**Before you start:** Read [shared/system-overview.md](shared/system-overview.md) to understand the design intent behind goat-flow.

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
