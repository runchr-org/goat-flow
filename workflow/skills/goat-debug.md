---
name: goat-debug
description: "Diagnosis-first debugging with hypothesis tracking and recurrence checks. Includes investigate mode for deep codebase exploration and onboarding."
goat-flow-skill-version: "1.1.0"
---
# /goat-debug

## Shared Conventions

Read `.goat-flow/skill-conventions.md` for full shared conventions.
If unavailable, use these essentials:
- Severity: SECURITY > CORRECTNESS > INTEGRATION > PERFORMANCE > STYLE
- Evidence: every finding MUST include file:line, tag OBSERVED vs INFERRED
- Learning loop: check .goat-flow/lessons/ and .goat-flow/footguns/ after completion
- Gates: BLOCKING GATE = stop and wait. CHECKPOINT = continue unless interrupted.
- Task tracking: tick checkboxes immediately when completed, not at the end.

## When to Use

Use when diagnosing a bug, understanding unfamiliar code, or onboarding to a new project.

**Complexity classification:** A 1-2 file bug fix is a Hotfix — minimal ceremony. A cross-system investigation is Standard. Don't over-classify: if you can describe the fix in one sentence, it's a Hotfix regardless of project size.

**Mode routing:**
- Has a specific bug/symptom → **Diagnose mode** (Phases D1-D4)
- Exploring unfamiliar code, no bug → **Investigate mode** (Phases I1-I3)
- New to this project, need to set up → **Onboard mode** (Phases I1-I3 + O1-O2)

**If you want to "just try something" before tracing the code path, STOP.**
That's the failure mode this skill exists to prevent.

**NOT this skill:**
- Reviewing changes for quality → /goat-review
- Generating test instructions → /goat-test
- Planning a new feature → /goat-plan

## Step 0 - Choose Depth and Frame the Debugging Work

Start with the depth choice, not a long intake.

Default opener:
> "Debugging [X] — do you want a quick diagnosis, or the full investigation with a hypothesis table and deeper trace?"

**Adaptive Step 0:**
- If the user already says "quick", "full", "diagnose", "investigate", or "onboard", confirm and continue.
- If the request is vague, ask one natural follow-up that covers the goal, the symptom or error, what area is involved, and what the user was doing when it broke.
- If the user says "I'll figure it out from the code" or provides minimal info, auto-detect from error output, `git diff`, or named files and confirm.

**Quick diagnosis path:**
- Gather the goal, symptom, error, area, and anything already tried in one short exchange.
- Diagnose the issue and, if the user wants implementation, carry straight into the fix plan and verification.
- Keep the conversation moving unless the user interrupts.

**Full investigation path:**
- Confirm the goal, symptom, area, urgency, and mode.
- Run the complete Diagnose, Investigate, or Onboard workflow with the full hypothesis table and trace depth.

**Mode selection:**
- Bug, symptom, error, crash, or failing test → **Diagnose mode**
- Explore, understand, how does, or unfamiliar area → **Investigate mode**
- Onboard, new project, or set up instructions → **Onboard mode**

**Auto-detect:** Read the error message or test output if provided inline.
If the user said `/goat-debug the test in auth.test.ts fails with TypeError`,
confirm: "Symptom: TypeError in auth.test.ts. I'll start with that file. Correct?"

**Footgun check:** If `.goat-flow/footguns/` exists, read entries mentioning the target area. Also check `.goat-flow/lessons/` for recurrence. If a match is found, present it: "This area has a known issue: [footgun]. Relevant?"

**Before proceeding:** present what you know (goal, symptom, area, selected depth, selected mode) and what you still need. For the full path, wait for confirmation. For the quick path, confirm and continue unless the user stops you.

---

## Diagnose Mode (Phases D1-D4)

### Phase D1 - Investigate (no fixes)

(Recurrence check already done in Step 0 - do not repeat here.)

**HYPOTHESIS TRACKING:** After initial read of the primary file,
write 2-3 hypotheses. Hypotheses MUST span at least 2 categories:
- Data (wrong input, missing field, encoding)
- Logic (off-by-one, wrong condition, fence-post error)
- Timing (race condition, async ordering, timeout)
- Environment (config, dependency version, platform difference)
- Configuration (wrong setting, missing env var, stale cache)

Include at least one boundary/counting hypothesis if the bug involves loops,
indices, arrays, or pagination.

After tracing, mark each: CONFIRMED / ELIMINATED / UNRESOLVED with evidence.

*Example:*
| 1 | Token expiry uses `<` instead of `<=` | Logic | CONFIRMED | `auth.ts:47` |
| 2 | Session store timing out under load | Timing | ELIMINATED | `config/redis.ts:12` shows 30s TTL, not related |

**CAN'T REPRODUCE?** If you can't reproduce after 5 file reads:
1. Log what you checked and what you expected to find
2. Suggest logging additions at suspected locations
3. Ask the user for more reproduction context

Generate multiple hypotheses internally before committing to a trace path.

### Phase D2 - Diagnosis

Present findings using the Output Format template below:
- Root cause with **confidence level**: HIGH (reproduced) / MEDIUM (traced to cause) / LOW (inferred from patterns)
- Hypothesis table with status
- Reproduction steps: "1, 2, 3 → expected: [X], actual: [Y]"

**Confidence floor:** Do not advance to Phase D3 if ALL findings are LOW confidence.
Return to Phase D1 for deeper investigation, or present partial findings and ask
the user whether to proceed or dig deeper.

**BLOCKING GATE:** Present diagnosis, then pause. If the human wants deeper investigation, keep digging. If they want you to propose a fix plan, move to Phase D3. If this matches a known issue or they want to just report findings, stop here. If the better next step is broader exploration, switch to Investigate mode.

