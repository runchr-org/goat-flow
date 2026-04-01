---
name: Skill session logs are never written
created: '2026-03-30'
type: pattern
---

**What happened:** The Shared Conventions block in every skill says "If `.goat-flow/tasks/logs/` exists → write session summary." The goat-review audit of `tasks/roadmaps/0.9.3/tasks.md` ran the full skill process (Step 0 → Phase A1-A3 → blocking gate) but no session log was written. The user noticed `.goat-flow/tasks/logs/sessions/` was empty. The closing protocol was skipped entirely — 0% compliance across the session.

**Root cause:** The session log instruction is buried in the Closing line of the Shared Conventions block (one clause in a compound sentence at `SKILL.md:17`). It fires at the END of a skill — after the agent has already delivered its output and is mentally "done." There's no enforcement mechanism: no hook checks for the file, no DoD gate references it, and no skill phase explicitly includes "write session log" as a step. It's a SHOULD rule in a MUST position.

**Prevention:** The closing protocol needs mechanical enforcement, not just a rule. Options: (1) add session logging to the DoD gates in CLAUDE.md so it blocks completion, (2) add a Stop hook that checks whether `.goat-flow/tasks/logs/sessions/` was written to during this session, (3) make session logging the FIRST line of the skill's output format template so the agent writes it before presenting findings, not after.
