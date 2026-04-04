# Journey Tests

Functional journey tests validate multi-step agent workflows against fixture projects.

## Two Types

### Scanner Journeys (`scanner-journeys.test.ts`)
Run the scanner pipeline end-to-end against fixtures. No real agent needed.
Tests: output format, anti-pattern detection, guide mode, cross-fixture consistency.

### Behavioral Journeys (`behavioral-journeys.test.ts`)
Validate agent transcripts against behavioral contracts from `ai-docs/evals/`.
Each eval defines: scenario (prompt), expected behavior (gates), anti-patterns.

**How they work:**
1. Parse eval file for behavioral gates and anti-patterns
2. In Layer 6: validate contracts are well-formed and parseable
3. In Layer 7 (smoke tests): run real agent, capture transcript, score against gates

## Adding a Journey

Scanner journeys: add to `scanner-journeys.test.ts` using `scanFixture()`.

Behavioral journeys: create an eval in `ai-docs/evals/` following `FORMAT.md`,
then add a test in `behavioral-journeys.test.ts` that validates the eval is parseable.
