# Docs Seed Files

These files are created regardless of which agent you use. They form the learning loop and project documentation.

---

## Learning Loop Files

```
1. ai-docs/lessons/ - README plus category bucket files.
   Do NOT invent entries. If ai-docs/evals/ exist, check each incident:
   if the root cause was a behavioural mistake (not an architectural
   landmine), seed one lesson from it. This gives agents a format
   example and makes the file visible.
   To find real incidents in this project, run:
     git log --oneline -50 | grep -iE 'fix|revert|hotfix|bug|broke|rollback'
   For each match, add a lesson entry to the relevant category bucket
   (for example `verification.md` or `workflow.md`) with: Created,
   What happened, and what the correct behaviour should have been.
   Minimum 3 entries if the project has >50 commits. If <50 commits,
   start with what you have.
   If the project uses a bug tracker, include issue numbers (e.g., #63442) for traceability.

2. ai-docs/footguns/ - If the directory already exists, MERGE with it: keep
   existing entries, add new footguns from reading the codebase.
   If the directory doesn't exist, create and seed category bucket
   files with real footguns only.
   Do NOT invent hypothetical ones. Do NOT replace existing entries.
   If no real footguns are found yet, leave the file with only the
   format header - an empty footguns file is better than a placeholder.
   Every entry MUST cite specific file paths with line numbers.
   Evidence labels: use ACTUAL_MEASURED for real data with source,
   DESIGN_TARGET for intended values, HYPOTHETICAL_EXAMPLE for
   illustrative only. Bare claims without labels are not acceptable
   (e.g., src/Auth.php:42). Bare paths without line numbers do not count.
   To find real footguns in this project, run:
     grep -rn 'TODO\|FIXME\|HACK\|XXX' src/ --include='*.ts' --include='*.php' --include='*.py' | head -20
     git log --all --oneline -- '*migration*' '**/migrations/**' | head -10
   Each footgun MUST have a file:line reference like src/Auth.php:42.
   Prefer bucket files such as `hooks.md`, `setup.md`, or `scanner.md`
   with `category:` frontmatter and multiple `## Footgun:` entries.
   Design patterns are NOT footguns - footguns are actual traps in the
   code where an agent (or developer) is likely to make a mistake.
   Also audit config files (.json, .yaml, .sh) for stale project names,
   hardcoded absolute paths, or outdated references. Seed these as
   footguns if found.

3. .goat-flow/tasks/handoff-template.md - Template for session handoffs. MUST
   include a purpose section explaining: when to create (incomplete
   work or two-correction stop), when to read (start of every session,
   check if .goat-flow/tasks/handoff.md exists), and how to use (copy template
   to .goat-flow/tasks/handoff.md, fill in). Sections: Date, Status, Current
   State (including files changed), Key Decisions, Errors & Corrections,
   Learnings, Known Risks, Next Step, Context Files.

4. .goat-flow/tasks/.gitignore - Ignore runtime working files:
   todo.md
   handoff.md
   (The template is committed; the filled-in copies are not.)
```

## Architecture Docs

```
5. ai-docs/architecture.md - If the file already exists: review against
   the under-100-lines target. If over, compress. If it only covers
   one layer, note missing components as TODOs.
   If the file doesn't exist: read the codebase and write a short
   overview (under 100 lines): what the system does, major components,
   data flows, non-obvious constraints, deliberate trade-offs.

6. ai-docs/decisions/ - ADR directory. DO NOT create this directory during
   setup unless you can identify a real architectural decision from the
   code right now. If no real decisions exist yet, skip this entirely.
   The directory materialises when the first real ADR is written.
   Do NOT create empty directories or placeholder files.

```

## Project Coding Guidelines (Cold Path)

```
7. ai-docs/coding-standards/ - Project coding guidelines (cold path).
   Create ai-docs/README.md as routing map.
   Create ai-docs/coding-standards/conventions.md with project-wide conventions.
   Create ai-docs/coding-standards/code-review.md with review standards.
   Create ai-docs/coding-standards/git-commit.md with commit conventions.
   If .github/instructions/ exists, treat those files as canonical.
   Create ai-docs/coding-standards/ files only where gaps exist - do NOT
   migrate or duplicate existing .github/instructions/ content.
   Link to .github/instructions/ from ai-docs/README.md routing map.
   Create .github/git-commit-instructions.md if .git/ exists.

   VERIFICATION GATE - after creating ai-docs/coding-standards/ files:
   - Verify every file path referenced actually exists (ls/find)
   - Verify every command listed actually runs (build, test, lint)
   - Verify every architectural claim matches current code, not roadmap
   - Remove any planned/aspirational features - only document current state
   - If ai-docs/architecture.md mentions something, confirm it in source before citing it

   ALSO AUDIT EXISTING INSTRUCTION FILES:
   - Read the Ask First section in the hot-path file (CLAUDE.md/AGENTS.md/GEMINI.md)
   - Verify every path in Ask First exists on disk - stale paths mislead agents
   - Check router table entries resolve - broken refs are common after renames
   - If a path doesn't exist, fix it (don't copy it into ai-docs/coding-standards/)
```

## Skills Deduplication

```
Create skills in ONE canonical location (.agents/skills/ for multi-agent
projects), then copy to agent-specific directories (.claude/skills/).
Do NOT write the same skill independently in multiple directories - this
guarantees inconsistency. If making a correction to a skill, update the
canonical copy first, then propagate.
```

## Ownership Split Report

```
8. ai-docs/guidelines-ownership-split.md - If a guidelines file was
   trimmed in the pre-audit step, create this file documenting what
   was moved, what was removed, and why. Preserves migration rationale.
   In dual-agent projects, document ownership for BOTH instruction
   files (CLAUDE.md and AGENTS.md). Note intentional differences.
```
