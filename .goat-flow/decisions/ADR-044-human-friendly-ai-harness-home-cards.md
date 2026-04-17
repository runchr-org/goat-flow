# ADR-044: Make Home AI Harness cards summary-first and human-friendly

**Date:** 2026-04-17
**Status:** Implemented

## Context

The Home dashboard AI Harness section had drifted toward an internal/debug view instead of a product-facing summary.

The card rows showed concern-level counter strings such as `I 1/1 · A 2/2 · m 2`, plus hard `PASS` / `FAIL` labels. Those values are accurate, but they require users to understand GOAT Flow's internal harness model:

- `I` = integrity checks
- `A` = advisory checks
- `m` = metric-only signals

In practice, users reading the Home dashboard want fast answers:

- Which agent is healthiest right now?
- How much work is left?
- Which concern areas need attention?

The dense counter format exposed implementation detail too early. It made the Home view feel more like an audit debugger than a decision surface. User feedback preferred the earlier card design that emphasized a grade, percentage, recommendation count, and simple per-concern bars.

## Decision

For the **Home** AI Harness cards:

1. Keep the top-line agent grade and percentage summary.
2. Keep the concise recommendation summary (`All checks passing`, `N recommendations`).
3. Show each concern as a bar + percentage, not as `I/A/m` shorthand.
4. In the expanded detail panel, replace raw counter badges with plain-language status:
   - `Healthy` / `Needs work`
   - progress bar + percentage
   - short summary text such as `2 recommendations`, `1 advisory acknowledged`, `3/4 scored checks satisfied`
5. Keep the raw findings and recommendations lists below, because they are actionable and already readable.

The internal scoring model and audit semantics do **not** change. This ADR is about presentation, not evaluation logic.

## Rationale

- **Home is a summary surface.** It should answer "where do I look next?" before it explains audit internals.
- **Bars are faster to scan than counters.** A user can compare three agents and five concerns visually without decoding abbreviations.
- **Plain language scales better than domain shorthand.** `1 advisory acknowledged` is readable without prior knowledge; `A 1/1 (1 ack)` is not.
- **Detail still exists when needed.** The findings and recommendations lists remain available in the expanded panel, so simplifying the header does not remove useful diagnostic context.

## Consequences

- The Home AI Harness cards are closer to the earlier dashboard design that users found easier to read.
- The view now prioritizes ranking, trend, and next-action cues over internal check taxonomy.
- Internal harness concepts (`integrity`, `advisory`, `metric`, acknowledgment) remain in the data model, but are no longer the first thing users see on the Home page.
- Critique and other audit surfaces may still use the older presentation until they are updated separately.
