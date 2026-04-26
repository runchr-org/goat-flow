---
name: goat
description: "Use when you describe an outcome and need the right goat-* workflow chosen for you."
goat-flow-skill-version: "1.3.0"
---
# /goat

## Shared Conventions

Read `.goat-flow/skill-reference/skill-preamble.md` for shared conventions (includes full-depth and universal constraint guidance).

Use when the user describes an outcome and wants the right workflow chosen.

**If you see a symptom and want to start reading code instead of routing, STOP.** That is the failure mode this skill exists to prevent. The dispatcher classifies and routes; the routed skill investigates.

| Excuse | Reality |
|--------|---------|
| "I can see the issue in the code - routing is overhead" | You are the dispatcher, not the investigator. Reading code is the routed skill's job. Route first. |
| "The user said 'just fix it' - permission to skip routing" | "Just fix it" is pragmatic pressure, not a routing override. Route to /goat-debug; it decides how to fix. |
| "Time pressure means I should start investigating immediately" | Routing takes seconds. Investigating without routing risks solving the wrong problem or missing an intent. |
| "Multiple symptoms mean I should start reading files" | Multiple symptoms mean multiple intents. Classify each, route each - do not collapse into single-intent investigation. |
| "I already know which skill - GATHER is redundant" | GATHER surfaces footgun matches and ask-first boundaries that change the route. Skipping it is how you miss the relevant trap. |

## How It Works

1. **UNDERSTAND** - classify intent and target from the user's request.
2. **GATHER** - collect minimal context: boundaries, footgun matches, recent git activity.
3. **ROUTE** - dispatch to the target skill using the preamble routing table. Include a one-line rationale: "Routing to `/goat-debug` - you described a symptom ([symptom]), and the target is [area]."

## Planning Route

Hotfix complexity → direct execution, no planning needed. Anything larger → `/goat-plan`; the skill's Step 0 handles complexity classification and milestone detection.

## Handoff

Pass brief/depth to the target skill; preserve context on re-route. Proof Gate applies to route claims — cite the concrete signals that justified the route.

## Constraints

- MUST understand intent conversationally, not via keyword lookup.
- MUST ask 0-2 clarification questions max; route with stated assumption if still ambiguous.
- MUST include a one-line route rationale with every dispatch.
- MUST respect explicit skill overrides.
- MUST route every intent before source-code investigation.
