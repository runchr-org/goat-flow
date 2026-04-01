---
name: '"AI gate passed" does not mean the work is done'
created: '2026-04-01'
type: pattern
---

**What happened:** M1 AI gate said 14/14 checks passed. Real-world test on halaxy-agents-lab (2026-04-01) found: 12 goat skill dirs instead of 6 (stale skills not cleaned), router table with 12 entries instead of 6, missing Edit/Write .env deny (only Read installed), CI workflow checking for "goat-goat" instead of "goat", version headers still at 0.9.2, format hook referencing uninstalled formatters. The AI gate checked whether code EXISTS in the goat-flow repo, not whether it WORKS on real consumer projects.

**Root cause:** The AI verifier read goat-flow source code and confirmed features were implemented. It never ran setup on a real project to verify the output. The verifier tested the tool, not the tool's output. Same pattern as "Scanner 100% does not mean the project is correct."

**Prevention:** AI testing gates must include at least one end-to-end test: run the tool against a real project and verify the result. Checking source code is necessary but not sufficient.
