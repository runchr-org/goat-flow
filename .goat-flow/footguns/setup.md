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

## Footgun: Tasks .gitignore silently ignores all new milestone files

**Status:** active | **Created:** 2026-04-15 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** `/goat-plan` creates milestone files in `.goat-flow/tasks/` as "durable shared state between human and coding agent," but the files are never committed to git. They don't appear in PRs, don't survive `git clone`, and could vanish on branch cleanup. The planning skill's continuity model (resume from last `[x]` checkbox) fails across git operations.

**Why it happens:** `.goat-flow/tasks/.gitignore:2` contains `*` with only `!.gitignore` excluded. This ignores ALL new files. The .gitignore comment says "v1.1 tracks committed task docs and ignores scratch continuity files" but the `*` rule ignores everything — the comment describes intent that doesn't match implementation.

**Evidence:**
- `.goat-flow/tasks/.gitignore:2` — `*` (ignores all files)
- `git check-ignore -v .goat-flow/tasks/1.2.0/M22-optional-project-calibration-config.md` returns `.goat-flow/tasks/.gitignore:2:*` — confirmed ignored
- `git ls-files .goat-flow/tasks/` returns only `.gitignore` — no milestone files are tracked
- `.claude/skills/goat-plan/SKILL.md:15` — "Creates structured milestone files in .goat-flow/tasks/ that track progress, enforce testing gates, and provide shared state between human and coding agent"

**Impact:** 20+ milestone files exist locally but are invisible to git. The 4x-recurring lesson about agents not ticking checkboxes (`.goat-flow/lessons/verification.md:15-26`) is compounded: agents fail to tick checkboxes in files that aren't even committed.

**Prevention:**
1. Change `.gitignore` to track milestone files by default: ignore only scratch/temp patterns (e.g. `*.tmp`, `*.scratch`), not everything
2. Or explicitly track milestone files with `!M*.md` and `!*/M*.md` exceptions
3. If task files are intentionally ephemeral, update goat-plan SKILL.md to stop claiming "durable shared state"

---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **Setup instructions contradict spec on execution loop steps** (resolved 2026-04-14) — Retired `docs/system-spec.md` and `docs/five-layers.md` in v1.1.0; `workflow/setup/reference/execution-loop.md` is now the single authoritative source.
- **Multi-agent setup files share structure but not vocabulary** (resolved 2026-04-14) — Updated Gemini hook event names and settings.json to use correct CLI-specific vocabulary instead of copying Claude's.
- **Workflow skill templates lag behind installed skills** (resolved 2026-04-15) — All 7 templates now match installed skills; preflight validates version parity.
- **Ask First config/instruction sync is documented as blocking but not validated** (resolved 2026-04-13) — Added `normalizePath()` for glob-aware comparison; downgraded Step 06 "BLOCKING" to advisory.
- **Base setup simplification can leave harness checks enforcing removed config fields** (resolved 2026-04-15) — Harness now treats missing `toolchain` and `ask_first` as optional with explanatory findings.
- **Deduplicated multi-agent setup drifts from per-agent setup rules** (resolved 2026-04-13) — Removed `--agent all` and `composeMultiAgentSetup()`; setup now requires explicit `--agent` flag and routes per-agent only.