If the user's original intent was "just diagnose" or "investigate" (no implementation verbs), default to just report findings and stop here without proposing a fix.

### Phase D3 - Fix Plan

Only if human approved. Propose a fix plan (not the fix itself):
- **What changes:** specific files and functions
- **Blast radius:** what else could break
- **Architecture check:** verify fix doesn't violate constraints in `.goat-flow/architecture.md`
- **Verification:** how to confirm the fix worked (specific test or command)

"Should I implement this fix?"

If yes → implement. Then auto-transition to Phase D4 (skip redundant "confirm fix applied" when the agent did the work).

### Phase D4 - Post-Fix Verification

If a fix was applied (by agent or human):
1. Run the specific verification from Phase D3
2. Check for regressions in related areas
3. Grep for the old pattern if anything was renamed

**Two-corrections rule:** If you've been corrected twice on the same approach,
stop and rewind. Present what you've tried and ask the human for a different angle.

**CHECKPOINT:** "Fix verified: [pass/fail]. Regressions: [none/found]. Learning loop: [entry needed/none]."

---

## Investigate Mode (Phases I1-I3)

### Phase I1 - Scope & Plan

Declare before reading deeply:
- **In scope:** [files, directories, or patterns]
- **Out of scope:** [what we're NOT investigating]
- **Read estimate:** How many files do you expect to read? (If you exceed 3x this estimate, pause and re-scope.)

Read `.goat-flow/footguns/` for entries mentioning the target area.

**BLOCKING GATE:** "I'll investigate [scope] reading up to [N] files. Adjust?"

### Phase I2 - Read (Progressive Depth)

Read in layers:
1. **Entry points** - where execution starts
2. **Critical path** - main flow through the area
3. **Supporting files** - helpers, utilities, configs

For each file, log: role, connections, evidence tag (OBSERVED / INFERRED).

**CHECKPOINT:** If reads exceed 3x your initial estimate: "[N] files read, estimated [M]. Re-scope or continue?"

### Phase I3 - Report

Produce investigation report. Required sections:
- **What I Didn't Read** - REQUIRED. List skipped files/areas with reasons.
- **Current vs Expected State** - what IS vs what SHOULD BE.
- **Evidence tags** - OBSERVED for verified, INFERRED for deductions (state what's missing).

**BLOCKING GATE:** Present the report, then pause so the human can go deeper into a specific area, check a boundary you did not cross, switch to Diagnose mode if a bug emerged, or close.

---

## Onboard Mode (I1-I3 + O1-O2)

Activated when Step 0 goal = "onboarding" / "new to this project."

Runs Investigate mode (I1-I3) plus:

### Phase O1 - Stack Detection (before I1)
1. Languages: scan file extensions, read build configs
2. Frameworks: identify from dependencies
3. Build/test/lint: extract commands from config files
4. Directory structure: map top-level organization

Present: "This project uses [languages] with [frameworks]. Build: [cmd], Test: [cmd]. Correct?"

### Phase O2 - Glossary & Instruction Drafting (after I3)

**Glossary:** If `.goat-flow/glossary.md` exists, read it. If not, build one from codebase.

**Instruction Drafting (if requested):** Present all content inline BEFORE writing files. Source of truth is code, not docs. MUST NOT include aspirational content.

**BLOCKING GATE:** "Write these files, or adjust first?"

---

## Common Failure Modes

1. **"Just try something"** - agent patches without understanding. Phase D1 prevents this.
2. **Single-track hypothesis** - 3 variations of the same theory. The 2-category rule prevents this.
3. **Premature fix** - agent proposes a fix with LOW confidence. The confidence floor prevents this.

## Constraints

Conversational: present findings by severity tier, pause between tiers. Let the human drill in.

<!-- FIXED: Do not adapt these -->
- MUST write hypotheses AFTER initial read of the primary file (diagnose mode)
- MUST include at least 2 hypothesis categories (diagnose mode)
- MUST NOT propose fixes until human reviews diagnosis (D2→D3 gate)
- MUST declare scope before deep reading (investigate mode)
- MUST tag evidence as OBSERVED or INFERRED (investigate mode)
- MUST include "What I Didn't Read" in every investigation report
- MUST pause if reads exceed 3x initial estimate - re-scope before continuing (investigate mode)
- MUST check recurrence against footguns + lessons (diagnose mode)
- MUST NOT fabricate file paths or function names
- MUST verify fix doesn't violate architecture constraints

## Output Format

```markdown
## TL;DR
<!-- 1 sentence: root cause + confidence level -->

## Hypotheses
| # | Hypothesis | Category | Status | Evidence |
|---|-----------|----------|--------|----------|
| 1 | [description] | data/logic/timing/env/config | CONFIRMED/ELIMINATED/UNRESOLVED | `file:line` |

## Root Cause
**Confidence:** HIGH (reproduced) | MEDIUM (traced) | LOW (inferred)
**Location:** `file:line`
**Description:** [what's wrong and why]

## Reproduction Steps
1. [step]
2. Expected: [X] - Actual: [Y]

## Fix Plan
<!-- Only if human approved Phase D3 -->
- What changes: [description]
- Blast radius: [what else could break]
- Verification: [how to confirm the fix worked]
```

## Chains With

- /goat-test - bug fixed, need verification plan
- /goat-review - fix or investigation ready, needs review
- /goat-plan - investigation reveals need for structured planning
- /goat-security - investigation reveals security concerns

**Handoff shape:** `{mode, bug_description?, root_cause?, confidence?, scope?, components?, risks?, open_questions?}`
