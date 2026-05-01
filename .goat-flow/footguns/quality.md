---
category: quality
last_reviewed: 2026-04-30
---

## Footgun: Quality reviews disappear when the agent skips the final JSON write

**Status:** active | **Created:** 2026-04-19 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A quality review ran end-to-end, but `goat-flow quality history` reports no saved runs and `goat-flow quality diff` has nothing to compare. No file appears under `.goat-flow/logs/quality/`.

**Why it happens:** `goat-flow quality . --agent <id>` composes a prompt that instructs the agent to write its final JSON report directly to `.goat-flow/logs/quality/<YYYY-MM-DD>-<HHMM>-<agent>-<rand5>.json`. The write is the agent's responsibility, not the CLI's. If the agent emits the JSON inline as a fenced code block, or forgets the save step, or writes to a different path, nothing persists. The target directory is gitignored, so there is no git-side hint that the save was skipped.

**Evidence:**
- `src/cli/prompt/compose-quality.ts` (search: `Write it as a file to`) - the prompt ends with an explicit instruction to write the file rather than emit a fenced JSON block.
- `src/cli/prompt/compose-quality.ts` (search: `Wrote quality report to`) - the prompt requires a single-line confirmation that references the saved filename.
- `src/cli/quality/history.ts` (search: `No saved quality history`) - `history` and `diff` only read files that were actually written to disk.

**Prevention:**
1. After any `/quality` run, verify the save landed: `ls .goat-flow/logs/quality/*.json | tail -3`. If the latest mtime is older than the review you just ran, the agent skipped the write.
2. If the agent replied with a fenced JSON block instead of writing a file, ask it to save the block to the expected path using its filesystem tool before closing the session.
3. Only after the file exists on disk is `quality history` / `quality diff` meaningful - both silently return empty when nothing is saved, so a missing save looks identical to "no prior runs."

See `.goat-flow/lessons/design-decisions.md` (2026-04-19 amendment under "Don't carve I/O side-effect exceptions into prompts that forbid I/O") for the historical thread that led here.


## Resolved Entries

---

## Footgun: Metric checks inflated harness concern scores to 100% even when the capability was absent

**Status:** resolved | **Created:** 2026-04-30 | **Resolved:** 2026-04-30 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** `audit --harness` reported Verification score 100 and Recovery score 100 while its own findings said "no structured toolchain.test configured" and "26 milestone files at 0%." All four quality assessment agents (Claude, Codex, Copilot, Gemini) independently identified this as the top structural flaw across 16 quality reports.

**Root cause:** `computeHarness` in `src/cli/audit/audit.ts` (search: `counts[check.concern].total++`) counted every harness check — including metric-type checks — in the concern score denominator and numerator. The `AuditConcern` type contract (search: `metrics: number`) documents metrics as "never scored, always informational," and `applyCheckToConcern` correctly skipped metrics for status. But the score calculation at the loop level did not.

**Fix:** Added `if (check.type !== "metric")` guard before incrementing `total`/`passing` in `computeHarness`. Also changed `testRunnerConfigured` (a metric check) to return `fail` when no runner is configured - honest metric reporting since the status never affects the concern anyway. The same bug existed in the dashboard frontend: `agentScore()` in `home.html`, `quality.html`, and `setup.html` all computed agent percentages from `harness.checks.length` without filtering metrics, showing 94% when all scored checks were passing. Fixed by filtering `c.type !== 'metric'` before the pass/total ratio.

**Prevention:** When adding new harness checks, verify the check type is intentional. The contract: `integrity` gates status, `advisory` gates status unless acknowledged, `metric` never affects status or score. New metric checks should return `fail` when the measured capability is absent rather than `pass` with an explanatory finding. Dashboard score calculations must also exclude metrics - the backend `computeHarness` fix does not propagate to frontend `agentScore()` functions.
