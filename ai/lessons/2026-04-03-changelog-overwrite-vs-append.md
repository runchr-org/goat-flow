---
name: Changelog updates must be additive by section
created: 2026-04-03
type: pattern
---

**What happened:** The `v0.10.0` block in `CHANGELOG.md` was replaced during an edit instead of being extended, so prior release deltas were effectively lost before being re-added later.

**Evidence:** `CHANGELOG.md:5-14` after the overwrite step.

**Prevention:** When updating release notes, apply edits as additive patches and re-run `git diff CHANGELOG.md` to verify no existing top-level bullets were removed. For large release-note blocks, use a merge strategy: preserve current bullets, then append new bullets separately.

