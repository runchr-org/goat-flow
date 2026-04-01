---
name: Multi-agent setup files share structure but not vocabulary
status: active
created: '2026-03-21'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Gemini CLI rejects hook event names with "Invalid hook event name" warnings. Hooks silently don't run. Users get a working `.claude/` setup but broken `.gemini/` setup from the same instructions.

**Why it happens:** `setup/setup-gemini.md` was derived from `setup/setup-claude.md` by substituting paths (`.claude/` → `.gemini/`, `CLAUDE.md` → `GEMINI.md`) but CLI-specific vocabulary wasn't translated. Each CLI uses different hook event names:
- Claude Code: `PreToolUse`, `PostToolUse`, `Stop`
- Gemini CLI: `BeforeTool`, `AfterTool`, `AfterAgent`, `SessionEnd`

Hook script comments also carried over Claude-specific language ("runs after every Claude turn").

**Evidence:**
- `setup/setup-gemini.md` → Gemini CLI event reference block (BeforeTool, AfterTool, SessionEnd)
- `.gemini/hooks/deny-dangerous.sh` → updated to "BeforeTool hook"
- `.gemini/settings.json` → updated to `BeforeTool` and `AfterAgent` event names

**Prevention:** When creating or updating a setup file for a new CLI, diff it against the source file and check every CLI-specific term - not just paths. Maintain the event name reference block at the top of each CLI's Phase 1c section.
