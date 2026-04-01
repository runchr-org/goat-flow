---
name: Sub-agents write aspirational content as current state
created: '2026-03-22'
---

**What happened:** Sub-agents creating ai/coding-standards/ files read docs/architecture.md and roadmap docs, then wrote coding guidelines that included planned features (Playwright browser, SQLite persistence, redaction.rs) as if they were current. Three external agent audits found 5+ inaccuracies per project.
**Root cause:** The setup prompt said "Create conventions.md from project analysis" but didn't say "verify against actual code." Agents read documentation (which mixes current and planned) without checking the implementation.
**Fix:** Added verification gates to workflow templates and setup guides. Templates now say: "Only document what currently exists. Verify by reading source files, not documentation."
