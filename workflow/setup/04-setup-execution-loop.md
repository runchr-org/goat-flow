# Step 04 — Setup Execution Loop

Verify and refine the execution loop in the instruction file. Steps 02 or 03 created the initial structure — this step ensures all 6 phases are complete and correct.

## The 6-step loop

Read `workflow/setup/execution-loop.md` as the authoritative reference. The instruction file MUST have all 6 steps:

1. **READ** — Read relevant files first, never fabricate codebase facts. Cross-doc: MUST read `.goat-flow/footguns/` before modifying Ask First files. Include BAD/GOOD example.

2. **CLASSIFY** — Three signals before acting:
   - Intent: question (answer it) vs directive (act on it)
   - Complexity: Hotfix / Small Feature / Standard / System Change / Infrastructure
   - Mode: Plan / Implement / Explain / Debug / Review

3. **SCOPE** — Declare before acting: files allowed to change, non-goals, max blast radius. Expanding beyond scope = stop and re-scope.

4. **ACT** — Behaviour per mode as a table. State declaration rule. Mode-transition rule. Anti-BDUF guard with BAD/GOOD example.

5. **VERIFY** — Continuous test loop. Two-level escalation. Plan tracking: tick checkboxes as tasks complete. Recovery protocols for common failures.

6. **LOG** — Mechanical triggers (non-negotiable):
   - VERIFY caught a failure → `.goat-flow/lessons/` entry BEFORE DoD
   - Human corrected agent → `.goat-flow/lessons/` entry IMMEDIATELY
   - Architectural trap with file:line evidence → `.goat-flow/footguns/`
   - Session logs to `.goat-flow/logs/sessions/`

## Check completeness

Compare each section against the reference. Fill gaps. Do NOT pad — if a section is already complete, leave it alone.

---

**Verification gate:**
- [ ] All 6 execution loop steps present (READ, CLASSIFY, SCOPE, ACT, VERIFY, LOG)
- [ ] ACT has state declaration AND mode-transition rule
- [ ] LOG has mechanical trigger + human correction trigger
- [ ] Instruction file still under 120 lines

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 04-setup-execution-loop
- **What was done:** (sections added/refined, line count)
- **Self-critique:** (honest assessment)

NEXT: proceed to `05-install-skills.md`
