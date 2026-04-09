# Journey Tests

Functional journey tests validate multi-step agent workflows against fixture projects.

## Scanner Journeys (`scanner-journeys.test.ts`)
Run the scanner pipeline end-to-end against fixtures. No real agent needed.
Tests: output format, anti-pattern detection, guide mode, cross-fixture consistency.

## Adding a Journey

Scanner journeys: add to `scanner-journeys.test.ts` using `scanFixture()`.
