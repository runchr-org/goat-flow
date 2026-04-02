---
name: Agents under line pressure cut "small but required" sections
created: '2026-03-20'
---

**What happened:** Both rampart and sus-form-detector agents dropped Sub-Agent Objectives (f) and Communication When Blocked (g) when compressing CLAUDE.md toward the line target. The instructions said "Do NOT skip sections (f)-(i)" but only in Prompt B - Prompt A (used for new projects) didn't have this warning.

**Prevention:** Every constraint that agents are likely to cut under pressure must appear in BOTH the template (execution-loop.md) AND the prompt that invokes it (Prompt A in setup-claude.md). A rule in only one place is a rule that gets missed.
