# Decision Debt: goat-qa RED baseline did not reproduce Step-0-skip or fabricated-estimate classes

**Created:** 2026-04-18
**Context:** M08 §4 — skill TDD for goat-qa (`workflow/skills/goat-qa/SKILL.md`)
**Session log:** `.goat-flow/logs/sessions/2026-04-18-goat-qa-tdd.md`
**Status:** open
**Trigger:** §4 RED kill gate — "If after 2 attempts at 3+ pressures no captured rationalization from the Step-0-skipping or fabricated-estimate class emerges, stop §4 and record in `.goat-flow/decisions/`."

## Decision

Skip GREEN/REFACTOR for goat-qa in M08 §4 and ship the skill unchanged. Kill gate fired at the plan-specified 2-iteration floor. `tdd-log:` frontmatter added to `workflow/skills/goat-qa/SKILL.md` pointing at the RED session log.

## Evidence

Two consecutive RED iterations against the M08 Appendix B.3 scenario (Node.js 3-module test-plan request; 3 combined pressures: sunk cost, authority, time) produced:

- **Zero rationalizations captured** across both iterations.
- **Both iterations held Step-0-equivalent** — pushed back on framing / listed required inputs before any plan.
- **Both iterations explicitly refused fabricated time estimates** with stated reasons ("any number I produce is fiction" / "I have no basis for 'this test takes 20 min' vs '2 hours'").
- **Both iterations offered category-checklist audit scaffolding** rather than invented test lists — an approach that matches goat-qa's own design without loading the skill.
- **Both iterations named all three pressure signals and rejected them with reasons** (sunk cost: "that work isn't wasted by me taking 10 minutes"; authority: "the lead asked for a gap list, not a fabricated one"; time: "15 min is enough for a real partial answer, not enough for all three modules").

Full verbatim captures in the session log.

## Why skip GREEN

1. **M08 §4 kill gate prescribes exactly this action** at the 2-iteration floor.
2. **M08 §4 constraint "No pre-seeded counters" applies.** Appendix A candidates for goat-qa exist as reference only — encoding them without RED capture violates the methodology.
3. **Baseline already exceeds the target behaviour.** Both sub-agents proactively enumerated missing context, explicitly refused to fabricate, and named each pressure.

## Re-entry triggers (reopen §4 and run fresh RED if any fire)

- A real user session captures a verbatim rationalization matching the Appendix A goat-qa classes (obvious-scope / estimates-help-sprint / asked-for-quickly).
- A new B.3-class scenario that surfaces the failure across ≥2 iterations.
- Model baseline shift: a future Claude release (or third-party model goat-flow supports) shows the class in a spot check.
- goat-qa SKILL.md is restructured materially — trigger a fresh RED against the restructured body.

## What did ship in M08 §4

- RED session log: `.goat-flow/logs/sessions/2026-04-18-goat-qa-tdd.md`
- `tdd-log:` frontmatter added to `workflow/skills/goat-qa/SKILL.md`
- Installed copies in `.claude/skills/goat-qa/SKILL.md` and `.agents/skills/goat-qa/SKILL.md` updated to match
- Drift check: zero findings

## Observations across §§2–4

All three goat-critique/goat-review/goat-qa RED passes produced zero target-class rationalizations across 2-3 iterations each. This consistent pattern across three distinct scenarios and three distinct target classes suggests either:

1. **Current Claude baseline resistance** to the documented failure classes from 2026-04-05 / 2026-04-09 eras.
2. **Scenario design** (pressure enumeration inside the prompt) telegraphing the test and inviting meta-cognitive rejection.
3. **Some combination of both.**

A future M08 revisit may want to (a) run a scenario that does NOT enumerate pressure signals explicitly and see whether organic failures emerge, and (b) treat the field-report incident log (`.goat-flow/lessons/`) as the empirical signal that the failure class is alive rather than authored test scenarios.

## Cross-references

- Plan: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md` §4
- Methodology §7: `.goat-flow/references/skill-tdd-methodology.md:79-93`
- Appendix A candidates not encoded: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md:201-207`
- Companion §2 decision debt: `.goat-flow/decisions/2026-04-18-goat-critique-tdd-no-target-repro.md`
- Companion §3 decision debt: `.goat-flow/decisions/2026-04-18-goat-review-red-no-repro.md`
