---
name: Setup adds skills but never removes them
status: active
created: '2026-03-31'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** After upgrading goat-flow (e.g., 0.9.0 → 0.9.3), projects end up with 13 skill directories instead of 6. The scanner scores 100% because it only checks the 6 canonical skills — the 7 stale ones are invisible. The dispatcher routes to old skill names. The router table references skills that should have been merged as modes.

**Why it happens:** The setup prompt (AP15 fragment) says "update outdated skills" but never says "delete skills that no longer exist in the canonical set." The scanner has no check for non-canonical skill directories. The agent does exactly what it's told — updates 6 skills, leaves 7 untouched.

**Evidence:**
- `src/cli/prompt/fragments/anti-patterns.ts` → AP15 fragment only instructs "update," not "remove"
- devgoat-bash-scripts: 13 skills after upgrade (7 stale at v0.9.0)
- blundergoat-platform: 13 skills after upgrade (same pattern)

**Prevention:** Setup must explicitly list old goat-flow skill names to delete during upgrade: goat-investigate, goat-simplify, goat-refactor, goat-audit, goat-onboard, goat-reflect, goat-resume, goat-context. The scanner should warn about non-canonical goat-* directories.
