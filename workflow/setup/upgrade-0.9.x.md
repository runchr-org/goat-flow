# Upgrade v0.9.x → Current

Read `shared/system-overview.md` first if you haven't already.

These projects have 10 old skills and learning loop content in `docs/` not `.goat-flow/`.

---

## Step 1 — Confirm v0.9 state

You're in the right place if the project has:
- Old skill names: goat-audit, goat-investigate, goat-onboard, goat-reflect, goat-resume, goat-context, goat-simplify, goat-refactor
- No `.goat-flow/config.yaml`
- Learning loop in `docs/footguns.md` and `docs/lessons.md` (flat files, not directories)

If the project has `.goat-flow/config.yaml` with a version, use `upgrade-1.0.0.md` instead.
If the project has no goat-flow at all, use the fresh setup (`setup-claude.md` etc.).

---

## Step 2 — Skills

- Delete old skills from ALL agent skill directories (`.claude/skills/`, `.agents/skills/`, `.gemini/skills/`):
  goat-audit, goat-investigate, goat-onboard, goat-reflect, goat-resume, goat-context, goat-simplify, goat-refactor
- Also delete generic pre-goat skills if present: `audit/`, `review/`, `preflight/`
- Install current 5 + dispatcher from `workflow/skills/goat-*.md` templates
- Each skill gets the 7-line inline fallback referencing `.goat-flow/skill-conventions.md`

---

## Step 3 — Migrate learning loop content

These files contain real project memory. Migrate the content, don't discard it.

- If `docs/footguns.md` exists: migrate entries into `.goat-flow/footguns/` category bucket files. After migration is verified, delete `docs/footguns.md`.
- If `docs/lessons.md` exists: migrate entries into `.goat-flow/lessons/` category bucket files. After migration is verified, delete `docs/lessons.md`.
- If `agent-evals/` exists: delete it (evals system removed in v1.1.0).
- If `docs/architecture.md` exists: move to `.goat-flow/architecture.md`. Delete the source.
- If `docs/decisions/` exists: move to `.goat-flow/decisions/`. Delete the source.
- If `docs/guidelines-ownership-split.md` exists: delete it (superseded by ADR-031 file ownership rules).

**Parallel surfaces are an anti-pattern.** Do not leave old `docs/` files alongside new `.goat-flow/` equivalents. The scanner penalizes this (AP22).

---

## Step 4 — Delete legacy artifacts

- Delete `tasks/handoff-template.md`, `tasks/handoff.md`, `tasks/todo.md` if they exist. If they have content, preserve in `.goat-flow/logs/sessions/` as a migration artifact first.
- Delete `docs/system-spec.md`, `docs/five-layers.md`, `docs/design-rationale.md` if they exist (retired in v1.1.0).
- Do NOT create handoff-template.md or todo.md (removed in v1.1.0).

---

## Step 5 — Create goat-flow infrastructure

- Create `.goat-flow/config.yaml` with current version
- Copy `workflow/skills/reference/shared-preamble.md` → `.goat-flow/skill-conventions.md`
- Create `.goat-flow/glossary.md`
- Install hooks from `workflow/hooks/`
- If `.github/instructions/` exists: create `.goat-flow/coding-standards/conventions.md` as a pointer file referencing those files. Do NOT duplicate their content.

---

## Step 6 — Instruction file

Follow the agent-specific setup file (e.g., `setup-claude.md`) for:
- Creating or rewriting the instruction file (CLAUDE.md etc.)
- Installing hooks and settings
- Human checklist

---

## What to never touch during upgrade

- Existing project source code, configs, scripts
- Other agents' files (single-agent scoping)
- `.github/instructions/` content — reference, don't duplicate
- Existing hooks with project-specific deny rules — merge, don't overwrite

---

## Post-upgrade verification

1. Run `scripts/context-validate.sh` if it exists
2. Run `goat-flow scan . --agent {agent}` — target 100%
3. Verify project build/test/lint still passes
4. Review git diff — every change should be intentional
5. Confirm no parallel surfaces: `docs/footguns.md` + `.goat-flow/footguns/` should not both exist
