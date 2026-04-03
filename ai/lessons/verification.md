---
category: verification
---

## Lesson: "Double check" means read the files, not re-run the tests

**Created:** 2026-03-22

**What happened:** User asked to "double check" multiple times. Each time, re-ran typecheck + tests + scan. Never caught stale shape references, documentation inconsistencies, or content quality issues that three external agents found immediately by reading the actual files.
**Root cause:** Interpreted verification as "run the pipeline" instead of "read what changed." Tests only cover what they test.
**Fix:** Added removed-pattern check to preflight. "Double check" should include: (1) run pipeline, (2) grep removed patterns, (3) read 3-5 changed files for content accuracy.

---

## Pattern: Verification scope must match change scope

**Created:**

When the change is code-only, running tests is sufficient. When the change touches docs, setup prompts, or workflow templates, verification must read those files too. The verification scope must match the blast radius of the change. When building on existing files, audit them first - errors in source files propagate to everything built on top.

---

## Pattern: Agent skipped the AI testing gate and offered to continue to the next milestone

**Created:** 2026-03-31

**What happened:** After executing M1 (Fixes & Hygiene), the agent reported results and offered to "continue with P9/P17/P4" — moving to the next work item without running the AI Testing Gate that was literally in the same milestone file it had been working from. The gate was designed by the agent itself, written into the milestone file, and explicitly says "Run this prompt after all M1 tasks are complete." The agent wrote it, completed the tasks, and skipped it entirely.

**Why this matters:** The AI Testing Gate is the verification step that catches implementation errors before they propagate. Skipping it means the doer is also the judge — the exact anti-pattern the gate was designed to prevent. The agent's eagerness to move forward ("Want me to continue?") overrode the verification step that stood between finishing and done.

**This is the same root cause as the commit offer and the checkbox skip:** After completing implementation work, the agent's default is to report results and suggest the next action. Verification steps that happen AFTER the primary output get skipped because the agent treats "code works, tests pass" as the finish line.

**Prevention:** After completing all tasks in a milestone, the NEXT action is ALWAYS the AI Testing Gate — not reporting results, not suggesting next steps. The gate must run before any summary or status update. Treat the testing gate as the last task in the milestone, not a post-milestone activity.

---

## Pattern: Agent didn't tick checkbox tasks during execution

**Created:** 2026-03-31

**What happened:** CLAUDE.md VERIFY section says "If working from a plan/milestone file, MUST tick `- [x]` on each task as it's completed - not at the end." While executing M1 (17 tasks across 10 priority groups), the agent completed all tasks but ticked zero checkboxes. Only noticed when the user pointed it out. Same root cause as the commit offer — instructions read but not followed when a strong default behavior (finish the code, report results) took over.

**Prevention:** Before starting work from a milestone file, read the checkbox tasks. After each task completes, tick it immediately — before moving to the next task. "Not at the end" means not at the end.

---

## Pattern: "AI gate passed" does not mean the work is done

**Created:** 2026-04-01

**What happened:** M1 AI gate said 14/14 checks passed. Real-world test on halaxy-agents-lab (2026-04-01) found: 12 goat skill dirs instead of 6 (stale skills not cleaned), router table with 12 entries instead of 6, missing Edit/Write .env deny (only Read installed), CI workflow checking for "goat-goat" instead of "goat", version headers still at 0.9.2, format hook referencing uninstalled formatters. The AI gate checked whether code EXISTS in the goat-flow repo, not whether it WORKS on real consumer projects.

**Root cause:** The AI verifier read goat-flow source code and confirmed features were implemented. It never ran setup on a real project to verify the output. The verifier tested the tool, not the tool's output. Same pattern as "Scanner 100% does not mean the project is correct."

**Prevention:** AI testing gates must include at least one end-to-end test: run the tool against a real project and verify the result. Checking source code is necessary but not sufficient.

---

## Pattern: End-of-task rules get skipped

**Created:**

Rules that fire after the agent has delivered its primary output have near-zero compliance. The agent's attention is on the deliverable, not the closing checklist. Session logging, learning loop updates, and handoff notes all suffer from this. Prevention must be structural: either make the closing step part of the output format (so it happens DURING delivery, not after), or enforce it via hooks/DoD gates that block completion.

---

## Pattern: Blocked ≠ impossible

**Created:**

Deny hooks block dangerous patterns, not all operations. When a command is blocked, spend 2 seconds thinking about the safe alternative before asking the user or giving up.
