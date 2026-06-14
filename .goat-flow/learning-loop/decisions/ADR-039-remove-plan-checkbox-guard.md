# ADR-039: Remove Plan Checkbox Guard

**Status:** Accepted
**Date:** 2026-06-14

## Context

ADR-038 shipped `plan-checkbox-guard.sh` as a separate Stop hook for milestone-accounting reminders. The hook was intentionally not safety or validation evidence, but it still expanded the default Stop surface, dashboard hook list, installer/config schema, manifest, audit fixtures, and docs.

The v1.12.1 review found the operational cost was higher than the value: non-Claude Stop delivery remained unverified, the hook needed local ignored state and plan-file heuristics, and stale installed registrations could keep invoking a deleted script unless cleanup was handled deliberately. ADR-037 already keeps shipped post-turn behavior focused on universal safety.

## Decision

Remove `plan-checkbox-guard.sh` from shipped goat-flow hooks. New installs and hook syncs must not copy, register, list, or configure it. `post-turn-safety.sh` remains the only shipped Stop hook, and project validation plus milestone accounting stay explicit verification discipline.

Keep a narrow legacy cleanup path that prunes stale `plan-checkbox-guard.sh` registrations, stale central/per-agent scripts, `hooks.plan-checkbox-guard`, the `plan-guard` config block, and the old `logs/plan-guard-state.json` ignore entry. That cleanup path is a tombstone only: it must not expose the hook in the registry, dashboard state, manifest required files, generated config, or default config.

Hook fact extraction must continue to ignore stale guard-only Stop registrations so they do not count as post-turn safety or validation evidence.

## Failure Mode Comparison

| Option | What fails | Why rejected or accepted |
| --- | --- | --- |
| Keep the guard as a shipped hook | A workflow reminder continues to occupy the default Stop surface and requires cross-agent payload/trust evidence unrelated to safety | Rejected; too much product surface for a reminder |
| Replace it immediately with another reminder mechanism | Risks rebuilding the same plan-state heuristics under a new name | Rejected for this patch; replacement needs its own plan |
| Delete it without cleanup | Existing agent configs can keep invoking a removed script and wedge Stop handling | Rejected; stale install pruning is mandatory |
| Remove current support and keep a tombstone cleanup path | Product surface becomes truthful while old installs are cleaned on sync/setup | Accepted |

## Consequences

- `hooks list`, the dashboard Hooks view, setup output, manifest required files, and audit hook-version checks list only `deny-dangerous`, `gruff-code-quality`, and `post-turn-safety`.
- Existing projects pick up cleanup by re-running setup or `goat-flow hooks sync`.
- Historical ADR-038, v1.12.0 changelog text, and completed milestone evidence remain as history, but must not be cited as current behavior.

## Reversibility

Two-way door. A future plan-accounting mechanism can ship if it has a separate decision record, verified runtime contracts, and a smaller product surface. It must preserve ADR-037: do not fold plan hygiene into post-turn safety or project-validation evidence.
