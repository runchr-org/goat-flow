# Agent Config — GitHub Copilot

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `.github/copilot-instructions.md` |
| Skills directory | `.github/skills/` |
| Hooks | None — Copilot has no hook mechanism |

## Owns

`.github/copilot-instructions.md`, `.github/skills/`, and shared `.goat-flow/`.

## Hands off

CLAUDE.md, AGENTS.md, GEMINI.md, `.claude/`, `.agents/`, `.gemini/`, `.codex/`.

## Agent-specific setup

### Bridge files

After completing step 06 (coding guidelines), create bridge files for Copilot. For each file in `.goat-flow/coding-standards/`, create a matching `.github/instructions/*.instructions.md`:

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

### Verification

- `.github/copilot-instructions.md` exists with execution loop, autonomy tiers, DoD, router table
- `.github/instructions/` bridge files reference `.goat-flow/coding-standards/` content
- Open Copilot Chat and verify it picks up the instructions

---

Begin setup: proceed to `01-system-overview.md`
