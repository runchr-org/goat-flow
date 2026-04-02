---
name: Dispatcher keeps getting excluded from patterns and glob matches
created: '2026-04-01'
type: pattern
---

**What happened:** Three separate incidents where the dispatcher was missed by glob/iteration patterns: (1) `scripts/preflight-checks.sh` used `find -name 'goat-*.md'` which skipped `goat.md`, (2) CI template `for skill in ...; do goat-$skill` couldn't represent the dispatcher, producing `goat-goat`, (3) v0.9.3 consolidation missed counting the dispatcher in multiple files. All stem from the same root: the dispatcher's name (`goat`) breaks the `goat-{suffix}` pattern that all other skills follow.

**Prevention:** Always use `goat*` (no dash) for glob patterns. Always iterate literal canonical names, never derive by prefixing. Test the dispatcher first in any skill enumeration — if your pattern works for `goat`, it works for `goat-debug` too, but not vice versa.
