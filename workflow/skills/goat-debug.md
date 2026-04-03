---
name: goat-debug
description: "Diagnosis-first debugging with hypothesis tracking, recurrence checks, and evidence-based fix planning."
goat-flow-skill-version: "0.10.0"
---
# /goat-debug

## Shared Conventions

- **Severity:** SECURITY > CORRECTNESS > INTEGRATION > PERFORMANCE > STYLE
- **Evidence:** Every finding needs `file:line`. Tag as OBSERVED (verified) or INFERRED (state what's missing). MUST NOT fabricate.
- **Gates:** BLOCKING GATE = must stop for human. CHECKPOINT = report status, continue unless interrupted.
- **Adaptive Step 0:** If context already provided, confirm it - don't re-ask. Bare invocation with no arguments = zero context = ask structural questions and WAIT. Auto-detect pre-fills - it does not replace confirmation.
- **Stuck:** 3 reads with no signal → present what you have, ask to redirect.
- **Ceremony:** Hotfix/Small Feature → skip closing ceremony, flush rule, footgun annotations, goat-plan Phases 2-3. Standard → full phases. System/Infrastructure → full + cross-boundary verification. Sub-agent mode → GATEs become CHECKPOINTs automatically.
- **Footgun fast-path:** If Step 0 footgun check matches a known trap, surface it immediately and offer the mitigation path. Still require READ + VERIFY on actual files — footguns are incident records, not executable specs.
- **Flush:** 10+ tool calls without a gate/checkpoint → write 3-sentence status to `.goat-flow/tasks/handoff.md`, ask to continue/compact/redirect. (Skip for Hotfix/Small Feature.)
- **Learning Loop:** Behavioural mistake → add a `## Lesson:` or `## Pattern:` entry to the relevant category bucket in `ai-docs/lessons/` or `.goat-flow/lessons/`. Architectural trap → add a `## Footgun:` entry to the relevant category bucket in `ai-docs/footguns/` or `.goat-flow/footguns/`.
- **Closing:** If incomplete → write `.goat-flow/tasks/handoff.md`. Check learning loop. Write session log to `.goat-flow/logs/sessions/YYYY-MM-DD-slug.md`. Suggest next skill.

## When to Use

Use when diagnosing a bug or unexpected behavior - especially when the root
cause is unclear or spans multiple components.

Purpose: diagnosis-first debugging. The agent gathers context, then investigates
and produces a diagnosis with evidence BEFORE proposing any fix.

**If you want to "just try something" before tracing the code path, STOP.**
That's the failure mode this skill exists to prevent.

**NOT this skill:**
- Exploring unfamiliar code without a bug → /goat-debug (investigate mode)
- Reviewing changes for quality → /goat-review
- Generating test instructions → /goat-test
- Performance profiling or unclear requirements → general reasoning

## Step 0 - Gather Context

<!-- ADAPT: Replace illustrative questions (3, 4) with your project's common debug targets -->

**Structural questions (always ask or confirm):**
1. What's the symptom? (error message, unexpected behaviour, test failure)
2. Which area? (or I'll scan `git diff` to find it)
3. When did it start? (e.g., after a specific commit, deploy, or "always")

**Illustrative questions (adapt):**
4. <!-- ADAPT: "Which area? (e.g., auth flow, database queries, API endpoints, build pipeline)" -->
5. What have you already tried? (so I don't repeat dead ends)
6. How urgent? Default: 10 turns. After that, present what you have even if incomplete.

**Escape hatch:** If the user says "I'll figure it out from the code" or provides minimal info, proceed with what you have — auto-detect from error output, `git diff`, or named files.

**Auto-detect:** Read the error message or test output if provided inline.
If the user said `/goat-debug the test in auth.test.ts fails with TypeError`,
confirm: "Symptom: TypeError in auth.test.ts. I'll start with that file. Correct?"

**Footgun check:** If `ai-docs/footguns/` or `.goat-flow/footguns/` exists, read entries mentioning the target area from both locations. If a match is found, present it: "This area has a known issue: [footgun]. Relevant?"

**Contradiction check:** If the user's stated complexity doesn't match the actual scope, flag it:
- "hotfix" but 5+ files affected → likely Standard or System
- "small feature" but crosses 3+ boundaries → likely System
- "quick test" but 20+ functions in target → warn scope is larger than implied
Surface the mismatch, suggest re-classification. Don't silently proceed.

**Before proceeding:** present what you know (symptom, area, urgency) and what you still need. Wait for the user to confirm before entering Phase 1.

## Phase 1 - Investigate (no fixes)

(Recurrence check already done in Step 0 — do not repeat here.)

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

## Phase 2 - Diagnosis

Present findings using the Output Format template below:
- Root cause with **confidence level**: HIGH (reproduced) / MEDIUM (traced to cause) / LOW (inferred from patterns)
- Hypothesis table with status
- Reproduction steps: "1, 2, 3 → expected: [X], actual: [Y]"

**Confidence floor:** Do not advance to Phase 3 if ALL findings are LOW confidence.
Return to Phase 1 for deeper investigation, or present partial findings and ask
the user whether to proceed or dig deeper.

**BLOCKING GATE:** Present diagnosis. Offer:
(a) investigate deeper - I'm not confident yet
(b) propose a fix plan
(c) this matches a known issue - close
(d) something else

This gate is the core value of the skill. Skipping diagnosis is how 3-hour
debugging sessions start.

## Phase 3 - Fix Plan

Only if human approved. Propose a fix plan (not the fix itself):
- **What changes:** specific files and functions
- **Blast radius:** what else could break
- **Architecture check:** verify fix doesn't violate constraints in `ai-docs/architecture.md`
- **Verification:** how to confirm the fix worked (specific test or command)

<!-- ADAPT: Add your project's specific verification commands -->

"Should I implement this fix?"

If yes → implement. Then auto-transition to Phase 4 (skip redundant "confirm fix applied" when the agent did the work).

## Phase 4 - Post-Fix Verification

If a fix was applied (by agent or human):
1. Run the specific verification from Phase 3
2. Check for regressions in related areas
3. Grep for the old pattern if anything was renamed

**Two-corrections rule:** If you've been corrected twice on the same approach,
stop and rewind. Present what you've tried and ask the human for a different angle.

**CHECKPOINT:** "Fix verified: [pass/fail]. Regressions: [none/found]. Learning loop: [entry needed/none]."

## Common Failure Modes

1. **"Just try something"** - agent patches without understanding. Phase 1 prevents this.
2. **Single-track hypothesis** - 3 variations of the same theory. The 2-category rule prevents this.
3. **Premature fix** - agent proposes a fix with LOW confidence. The confidence floor prevents this.

## Constraints

<!-- FIXED: Do not adapt these -->
- MUST write hypotheses AFTER initial read of the primary file
- MUST include at least 2 hypothesis categories
- MUST NOT propose fixes until human reviews diagnosis (Phase 2→3 gate)
- MUST NOT fabricate file paths or function names
- MUST check recurrence against footguns + lessons before fresh investigation
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
<!-- Only if human approved Phase 3 -->
- What changes: [description]
- Blast radius: [what else could break]
- Verification: [how to confirm the fix worked]
```

## Chains With

- /goat-test - bug fixed, need verification plan
- /goat-debug (investigate mode) - root cause unclear, need deeper exploration
- /goat-review - fix ready, needs review before merge

**Handoff shape:** `{bug_description, root_cause, confidence, fix_applied, files_changed}`
