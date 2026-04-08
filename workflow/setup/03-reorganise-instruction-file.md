# Step 03 — Reorganise Instruction File

For projects with an existing instruction file. If the project has no instruction file, go back to `02-create-instruction-file.md`.

## Read the existing file completely

Before changing anything, read the entire instruction file. Understand what it contains.

## Separate domain knowledge from agent instructions

Classify every section:

- **Domain knowledge** = describes HOW THE PROJECT WORKS (entity relationships, architecture, constraints, domain concepts, data flows, API contracts)
  - Test: "The API uses chi router on port 8080" → domain knowledge → MOVE
- **Agent instructions** = commands the agent with imperative verbs (commands, rules, boundaries, behavioral constraints)
  - Test: "Never create middleware.ts" → agent instruction → KEEP

## Move domain knowledge to better homes

Extract domain knowledge to:
- `.goat-flow/architecture.md` — system structure, data flows, component relationships, non-obvious constraints, deliberate trade-offs
- `.goat-flow/glossary.md` — domain terms, entity definitions, acronyms

This preserves the content in a better location, loaded on demand via the Router Table. No content is lost.

## Keep behavioral rules in the instruction file

Keep all:
- Commands, prohibitions, imperative rules
- Ask First boundaries with real paths and reasons
- Essential commands
- Existing agent-specific configuration

## Add missing goat-flow sections

Compare against `workflow/setup/execution-loop.md`. Add any missing sections:
- Execution loop (READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG)
- Autonomy tiers (Always / Ask First / Never)
- Definition of Done (6 gates)
- Working Memory
- Sub-Agent Objectives, Communication When Blocked
- Router table (MUST reference `.goat-flow/` paths)
- Essential commands

## Never create backup copies

Do NOT copy to "original-*" backup files. The content is reorganised, not destroyed. Git history preserves the original.

---

**Verification gate:**
- [ ] Instruction file is under 120 lines (report actual count)
- [ ] All domain knowledge extracted to `.goat-flow/architecture.md` and/or `.goat-flow/glossary.md`
- [ ] No domain content was deleted — verify it exists in the new locations
- [ ] All goat-flow sections present (execution loop, autonomy tiers, DoD, router table, essential commands)
- [ ] No "original-*" backup files created

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 03-reorganise-instruction-file
- **What was done:** (content moved, line count before/after, sections added)
- **Self-critique:** (honest assessment)

NEXT: proceed to `04-setup-execution-loop.md`
