---
name: Removing a concept requires full-repo grep, not just code grep
created: '2026-03-22'
---

**What happened:** Shape removed from scanner code (ADR-002) but `[APP / LIBRARY / SCRIPT COLLECTION]` survived in 9 setup/workflow/doc files. Confusion-log removed (ADR-003) but agent recreated it because the constraint wasn't in the prompt.
**Root cause:** Grepped `src/` and `test/` but not `setup/`, `workflow/`, `docs/`.
**Fix:** Preflight now enforces removed patterns across all live directories. ADR removals must grep the entire repo.
