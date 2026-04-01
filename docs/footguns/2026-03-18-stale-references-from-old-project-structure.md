---
name: Stale references from old project structure
status: active
created: 2026-03-18
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Settings, paths, or documentation reference `ai-workflow-framework` (the old project name) instead of `goat-flow`.

**Why it happens:** The project was renamed from `ai-workflow-framework` to `goat-flow`. Not all references were updated.

**Evidence:**
- `.claude/settings.local.json` → contained absolute paths referencing the old project name (file is gitignored, not tracked)

**Prevention:** After any project-level rename, run `grep -r "old-name" --include="*.md" --include="*.json"` across the entire repo.
