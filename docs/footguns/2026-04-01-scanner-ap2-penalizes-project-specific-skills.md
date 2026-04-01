---
name: Scanner AP2 penalizes project-specific skills
status: resolved
created: '2026-04-01'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** Scanner deducts -3 for any skill directory that doesn't start with `goat-`. Projects with custom skills (`deploy/`, `lint-fix/`, `preflight/`) get penalized and the setup fragment tells the agent to rename them to `goat-deploy/` etc.

**Why it happens:** AP2 assumed all skills in a project should have the `goat-` prefix. The check was dead code (could never trigger because `skills.found` only contains canonical goat-flow names from `SKILL_NAMES`), but the associated fragment `ap-fix-skill-names` contained harmful instructions that would rename project-specific skills.

**Evidence:**
- `src/cli/rubric/anti-patterns.ts` → AP2 check (removed)
- `src/cli/prompt/fragments/anti-patterns.ts` → `ap-fix-skill-names` fragment (removed)
- halaxy-agents-lab had project-specific `preflight/`, `audit/`, `review/` skills that would have been flagged

**Prevention:** Scanner checks should only validate goat-flow's own skills (from `SKILL_NAMES`), never impose naming conventions on project-specific skills. The `goat-` prefix is a goat-flow convention, not a universal rule.
