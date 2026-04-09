# Step 06 — Setup Coding Guidelines

Create project coding standards in `.goat-flow/coding-standards/`.

## Step 1 — Discover existing standards

Scan the project for existing coding standards:
- `.github/instructions/*.md` or `.github/instructions/*.instructions.md`
- `ai/instructions/*.md`
- `docs/` (conventions, coding-standards files)
- Inline in instruction file (domain knowledge sections)

List what you find.

## Step 2 — Always create conventions.md

`.goat-flow/coding-standards/conventions.md` is ALWAYS created. It is either:

**A) A pointer file** (if the project has existing standards):
```markdown
# Project Conventions

This project's coding standards live in `.github/instructions/`:

| Standard | File |
|----------|------|
| [list all that exist] |

Build: [command]
Test: [command]
Lint: [command]
```

**B) A full conventions file** (if no existing standards):
Use `workflow/coding-standards/conventions.md` template. Include: build/test/lint commands, naming conventions, file structure, stack-specific patterns.

## Step 3 — Supplement gaps only

Create additional `.goat-flow/coding-standards/` files ONLY for areas the project does NOT already cover:
- `backend.md` / `frontend.md` — if no stack-specific standards exist. Use templates from `workflow/coding-standards/backend/` or `workflow/coding-standards/frontend/`
- `testing.md` — testing standards following DDT methodology, if none exist

Do NOT create files for areas already covered by `.github/instructions/` or other project files. Do NOT duplicate existing content.

---

**Verification gate:**
- [ ] `.goat-flow/coding-standards/conventions.md` exists with real content
- [ ] Every file path referenced actually exists
- [ ] Every command listed actually runs
- [ ] No content duplicated from `.github/instructions/`

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 06-setup-coding-guidelines
- **What was done:** (files created, existing standards found)
- **Self-critique:** (honest assessment)

NEXT: proceed to `07-setup-architecture.md`
