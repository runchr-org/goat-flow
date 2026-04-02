---
name: Concept duplication across core docs
status: active
created: 2026-03-18
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** A user reads conflicting descriptions of the same concept in different files. An agent follows a rule from one file that contradicts another.

**Why it happens:** The execution loop, autonomy tiers, anti-pattern table, and other core concepts are described in `docs/system-spec.md`, `docs/system/six-steps.md`, `docs/system/five-layers.md`, `docs/getting-started.md`, and `docs/reference/design-rationale.md`. Updating one without updating the others creates drift.

**Evidence:**
- `docs/system-spec.md` → execution loop definition
- `docs/system/six-steps.md` → execution loop definition (detailed version)
- `docs/getting-started.md` → execution loop summary
- `docs/reference/design-rationale.md` → execution loop rationale with repeated content

**Prevention:** When editing a core concept, grep for the concept name across all docs and update every occurrence. `docs/system-spec.md` is the canonical source of truth.
