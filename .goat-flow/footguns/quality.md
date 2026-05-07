---
category: quality
last_reviewed: 2026-05-06
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

**Root cause:** `computeHarness` in `src/cli/audit/audit.ts` (search: `counts[check.concern].total++`) counted every harness check the same way, so metric-type degraded evidence could be hidden or over-marketed. The `AuditConcern` type contract (search: `metrics: number`) distinguishes metric counts from status-gating integrity/advisory checks, and `applyCheckToConcern` skips metrics for status. But the score and scope calculations also need their own explicit metric/impact handling.

**Fix:** Three layers of the same bug, fixed separately:
1. `computeHarness` in `src/cli/audit/audit.ts` (search: `counts[check.concern].total++`) - handles metric-type degraded evidence as score-only rather than status-gating. Fixed concern scores that previously implied full readiness.
2. `agentScore()` in `home.html`, `quality.html`, and `setup.html` - includes score-only metric failures in dashboard maturity percentages while keeping them out of audit status. A later audit found the earlier `c.type !== 'metric'` filter made the dashboard say 100% / "All checks passing" while verification evidence was missing, so the dashboard now scores all non-skipped checks and labels score-only failures as warnings.
3. `buildScope` in `src/cli/audit/audit.ts` (search: `impact === "scope-fail"`) - excludes score-only failures from the scope failure filter. A metric returning `fail` was previously included in the scope's `failures` array, causing `harness.status = "fail"` and `overall.status = "fail"` even though all concerns were PASS. This made every project without optional runtime verification evidence fail the `--harness` gate.

**Prevention:** The metric contract has three enforcement points, not one: concern score calculation, dashboard maturity display, and scope status. Metrics must lower concern/dashboard scores when they fail, but never create a scope failure. When adding new harness checks, verify the check type and impact are intentional. The contract: `integrity` gates status, `advisory` gates status unless acknowledged, `metric` can lower scores but never creates a scope failure.
