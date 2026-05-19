---
category: verification
last_reviewed: 2026-05-19
---

## Pattern: Verification scope must match change scope
**Context:** Any change that touches more than just code.
**Approach:** When the change is code-only, running tests is sufficient. When the change touches docs, setup prompts, or workflow templates, verification must read those files too. When building on existing files, audit them first - errors in source files propagate to everything built on top.

## Pattern: Complexity refactors need file-level lint before closeout
**Context:** Reducing complexity in a specific function.
**Approach:** Lint the whole file before declaring the pass complete. A single extracted function can still leave sibling offenders, and helper rewrites can introduce small follow-up mistakes. Treat the file, not the original function, as the verification unit.

## Pattern: Refactors need typecheck before preflight
**Context:** After a large extraction or restructuring pass.
**Approach:** Run `npx tsc --noEmit` before relying on preflight. Complexity-only verification can miss callback type drift, helper return narrowing, and small unused-parameter regressions that only show up once TypeScript checks the whole tree.

## Pattern: Non-gating audit gaps belong in explicit limits
**Context:** A deterministic audit check passes by design, but review evidence shows a reader could over-interpret the PASS as complete assurance.
**Approach:** Preserve the existing status gate when the missing evidence is optional, project-specific, or intentionally advisory. Add a first-class `limits`/warning field and carry it through renderers, dashboard readers, and quality prompts. Prove the fix with one machine-readable assertion and one human-facing assertion. Evidence anchors: `src/cli/audit/audit.ts` (search: `addNonGatingEvidenceLimits`), `test/unit/audit-command.test.ts` (search: `Constraint score covers verified deny patterns only`), `test/unit/quality-command.test.ts` (search: `verification: PASS (75%; metrics=2; limits:`).
