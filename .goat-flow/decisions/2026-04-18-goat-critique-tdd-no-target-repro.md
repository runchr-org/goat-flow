# Decision Debt: goat-critique RED baseline did not reproduce the target failure class

**Created:** 2026-04-18
**Context:** M08 §2 — skill TDD for goat-critique (`workflow/skills/goat-critique/SKILL.md`)
**Session log:** `.goat-flow/logs/sessions/2026-04-18-goat-critique-tdd.md`
**Status:** open

## Decision

Skip GREEN/REFACTOR for goat-critique in M08 §2 and ship the skill unchanged. No inline rationalization counters added. `tdd-log:` frontmatter added to `workflow/skills/goat-critique/SKILL.md` pointing at the RED session log as an audit trail.

## Evidence

Three consecutive RED iterations against the M08 Appendix B.1 scenario (50M-row DB migration decision; 3 combined pressures: exhaustion, economic, pragmatic) produced:

- **Zero captured rationalizations from the target class** (inline role-play of expert perspectives, per `.goat-flow/lessons/agent-behavior.md:108-118`, created 2026-04-09).
- **Three distinct off-target-class rationalizations against Agent-tool dispatch** — one per iteration ("tool unavailable" / "subagents would be ceremony here" / "reflexive dispatch is performative rigor").
- **Zero Agent-tool dispatches** across all three iterations.
- **Zero tool calls** (verified: each iteration reports `tool_uses: 0`).
- **M02 brevity-synthesis pattern** (`.goat-flow/lessons/agent-behavior.md:5-21`) did NOT reproduce. Plan-level kill gate did NOT fire.

Full verbatim captures in the session log.

## Why skip GREEN

1. **M08 §2 constraint #1 forbids pre-seeding.** GREEN counters may only encode rationalizations captured verbatim in RED. No target-class capture → no valid counters.
2. **Off-target captures are partially consistent with goat-critique's own scope gate.** The skill's `NOT this skill` clause (`workflow/skills/goat-critique/SKILL.md:23-26`) already declines use for trivial artifacts or pre-enumerated decisions. All three sub-agents reasoned the B.1 scenario into that gate. Counter-encoding them would punish agents for *correctly* applying the scope clause.
3. **Scenario shape telegraphs the test.** Appendix B.1 names the simulate-shortcut explicitly as a "pragmatic" option, which invites meta-cognitive rejection. The lessons/agent-behavior.md:108-118 incident was a free-form user request for SBAO critique, not a prompt that named the shortcut inline.
4. **Current Claude capability appears resistant to the documented class at baseline.** Three independent rollouts across two Opus 4.7 sub-agents produced the same meta-aware refusal pattern.

## Re-entry triggers (reopen §2 and run fresh RED if any fire)

- A real user session surfaces the inline-role-play failure class again (freeform SBAO request, no telegraph), logged in `.goat-flow/lessons/agent-behavior.md`.
- A new scenario that does NOT name the simulate-shortcut inline reproduces the target class across ≥2 iterations.
- Model baseline shifts: a future Claude release (or third-party model the workflow supports) shows the failure class in a spot check.
- goat-critique SKILL.md is restructured materially (beyond the 2026-04-18 CSO description rewrite) — trigger a fresh RED against the restructured body.

## What did ship in M08 §2

- RED session log: `.goat-flow/logs/sessions/2026-04-18-goat-critique-tdd.md`
- `tdd-log:` frontmatter added to `workflow/skills/goat-critique/SKILL.md`
- Installed copies in `.claude/skills/goat-critique/SKILL.md` and `.agents/skills/goat-critique/SKILL.md` updated to match
- Drift check: zero findings

## Cross-references

- Plan: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md` §2
- Methodology §7 bulletproof signs: `.goat-flow/references/skill-tdd-methodology.md:79-93`
- Target failure lesson: `.goat-flow/lessons/agent-behavior.md:108-118`
- Appendix A candidates not encoded: `.goat-flow/tasks/1.2.0/M08-skill-tdd-rationalization.md:193-199`
