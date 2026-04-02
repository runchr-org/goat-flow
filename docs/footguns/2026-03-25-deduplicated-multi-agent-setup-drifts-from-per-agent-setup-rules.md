---
name: Deduplicated multi-agent setup drifts from per-agent setup rules
status: active
created: '2026-03-25'
evidence_type: ACTUAL_MEASURED
---

**Symptoms:** `goat-flow setup . --agent all` emits a single deduplicated setup prompt that looks shorter and cleaner than per-agent setup, but it can direct users to scaffold shared skills in the wrong directory, flatten phase-specific guidance into one generic reference, and skip template validation entirely.

**Why it happens:** `composeMultiAgentSetup()` rebuilds the full-setup output as a separate code path instead of reusing the single-agent phase rendering. Its shared table is derived from the first agent's standard refs, so Claude's `.claude/skills/` path leaks into a multi-agent prompt even though shared multi-agent skills are supposed to canonicalize under `.agents/skills/`.

**Evidence:**
- `src/cli/cli.ts` → routes multi-agent full setup through `composeMultiAgentSetup()`
- `src/cli/prompt/compose-setup.ts` → builds shared refs from the first agent only
- `src/cli/prompt/template-refs.ts` → skill output path is derived from `p.skillsDir`
- `src/cli/detect/agents.ts` → Claude profile sets `skillsDir: '.claude/skills'`
- `setup/shared/docs-seed.md` → multi-agent projects should canonicalize skills in `.agents/skills/`

**Prevention:** When adding a condensed or multi-agent output mode, preserve the same invariants as the single-agent path: canonical shared output paths, per-phase agent-specific guidance, and the same template validation gates. If a new setup mode cannot reuse those invariants directly, treat it as a high-risk integration path and audit its rendered output before release.
