# Step 05 — Install Skills

Install the 6 goat-flow skills (5 functional + 1 dispatcher) in the agent's skills directory.

## Pre-existing skills

If non-goat-prefixed skills exist (e.g., audit/, review/, preflight/), IGNORE them — they are the project's custom skills. Do not modify, delete, or merge them.

## Skills to install

Read the detailed templates in `workflow/skills/goat-*.md` before creating. Create or update these 6 skills in the agent's skills directory (see agent config file for path):

1. **goat-debug/SKILL.md** — Diagnosis-first debugging. Hypothesis tracking, recurrence checks. Includes investigate and onboard modes.
2. **goat-review/SKILL.md** — Structured code review + quality audit + simplify mode. RFC 2119 severity, footgun matching.
3. **goat-security/SKILL.md** — Threat-model-driven security assessment. Exploitability ranking, dependency auditing.
4. **goat-plan/SKILL.md** — Planning with SBAO (multi-perspective sub-agent critique) and Mob Elaboration. Kill criteria, milestone archetypes. Includes refactor planning mode.
5. **goat-test/SKILL.md** — 3-phase test plan generation. Doer-verifier principle.
6. **goat/SKILL.md** — Dispatcher. Routes natural language to the right skill. Required — scanner checks for it (check 2.1.20).

## Requirements for each skill

Each SKILL.md MUST include:
- `goat-flow-skill-version:` in YAML frontmatter matching the current goat-flow version
- Sections: When to Use, Step 0 / Gather Context, Process with phased steps, Constraints, Output Format, Chaining

**IMPORTANT: Install skills VERBATIM from the templates. Do NOT adapt, compress, rewrite, or remove any sections.** Skills are the same for every project — project-specific context comes from CLAUDE.md, `.goat-flow/footguns/`, and `.goat-flow/coding-standards/`, which skills read at runtime. Cutting or rewriting skill content causes more damage than generic examples ever will.

## Version check

After installing, verify each SKILL.md frontmatter has the correct `goat-flow-skill-version`. Check the expected version in `workflow/skills/goat-debug.md` line 4. Mismatched versions trigger AP15 deduction (-2 per skill, max -10).

---

**Verification gate:**
- [ ] All 6 skill files exist in the agent's skills directory
- [ ] goat/SKILL.md (dispatcher) exists
- [ ] All 6 skills have matching `goat-flow-skill-version` tags
- [ ] Instruction file router table references the skills directory

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 05-install-skills
- **What was done:** (skills created/updated, version tag)
- **Self-critique:** (honest assessment)

NEXT: proceed to `06-setup-coding-guidelines.md`
