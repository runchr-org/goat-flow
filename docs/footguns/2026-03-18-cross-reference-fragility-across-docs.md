---
name: Cross-reference fragility across docs
status: active
created: 2026-03-18
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** A renamed or moved file breaks links in multiple documents. Users following getting-started.md hit dead references.

**Why it happens:** Documentation files reference each other by relative path. The project has 60+ markdown files with dense cross-referencing. Renaming one file can break references in 5-10 others.

**Evidence:**
- `docs/getting-started.md` → referenced stale paths to old workflow directory
- `docs/system/five-layers.md` → referenced `FIVE_LAYER_SYSTEM.md` (old filename)

**Prevention:** After any file rename or move, grep the entire repo for the old path. Use `grep -r "old-filename" --include="*.md"` before declaring done. This is DoD gate #6.
