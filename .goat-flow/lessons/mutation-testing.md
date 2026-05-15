---
category: mutation-testing
last_reviewed: 2026-05-15
---

## Lesson: Stryker sandboxes need local-state ignores and mutation-safe test selection

**Status:** active | **Created:** 2026-05-15

**What happened:** The first `scripts/mutation-test.sh` audit-engine run failed before mutation testing with `EISDIR: illegal operation on a directory, copyfile ... .goat-flow/scratchpad/.../.claude/skills/skill-creator`. After adding scratchpad/task/log ignores, the Stryker dry run reached the test command but failed because instrumented source broke learning-loop semantic-anchor checks and the sandbox did not carry `dist/cli/cli.js` for the main-module guard.

**Root cause:** Stryker copies the project into a sandbox and instruments targeted source files before the initial dry run. goat-flow's local-state directories contain gitignored working artifacts that should not be copied, and repo self-inspection tests that grep exact source text are not compatible with Stryker-instrumented files.

**Fix:** Keep Stryker sandbox inputs focused on committed anchors for `.goat-flow/logs/`, `.goat-flow/scratchpad/`, and `.goat-flow/tasks/`; exclude their local contents. Use a mutation-safe fast-suite command that skips `zero-entry fresh install` and `main-module guard via symlink` during Stryker runs. Evidence anchors: `scripts/mutation-test.sh` (search: `ignorePatterns`), `scripts/mutation-test.sh` (search: `--test-skip-pattern "zero-entry fresh install|main-module guard via symlink"`).

**Prevention:** For mutation-test helpers, run `bash scripts/mutation-test.sh '<target>' -- --dryRunOnly` before attempting a full mutation campaign. The dry run must pass inside the Stryker sandbox; a normal `npm run test:fast` pass in the checkout is not enough.
