---
name: Agent didn't tick checkbox tasks during execution
created: '2026-03-31'
type: pattern
---

**What happened:** CLAUDE.md VERIFY section says "If working from a plan/milestone file, MUST tick `- [x]` on each task as it's completed - not at the end." While executing M1 (17 tasks across 10 priority groups), the agent completed all tasks but ticked zero checkboxes. Only noticed when the user pointed it out. Same root cause as the commit offer — instructions read but not followed when a strong default behavior (finish the code, report results) took over.

**Prevention:** Before starting work from a milestone file, read the checkbox tasks. After each task completes, tick it immediately — before moving to the next task. "Not at the end" means not at the end.
