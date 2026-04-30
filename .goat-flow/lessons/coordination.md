---
category: coordination
last_reviewed: 2026-05-01
---

## Lesson: Phase 0 normalisation catches council false findings before they create work

**Created:** 2026-05-01
**What happened:** A five-council synthesis (Claude x2, ChatGPT, Gemini, Codex) produced findings for the v1.4 programme. Phase 0 normalisation verified every factual claim before acting. Two corrections surfaced:
1. OP-5 claimed installed skills were at v1.3.1 and the review plan needed rebasing. Verification showed all six skills at v1.3.2 across all four parity surfaces. The review plan's baseline was correct. ~1 weekend of recomputation work avoided.
2. OP-7 claimed word budgets were a programme-wide crisis. Verification showed only goat-critique is at the wall (3 words slack). goat-plan has 79 words of room. The other four skills have 277-1191 words of slack.
**Evidence:** `.goat-flow/tasks/1.3.3/v1.4-programme.md` (search: `Finding investigated and rejected: OP-5`) documents both corrections with `wc -w` and `grep` output from the verification session.
**Prevention:** Always run Phase 0 normalisation on council synthesis findings before acting on them. Verify version claims with `grep goat-flow-skill-version`, word counts with `wc -w`, and parity with `cmp`. Council findings are inputs to verify, not evidence to trust.

## Lesson: AI council version-baseline claims are an axis where reviewers hallucinate

**Created:** 2026-05-01
**What happened:** The council synthesis stated "installed skills are v1.3.1" across multiple findings (CC-2, OP-5). All five council members either produced or passed through this claim without verification. The actual version was v1.3.2 — a one-increment error that would have cascaded into unnecessary score recomputation across the review plan.
**Prevention:** When a council pass produces version-number claims, Phase 0 must verify them against the actual codebase. Version numbers are cheap to check (`grep goat-flow-skill-version`) and expensive to get wrong (downstream score computations, rebase work). Add "version baseline verification" as a standing Phase 0 checklist item for future council synthesis passes.

## Lesson: goat-flow correction loop runs at higher precision than council input

**Created:** 2026-05-01
**What happened:** Across Phase 0 and Phase 1 of the v1.4 programme, the framework's structured intake filtered three corrections from council input: one false finding (OP-5), one over-stated finding (OP-7), and one guardrail-consistency question (critique score gap) that the programme document itself surfaced. The correction rate (~3 findings corrected out of ~19) suggests the council pass produces useful but noisy input, and the Phase 0 verification step is load-bearing infrastructure, not ceremony.
**Prevention:** If this pattern holds across Phase 2 per-plan updates, promote Phase 0 verification from "v1.4 programme requirement" to "standing requirement for any council-derived improvement work." The cost of Phase 0 (~1 weekend) is small relative to the rework it prevents.
