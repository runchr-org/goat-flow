---
category: design-decisions
---

## Lesson: Doer-verifier is theater in single-agent context

**Created:** 2026-04-03

When the same agent writes code and then "independently verifies" it, the verification is fake. The agent has full context of its own reasoning and will rationalize its own decisions. 6/6 reviewers independently confirmed this.

Real verification requires a context boundary: a different agent, a fresh invocation, or a human. The natural doer-verifier split in goat-flow is between skill invocations (implement in /goat-debug, verify in /goat-review), not within one skill.

**Trigger:** Any proposal to add self-verification phases within a single skill invocation. The value is in the skill handoff, not in asking the same agent to re-read its own diff.

**Decision:** ADR-019. Don't add goat-doer/goat-verifier. Use existing skills (/goat-review, /goat-test) as the verification layer.

---

## Lesson: Agent critiques are input, not a spec - validate before implementing

**Created:** 2026-04-03

5 Codex critiques across 5 projects generated 589 pending tasks. That's a rewrite, not an improvement. The critiques are optimized for "what annoyed me in one session" not "what improves outcomes over time."

Risks of blindly implementing critique feedback:
- Removing safety nets (BLOCKING GATEs) that feel like ceremony but prevent mistakes for less experienced users
- Over-correcting on signal from one context (Codex doing setup, single-session perspective)
- No outcome data - nobody measured whether projects WITH the gates produce better code than projects WITHOUT
- 589 tasks shipped at once guarantees breaking things we don't understand yet

**Pattern:** Ship UI/dashboard changes (low risk) separately from framework/skill changes (high risk). Validate each framework change on one real project before applying to templates. Keep a "before" snapshot and diff after each milestone.

**Trigger:** Any batch of changes driven by external critique. Test one change at a time against real outcomes, not against the critic's score.

---

## Pattern: Dispatcher is a first-class skill, not a helper

**Created:** 2026-04-08

**Status:** RESOLVED in v0.9.3. Dispatcher added to SKILL_NAMES. All counts updated to 6 (5 + dispatcher).

The goat dispatcher was treated as secondary to the "real" skills - excluded from CANONICAL_SKILLS and consistently under-counted. This led to inconsistencies across 15+ files.

**Prevention:** Count the dispatcher in every enumeration of canonical skills.

---

## Pattern: Dispatcher keeps getting excluded from patterns and glob matches

**Created:** 2026-04-01

**What happened:** Three separate incidents where the dispatcher was missed by glob/iteration patterns: (1) `scripts/preflight-checks.sh` used `find -name 'goat-*.md'` which skipped `goat.md`, (2) CI template `for skill in ...; do goat-$skill` couldn't represent the dispatcher, producing `goat-goat`, (3) v0.9.3 consolidation missed counting the dispatcher in multiple files. All stem from the same root: the dispatcher's name (`goat`) breaks the `goat-{suffix}` pattern that all other skills follow.

**Prevention:** Always use `goat*` (no dash) for glob patterns. Always iterate literal canonical names, never derive by prefixing. Test the dispatcher first in any skill enumeration - if your pattern works for `goat`, it works for `goat-debug` too, but not vice versa.

---

## Pattern: Verification prompts must not assume goat skills are the only skills

**Created:** 2026-04-01

**What happened:** M1 human testing gate prompt said "List all directories in .claude/skills/. The ONLY dirs should be: goat, goat-debug, ..." This would fail any project with non-goat project-specific skills (deploy/, preflight/, audit/). The instruction would cause a verifier to report project-specific skills as violations. Same blind spot as AP2 - assuming goat-flow owns the entire skills directory.

**Prevention:** Verification prompts and scanner checks must scope to goat-flow's domain: "List all goat-* directories..." not "List all directories..." Project-specific skills are not goat-flow's business.
