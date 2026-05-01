# ADR-026: Remove workspace boundary audit check

**Status:** accepted
**Date:** 2026-05-01

## Context

The `boundary-guidance-present` harness check (advisory, context concern) verified that each agent's instruction file contained workspace boundary language — phrases like "controlling workspace", "selected target", or "workspace boundary." The check was added in v1.3.2 to encourage instruction files to distinguish the goat-flow controlling workspace from the selected target project.

In practice, satisfying the check required embedding hardcoded absolute paths in version-controlled instruction files (e.g., `## Workspace Boundary\nThe controlling goat-flow workspace and selected target project are both this checkout: /home/hxdev/projects/feature/healthkit`).

This produced three categories of breakage in the first real-world deployment (Healthkit):

1. **User-specific.** Each developer has a different WSL username and home directory. The path is wrong for every developer except the one who ran setup.
2. **Checkout-specific.** The same repository exists at multiple paths on the same machine (`feature/healthkit`, `deploy/healthkit`, `basedata/healthkit`). The path is wrong for 2 of 3 checkouts.
3. **Redundant.** AI agents already know their working directory at runtime via `pwd` / environment context. Hardcoding it in the instruction file adds no information.

The audit check encouraged a pattern that was guaranteed to produce stale, misleading content in shared instruction files.

## Decision

Remove the `boundary-guidance-present` check from the harness. Do not replace it.

The "controlling workspace vs. selected target" distinction remains useful as **runtime context** in quality prompts (`compose-quality.ts`), where it is computed dynamically and never committed to shared files.

## Consequences

- Harness check count drops from 17 to 16; context concern checks from 5 to 4.
- Projects that previously passed boundary-guidance-present are unaffected — the check simply no longer runs.
- Existing `## Workspace Boundary` sections in target projects' instruction files become orphaned prose. They should be removed by the project maintainer but cause no audit failures either way.
- The quality prompt continues to use "controlling workspace" / "selected target" language at runtime.
