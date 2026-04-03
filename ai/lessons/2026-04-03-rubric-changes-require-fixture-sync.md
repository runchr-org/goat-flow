---
name: Rubric changes require fixture expectation sync
created: 2026-04-03
---

Scanner and rubric changes can invalidate "known failing" fixture expectations even when the implementation is correct. If a check is renamed, tightened, or moves responsibility to a different detector, fixture assertions must be re-read against live scanner output before treating the failure as a code bug.

**Pattern:** For fixture-driven scanner tests, verify the current failing check IDs from the real scan result first, then update both the test assertions and fixture metadata together. Do not trust older expected IDs after rubric work.

**Trigger:** Human review reports a failing fixture after rubric or detector changes. Reproduce the failing scan, capture the actual check IDs, then sync the fixture corpus and test expectations in the same change.
