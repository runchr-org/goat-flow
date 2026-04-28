---
category: dashboard-testing
last_reviewed: 2026-04-29
---

## Lesson: VM helper tests need same-realm assertions

**Status:** active | **Created:** 2026-04-25

**What happened:** M03 added a VM-loaded browser helper test for `dashboard-custom-prompts.ts`. The first focused run failed even though the expected and actual arrays had the same printed contents, because `assert.deepEqual` compared an array created inside the VM realm against a host-realm array literal.

**Root cause:** The test executed browser helper code in `node:vm` to avoid changing classic-script exports, but the assertion treated cross-realm arrays like normal host arrays.

**Prevention:** When testing browser classic-script helpers through `node:vm`, normalize VM-produced arrays/objects with host constructors before strict structural assertions, or compare scalar fields. Evidence anchor: `test/unit/dashboard-custom-prompts.test.ts` (search: `Array.from(helpers.dashboardValidateCustomPromptDraft(ctx))`).

---

## Lesson: VM-loaded dashboard helper tests must treat `Error` objects as cross-realm too

**Status:** active | **Created:** 2026-04-29

**What happened:** While adding a focused unit test for `dashboardLaunchInTerminal()`, the runtime behavior was correct but the failure-path assertion still failed. The helper caught a VM-thrown `Error`, `instanceof Error` did not hold in the host realm, and the surfaced message became `String(err)` (`Error: xterm.js load failed`) rather than the host test's exact `err.message` expectation.

**Root cause:** I remembered the existing cross-realm array/object lesson for VM-loaded browser helpers but still treated `Error` identity as if it were shared across realms. In `node:vm`, errors have the same identity problem as arrays and plain objects.

**Prevention:**
1. In VM-loaded dashboard helper tests, compare stable error-message content or normalize the error into the host realm before strict equality checks.
2. When a helper uses `instanceof Error`, expect VM-based tests to surface the `String(err)` fallback unless the test injects same-realm errors deliberately.
3. Evidence anchors: `test/unit/dashboard-terminal-launch.test.ts` (search: `xterm.js load failed`), `src/dashboard/dashboard-terminal.ts` (search: `const msg = err instanceof Error ? err.message : String(err)`).
