# Session Log — 2026-04-17 — M03 Active-Plan Marker

**Goal:** Execute milestone M03 from the 1.2.0 plan — introduce a `.goat-flow/tasks/.active` marker file convention so `/goat` and `/goat-plan` scan a single current-plan subdir instead of the entire 397-file `.goat-flow/tasks/` tree. Continuation of 1.2.0 wave-by-wave execution after M02.

## What Was Done

### 1 — Anchor verification

All M03 Evidence-base anchors checked: `.goat-flow/tasks/` actual file count (397, matches), 6 top-level entries (matches), all skill-template line anchors (`workflow/skills/goat/SKILL.md:24`, `goat-plan/SKILL.md:3,15,35,38,50,121` all hit the right content), code anchors (`src/cli/config/reader.ts:38`, `src/cli/audit/check-goat-flow.ts:25-26,176-178`, `src/cli/audit/harness/check-recovery.ts:14-20`, `src/cli/prompt/compose-critique.ts:206`, `workflow/install-goat-flow.sh`).

One milestone reference was wrong: `.goat-flow/code-map.md` was supposed to have a `.goat-flow/tasks/` entry to update, but code-map.md had no `.goat-flow/` section at all. Resolved by adding a new top-level `.goat-flow/` section to code-map.md instead of editing nothing.

### 2 — Section 1: ADR-043 + marker format

Created `.goat-flow/decisions/ADR-043-active-plan-marker.md` recording:
- **Decision:** Option B (marker file `.goat-flow/tasks/.active`).
- **Format:** one-line, content = subdir name (e.g. `1.2.0`), no trailing slash, no leading dot in the value.
- **Option A (directory rename)** rejected: would break ~20 cross-refs in this plan + 1.4.0 cross-refs (rename-survivor failure class from `lessons/verification.md`).
- **Option C (config.yaml-derived path)** rejected: config version is semver-stable while task plan versions churn faster; on this repo today config = `1.1.0` but active plan = `1.2.0`.

