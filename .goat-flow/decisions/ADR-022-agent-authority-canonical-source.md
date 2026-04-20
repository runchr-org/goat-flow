# ADR-022: Canonical source for agent identity

**Date:** 2026-04-19
**Status:** Accepted
**Milestone:** M17-12 (quality-report follow-ups)

## Context

The `AgentId` union (`"claude" | "codex" | "gemini" | "copilot"`) is duplicated across several surfaces:

- `src/cli/types.ts:7` - the compile-time union itself.
- `src/cli/agents/registry.ts:88` - `getKnownAgentIds()` returns the runtime tuple, derived from `loadManifest().agents` keys.
- `src/cli/quality/schema.ts:490-495` - inline array `["claude", "codex", "gemini", "copilot"] satisfies readonly AgentId[]` used for runtime validation.
- `src/cli/quality/history.ts:17` - a regex literal with the four agent names baked in.
- `src/cli/prompt/compose-setup.ts:39-44` - `Record<AgentId, string>` whose keys repeat the same four names.
- `workflow/manifest.json` - the 4 agent blocks keyed by id.

Adding a fifth agent means touching all six sites. The critique in M17-12 asked for a single canonical authority.

## Decision

**Hybrid authority with a single compile-time source of truth for identity and a single runtime source for the materialised tuple:**

1. **`AgentId` union stays in `src/cli/types.ts`** as the compile-time authority. All TypeScript code that needs the union (including `Record<AgentId, X>` lookups) imports from here.

2. **`KNOWN_AGENT_IDS` const tuple lives in `src/cli/agents/registry.ts`** and becomes the runtime authority. Exported alongside the existing `getKnownAgentIds()` helper. The tuple is `as const` so its element types are literal-narrow.

3. **`getKnownAgentIds()` continues to derive from `loadManifest().agents`** at runtime - that remains the cross-check between the compile-time union and the on-disk manifest.

4. **Manifest validates against the union** at load time. If `workflow/manifest.json` gains an agent key that isn't in `AgentId`, `getKnownAgentIds()`'s `isAgentId` filter drops it and `loadManifest()` surfaces the mismatch via the existing `ManifestValidationError` path.

5. **All hardcoded `["claude", "codex", "gemini", "copilot"]` literals** in non-type-position code migrate to `KNOWN_AGENT_IDS` or `getKnownAgentIds()`. Type-position uses (`Record<AgentId, X>`) stay as-is - they're already authority-driven via the union.

## Alternatives considered

1. **Manifest-backed only (runtime-derived union):** Rejected. TypeScript cannot derive a literal union from `Object.keys(manifest.agents)` at compile time without a codegen step. We'd lose `AgentId`'s compile-time safety for a marginal DRY win.

2. **Generated bridge (codegen from manifest → TS):** Rejected for 1.2.0. Adds a build-time codegen step with its own drift risk (generated file out of sync with source). Current 4-agent stability doesn't justify the machinery. Revisit if the agent list grows past ~6 or starts changing frequently.

3. **Move the union into `registry.ts` (no separate types.ts role):** Rejected. `types.ts` is the canonical shared-types entry; moving `AgentId` away splits related type definitions across files. Better to keep `AgentId` in types.ts and have registry.ts import + re-export the runtime form.

## Consequences

- Adding a fifth agent requires exactly two edits: `src/cli/types.ts` (extend the union) and `workflow/manifest.json` (add the agent block). Everything else flows from those.
- `src/cli/quality/schema.ts` replaces its inline literal with `getKnownAgentIds()` - correctness-preserving refactor.
- `src/cli/quality/history.ts` builds the `QUALITY_HISTORY_FILENAME` regex dynamically from `KNOWN_AGENT_IDS` so it stays in sync.
- `src/cli/prompt/compose-setup.ts:39-44` is already safe: `Record<AgentId, string>` forces TypeScript to require every union member. Keep as-is.
- Dashboard-side `RunnerId` remains a manual mirror of `AgentId` (ambient `.d.ts`, can't import cross-module). Mirroring is documented at `src/dashboard/globals.d.ts:6-8` with a `keep in sync` pointer. Promoting the dashboard typings to a module (so it could `import type { AgentId }`) is deferred - out of M17-12 scope.
