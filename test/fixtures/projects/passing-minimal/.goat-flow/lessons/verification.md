---
category: verification
---

## Lesson: Always re-run scanner after fixture changes
**Created:** 2026-04-01
**What happened:** Updated fixture but did not re-run scanner, test expectations drifted.
**Evidence:** `src/index.ts:1` - hook output changed after fixture update.
**Prevention:** Re-run `npx tsx --test` after any fixture modification.
