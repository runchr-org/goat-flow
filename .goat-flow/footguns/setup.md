---
category: setup
last_reviewed: 2026-04-20
---

## Footgun: goat-plan claims "durable shared state" but task files are intentionally gitignored

**Status:** resolved | **Created:** 2026-04-15 | **Resolved:** 2026-04-16 | **Evidence:** ACTUAL_MEASURED

**Resolution:** `goat-plan/SKILL.md` description updated to say "local working state for the current session" instead of "shared state between human and coding agent." Updated across all agent copies (.claude, .agents) and the workflow template.

**Original symptoms:** The skill description over-promised persistence for gitignored task files.

---

## Footgun: Redundant context files waste token budget on every skill invocation

**Status:** resolved | **Created:** 2026-04-16 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** `RULES.md` (432 words) in the goat dispatcher skill loaded on every `/goat` dispatch. 6 of 6 sections duplicated content already in CLAUDE.md and the shared skill preamble. Net unique content: ~30 words. Flagged by a coding agent critique on a consumer project as a framework flaw.

**Why it happened:** RULES.md was created as a standalone "core mandates" file for the mono-skill dispatcher model. When the architecture split into 7 separate skills with a shared preamble (now at `.goat-flow/skill-reference/skill-preamble.md`), the preamble absorbed the same rules but RULES.md was never removed.

**Evidence (historical, pre-subdir-move paths):** `RULES.md` sections mapped 1:1 to existing surfaces. Evidence Standard, Severity Scale, and Learning Loop all duplicated content already in the shared preamble; Execution Loop duplicated CLAUDE.md's loop section. Specific line numbers from 2026-04-16 are stale after the `.goat-flow/skill-reference/` subdir move and are no longer recorded here.

**Resolution:** Deleted `RULES.md`. Moved 2 unique lines into the shared preamble's "Engineering Standards" section.

**Prevention:** When adding a new shared-context file, check whether its content already exists in CLAUDE.md or the shared preamble. Before promoting any file to "load on every invocation," verify it provides net-new signal per token.

---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **Setup creates parallel surfaces instead of migrating existing ones** (resolved 2026-04-20) - legacy_surfaces block removed from `workflow/manifest.json` and the `# 0. Legacy surface detection` block deleted from `workflow/install-goat-flow.sh` per no-backwards-compat policy. Pre-v1 installs are out of scope; consumer projects on old layouts are expected to start fresh.
- **Setup instructions contradict spec on execution loop steps** (resolved 2026-04-14) - Retired `docs/system-spec.md` and `docs/five-layers.md` in v1.1.0; `workflow/setup/reference/execution-loop.md` is now the single authoritative source.
- **Multi-agent setup files share structure but not vocabulary** (resolved 2026-04-14) - Updated Gemini hook event names and settings.json to use correct CLI-specific vocabulary instead of copying Claude's.
- **Workflow skill templates lag behind installed skills** (resolved 2026-04-15) - All 7 templates now match installed skills; preflight validates version parity.
- **Ask First config/instruction sync is documented as blocking but not validated** (resolved 2026-04-13) - Added `normalizePath()` for glob-aware comparison; downgraded Step 06 "BLOCKING" to advisory.
- **Base setup simplification can leave harness checks enforcing removed config fields** (resolved 2026-04-15) - Harness now treats missing `toolchain` and `ask_first` as optional with explanatory findings.
- **Deduplicated multi-agent setup drifts from per-agent setup rules** (resolved 2026-04-13) - Removed `--agent all` and `composeMultiAgentSetup()`; setup now requires explicit `--agent` flag and routes per-agent only.
- **Setup adds skills but never removes them** (resolved 2026-04-15) - The `agent-skills` check in `check-agent-setup.ts` now detects deprecated skill directories. Upgrade docs include explicit deletion instructions. Migration script handles it automatically.
