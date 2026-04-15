---
category: setup
---

## Resolved Entries (additional)

- **Setup adds skills but never removes them** (resolved 2026-04-15) — The `agent-skills` check in `check-agent-setup.ts` now detects deprecated skill directories. Upgrade docs include explicit deletion instructions. Migration script handles it automatically. Original evidence: devgoat-bash-scripts and blundergoat-platform had 13 skill dirs after upgrade.

---

## Footgun: Setup creates parallel surfaces instead of migrating existing ones

**Status:** active | **Created:** 2026-04-03 | **Evidence:** ACTUAL_MEASURED

When a project already has learning-loop artifacts, setup creates NEW parallel surfaces instead of using the existing ones:

- `tasks/` AND `.goat-flow/tasks/` both created
- `docs/footguns.md` (flat) AND `.goat-flow/footguns/` (directory) both created
- `docs/lessons.md` AND `.goat-flow/lessons/` both created
- `ai/instructions/` AND `.goat-flow/coding-standards/` both created with overlapping content

**Evidence:** Found by Codex on ambient-scribe (4 duplicate surfaces), blundergoat-platform (context-validate.sh:105 requires BOTH old and new), healthkit (contradictory paths in CLAUDE.md vs config.yaml vs skills).

**Impact:** Agents receive contradictory instructions about where to write lessons and footguns. The same information ends up in multiple places and drifts. Users can't tell which is canonical.

**Prevention:** Setup must detect existing artifact locations and use them, not create parallel ones.

---

## Footgun: goat-plan claims "durable shared state" but task files are intentionally gitignored

**Status:** active | **Created:** 2026-04-15 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** The goat-plan skill description says it creates "shared state between human and coding agent" in `.goat-flow/tasks/`, but all task files are gitignored by design. This creates a mismatch between what the skill promises and what actually persists. Task files are local working state — they don't survive `git clone`, don't appear in PRs, and are invisible to other contributors.

**Why it happens:** `.goat-flow/tasks/.gitignore` ignores everything (`*`). This is intentional — task files are working artifacts, not committed deliverables. But `goat-plan/SKILL.md` (search: `shared state`) describes them as "shared state" and "durable," which over-promises.

**Evidence:**
- `.goat-flow/tasks/.gitignore` — `*` ignores all files (by design)
- `goat-plan/SKILL.md` (search: `shared state`) — "Creates structured milestone files in .goat-flow/tasks/ that track progress, enforce testing gates, and provide shared state between human and coding agent"

**Impact:** Agents and users may expect task files to persist across git operations. The continuity model (resume from last `[x]` checkbox) works within a local session but not across clones or branch switches.

**Prevention:** Update goat-plan SKILL.md description to say "local working state" instead of "durable shared state." Make clear that task files are session-scoped artifacts, not committed project state.

---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **Setup instructions contradict spec on execution loop steps** (resolved 2026-04-14) — Retired `docs/system-spec.md` and `docs/five-layers.md` in v1.1.0; `workflow/setup/reference/execution-loop.md` is now the single authoritative source.
- **Multi-agent setup files share structure but not vocabulary** (resolved 2026-04-14) — Updated Gemini hook event names and settings.json to use correct CLI-specific vocabulary instead of copying Claude's.
- **Workflow skill templates lag behind installed skills** (resolved 2026-04-15) — All 7 templates now match installed skills; preflight validates version parity.
- **Ask First config/instruction sync is documented as blocking but not validated** (resolved 2026-04-13) — Added `normalizePath()` for glob-aware comparison; downgraded Step 06 "BLOCKING" to advisory.
- **Base setup simplification can leave harness checks enforcing removed config fields** (resolved 2026-04-15) — Harness now treats missing `toolchain` and `ask_first` as optional with explanatory findings.
- **Deduplicated multi-agent setup drifts from per-agent setup rules** (resolved 2026-04-13) — Removed `--agent all` and `composeMultiAgentSetup()`; setup now requires explicit `--agent` flag and routes per-agent only.
