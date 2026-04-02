---
name: Scanner 100% does not mean the project is correct
created: '2026-03-31'
type: pattern
---

**What happened:** goat-flow scored 100% on its own scanner while preflight-checks.sh failed with 8 errors. Scanner checked structural presence (files exist, have right headings). Preflight checked functional correctness (commands work, paths resolve, versions match). The two tools disagreed about the repo's health.

**Root cause:** Scanner and preflight check different things. Neither is authoritative for the other's concerns. "100% scanner score" became a proxy for "everything is fine" when it only means "the skeleton is correct."

**Prevention:** Don't treat scanner score as a quality gate for the whole project. Use it for what it checks (structure) and preflight for what it checks (function). When they disagree, investigate — the more specific tool is usually right.
