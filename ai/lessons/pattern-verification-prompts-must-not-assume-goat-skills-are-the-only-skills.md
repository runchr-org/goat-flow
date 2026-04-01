---
name: Verification prompts must not assume goat skills are the only skills
created: '2026-04-01'
type: pattern
---

**What happened:** M1 human testing gate prompt said "List all directories in .claude/skills/. The ONLY dirs should be: goat, goat-debug, ..." This would fail any project with non-goat project-specific skills (deploy/, preflight/, audit/). The instruction would cause a verifier to report project-specific skills as violations. Same blind spot as AP2 — assuming goat-flow owns the entire skills directory.

**Prevention:** Verification prompts and scanner checks must scope to goat-flow's domain: "List all goat-* directories..." not "List all directories..." Project-specific skills are not goat-flow's business.
