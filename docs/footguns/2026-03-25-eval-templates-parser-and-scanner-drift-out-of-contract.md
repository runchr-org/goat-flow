---
name: Eval templates, parser, and scanner drift out of contract
status: active
created: '2026-03-25'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** An eval written exactly from the shipped template can fail the scanner, or a valid eval heading accepted by the parser can still fail the rubric. Users create evals that look correct in markdown but lose points in `goat-flow scan`.

**Why it happens:** Eval structure is defined in three places with different assumptions:
- `workflow/evaluation/evals.md` tells users what to write
- `src/cli/evals/parser.ts` decides which headings are semantically equivalent
- `src/cli/facts/shared.ts` performs strict regex checks for the rubric

When one of those changes without the others, the setup guidance stops matching the scan logic.

**Evidence:**
- `workflow/evaluation/evals.md` → template tells users to create an `## Origin` section
- `src/cli/facts/shared.ts` → scanner only accepts `**Origin:**` labels
- `src/cli/evals/parser.ts` → parser treats `Scenario` as equivalent to `Replay Prompt`

**Prevention:** Treat eval shape as a single contract. Any change to allowed headings, label format, or example structure must be updated in the template, parser, and scanner together. Verify with one round-trip test: write an eval from the template, parse it, then confirm it passes the full-tier scan checks.
