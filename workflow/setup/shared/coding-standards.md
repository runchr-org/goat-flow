# Coding Standards Setup

Instructions for creating project coding standards in `ai-docs/coding-standards/`.

---

## Step 1 — Discover existing standards

Scan the project for existing coding standards:

- `.github/instructions/*.md` or `.github/instructions/*.instructions.md`
- `ai/instructions/*.md`
- `docs/` (conventions, code-review, coding-standards files)
- Inline in CLAUDE.md, AGENTS.md, or GEMINI.md (domain knowledge sections)

List what you find.

## Step 2 — Always create ai-docs/coding-standards/conventions.md

This file ALWAYS gets created. It is either:

**A) A pointer file** (if the project has existing standards):
```markdown
# Project Conventions

This project's coding standards live in `.github/instructions/`:

| Standard | File |
|----------|------|
| Conventions | `.github/instructions/conventions.instructions.md` |
| PHP | `.github/instructions/php.instructions.md` |
| Code review | `.github/instructions/code-review.instructions.md` |
| [list all that exist] |

Build: [command]
Test: [command]
Lint: [command]
```

**B) A full conventions file** (if no existing standards):
Use `workflow/coding-standards/conventions.md` template. Include: build/test/lint commands, naming conventions, file structure, stack-specific patterns.

Either way, the scanner sees `conventions.md` exists with content. No contradiction.

## Step 3 — Create ai-docs/README.md routing map

Always create. Points to `ai-docs/coding-standards/` AND any existing instruction locations:

```markdown
# AI Docs Router

| Need | Where to look |
|------|--------------|
| Coding conventions | `ai-docs/coding-standards/conventions.md` |
| Architecture | `ai-docs/architecture.md` |
| Footguns | `ai-docs/footguns/` |
| Lessons | `ai-docs/lessons/` |
| Decisions | `ai-docs/decisions/` |
```

If `.github/instructions/` exists, add those entries too.

## Step 4 — Supplement gaps only

Check which areas the project does NOT already cover. Create additional `ai-docs/coding-standards/` files ONLY for gaps:

- `code-review.md` — if no code-review instructions exist anywhere
- `git-commit.md` — if no git-commit instructions exist anywhere
- `backend.md` / `frontend.md` — if no stack-specific standards exist. Use templates from `workflow/coding-standards/backend/` or `workflow/coding-standards/frontend/`
- `testing.md` — testing standards following DDT methodology, if none exist

Do NOT create files for areas already covered by `.github/instructions/` or other project files.

## Step 5 — Verify

- `ai-docs/coding-standards/conventions.md` exists (always)
- `ai-docs/README.md` exists (always)
- Every path referenced actually exists
- Every command listed actually runs
- No content duplicated from `.github/instructions/` — only pointer references

## What NOT to do

- Do NOT edit or delete existing project files
- Do NOT copy `.github/instructions/` content into `ai-docs/coding-standards/`
- DO always create `conventions.md` — as a pointer if existing standards exist, as a full file if not
