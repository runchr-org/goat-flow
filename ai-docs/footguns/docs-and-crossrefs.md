---
category: docs-and-crossrefs
---

## Footgun: Concept duplication across core docs

**Status:** active | **Created:** 2026-03-18 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A user reads conflicting descriptions of the same concept in different files. An agent follows a rule from one file that contradicts another.

**Why it happens:** The execution loop, autonomy tiers, anti-pattern table, and other core concepts are described in `docs/system-spec.md`, `docs/five-layers.md`, `docs/getting-started.md`, and `docs/design-rationale.md`. Updating one without updating the others creates drift.

**Evidence:**
- `docs/system-spec.md` → execution loop definition
- `docs/system-spec.md` → execution loop definition (detailed version)
- `docs/getting-started.md` → execution loop summary
- `docs/design-rationale.md` → execution loop rationale with repeated content

**Prevention:** When editing a core concept, grep for the concept name across all docs and update every occurrence. `docs/system-spec.md` is the canonical source of truth.

---

## Footgun: Cross-reference fragility across docs

**Status:** active | **Created:** 2026-03-18 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A renamed or moved file breaks links in multiple documents. Users following getting-started.md hit dead references.

**Why it happens:** Documentation files reference each other by relative path. The project has 60+ markdown files with dense cross-referencing. Renaming one file can break references in 5-10 others.

**Evidence:**
- `docs/getting-started.md` → referenced stale paths to old workflow directory
- `docs/five-layers.md` → referenced `FIVE_LAYER_SYSTEM.md` (old filename)

**Prevention:** After any file rename or move, grep the entire repo for the old path. Use `grep -r "old-filename" --include="*.md"` before declaring done. This is DoD gate #6.

---

## Footgun: Stale references from old project structure

**Status:** active | **Created:** 2026-03-18 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Settings, paths, or documentation reference `ai-workflow-framework` (the old project name) instead of `goat-flow`.

**Why it happens:** The project was renamed from `ai-workflow-framework` to `goat-flow`. Not all references were updated.

**Evidence:**
- `.claude/settings.local.json` → contained absolute paths referencing the old project name (file is gitignored, not tracked)

**Prevention:** After any project-level rename, run `grep -r "old-name" --include="*.md" --include="*.json"` across the entire repo.

---

## Footgun: Line target inconsistency for project shapes (RESOLVED)

**Status:** resolved | **Created:** 2026-03-18 | **Evidence:** ACTUAL_MEASURED

**Prevention:** Line target is 120 for all shapes, stated in `docs/system-spec.md`. If this number appears differently in any other file, the spec is canonical.
