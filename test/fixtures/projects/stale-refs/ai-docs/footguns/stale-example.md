---
name: Stale reference footgun
status: active
created: 2026-04-03
evidence_type: ACTUAL_MEASURED
---

**Evidence:**
- `src/deleted-file.ts:42` - this file does not exist in the fixture
- `lib/nonexistent.py:100` - stale reference to missing file
