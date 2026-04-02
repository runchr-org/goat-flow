---
name: Dispatcher intent mapping has no coverage for analysis/evaluation verbs
status: active
created: '2026-03-30'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** User asks `/goat analyse this plan` or `/goat evaluate the setup`. Dispatcher auto-routes to goat-review without disambiguating. User expected goat-plan (or wanted to choose). The wrong skill loads and the entire interaction is wasted.

**Why it happens:** The dispatcher's intent mapping table has rows mapping keywords to skills. "Analyse", "evaluate", "critique", "assess", and "deeply review" appear in none of them. When no keyword matches, the agent falls through to the closest semantic match instead of triggering the disambiguation path.

**Evidence:**
- `.claude/skills/goat/SKILL.md` → intent mapping table has no row for analyse/evaluate/critique
- `.claude/skills/goat/SKILL.md` → disambiguation table lacks "analyse a plan" ambiguity
- `workflow/skills/goat.md` → same gap in the template version
- Real incident: `/goat deeply analyse this plan: tasks/roadmaps/0.9.3/tasks.md` routed to goat-review without asking (2026-03-30)

**Prevention:** Add analysis/evaluation verbs to the disambiguation table (NOT the intent mapping table — they are inherently ambiguous). When the target is a planning artifact (path contains `roadmap`, `plan`, `todo`, `milestone`), always present goat-review vs goat-plan as options. The dispatcher's job is to route clearly and ask when unclear — not to guess.
