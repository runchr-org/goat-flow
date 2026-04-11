# Agent Config - GitHub Copilot

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `.github/copilot-instructions.md` |
| Skills directory | `.github/skills/` |
| Hooks | None - Copilot has no hook mechanism |

## Owns

`.github/copilot-instructions.md`, `.github/skills/`, and shared `.goat-flow/`.

## Hands off

CLAUDE.md, AGENTS.md, GEMINI.md, `.claude/`, `.agents/`, `.gemini/`, `.codex/`.

## Agent-specific setup

### Bridge files

Bridge files are no longer part of base setup. If the project has local instruction files under `.github/instructions/`, Copilot can use them directly. Copilot needs inline content - it doesn't follow markdown links.

### Copilot CLI skills

If the project uses Copilot CLI, create skills under `.github/skills/`:
- Copy from `workflow/skills/goat-*.md` templates
- Format is identical to `.claude/skills/` SKILL.md files

### Verification

- `.github/copilot-instructions.md` exists with execution loop, autonomy tiers, DoD, router table
- If `.github/instructions/` exists, Copilot picks up the content
- Open Copilot Chat and verify it picks up the instructions

---

Begin setup: proceed to `01-system-overview.md`
