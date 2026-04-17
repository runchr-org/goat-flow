# Manifest consumers (M06a)

`workflow/manifest.json` is goat-flow's single source of truth for duplicated
facts. `src/cli/manifest/manifest.ts` resolves it at load time — computing
derived values from code constants and validating static values against
observed on-disk reality — and exposes a `Manifest` object to callers.

## Fact sources

Every `Manifest.facts` field is either **derived** (computed from code) or
**static** (declared in JSON, validated against observed state). Static values
that cannot be verified against running code are forbidden.

| Fact | Type | Source of truth |
|------|------|-----------------|
| `facts.version` | derived | `package.json` via `getPackageVersion()` |
| `facts.skills.total` | derived | `SKILL_NAMES.length` (`src/cli/constants.ts`) |
| `facts.skills.names` | derived | `SKILL_NAMES` |
| `facts.skills.functional_count` | derived | `SKILL_NAMES` minus `goat` dispatcher |
| `facts.skills.dispatcher` | architectural constant | `"goat"` (hardcoded in `manifest.ts`) |
| `facts.skills.stale_names` | passthrough | `workflow/manifest.json` `skills.stale_names` |
| `facts.checks.setup` | derived | `SETUP_CHECKS.length` (`src/cli/audit/check-goat-flow.ts`) |
| `facts.checks.agent` | derived | `AGENT_CHECKS.length` (`src/cli/audit/check-agent-setup.ts`) |
| `facts.checks.harness` | derived | `HARNESS_CHECKS.length` (`src/cli/audit/harness/index.ts`) |
| `facts.checks.total` | derived | sum of the three |
| `facts.dashboard_views.names` | static | `workflow/manifest.json` `facts.dashboard_views`, validated against `src/dashboard/views/*.html` |
| `facts.dashboard_views.count` | derived | list length |
| `facts.presets.count` | static | `workflow/manifest.json` `facts.presets_count`, validated against `id:` occurrences in `src/dashboard/preset-prompts.ts` |

## Consumers

Every caller that needs a duplicated fact must read it from the manifest,
never from a literal.

| Consumer file | Fact(s) read |
|---------------|--------------|
| `src/cli/prompt/compose-critique.ts` | `facts.skills.total`, `facts.skills.functional_count`, `facts.skills.dispatcher`, `facts.skills.names`, `facts.skills.stale_names` |
| `src/cli/prompt/compose-setup.ts` | `facts.skills.total`, `facts.skills.names` |
| `src/cli/cli.ts` (`goat-flow manifest`) | full `Manifest` |

When adding a new prompt or doc that mentions a duplicated fact, wire it
through `loadManifest()`. If the fact is not yet represented, add it to
`src/cli/manifest/types.ts` and `manifest.ts` before hardcoding a number.

## M12 dependency note

M12 (multi-agent support matrix) will extend `workflow/manifest.json`'s
`agents:` block with typed capability fields. M06a does not touch the
`agents:` block. M12 will add its own `facts.agents` resolution layer in this
same module; keep M12's concerns out of `manifest.ts` until M12 ships.

## M06b deferred work

M06b (1.2.x) will add:
- `workflow/manifest-snapshots/vX.Y.Z.json` frozen copies per release.
- CHANGELOG-scoped numeric claim lint that compares release-frozen numbers
  against the matching snapshot.
- Migration of the four specific R1 failures from the 2026-04-17 session into
  manifest-aware lint entries.

Numeric-claim drift detection in README, docs, and architecture.md is
already shipped by M05 via `goat-flow audit --check-content` (see
`src/cli/audit/check-factual-claims.ts`).
