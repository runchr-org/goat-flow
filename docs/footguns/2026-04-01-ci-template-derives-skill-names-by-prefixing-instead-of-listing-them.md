---
name: CI template derives skill names by prefixing instead of listing them
status: active
created: '2026-04-01'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Consumer project CI workflow checks for `goat-investigate`, `goat-refactor`, `goat-simplify` (all stale) and misses the `goat` dispatcher entirely. When an agent adapts the pattern to include the dispatcher, it prefixes `goat-` to the name `goat`, producing `goat-goat`. The CI check permanently fails for the dispatcher.

**Why it happens:** `src/cli/prompt/fragments/full.ts` CI template had `for skill in security debug investigate review plan test refactor simplify; do` and constructed `goat-$skill`. This design assumes all skill names follow the `goat-{suffix}` pattern, but the dispatcher is just `goat`. The suffix list was also never updated after the 9→6 consolidation — 3 stale suffixes remained.

**Evidence:**
- `src/cli/prompt/fragments/full.ts` → CI template skill loop with stale suffixes and derivation pattern
- halaxy-agents-lab `.github/workflows/context-validation.yml` → `CANONICAL_SKILLS="goat-debug goat-review goat-plan goat-security goat-test goat-goat"` (permanently broken)

**Prevention:** Always iterate canonical skill names directly (`goat goat-debug goat-plan goat-review goat-security goat-test`), never derive them by prefixing. Import from `SKILL_NAMES` in code, or list literal names in templates. The dispatcher name breaks the `goat-{suffix}` pattern.
