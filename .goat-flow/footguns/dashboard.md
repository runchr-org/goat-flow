---
category: dashboard
last_reviewed: 2026-04-18
---

## Footgun: Project-browser modal is reachable only via header-span click, not from the add-project flow

**Status:** active | **Created:** 2026-04-18 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Users looking for a filesystem-browse capability while adding a project find only a text input. The browse modal exists and works, but its only visible trigger is the project-name span in the page header (tooltip: "Switch project"). Reviewers testing the "Add Project" flow report the modal as "not opened directly from a visible UI button".

**Evidence:**
- Trigger is a clickable span in the header: `src/dashboard/index.html` (search: `@click="openBrowser()"`), tooltip via `title="Switch project"`.
- Modal markup behind the trigger: `src/dashboard/index.html` (search: `x-show="showBrowser"`).
- Handler: `src/dashboard/app.ts` (search: `async openBrowser()`) toggles `showBrowser` and calls `browseTo(this.projectPath)`.
- Live UI session on 2026-04-18: tester exercising the Add Project flow needed programmatic `showBrowser = true` via Alpine state to reach the modal. They did not notice the header span because the Add Project form shows a text input and no Browse button.

**Why it happens:** Two independent add-project surfaces exist - a text input on the Add Project view, and a filesystem picker triggered from the header's "Switch project" affordance. There is no visible cross-link between the two, and the "Switch project" label does not suggest adding a new project.

**Prevention:**
1. If refactoring the header, grep for `openBrowser` before changing the project-name span - it is currently the only visible path to the filesystem picker.
2. If the Add Project flow gains its own Browse button, remove the header-only path to avoid duplication; otherwise keep both and document the header trigger in the Add Project view so users in that mental model can find it.
3. When adding any modal with Alpine `x-show`, add a smoke test or manual-test note that clicking the intended visible trigger actually opens it.

---

## Footgun: Alpine.js string `:style` replaces static `style` attribute

**Status:** resolved | **Created:** 2026-04-05 | **Resolved:** 2026-04-18 | **Evidence:** ACTUAL_MEASURED

**Resolution:** Both live violations in `src/dashboard/index.html` converted to object `:style` syntax. Remaining `:style` usages in other view files (for example `src/dashboard/views/projects.html` and `src/dashboard/views/settings.html`) use string syntax but on elements without a static `style=`, so they do not trigger the merge-vs-replace trap.

**Original symptoms:** Inline styles (padding, border-radius, font-size, background color) silently disappear at runtime. Elements render with browser defaults. The source HTML looks correct - the bug is invisible until you inspect the rendered DOM.

**Why it happens:** Alpine.js handles `:style` differently depending on whether you pass a string or an object. A **string** `:style` replaces the entire `style` attribute, wiping any static `style="..."` on the same element. An **object** `:style` merges with the static attribute.

**Original evidence (historical):**
- `src/dashboard/index.html` `<body>` tag paired static `style="background:#1a1a1e;color:#e4e4e7"` with string `:style="darkMode ? '...' : '...'"`. Latent pattern (dynamic string happened to repeat static properties), fixed by converting to object syntax.
- `src/dashboard/index.html` browser directory `<button>` paired static `style="text-align:left;padding:6px 8px;border-radius:4px;..."` with string `:style="dir.isProject ? 'font-weight: 600' : ''"`. Live bug: when `dir.isProject` was falsy, the empty string replaced the full static style, clearing padding, border-radius, cursor, and other declarations. Fixed by converting to `:style="dir.isProject ? { fontWeight: 600 } : {}"`.

**Pattern illustration (kept for future guidance):**
```html
<!-- BUG: static style gets wiped -->
<div style="padding: 20px; background: #4ade80;" :style="`width: ${pct}%`">
<!-- Rendered DOM: style="width: 50%" - padding and background gone -->

<!-- FIX: object syntax merges -->
<div style="padding: 20px; background: #4ade80;" :style="{ width: pct + '%' }">
<!-- Rendered DOM: style="padding: 20px; background: #4ade80; width: 50%" -->
```

**Prevention (retained):**
1. Never combine static `style="..."` with string `:style="..."`. Use object `:style="{ prop: value }"` when a static `style` exists.
2. Alternatively, move all static styles to a CSS class and keep `:style` for dynamic values only.
3. When a UI element looks wrong at runtime but correct in source, check the rendered `style` attribute in devtools - if properties are missing, this is the cause.
