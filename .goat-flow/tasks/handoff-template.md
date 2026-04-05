# Agent Session Handoff Template

**Purpose:** When an agent has incomplete work at the end of a session, copy this template to `.goat-flow/tasks/handoff.md` and fill it in. The next session MUST read `.goat-flow/tasks/handoff.md` before starting work to pick up where the previous session left off.

**When to create:** If you're ending a session with unfinished work, or if two corrections on the same approach triggered a stop. Do NOT leave incomplete work without a handoff.

**When to read:** At the start of any session, check if `.goat-flow/tasks/handoff.md` exists. If it does, read it before doing anything else.

---

## Date
[YYYY-MM-DD]

## Status
[In Progress / Blocked / Ready for Review]

## Current State
- What was being worked on
- What's done, what's not
- Branch name (if applicable)
- Files changed this session

## Key Decisions Made
- Decision and why

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
- What might break if the next agent doesn't know this

## Next Step
- Exactly what to do next, with file paths
- What to read first

## Context Files
- Key files the next agent should read before starting
- Any files that were read but not changed (important for understanding)
