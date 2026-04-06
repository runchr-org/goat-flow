# Coding Standards Setup

Instructions for creating project coding standards in `ai-docs/coding-standards/`.

---

## Step 1 — Discover existing standards

Before creating anything, scan the project for existing coding standards:

- `.github/instructions/*.md` or `.github/instructions/*.instructions.md`
- `ai/instructions/*.md`
- `docs/` (conventions, code-review, coding-standards files)
- Inline in CLAUDE.md, AGENTS.md, or GEMINI.md (domain knowledge sections)
- Any project-specific README files with coding conventions

List what you find. These are the project's canonical standards — do NOT recreate or duplicate them.

## Step 2 — Reference existing files

Create `ai-docs/README.md` as a routing map. For each existing standards file found in Step 1, add a reference:

| Need | Where to look |
|------|--------------|
| PHP conventions | `.github/instructions/php.instructions.md` |
| Code review | `.github/instructions/code-review.instructions.md` |
| [etc. — list what exists] |

Do NOT copy content from existing files into `ai-docs/coding-standards/`. Reference them.

## Step 3 — Supplement gaps

Check which areas the project does NOT already cover. Use templates from `workflow/coding-standards/` to fill gaps only:

- `conventions.md` — project-wide conventions (build/test/lint commands, naming, structure). Create if no equivalent exists.
- `code-review.md` — review standards. Create if no code-review instructions exist.
- `git-commit.md` — commit format. Create if no git-commit instructions exist.
- `backend.md` / `frontend.md` — stack-specific standards. Use the relevant template from `workflow/coding-standards/backend/` or `workflow/coding-standards/frontend/`. Create only if the project has no equivalent.
- `testing.md` — testing standards following DDT methodology. Create if no testing conventions exist.

Only create files for standards the project doesn't already have.

## Step 4 — Verify

- Every path referenced in `ai-docs/README.md` actually exists
- Every command listed in conventions.md actually runs
- No aspirational content — only document current state
- No duplication between `ai-docs/coding-standards/` and existing `.github/instructions/` or `docs/` files

## What NOT to do

- Do NOT edit or delete existing project files
- Do NOT migrate `.github/instructions/` content into `ai-docs/coding-standards/`
- Do NOT create `ai-docs/coding-standards/` files that overlap with existing instruction files
- If the project already has comprehensive standards, this step may create nothing beyond `ai-docs/README.md`
