---
name: Scanner reports enforcement features it didn't detect
status: active
created: '2026-03-31'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Scanner gives Codex full marks for deny hook quality (jq parsing, chaining detection, compaction hook) when the Codex enforcement is actually a Starlark execpolicy file — a completely different format that doesn't use jq or split on &&/||/;.

**Why it happens:** `src/cli/facts/agent.ts` hardcodes `denyUsesJq = true` and `denyHandlesChaining = true` for execpolicy agents, and treats `session_start` hooks as compaction hooks. These are assumptions, not detections. The scanner reports them as facts.

**Evidence:**
- `src/cli/facts/agent.ts` → hardcoded assumptions for Codex enforcement quality
- goat-flow Codex self-review (66/100): "the scanner fakes Codex compaction and deny-hook properties"

**Prevention:** Only report what's actually detected from file content. If a Starlark file exists, report it exists — don't assume it has properties that only apply to bash hooks.
