---
name: Agent skipped the AI testing gate and offered to continue to the next milestone
created: '2026-03-31'
type: pattern
---

**What happened:** After executing M1 (Fixes & Hygiene), the agent reported results and offered to "continue with P9/P17/P4" — moving to the next work item without running the AI Testing Gate that was literally in the same milestone file it had been working from. The gate was designed by the agent itself, written into the milestone file, and explicitly says "Run this prompt after all M1 tasks are complete." The agent wrote it, completed the tasks, and skipped it entirely.

**Why this matters:** The AI Testing Gate is the verification step that catches implementation errors before they propagate. Skipping it means the doer is also the judge — the exact anti-pattern the gate was designed to prevent. The agent's eagerness to move forward ("Want me to continue?") overrode the verification step that stood between finishing and done.

**This is the same root cause as the commit offer and the checkbox skip:** After completing implementation work, the agent's default is to report results and suggest the next action. Verification steps that happen AFTER the primary output get skipped because the agent treats "code works, tests pass" as the finish line.

**Prevention:** After completing all tasks in a milestone, the NEXT action is ALWAYS the AI Testing Gate — not reporting results, not suggesting next steps. The gate must run before any summary or status update. Treat the testing gate as the last task in the milestone, not a post-milestone activity.
