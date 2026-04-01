---
name: Agent rewrites shared docs with agent-specific vocabulary
status: active
created: '2026-03-21'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Shared documentation files (`docs/`, `workflow/`) contain references to only one agent's hook names, paths, or terminology. Other agents reading these docs get incorrect instructions. Tables lose rows for other agents.

**Why it happens:** When an agent is asked to set up or update its platform support, it replaces existing references wholesale instead of adding multi-agent support. The agent treats the task as find-and-replace: `.claude/` → `.gemini/`, `PreToolUse` → `BeforeTool`, "Every Claude turn" → "Every Gemini turn". It does not distinguish between agent-specific files (`setup/setup-gemini.md`) and shared files (`docs/system-spec.md`).

**Evidence:**
- `docs/system-spec.md` → "Every Gemini turn" replaced "Every Claude turn" (should be agent-neutral)
- `docs/system/five-layers.md` → Claude Code row deleted from skills table, replaced with Gemini CLI only
- `docs/system/six-steps.md` → Claude Code hook example replaced with Gemini, not added alongside
- `workflow/runtime/enforcement.md` → all `.claude/` paths replaced with `.gemini/`, creating hybrid state

**Prevention:**
- Agent-specific files (`setup/setup-*.md`, `.claude/`, `.gemini/`) - edits fine
- Shared docs (`docs/`, `workflow/`) - MUST remain agent-neutral or list all agents
- When adding agent support: ADD to tables and examples, never DELETE or REPLACE existing agent references
- Setup prompts MUST include explicit scope constraints: "Do NOT modify files outside `.gemini/` and `GEMINI.md`"
