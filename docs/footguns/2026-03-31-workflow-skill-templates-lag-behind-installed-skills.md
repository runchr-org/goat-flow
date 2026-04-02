---
name: Workflow skill templates lag behind installed skills
status: active
created: '2026-03-31'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Consumer projects running `npx goat-flow setup` get templates at v0.9.2 while the package is v0.9.3. The setup agent writes "0.9.2" from the template, the scanner flags it as outdated, and the agent has to do a second pass to fix every skill to "0.9.3."

**Why it happens:** The `workflow/skills/*.md` templates are the source of truth for consumer projects. When goat-flow's own installed skills (`.claude/skills/`) get updated, the templates don't automatically follow. The npm publish script doesn't verify template versions match `RUBRIC_VERSION`.

**Evidence:**
- `workflow/skills/goat-debug.md` → frontmatter version lagging behind `.claude/skills/goat-debug/SKILL.md`
- devgoat-bash-scripts review: "templates ship with 0.9.2 but scanner expects 0.9.3"
- halaxy-cypress review: "skill version mismatch between templates and installed package"

**Prevention:** npm publish script or preflight must verify all `workflow/skills/*.md` files have `goat-flow-skill-version` matching `RUBRIC_VERSION`. Fail the publish if they don't match.
