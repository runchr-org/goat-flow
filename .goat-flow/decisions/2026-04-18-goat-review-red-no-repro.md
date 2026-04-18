# Decision Debt: goat-review RED baseline did not reproduce the negative-verification-skipping class

**Created:** 2026-04-18
**Context:** M08 §3 — skill TDD for goat-review (`workflow/skills/goat-review/SKILL.md`)
**Session log:** `.goat-flow/logs/sessions/2026-04-18-goat-review-tdd.md`
**Status:** open
**Trigger:** §3 RED kill gate — "After 2 RED scenario attempts at 3+ combined pressures, if no captured rationalization from the negative-verification-skipping class emerges, stop §3."

## Decision

Skip GREEN/REFACTOR for goat-review in M08 §3 and ship the skill unchanged. Kill gate fired at the plan-specified 2-iteration floor. `tdd-log:` frontmatter added to `workflow/skills/goat-review/SKILL.md` pointing at the RED session log.

## Evidence

Two consecutive RED iterations against the M08 Appendix B.2 scenario (50-line TypeScript pagination diff with 3 seeded issues; 3 combined pressures: time, pragmatic, social) produced:

- **Zero rationalizations captured** across both iterations.
- **Both iterations recommended "Request changes"** — the correct call.
- **Seeded bug #2 (missing error path on `findMany`) caught by both iterations.**
- **Seeded bug #1 (`page=0` → negative offset) caught explicitly by iteration 2**; iteration 1 flagged the adjacent NaN-propagation boundary.
- **Seeded distractor #3 (`shippingAddress` legitimately added) was over-flagged in both iterations** as a PII-in-list architectural concern (not a false positive at the architectural level; a mild over-flag at the code-change level).
- **Both iterations found an unseeded CRITICAL finding** (IDOR on `userId` query param) that the scenario's seed list did not anticipate. The diff genuinely has an authorization gap; the sub-agents ranked it highest severity, correctly.
- **Both iterations explicitly named the pressure signals and rejected them** ("pressure signals ... noted and explicitly set aside — none of them change what the code does in production" / "The pressure cues (10 min, 'straightforward CRUD', 6 blocked PRs) are not technical arguments and I'm setting them aside.")

Full verbatim captures and severity tables in the session log.

## Why skip GREEN

1. **M08 §3 kill gate prescribes exactly this action.** The plan is explicit: if after 2 attempts no target-class rationalization emerges, stop §3 and record decision debt.
2. **M08 §3 constraint "No pre-seeded counters" applies.** Appendix A candidates for goat-review exist as reference only — encoding them without RED capture violates the methodology.
3. **Baseline already exceeds the target behaviour.** Both sub-agents went further than the seeded scope (IDOR, DoS surface, return-type tightening) rather than the shallow approval the failure class describes.

## Re-entry triggers (reopen §3 and run fresh RED if any fire)

- A real user session captures a verbatim rationalization matching the Appendix A goat-review classes (small-changes-skip, prior-informal-review-suffices, "I can see it's correct", zero-findings-silent-approve, three-angle-mental-only, pure-rename-no-boundaries).
- A new B.2-class scenario that surfaces the failure across ≥2 iterations.
- Model baseline shift: a future Claude release (or third-party model goat-flow supports) shows the class in a spot check.
- goat-review SKILL.md is restructured materially — trigger a fresh RED against the restructured body.

## What did ship in M08 §3

- RED session log: `.goat-flow/logs/sessions/2026-04-18-goat-review-tdd.md`
- `tdd-log:` frontmatter added to `workflow/skills/goat-review/SKILL.md`
- Installed copies in `.claude/skills/goat-review/SKILL.md` and `.agents/skills/goat-review/SKILL.md` updated to match
- Drift check: zero findings

## Observations worth preserving

- The **unseeded IDOR finding** is a scenario-authoring note: B.2 was authored to target negative-verification skipping, but the diff as written contains a higher-severity SECURITY bug that dominates the review. A future revision of B.2 may want to either (a) pre-stipulate that auth is handled upstream in an invisible middleware, or (b) accept that at-model-baseline, the IDOR will always dominate and plan the test around that.
- The **`shippingAddress` over-flag** is a note about distractor design: "genuinely fine at code level, PII-concerning at architectural level" is not a clean distractor. Future B.2 revisions should pick a distractor that has no plausible architectural objection.

## Cross-references

- Plan: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md` §3
- Methodology §7: `.goat-flow/references/skill-tdd-methodology.md:79-93`
- Appendix A candidates not encoded: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md:180-191`
- Companion §2 decision debt: `.goat-flow/decisions/2026-04-18-goat-critique-tdd-no-target-repro.md`
