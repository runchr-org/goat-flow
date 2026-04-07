# Phase 1 — Foundation

This phase works for ALL projects — new, existing, partially set up, or outdated.
It always audits the current state before making changes.

The agent-specific setup file (setup-claude.md, setup-codex.md, setup-gemini.md)
tells you WHICH instruction file and settings to create. This file tells you
HOW to build the content.

---

## Phase 1a — Instruction File + Docs

Read workflow/setup/shared/execution-loop.md FIRST — this is the authoritative
template for instruction file sections. If they conflict, execution-loop.md wins.

STEP 0 — Detect stack and current state:
0. Check `.goat-flow/config.yaml`. If it exists and the version matches the current release, STOP — this project is already set up. Run `goat-flow scan .` and fix any failing checks. If the version is older, follow the appropriate upgrade guide (`upgrade-0.9.x.md` or `upgrade-1.0.0.md`) instead of this fresh setup.
1. Detect the project's languages, build/test/lint/format commands by
   reading package.json, Cargo.toml, go.mod, composer.json, pyproject.toml,
   Gemfile, *.csproj, or equivalent. List what you find.
2. Check if the instruction file already exists. If it does, read it completely.
3. Check for other agent instruction files (CLAUDE.md, AGENTS.md, GEMINI.md).
   If multiple exist, this is a multi-agent project — coordinate content.
4. Check for existing scripts/ (preflight, validation, deny-dangerous).
5. Check for existing agent settings and hooks — note what exists.
6. Check for existing .goat-flow/ (footguns/, lessons/, architecture.md)
   — note what already exists so later steps merge, not replace.

STEP 1 — Instruction file (create or rewrite):
If the instruction file does NOT exist:
- Create it with the sections listed in workflow/setup/shared/execution-loop.md.

If the instruction file DOES exist:
- Read it completely.
- Separate domain knowledge from agent instructions:
  Domain content = describes HOW THE PROJECT WORKS (move to .goat-flow/architecture.md)
  Agent instructions = commands the agent with imperative verbs (keep)
  Test: "The API uses chi router on port 8080" → domain knowledge → MOVE
  Test: "Never create middleware.ts" → agent instruction → KEEP
- Rewrite with the sections from workflow/setup/shared/execution-loop.md,
  preserving any existing agent-behavioural rules that are still valid.

For ALL projects:
- Adapt all examples and Ask First boundaries for THIS project.
- Do NOT skip sections (f)–(i) — they are small but required.
- If scripts/ has existing preflight or validation scripts, use them
  instead of writing new ones.

