# Decisions

**Architectural Decision Records (ADRs).** A decision record captures a significant technical decision with the context that led to it, so future agents and developers understand WHY something is built the way it is - not just what was done.

Write a new ADR when a decision: changes how the system is structured, constrains future choices, reverses or supersedes a prior decision, or resolves a non-obvious trade-off that someone will later question.

Do NOT write an ADR for routine implementation choices, bug fixes, or changes that are self-explanatory from the code.

## Naming

Files are numbered sequentially: `ADR-NNN-kebab-case-title.md` (e.g. `ADR-001-config-storage-model.md`). To find the next number, check existing files in this directory.

## Required structure

Every ADR MUST have these sections:

```markdown
# ADR-NNN: Title

**Status:** Accepted | **Date:** YYYY-MM-DD

## Context

Why does this decision need to be made? What forces are at play?
Cite specific incidents, constraints, or prior decisions that created the need.
Real evidence only - never hypothetical scenarios.

## Decision

What was decided. Be specific enough that someone can verify whether
the codebase conforms.

## Consequences

Trade-offs: what becomes easier, what becomes harder, what follow-up
work is created.
```

## Status values

- **Accepted** - decision made, not yet fully implemented
- **Implemented** - decision made and reflected in the codebase
- **Superseded by ADR-NNN** - replaced by a later decision

When amending an accepted ADR, add an `**Updated:** YYYY-MM-DD` line below the Status/Date header.

## Optional sections

Add these when they earn their keep - not by default:

- `## Alternatives considered` - rejected options and why
- `## Revisit triggers` - conditions under which this decision should be reopened
- `## Related decisions` - links to other ADRs this builds on or constrains

## Quality bar

- Context must cite real incidents, measurements, or constraints - not hypothetical risks
- Decision must be specific enough to be verifiable ("we will X" not "we should consider X")
- Consequences must name concrete trade-offs, not just restate the decision as a benefit
- One decision per ADR; if two decisions are tangled, split them and cross-reference
