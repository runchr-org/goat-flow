# Prompt: SBAO Ranking

> **When to use:** After writing your [feature brief](feature-brief.md) and optionally running [Mob Elaboration](mob-elaboration.md). Use this to generate and refine a technical plan before breaking it into [milestones](milestone-planning.md).

Signal-Based Adaptive Orchestration: ask multiple agents for competing
plans, then force comparison, critique, and synthesis instead of accepting
the first plausible answer.

Use this only when the change is important enough to justify extra planning
cost: migrations, architecture shifts, risky integrations, or ambiguous
requirements.

## Step 1: Generate competing plans

Create 2 or 3 competing plans. Vary the context intentionally:
- one with the full repo context you believe matters
- one with a cleaner or "fresh context" framing
- optionally one from a different model or provider if the first two
  differ materially

Give each planner the same requirements artifact and the same constraints.
Ask for a plan only, not implementation.

Suggested prompt:

```
Read the current codebase and the attached requirements artifact.
Produce a technical plan only. Do not write code.

Write your output to the tasks directory (check config.yaml for path, default `.goat-flow/tasks/`) as `<feature-name>-plan-<agent>.md`.

The plan must cover:
- scope and non-goals
- affected systems/files
- sequencing and milestones
- validation strategy
- key risks and rollback considerations
```

## Step 2: Rank the plans

Once the candidate plans exist, ask one or more agents to compare them.
Make the rubric explicit so the ranking is not just style preference.

Suggested prompt:

```
Rank these plans in a comparison table and score each out of 100.

Judge them on:
1. correctness against the current codebase
2. integration safety and blast-radius control
3. sequencing and milestone quality
4. validation and rollback quality
5. clarity, specificity, and avoidance of hand-wavy work

Call out:
- what each plan gets right
- what each plan misses
- where two plans disagree materially
```

## Step 3: Cross-examine the top plans

If the top two plans differ on an architectural decision, force one more
round of critique before choosing.

Suggested prompt:

```
These two plans disagree materially. Explain the trade-off directly.
Which assumptions drive the disagreement? Which plan better matches the
current codebase and why?
```

## Step 4: Create the prime plan

Review the candidate plans and write down what should survive.
Then ask your preferred agent to synthesize the prime plan:

```
I've reviewed these competing plans. Here's what I like and don't like:

**Keep:** [list the ideas, approaches, or architectural choices you want to keep]
**Drop:** [list what you disagree with or want to change]
**Decide:** [list open questions or trade-offs you want the agent to weigh in on]

Create a best-of-all-ideas plan in the tasks directory as `<feature-name>-plan-prime.md` that incorporates the Keep items, avoids the Drop items, and makes a reasoned recommendation for each Decide item.
```

## Quality Bar

- Do not accept a plan just because it is longer
- Prefer plans that tie claims to the current repo structure
- Penalize plans that skip validation, migration, or rollback concerns
- If all candidate plans are weak, run another planning round instead of
  forcing a bad prime plan
- Preserve the comparison table alongside the prime plan so later work can
  see which trade-offs were made

---