INFRASTRUCTURE FACTS:
Add a ## Project Infrastructure section to the instruction file documenting:
- Deployment platform (Docker Compose, Kubernetes, bare VPS, serverless, etc.)
- Branch conventions (e.g., main=prod, develop=staging, feature/* → PRs)
- Required runtime versions (Node 20, PHP 8.2, Python 3.11 — whatever is pinned)
- Container/build rebuild command (exact command to run after server code or
  config changes, e.g., "docker compose up -d --build")
- CI/CD system and what triggers it

Agents without this context propose incompatible syntax, test against stale
containers, and push to the wrong branch. Document from reality, not aspirations.

STEP 2 — Docs seed files:
If .goat-flow/footguns/ or .goat-flow/lessons/ already exist, MERGE — do not replace.
Read existing content first, add new entries from the codebase, keep all
existing entries. Only create files that don't already exist.

  1. .goat-flow/lessons/ — README plus category bucket files.
     Do NOT invent entries.
     To find real incidents in this project, run:
       git log --oneline -50 | grep -iE 'fix|revert|hotfix|bug|broke|rollback'
     For each match, add a lesson entry to the relevant category bucket
     (for example `verification.md` or `workflow.md`) with: Created,
     What happened, and what the correct behaviour should have been.
     Search git history for real incidents. If you find some, add them.
     If not, leave the file with format headers only — content accumulates
     through real work.
     If the project uses a bug tracker, include issue numbers (e.g., #63442)
     for traceability.

  2. .goat-flow/footguns/ — If the directory already exists, MERGE with it: keep
     existing entries, add new footguns from reading the codebase.
     If the directory doesn't exist, create and seed category bucket
     files with real footguns only.
     Do NOT invent hypothetical ones. Do NOT replace existing entries.
     If no real footguns are found yet, leave the file with only the
     format header — an empty footguns file is better than a placeholder.
     Every entry MUST cite specific file paths. Line numbers are
     RECOMMENDED — include them when available, but they are historical
     context that may drift as code changes.
     Evidence labels: use ACTUAL_MEASURED for real data with source,
     DESIGN_TARGET for intended values, HYPOTHETICAL_EXAMPLE for
     illustrative only. Bare claims without labels are not acceptable.
     To find real footguns in this project, run:
       grep -rn 'TODO\|FIXME\|HACK\|XXX' src/ --include='*.ts' --include='*.php' --include='*.py' | head -20
       git log --all --oneline -- '*migration*' '**/migrations/**' | head -10
     Each footgun should reference the relevant file and method/function.
     Approximate location is fine — the concept matters more than exact
     line numbers, which drift quickly.
     Prefer bucket files such as `hooks.md`, `setup.md`, or `scanner.md`
     with `category:` frontmatter and multiple `## Footgun:` entries.
     Design patterns are NOT footguns — footguns are actual traps in the
     code where an agent (or developer) is likely to make a mistake.
     Also audit config files (.json, .yaml, .sh) for stale project names,
     hardcoded absolute paths, or outdated references. Seed these as
     footguns if found.

  3. .goat-flow/architecture.md — If the file already exists: review for
     conciseness. If it only covers one layer, note missing components
     as TODOs.
     If the file doesn't exist: read the codebase and write an overview.
     Keep it concise — focus on what the system does, major components,
     data flows, non-obvious constraints, deliberate trade-offs. Don't
     pad, but don't artificially compress a complex system either.

  4. .goat-flow/glossary.md — Key domain terms, definitions, and canonical
     file references. Always create this file.

  5. .goat-flow/decisions/ — Create with an ADR template file
     (`ADR-000-template.md`). Empty directories with a template are
     correctly set up.

  6. .goat-flow/README.md — Copy from `workflow/setup/shared/goat-flow-readme.md`.
     Explains what each .goat-flow/ directory is for.

Do NOT create `.goat-flow/domain-reference.md` — domain context belongs in
architecture.md or the instruction file, not a separate doc.

STEP 3 — Local instruction files (Layer 2):
Read .goat-flow/footguns/ and the codebase structure. For directories with
2+ footgun entries, Ask First boundaries, or differing conventions:
create a local instruction file (under 20 lines each).
Skip directories already covered by .github/instructions/ files.
If no directories qualify, create none and note why.

VERIFICATION GATE (all MUST pass before proceeding to Phase 1b):
- GATE: Count instruction file lines. MUST be under 120.
- GATE: Verify all docs seed files exist (lessons/, footguns/, architecture.md, decisions/).
- GATE: Report line count and number of local instruction files.
Do NOT proceed to Phase 1b until all gates pass.

NEXT: Proceed to Phase 1b.

---

## Phase 1b — Skills

Use the stack detected in Phase 1a Step 0 (languages and frameworks).

PRE-EXISTING SKILLS:
If non-goat-prefixed skills exist (e.g., audit/, review/, preflight/),
IGNORE them — they are the project's custom skills. Do not modify, delete,
or merge them. Focus ONLY on creating/updating the 6 goat-flow skills (5 + dispatcher).

SKILL VERSION AUDIT:
If goat-* skills already exist, check the goat-flow-skill-version tag in
each skill's YAML frontmatter. If the version is missing or does not match
the current goat-flow version:
1. Read the current template from workflow/skills/goat-{name}.md
2. Compare EVERY section against the installed skill — look for new
   sections, renamed phases, structural changes, or improved guidance
3. The template may contain valuable upgrades (better prompts, new gates,
   improved output formats) — do not assume the old version is fine
4. Update the skill content to match the current template structure
5. Update the goat-flow-skill-version tag to the current version
This is NOT a cosmetic update — skill templates improve with each release.

Read the detailed skill templates in workflow/skills/goat-*.md for each
skill's full specification before creating or updating.

Create or update these 6 skills (5 + dispatcher) in the agent's skills directory:

1. goat-debug/SKILL.md — Diagnosis-first debugging. Hypothesis tracking,
   recurrence checks. Includes investigate mode (deep codebase investigation,
   progressive depth reading) and onboard mode (stack detection + orientation).
2. goat-review/SKILL.md — Structured code review + quality audit mode +
   instruction review mode + simplify mode (readability improvement, MUST NOT
   change behavior). RFC 2119 severity, negative verification, footgun matching.
3. goat-security/SKILL.md — Threat-model-driven security assessment.
   Framework-aware verification, exploitability ranking, dependency auditing.
4. goat-plan/SKILL.md — 4-phase planning with complexity routing.
   Triangular tension analysis, kill criteria, milestone archetypes. Includes
   refactor planning mode (cross-file restructuring, blast radius analysis).
5. goat-test/SKILL.md — 3-phase test plan generation. Doer-verifier principle:
   coding agent MUST NOT verify its own work.

Each skill MUST include in its YAML frontmatter:
  goat-flow-skill-version: matching the current goat-flow version

Each skill MUST include these sections:
- When to Use (specific triggers, not generic)
- Step 0 / Gather Context (questions to ask before starting)
- Process with phased steps and human gates between phases
- Constraints (MUST/MUST NOT rules)
- Output Format (expected deliverable structure)
- Chaining (what skill to suggest next)

Adapt all examples for THIS project's tech stack. Do NOT leave placeholder
text like "[Step 1]" or "[describe X]".

ADAPTATION EXAMPLE — Step 0 questions:
  Generic (wrong):  "What code to simplify?"
  Adapted (right):  "Which Symfony controller to simplify? Check .goat-flow/footguns/
                     for PracGroup scoping traps first."
The adapted version names a real project artifact and references the learning loop.
Every skill's Step 0, constraints, and output format should be this specific.

DISPATCHER (required — 6th skill):
Also install workflow/skills/goat.md as {agent-skills-dir}/goat/SKILL.md.
This is the /goat dispatcher that routes natural language to the right skill.
Without it, users must remember exact skill names. The scanner checks for it
(check 2.1.20) and will flag its absence.

VERSION CHECK (required — AP15 deduction if skipped):
After installing all skills, verify each SKILL.md frontmatter contains:
  goat-flow-skill-version: matching the installed goat-flow version
Check the current expected version in workflow/skills/goat-debug.md line 4.
If any skill has a different version or is missing the tag, the scanner
deducts -2 per outdated skill (AP15, max -10). Do not skip this check.

VERIFICATION GATE (all MUST pass before proceeding to Phase 1c):
- GATE: Verify all 6 goat-flow skill files exist with required sections.
- GATE: Verify goat/SKILL.md (dispatcher) exists in the skills directory.
- GATE: Verify all 6 skills have matching goat-flow-skill-version tags.
- GATE: Verify instruction file router table references the skill directories.
- GATE: Run scripts/preflight-checks.sh if it exists, otherwise run the
  project's lint + test commands from Essential Commands.
Do NOT proceed to Phase 1c until all gates pass.

NEXT: Proceed to Phase 1c.

---

## Phase 1c — Coding Guidelines

Check for existing coding guidelines in the project:
- .github/instructions/*.md
- .goat-flow/coding-standards/*.md
- Any project-specific code-review, git-commit, or conventions docs

RULES:
- Do NOT delete or alter existing coding convention documents.
  The project knows its own inhouse rules better than templates.
- Do NOT override existing git-commit or code-review instructions.
- DO create .goat-flow/README.md as a routing map pointing to all guideline files.
- DO create .goat-flow/coding-standards/ files where gaps exist.

If .github/instructions/ exists:
- Read existing files — these are the project's canonical conventions.
- Create .goat-flow/README.md as routing map linking to both .goat-flow/coding-standards/
  and .github/instructions/ files.
- Create .goat-flow/coding-standards/backend.md and .goat-flow/coding-standards/frontend.md
  ONLY if the existing instructions don't cover those domains.
  Base new files on workflow/coding-standards/ templates but adapt
  for this project. Link to existing conventions where they overlap.

If no instruction files exist:
- Create .goat-flow/README.md (routing map)
- Create .goat-flow/coding-standards/conventions.md (from workflow/coding-standards/conventions.md)
- Create .goat-flow/coding-standards/code-review.md (from workflow/coding-standards/code-review.md)
- Create .goat-flow/coding-standards/git-commit.md (from workflow/coding-standards/git-commit.md)
- Create .goat-flow/coding-standards/backend.md and/or .goat-flow/coding-standards/frontend.md
  based on detected stack (from workflow/coding-standards/backend/ and frontend/ templates)

VERIFICATION after creating .goat-flow/coding-standards/ files:
1. Verify every file path referenced actually exists (ls)
2. Verify commands work: run build/test/lint commands listed in conventions.md
3. Remove aspirational content — only document current state, not roadmaps

Add to instruction file Router Table:
| Project guidelines | `.goat-flow/README.md` |

VERIFICATION GATE (all MUST pass before proceeding to Phase 1d):
- GATE: .goat-flow/README.md exists and links to all guideline files.
- GATE: .goat-flow/coding-standards/ has at least conventions.md or equivalent coverage.
- GATE: Every file path referenced in README.md actually exists on disk.
- GATE: Instruction file router table includes the Project guidelines entry.
Do NOT proceed to Phase 1d until all gates pass.

NEXT: Proceed to Phase 1d.

---

## Phase 1d — Polish

RFC 2119 PASS:
1. Review the instruction file and apply MUST/SHOULD/MAY to every rule:

   MUST (non-negotiable — the system breaks without these):
   - Execution loop steps (READ, CLASSIFY, SCOPE, ACT, VERIFY, LOG)
   - Autonomy tier boundaries (Always / Ask First / Never)
   - Definition of Done gates
   - State declaration before acting
   - Stop-the-line escalation at Level 2

   SHOULD (important — skip only with good reason):
   - Log hygiene (update lessons, footguns after tasks)
   - Footgun propagation to local instruction files
   - Anti-BDUF guard
   - Question vs directive disambiguation

   MAY (optional — use when helpful):
   - Structural debt trigger (complexity threshold warning)
   - Communication when blocked (one question with recommended default)
   - Sub-agent 5-call budget (soft limit)

   MUST NOT (hard prohibitions):
   - Fabricate codebase facts without reading files
   - Act outside declared state without announcing the switch
   - Skip verification on cross-boundary changes
   - Report preflight complete if any MUST item fails

   In the same pass, compress prose:
   - Convert paragraphs to bullet points
   - Remove explanatory text where the rule is self-evident
   - Replace multi-sentence descriptions with one-liners
   - Keep examples (BAD/GOOD patterns) — they're high-signal
   - Remove any content that duplicates what's in other docs

   CONSTRAINTS:
   - Instruction file MUST stay under the line target after this pass
   - Do NOT add new content — this is a compression + prioritisation pass
   - Do NOT remove any rules — only change how they're expressed
   - Preserve the execution loop structure

2. Add agent-local settings to .gitignore if not already there
   (e.g., .claude/settings.local.json for Claude Code).

VERIFICATION GATE (all MUST pass before proceeding to Final Verification):
- GATE: Count MUST/SHOULD/MAY in instruction file — need 10+.
- GATE: Instruction file is still under 120 lines after RFC 2119 pass.
Do NOT proceed to Final Verification until all gates pass.

---

## Final Verification

Run `goat-flow scan . --agent {agent}` and fix all failures until 100%.
Verify project build/test/lint still passes.
