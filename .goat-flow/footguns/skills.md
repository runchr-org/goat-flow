---
category: skills
---

## Footgun: Agent rewrites shared docs with agent-specific vocabulary

**Status:** active | **Created:** 2026-03-21 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Shared documentation files (`docs/`, `workflow/`) contain references to only one agent's hook names, paths, or terminology. Other agents reading these docs get incorrect instructions. Tables lose rows for other agents.

**Why it happens:** When an agent is asked to set up or update its platform support, it replaces existing references wholesale instead of adding multi-agent support. The agent treats the task as find-and-replace: `.claude/` → `.gemini/`, `PreToolUse` → `BeforeTool`, "Every Claude turn" → "Every Gemini turn". It does not distinguish between agent-specific files (`workflow/setup/agents/gemini.md`) and shared files (e.g. `workflow/setup/shared/`; originally `docs/system-spec.md`, retired in v1.1.0).

**Evidence:**
- `docs/system-spec.md` → "Every Gemini turn" replaced "Every Claude turn" (should be agent-neutral) (file retired in v1.1.0, see `workflow/setup/01-system-overview.md`)
- `docs/five-layers.md` → Claude Code row deleted from skills table, replaced with Gemini CLI only (file retired in v1.1.0, see `workflow/setup/01-system-overview.md`)
- `docs/system-spec.md` → Claude Code hook example replaced with Gemini, not added alongside (file retired in v1.1.0, see `workflow/setup/01-system-overview.md`)
- `workflow/runtime/enforcement.md` → all `.claude/` paths replaced with `.gemini/`, creating hybrid state (file retired in v1.1.0, see `workflow/hooks/`)

**Prevention:**
- Agent-specific files (`workflow/setup/setup-*.md`, `.claude/`, `.gemini/`) - edits fine
- Shared docs (`docs/`, `workflow/`) - MUST remain agent-neutral or list all agents
- When adding agent support: ADD to tables and examples, never DELETE or REPLACE existing agent references
- Setup prompts MUST include explicit scope constraints: "Do NOT modify files outside `.gemini/` and `GEMINI.md`"

---

## Footgun: mv/cp/Write overwrites existing files without checking

**Status:** active | **Created:** 2026-03-21 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A file that existed at the destination path is silently overwritten and its content is permanently lost. Especially dangerous for untracked files that have no git recovery path.

**Why it happens:** `mv src dest` and `cp src dest` overwrite `dest` without warning if it already exists. The Write tool does the same. Agents treat rename/move as a single command without checking the destination. If the user then asks to "undo", the agent moves the overwritten content back to the source path - destroying the original destination content entirely.

**Evidence:**
- `docs/roadmaps/TODO_improvements_v0.4.md` → overwritten by `mv TODO_improvements_v0.3.md TODO_improvements_v0.4.md` (2026-03-21). The file was untracked and unrecoverable through git.

**Prevention:**
- Before ANY `mv`, `cp`, or Write to an existing path: run `ls` on the destination first
- If the destination exists, STOP and ask the user before proceeding
- For `mv`: use `mv -n` (no-clobber) instead of bare `mv`
- This is a Never-tier rule - overwriting a file the user didn't ask to overwrite is data destruction

---

## Footgun: Dispatcher intent mapping has no coverage for analysis/evaluation verbs

**Status:** active | **Created:** 2026-03-30 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** User asks `/goat analyse this plan` or `/goat evaluate the setup`. Dispatcher auto-routes to goat-review without disambiguating. User expected goat-plan (or wanted to choose). The wrong skill loads and the entire interaction is wasted.

**Why it happens:** The dispatcher's intent mapping table has rows mapping keywords to skills. "Analyse", "evaluate", "critique", "assess", and "deeply review" appear in none of them. When no keyword matches, the agent falls through to the closest semantic match instead of triggering the disambiguation path.

**Evidence:**
- `.claude/skills/goat/SKILL.md` → intent mapping table has no row for analyse/evaluate/critique
- `.claude/skills/goat/SKILL.md` → disambiguation table lacks "analyse a plan" ambiguity
- `workflow/skills/goat.md` → same gap in the template version
- Real incident: `/goat deeply analyse this plan: tasks/roadmaps/0.9.3/tasks.md` routed to goat-review without asking (2026-03-30)

**Prevention:** Add analysis/evaluation verbs to the disambiguation table (NOT the intent mapping table - they are inherently ambiguous). When the target is a planning artifact (path contains `roadmap`, `plan`, `todo`, `milestone`), always present goat-review vs goat-plan as options. The dispatcher's job is to route clearly and ask when unclear - not to guess.

---

## Footgun: CI template derives skill names by prefixing instead of listing them

**Status:** active | **Created:** 2026-04-01 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Consumer project CI workflow checks for `goat-investigate`, `goat-refactor`, `goat-simplify` (all stale) and misses the `goat` dispatcher entirely. When an agent adapts the pattern to include the dispatcher, it prefixes `goat-` to the name `goat`, producing `goat-goat`. The CI check permanently fails for the dispatcher.

**Why it happens:** `src/cli/prompt/fragments/full.ts` CI template had `for skill in security debug investigate review plan test refactor simplify; do` and constructed `goat-$skill`. This design assumes all skill names follow the `goat-{suffix}` pattern, but the dispatcher is just `goat`. The suffix list was also never updated after the 9→6 consolidation - 3 stale suffixes remained.

**Evidence:**
- `src/cli/prompt/fragments/full.ts` → CI template skill loop with stale suffixes and derivation pattern
- halaxy-agents-lab `.github/workflows/context-validation.yml` → `CANONICAL_SKILLS="goat-debug goat-review goat-plan goat-security goat-test goat-goat"` (permanently broken)

**Prevention:** Always iterate canonical skill names directly (`goat goat-debug goat-plan goat-review goat-security goat-test`), never derive them by prefixing. Import from `SKILL_NAMES` in code, or list literal names in templates. The dispatcher name breaks the `goat-{suffix}` pattern.

---

## Footgun: Skills have phase gates but no time/call budget for context gathering

**Status:** open | **Created:** 2026-04-05 | **Evidence:** ACTUAL_MEASURED

Skills enforce phase gates (Step 0 must complete before Phase 1, gates pause for human approval) but have no budget for how long Step 0 can take. Claude can spend an entire session reading templates, exploring the codebase, and gathering context without ever producing output or asking a question.

**Evidence:**
- Claude Insights (112 sessions): "Claude spent so long reading templates that the user had to pull the plug before it wrote a single file" - during a healthkit GOAT Flow setup
- Pattern appears across review and setup sessions where Claude reads 20+ files in Step 0 without checkpointing

**Impact:** The user has no signal that the skill is stuck. The session appears active (tool calls are happening) but no output is produced. The only recovery is interrupting and restarting, wasting the entire session's context.

**Prevention:**
1. Add a Step 0 call budget to the shared preamble: "If Step 0 exceeds 5 file reads without producing output or asking a question, stop and present what you know so far"
2. Skills should checkpoint mid-Step-0 for complex projects: "I've read X files. Here's what I understand so far. Should I continue gathering context or start with what I have?"
