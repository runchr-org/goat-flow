---
name: goat-sbao
description: "Multi-perspective critique using sub-agent orchestration. Generates competing analyses, ranks them, cross-examines disagreements, and synthesises a prime output."
goat-flow-skill-version: "1.1.0"
---
# /goat-sbao

## Shared Conventions

Read `.goat-flow/skill-preamble.md` for shared conventions.
On full-depth, also read `.goat-flow/skill-conventions.md`.
If unavailable, use these essentials:
- Severity: SECURITY > CORRECTNESS > INTEGRATION > PERFORMANCE > STYLE
- Evidence: every finding MUST include file or file:line, tag OBSERVED vs INFERRED
- Learning loop: check .goat-flow/lessons/ and .goat-flow/footguns/ after completion
- Gates: BLOCKING GATE = stop and wait. CHECKPOINT = continue unless interrupted.

## When to Use

Use when a concrete artifact deserves multi-perspective critique before shipping. Takes ANY input artifact: a plan, security assessment, debug hypothesis set, review findings, test strategy, architecture proposal, or refactor approach.

**Use when:**
- The stakes justify spawning 3 sub-agents
- You have a concrete artifact to critique (not vague ideas)
- You want competing perspectives, not just validation
- Called by another goat-* skill or directly by the user

**NOT this skill:**
- No artifact exists yet → create one first (goat-review, goat-debug, etc.)
- Simple factual question → answer directly
- Trivial artifact (hotfix, single-file change) → skip SBAO, the ceremony costs more than the insight

## Step 0 — Intake

Two intake modes:

**Standalone** (`/goat-sbao` or routed from `/goat`): Ask what artifact to critique. Confirm scope: "Critiquing [artifact]. Quick critique (2 sub-agents, no cross-examination) or full SBAO (3 sub-agents, ranking, cross-examination, synthesis)?"

**Skill-chained** (called from another goat-* skill): The calling skill passes the artifact and context. Skip the depth question and artifact identification — use the caller's choices. Still run the footgun/lesson check below before Phase 1. Default to full depth unless the caller specifies quick.

For both modes:
- Read `.goat-flow/footguns/` for entries relevant to the artifact's domain
- Read `.goat-flow/lessons/` for past critique outcomes in this area
- Identify the artifact type (plan, security assessment, hypothesis set, review findings, test strategy, architecture doc, other) — this determines the critique rubric
- If arriving from the dispatcher with depth already chosen, skip the depth question

## Phase 1 — Generate Competing Critiques

Spawn sub-agents (2 for quick, 3 for full). Each gets the artifact verbatim, project context (architecture.md, relevant footguns/lessons), the appropriate critique rubric, and a different framing directive:

- **Sub-agent A (Pragmatist):** "What breaks first? What's missing that will cause rework? What's over-engineered?"
- **Sub-agent B (Adversary):** "Attack this. Find the weakest assumptions. Where does this fail under stress, edge cases, or malicious input?"
- **Sub-agent C (Integrator — full only):** "Does it conflict with existing architecture? Does it create tech debt? Does it solve the stated problem or a different one?"

Each sub-agent MUST return:
- 3-7 findings: title, severity (CRITICAL/HIGH/MEDIUM/LOW), evidence (file:line or artifact section reference), confidence (HIGH/MEDIUM/LOW), one-sentence rationale
- Overall assessment: STRONG / ADEQUATE / WEAK / FLAWED
- One thing the artifact gets RIGHT that should be preserved

MUST use Agent tool calls, not inline role-play. Sub-agents run in isolated context.

## Phase 2 — Rank and Compare

Build a comparison matrix:

| Finding | Agent A | Agent B | Agent C | Agreement |
|---------|---------|---------|---------|-----------|
| [finding] | [severity] | [severity or n/a] | [severity or n/a] | consensus / split / unique |

Score each critique on: grounding, specificity, actionability, coverage, calibration.

Highlight:
- **Consensus** (2+ agents agree) — highest confidence
- **Split** (agents disagree on severity/existence) — needs cross-examination
- **Unique** (only one agent raised it) — may be insight or noise

## Phase 3 — Cross-Examine (full depth only)

For each split finding, spawn one more sub-agent: "Agent A says [X], Agent B says [Y]. Which is correct given the actual codebase?"

For unique HIGH/CRITICAL findings, spawn verification: "Only one critique raised [finding]. Genuine blind spot or false positive?"

Mark each: RESOLVED (with winner) / STILL DISPUTED / RETRACTED (false positive confirmed).

## Phase 4 — Synthesise

Produce the prime critique:
- Consensus findings (preserved as-is)
- Resolved split findings (with resolution rationale)
- Still-disputed findings (both positions, human decides)
- Verified unique findings (survived cross-examination)
- Retracted findings (listed so user sees what was considered and dismissed)

Before presenting, identify areas of the artifact that no sub-agent addressed — these are blind spots. List them in "What Wasn't Critiqued."

**BLOCKING GATE:** Present the synthesised critique. Human decides: apply recommendations, dig deeper, re-run with different framing, or close.

## Critique Rubrics

The rubric determines what sub-agents evaluate. Match to artifact type:

**Plan:** correctness against codebase, integration safety, sequencing quality, validation coverage, task specificity
**Security assessment:** threat model completeness, framework mitigation accuracy, exploitability calibration, data flow quality, attack surface coverage
**Debug hypotheses:** hypothesis diversity, evidence quality (OBSERVED vs INFERRED), elimination rigour, confidence calibration, reproduction completeness
**Review findings:** severity calibration, false positive rate, pre-existing separation, cross-reference impact, diff coverage
**Test strategy:** coverage gaps, doer-verifier separation, manual test specificity, mock awareness, risk-proportionate depth
**Architecture/refactor:** blast radius accuracy, migration safety, backward compatibility, dependency impact, rollback feasibility
**Generic (fallback):** internal consistency, evidence grounding, scope completeness, feasibility, risk identification

## Constraints

- MUST use Agent tool calls for sub-agents, not inline role-play
- MUST spawn sub-agents with isolated context (they cannot see each other's Phase 1 output)
- MUST include a critique rubric appropriate to the artifact type
- MUST present consensus/split/unique classification for every finding
- MUST cross-examine split findings and unique HIGH/CRITICAL findings (full depth)
- MUST preserve "what the artifact gets right" — this is not a negativity engine
- MUST list "what wasn't critiqued" in every output
- MUST NOT fabricate file paths, function names, or artifact content
- MUST NOT auto-apply recommendations — human gate required
- Quick depth: 2 sub-agents, skip Phase 3, compressed output
- Full depth: 3 sub-agents, full Phase 3, complete output
- Sub-agent budget: max 5 tool calls per sub-agent in Phase 1, max 3 per cross-examination in Phase 3

## Quick Output Format

TL;DR → consensus findings → split/unique findings → strengths → recommended changes.

## Output Format

```markdown
## TL;DR
## Critique Rubric  <!-- which rubric and why -->
## Sub-Agent Comparison Matrix  <!-- finding x agent grid -->
## Sub-Agent Rankings  <!-- grounding, specificity, actionability, coverage, calibration -->
## Consensus Findings  <!-- highest confidence -->
## Cross-Examination Results  <!-- split findings with resolution -->
## Verified Unique Findings  <!-- survived cross-examination -->
## Retracted Findings  <!-- considered and dismissed -->
## Strengths  <!-- what to preserve -->
## Recommended Changes  <!-- ordered by severity, each with concrete action -->
## Open Questions  <!-- needs human judgment -->
## What Wasn't Critiqued
```
