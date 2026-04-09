---
category: bait
---

## Footgun: Scanner-bait footgun with stale evidence
**Status:** active
**Created:** 2026-04-03
**Evidence type:** ACTUAL_MEASURED
**Symptoms:** Footgun was created to inflate the score.
**Why it happens:** Gaming the scanner.
**Evidence:**
- `src/nonexistent-bait.ts:99` - stale reference that should fail validation.
**Prevention:** Use real file:line references.
