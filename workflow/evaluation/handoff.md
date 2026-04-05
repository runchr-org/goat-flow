# Prompt: Create .goat-flow/tasks/handoff-template.md

Paste this into your coding agent to create the session handoff template.
Use it when work stops mid-task and another session needs to resume
without reconstructing context from scratch.

---

## The Prompt

```
Create .goat-flow/tasks/handoff-template.md for this project.

This is a reusable session handoff template. It is copied when an agent
stops with incomplete work. The template itself stays clean.

Create with this structure:

# Agent Session Handoff Template

**Purpose:** When an agent has incomplete work at the end of a session,
copy this template to `.goat-flow/tasks/handoff.md` and fill it in. The next session
must read that handoff before doing new work.

**When to create:** If you are stopping with unfinished work, blocked
progress, or a forced rewind after repeated failed attempts.

**When to read:** At the start of a session, check whether
`.goat-flow/tasks/handoff.md` exists. If it does, read it first.

---

## Date
[YYYY-MM-DD]

## Status
[In Progress / Blocked / Ready for Review]

## Current State
- What was being worked on
- What is done and not done
- Branch name if relevant
- Files changed this session

## Key Decisions Made
- Decision and why it was made

## Errors & Corrections
- What went wrong and how it was fixed
- Any approaches that were tried and abandoned (and why)
- If a footgun or lesson was created from this, link it here

## Learnings
- What worked well this session (repeat in future)
- What didn't work (avoid in future)
- Any surprising findings about the codebase

## Known Risks
- Risk and mitigation
- What might break if the next session misses this context

## Next Step
- Exactly what to do first, with file paths
- Which files to read first

## Context Files
- Key files the next agent should read before starting
- Any files that were read but not changed (important for understanding)

USAGE:
When ending a session mid-task, the agent should:
1. Copy this template to `.goat-flow/tasks/handoff.md`
2. Fill in all sections with specifics from the current session
3. Leave it in the worktree for the next session to read

Do NOT invent progress, test results, or decisions. If something is
unknown, say it is unknown.
Do NOT commit or push the handoff unless a human explicitly asks.

The next session starts by reading the handoff file before doing
anything else.

VERIFICATION:
- Verify .goat-flow/tasks/handoff-template.md exists
- Verify it has Date, Status, Current State, Key Decisions Made,
  Errors & Corrections, Learnings, Known Risks, Next Step, and
  Context Files sections
- Verify it says when to create and when to read the handoff
```
