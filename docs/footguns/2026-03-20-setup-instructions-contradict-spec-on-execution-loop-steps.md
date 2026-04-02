---
name: Setup instructions contradict spec on execution loop steps
status: active
created: '2026-03-20'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Agents implementing GOAT Flow produce a CLAUDE.md with the old 5-step loop (READ → CLASSIFY → ACT → VERIFY → LOG), missing SCOPE and complexity budgets. Cascades into missing sections (f)-(g) because agents under line pressure cut what the spec doesn't reinforce.

**Why it happens:** `setup/setup-claude.md` tells agents to "Read docs/system-spec.md" FIRST. If system-spec.md shows a different loop than `setup/shared/execution-loop.md`, agents absorb whichever they read first and can't reconcile the contradiction. This caused 7 of 8 gaps in the sus-form-detector implementation.

**Evidence:**
- `docs/system-spec.md` → loop definition in Layer 1 architecture diagram and execution loop section
- `setup/shared/execution-loop.md` → updated loop definition (authoritative)
- `setup/setup-claude.md` → "Read docs/system-spec.md" as first instruction

**Prevention:** After updating `setup/shared/execution-loop.md`, ALWAYS update the same concept in `docs/system-spec.md`, `docs/system/six-steps.md`, and `docs/system/five-layers.md`. The spec is read first by agents - it must match. This is a specific instance of the "concept duplication" footgun above, but critical enough to track separately because it directly causes broken implementations.
