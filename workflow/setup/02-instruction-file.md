# Step 02 — Instruction File

Create or update the agent's instruction file (CLAUDE.md / AGENTS.md / GEMINI.md).

## First: detect the stack

1. Detect the project's languages, build/test/lint/format commands by reading package.json, Cargo.toml, go.mod, composer.json, pyproject.toml, Gemfile, *.csproj, or equivalent. List what you find.
2. Check for other agent instruction files. If multiple exist, this is a multi-agent project — only modify the one specified in your agent config file.
3. Check for existing `.goat-flow/` content — note what already exists so later steps merge, not replace.

## Then: check if the instruction file exists

### Path A — No instruction file exists (create new)

Create the instruction file at the path specified in your agent config file. Include all required sections listed below. Adapt all examples and boundaries for THIS project using the stack you just detected.

Target: under 120 lines. Hard limit: 150. Keep it concise — the instruction file is loaded every turn.

### Path B — Instruction file already exists (update)

Read it completely before changing anything. Then:

1. **Do not change the existing content** unless it's obviously an existing goat-flow instruction file from a previous setup. The user wrote this file — respect it.
2. **Add a goat-flow section at the top** with any missing required sections from the list below. The existing content stays below it unchanged. Top-of-file survives context compaction.
3. If it IS an existing goat-flow instruction file (has execution loop, autonomy tiers, router table already), update it in place — fix stale paths, update version header, add missing sections.
4. Do NOT create "original-*" backup files. Git history preserves the original.

## Required sections (both paths)

The instruction file MUST include these sections. Use `workflow/setup/execution-loop.md` as the template:

- (a) Version header
- (b) Execution loop: READ → CLASSIFY → SCOPE → ACT → VERIFY → LOG
- (c) Autonomy tiers: Always / Ask First / Never
- (d) Definition of Done
- (e) Router table
- (f) Essential commands

Adapt all examples, Ask First boundaries, and essential commands for THIS project's real codebase. Use real file paths, real commands, real boundaries.

## Optional: project infrastructure

Add a brief section documenting deployment platform, branch conventions, and required runtime versions — only if this information isn't already captured elsewhere in the project.

## Housekeeping

After writing/updating the instruction file:

- Add agent-local settings to `.gitignore` if not already there (e.g., `.claude/settings.local.json`)
- If the project uses a code formatter (prettier, biome, etc.), add `.goat-flow/**/*.md` to the formatter's ignore file (`.prettierignore`, `biome.json` ignores, etc.)

---

**Verification gate:**
- [ ] Instruction file exists at the correct path
- [ ] All sections (a) through (f) are present
- [ ] Examples and boundaries reference real project files
- [ ] If Path B: no useful existing content was lost
- [ ] `.gitignore` updated for agent-local files

NEXT: proceed to `03-install-skills.md`
