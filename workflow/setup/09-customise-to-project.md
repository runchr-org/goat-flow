# Step 09 — Customise to Project

Steps 02–08 created the structure. This step makes it useful. Stop following templates and start reading the actual codebase to write project-specific content.

This step should take the longest — it's doing real work, not copying templates.

## Footguns — find real traps in the code

```bash
grep -rn 'TODO\|FIXME\|HACK\|XXX' src/ --include='*.ts' --include='*.php' --include='*.py' | head -20
git log --oneline -50 | grep -iE 'fix|revert|hotfix|bug|broke|rollback'
```

- Read config files for stale project names, hardcoded paths, outdated references
- Write findings to `.goat-flow/footguns/` bucket files with real file paths as evidence
- Every entry MUST cite specific file paths. Use `ACTUAL_MEASURED` evidence labels.
- If `.goat-flow/footguns/` already has entries, MERGE — do not replace

## Lessons — extract from git history

- Use the same `git log` scan — for each incident, what was the root cause and what should have been done differently?
- Write to `.goat-flow/lessons/` category bucket files
- If `.goat-flow/lessons/` already has entries, MERGE — do not replace

## Architecture — make it real

- Review `.goat-flow/architecture.md` created in step 07
- Is it generic or does it reflect the actual system?
- Add: data flows, non-obvious constraints, deliberate trade-offs, deployment topology
- Remove anything that reads like template fill

## Glossary — add real domain terms

- Read the codebase for domain-specific terminology (model names, service names, acronyms)
- Update `.goat-flow/glossary.md` with terms a new contributor would need

## Instruction file — adapt Ask First boundaries

- Review the Ask First section. Are the boundaries specific to this project's real risk areas?
- Are there directories with complex ownership, migration scripts, config that shouldn't be touched?
- Update with real paths and real reasons

---

**Verification gate:**
- [ ] Every footgun entry references a real file path in this project
- [ ] Every lesson references a real git commit or incident
- [ ] architecture.md mentions at least 2 real components by name
- [ ] glossary.md has at least 3 project-specific terms
- [ ] Ask First boundaries reference real directories that exist on disk

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 09-customise-to-project
- **What was done:** (footguns found, lessons extracted, architecture enhanced, terms added)
- **Self-critique:** (honest assessment)

NEXT: proceed to `10-polish.md`
