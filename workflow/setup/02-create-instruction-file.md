# Step 02 — Create Instruction File

For bare projects with no existing instruction file. If the project already has one, go to `03-reorganise-instruction-file.md` instead.

## Detect stack and current state

1. Detect the project's languages, build/test/lint/format commands by reading package.json, Cargo.toml, go.mod, composer.json, pyproject.toml, Gemfile, *.csproj, or equivalent. List what you find.
2. Check for other agent instruction files (CLAUDE.md, AGENTS.md, GEMINI.md). If multiple exist, this is a multi-agent project.
3. Check for existing `.goat-flow/` content — note what already exists so later steps merge, not replace.

## Create the instruction file

Create the instruction file at the path specified in your agent config file (`agents/*.md`).

Use `workflow/setup/execution-loop.md` as the authoritative template for all sections. The instruction file MUST include:

- (a) Version header
- (b) Execution loop: READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG
- (c) Autonomy tiers: Always / Ask First / Never
- (d) Definition of Done: 6 gates
- (e) Working Memory
- (f) Sub-Agent Objectives
- (g) Communication When Blocked
- (h) Router table
- (i) Essential commands

Adapt all examples and Ask First boundaries for THIS project. Do NOT skip sections (f)–(i).

Add a ## Project Infrastructure section documenting:
- Deployment platform, branch conventions, required runtime versions
- Container/build rebuild command, CI/CD system

Target: under 120 lines. Hard limit: 150.

---

**Verification gate:**
- [ ] Instruction file exists at the correct path
- [ ] Line count is under 120 (report actual count)
- [ ] All sections (a) through (i) are present
- [ ] Essential commands actually run

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 02-create-instruction-file
- **What was done:** (file created, line count, stack detected)
- **Self-critique:** (honest assessment)

NEXT: proceed to `04-setup-execution-loop.md` (skip 03)
