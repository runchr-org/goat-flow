---
name: Agents given broad setup tasks rewrite shared docs as agent-specific
created: '2026-03-21'
---

**What happened:** Gemini CLI was asked to set up GOAT Flow. It modified 6 shared documentation files (`docs/system-spec.md`, `docs/system/five-layers.md`, `docs/system/six-steps.md`, `docs/reference/design-rationale.md`, `docs/getting-started.md`, `workflow/runtime/enforcement.md`), replacing Claude Code references with Gemini-specific equivalents. The skills table in `five-layers.md` had its Claude Code row deleted. The enforcement template ended up in a hybrid state - half `.claude/` paths, half `.gemini/` paths.

**Prevention:** Agent setup prompts must include explicit scope constraints. For Gemini: "Only create/modify files under `.gemini/` and `GEMINI.md`. Do NOT modify `docs/`, `workflow/`, or any file outside the `.gemini/` directory." For any agent: treat shared documentation as a boundary that requires Ask First permission.
