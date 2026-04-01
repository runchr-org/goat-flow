---
name: Verification scope must match change scope
created: ''
type: pattern
related:
  - 2026-03-22-sub-agent-output-must-be-audited.md
  - 2026-03-22-setup-agents-propagate-errors-from-existing-instruction-files.md
---

When the change is code-only, running tests is sufficient. When the change touches docs, setup prompts, or workflow templates, verification must read those files too. The verification scope must match the blast radius of the change. When building on existing files, audit them first - errors in source files propagate to everything built on top.
