---
name: goat
description: "Single entry point that classifies intent and dispatches to the correct goat-* skill."
goat-flow-skill-version: "0.10.0"
---
# /goat

Route to the right skill in one step. Type `/goat` followed by what you need.

## How It Works

1. Read the user's input
2. Match intent to a skill using the table below
3. Announce: **"Running /goat-{skill}."** (Say "stop" or name a different skill to override.)
4. Load and execute the target skill's full process (Step 0, phases, gates)

The other 5 skills remain directly invocable. `/goat` is a convenience layer, not a replacement.

## Intent Mapping

| If the input mentions... | Route to | Mode | Edits code? |
|--------------------------|----------|------|-------------|
| understand, explore, how does, onboard, explain | **/goat-debug** | Investigate | No (read-only) |
| what's causing, diagnose, why is, symptom, trace | **/goat-debug** | Diagnose | No (read-only) |
| fix, change, update (specific bug) | **/goat-debug** | Diagnose → Implement | Yes (after diagnosis + approval) |
| review, PR, diff, merge, check changes | **/goat-review** | Auto-detect (Standard/Audit) | No (read-only) |
| audit, quality sweep, instruction staleness | **/goat-review** | Audit / Instruction | No (read-only) |
| simplify, readability, clean up, naming, messy | **/goat-review** | Simplify | No (read-only, suggests) |
| security, vulnerability, CVE, auth bypass, OWASP | **/goat-security** | Threat model | No (read-only) |
| HIPAA, GDPR, PHI, compliance, regulation | **/goat-security** | Compliance | No (read-only) |
| dependencies, CVEs, outdated packages | **/goat-security** | Dependency audit | No (read-only) |
| plan, design, architect | **/goat-plan** | Plan | No (read-only) |
| build, create, implement (new thing) | **/goat-plan** | Plan → Execute | Yes (after plan + approval) |
| rename, move, extract, restructure, refactor | **/goat-plan** | Refactor | Yes (after plan + approval) |
| test, testing, verification, coverage | **/goat-test** | Auto-detect (Standard/Audit) | No (read-only) |

**Investigation verbs** (understand, explain, diagnose, review, plan) → read-only mode. Skills stop at findings.
**Implementation verbs** (fix, build, change, create, implement) → carry through to implementation after the read-only phase completes and user approves.

## Disambiguation

When intent is ambiguous (matches 2+ skills), present the top 2 options:

> "This could be:
> (a) **/goat-debug** - if there's a specific bug or failure to diagnose
> (b) **/goat-review** - if you want a quality assessment of this area
>
> Which fits better, or tell me more?"

Do NOT guess when ambiguous. One clarification question is faster than loading the wrong skill.

### Common Ambiguities

| Input | Ambiguity | Resolution |
|-------|-----------|------------|
| "check the auth code" | debug vs review vs security | Ask: "Is there a bug, a quality concern, or a security concern? Or tell me more." |
| "improve the caching" | plan vs review(simplify) | Ask: "Is this a new design, a restructure, or a readability cleanup? Or tell me more." |
| "look at the database" | debug(investigate) vs review | Ask: "Understanding it, debugging an issue, or reviewing quality? Or tell me more." |
| "help with the migration" | plan vs plan(refactor) vs debug | Ask: "Planning it, executing a restructure, or fixing a failing one? Or tell me more." |
| "this code is bad" | review vs review(simplify) vs debug | Ask: "Is it broken, hard to read, or low quality? Or tell me more." |
| "analyse/evaluate/critique a plan" | review vs plan | Ask: "Find problems in the plan (review), or sharpen and improve it (plan)? Or tell me more." |
| "the login is broken" | investigate vs fix | Ask: "Do you want me to investigate this or fix it?" |
| "this code is messy" | review vs simplify vs refactor | Ask: "Review for quality, clean up readability, or plan a restructure?" |
| "we need tests" | test plan vs write tests | Ask: "Generate a test plan, or write the tests?" |

**Target-aware disambiguation:** If the input references a file path, check the path for context:
- Path contains `roadmap`, `plan`, `todo`, `milestone` → disambiguate between goat-review and goat-plan
- Path contains `test`, `spec`, `e2e` → lean toward goat-test
- Path contains `security`, `auth`, `vuln` → lean toward goat-security

## Bare Invocation

If the user types just `/goat` with no arguments:

> "What do you need? Some examples:
> - `/goat fix the login bug` → debug (diagnose mode)
> - `/goat review the PR` → code review
> - `/goat plan the new feature` → planning
> - `/goat check for security issues` → security assessment
> - `/goat explore the auth module` → debug (investigate mode)
> - `/goat clean up the naming` → review (simplify mode)
> - `/goat refactor the user service` → plan (refactor mode)
> - `/goat check for CVEs` → security (dependency audit)
>
> Or describe what you're working on and I'll route you."

## Simple Questions (escape hatch)

If the input is a simple factual question (no action verbs, question mark present, asking about facts/structure), **answer directly** without routing to a skill.

Examples:
- "What checks does the scanner run?" → just answer from knowledge
- "How many skills are there?" → "5 skills + dispatcher"
- "Where are the footguns stored?" → "docs/footguns/"

Do NOT route factual questions to goat-debug investigate mode — that's heavyweight for a 1-line answer.

## Override

If the user names a skill explicitly, respect it:
- `/goat --debug check the auth` → force goat-debug regardless of other signals
- `/goat I want goat-security on the payment flow` → detect the skill name, use it

## Output Format

The dispatcher's output is the routing announcement + handoff to the target skill. No standalone deliverable.

Conversational: announce the selected skill, wait for override, then hand off to the target skill's Step 0.

## Transparency

**BLOCKING GATE:** ALWAYS announce the selected skill and mode before executing:

> **Running /goat-debug (investigate mode).** (Say "stop" or name a different skill to override.)

Then proceed directly to the target skill's Step 0. Do NOT add a second round of context gathering. Offer: (a) proceed, (b) name a different skill.

## Constraints

- MUST announce which skill and mode was selected before executing
- MUST NOT add questions beyond the target skill's own Step 0
- MUST NOT load two skills simultaneously - dispatch to one
- MUST present disambiguation options when 2+ skills match equally
- MUST respect explicit skill name overrides in user input
- The other 5 skills MUST remain directly invocable - this is additive

## Post-Dispatch Chaining

After the dispatched skill closes, suggest the next most likely skill:

| Completed | Suggest next |
|-----------|-------------|
| goat-debug (diagnose) | "Want to `/goat-test` to verify the fix, or `/goat-review` the changes?" |
| goat-debug (investigate) | "Understand the area? `/goat-plan` to design changes, or `/goat-debug` to diagnose a bug." |
| goat-plan (plan) | "Ready to start implementing, or `/goat-test` to plan verification?" |
| goat-plan (refactor) | "Refactor done? `/goat-test` to verify nothing broke, or `/goat-review` the result." |
| goat-review | "Found issues? `/goat-debug` to diagnose, or `/goat-test` to verify coverage." |
| goat-security | "Want to `/goat-review` the fixes, or `/goat-test` to verify mitigations?" |
| goat-test | "Tests written? `/goat-review` the test quality, or move on." |

Only suggest if the user hasn't already indicated they're done. One line, not a menu.