ADR number is 043 (next available; ADR-036 reserved for M19's Copilot supersede ADR per the 1.2.0 plan).

### 3 — Section 2: skill-template + installed-copy edits

Edited `workflow/skills/goat/SKILL.md` (line 24) and `workflow/skills/goat-plan/SKILL.md` (lines 3, 15, 35-36, 39, 51, 122, 125, 140, 144, 182, 195) to switch the scan/write semantics to the marker-aware pattern. User-facing prompts use `.goat-flow/tasks/<active>/` notation (angle brackets, prose-readable) rather than `${active}/` (shell-syntax-leaning).

Propagated to install copies via `cp` (4 files: `.claude/skills/goat/SKILL.md`, `.claude/skills/goat-plan/SKILL.md`, `.agents/skills/goat/SKILL.md`, `.agents/skills/goat-plan/SKILL.md`). Verified byte parity with `diff -q` across all 4 pairs. Preflight "Skill SKILL.md Parity" check confirms.

Beyond the milestone's 6 explicit task lines, 3 additional `.goat-flow/tasks/` references in goat-plan/SKILL.md (lines 140, 144, 182, 195) were updated for internal consistency. The milestone task list cited 6 lines but the spirit was "update all references to writes" — applied to all sites.

### 4 — Section 3: supporting surfaces

- `src/cli/prompt/compose-critique.ts:206` — design-notes line in the critique prompt now mentions the `.active` marker scopes which subdir is the active plan, with ADR-043 reference.
- `workflow/install-goat-flow.sh` — added Section 8 "Active plan marker". Logic: write `.active` only when exactly one X.Y.Z-named subdir exists at install time. Zero subdirs → skip (skill fallback handles). Multiple subdirs → skip (skill asks user). Idempotent (existing `.active` is preserved unless `--force`).
- `.goat-flow/glossary.md` — new "Active Plan Marker" row inserted alphabetically (before "Anti-Pattern Deduction"). Canonical file = ADR-043. Alias = `.active`.
- `.goat-flow/code-map.md` — added a new top-level `.goat-flow/` section (the file had no such section before). The `tasks/` subentry explicitly calls out `.active` and notes that sibling-version subdirs are not scanned.
- `workflow/setup/04-architecture-code-map.md:37` — scaffolding bullet enhanced with marker note.
- `workflow/setup/05-customise-to-project.md` — no edit. Its `.goat-flow/tasks/` references concern legacy hook-path migration and verification gates, not milestone writes. Decision recorded in the milestone's Section-3 task ticks.

### 5 — Section 4: marker on this repo

Wrote `.goat-flow/tasks/.active` containing `1.2.0\n`. Verified: `cat` returns `1.2.0`. `ls .goat-flow/tasks/1.2.0/` returns only the active milestone files (M01-M20 + README + M02-pressure-test-log) — none of `_archived/`, `plugin-plan/`, `1.4.0/`, `1.5.0/`, `temp-list-of-rules.md`.

### 6 — Section 5: deferred

Audit-check work (extending `check-goat-flow.ts` to validate `.active` exists and names a real subdir) deferred per the milestone's own "consider deferring if M04/M05 work is crowding the release" guidance. A 13th setup check would cascade into architecture.md doc-count edits, dashboard concern map, fixture corpora, and preflight assertions — disproportionate for the marker convention's intrinsic risk. Skill-side fallback (skills ask the user when `.active` is missing) makes missing-marker recoverable, not fatal. Tracked for revisit alongside M01 (harness check type tagging) or M11 (back-fill provenance), both of which already touch the same audit surface.

## Decisions

- **Option B over A and C** locked via ADR-043. Cross-ref fragility (Option A) and version-lag (Option C) both real on this repo.
- **`<active>/` notation in user-facing prompts** rather than `${active}/`. Brackets read as prose; shell-syntax dollars don't.
- **Section 5 audit check deferred.** Not a hard exit-criterion gap; revisit alongside M01 or M11.
- **05-customise-to-project.md skipped.** Its `.goat-flow/tasks/` references aren't milestone-write semantics.
- **Code-map gets a new section.** Milestone said "update the entry"; the entry didn't exist. Adding a section is the closest faithful interpretation.
- **3 extra goat-plan/SKILL.md edits** beyond the 6 listed. Internal consistency demands the same `<active>/` swap on the related lines.

## Verification

- `cat .goat-flow/tasks/.active` → `1.2.0`
- `ls .goat-flow/tasks/1.2.0/` → active milestones only
- `diff -q workflow/skills/goat/SKILL.md .claude/skills/goat/SKILL.md` → empty (parity)
- `diff -q workflow/skills/goat/SKILL.md .agents/skills/goat/SKILL.md` → empty (parity)
- `diff -q workflow/skills/goat-plan/SKILL.md .claude/skills/goat-plan/SKILL.md` → empty (parity)
- `diff -q workflow/skills/goat-plan/SKILL.md .agents/skills/goat-plan/SKILL.md` → empty (parity)
- `bash scripts/preflight-checks.sh` → `PREFLIGHT PASSED  37 checks, 11 warning(s)`
- Reference scan via `grep -rn '\.goat-flow/tasks/'` reviewed: skill text uses marker-aware pattern; install script uses marker; audit/config/manifest references are bare directory (allowed); session-log historical entries are bare (allowed).

## Follow-up

- **Manual acceptance on a fresh project setup** is not run this session. Install-script Section 8 logic was reviewed by reading; first downstream `goat-flow setup` invocation is the genuine acceptance test. Track as a follow-up; no blocker for M03's milestone-level completion.
- **Manual acceptance on a legacy project (no `.active`)** likewise not run. Skill fallback is documented; first real legacy-upgrade is the acceptance test.
- **Section 5 audit check** is the explicit deferred item. Revisit when M01 or M11 work begins.
- **Glossary state.** `.goat-flow/glossary.md` carried forward from prior session as modified; added a new row this session. Diff is now both the prior session's edit + the new Active Plan Marker row.

## Files changed in this session

- `workflow/skills/goat/SKILL.md` (line 24 rewritten)
- `workflow/skills/goat-plan/SKILL.md` (12 lines updated for marker convention)
- `.claude/skills/goat/SKILL.md` (mirror of template)
- `.claude/skills/goat-plan/SKILL.md` (mirror of template)
- `.agents/skills/goat/SKILL.md` (mirror of template)
- `.agents/skills/goat-plan/SKILL.md` (mirror of template)
- `workflow/setup/04-architecture-code-map.md` (line 37 enhanced)
- `workflow/install-goat-flow.sh` (Section 8 added — write .active conditionally)
- `src/cli/prompt/compose-critique.ts` (line 206 enhanced)
- `.goat-flow/glossary.md` (Active Plan Marker row added)
- `.goat-flow/code-map.md` (new `.goat-flow/` section appended)
- `.goat-flow/decisions/ADR-043-active-plan-marker.md` (NEW)
- `.goat-flow/tasks/.active` (NEW — content `1.2.0`)
- `.goat-flow/tasks/1.2.0/M03-active-plan-marker.md` (full tick + gate verifications + status: complete)
- `.goat-flow/logs/sessions/2026-04-17-M03-active-plan-marker.md` (NEW — this file)

## Wave 1 progress after M03

- M02 ✅ complete (Hallucination red-flags)
- M03 ✅ complete (Active-plan marker)
- M01 ⏭ next (Harness check type tagging — final Wave 1 item)

After M01, Wave 2 begins (M04 skill drift detection, M05 cold-path linting, M06 single source of truth manifest).
