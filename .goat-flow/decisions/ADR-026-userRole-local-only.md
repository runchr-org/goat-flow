## ADR-026: userRole is local-only config, not committed

**Status:** accepted
**Created:** 2026-04-05

### Context

`userRole` controls dispatcher routing and skill ceremony level (developer, investigator, tester). Contract tests in `test/contract/autonomous-and-modes.test.ts` originally asserted that the project's own `.goat-flow/config.yaml` contained `userRole: developer`.

This broke CI because `userRole` was intentionally removed from the committed config - it's a per-user preference (like editor theme), not a project setting.

### Decision

- `userRole` is optional in `config.yaml`. When absent, the config reader defaults to `'developer'`.
- `userRole` belongs in `.goat-flow/config.local.yaml` (gitignored), not in the committed `config.yaml`.
- Contract tests verify that the config reader supports `userRole` and defaults correctly - they do NOT assert that the project config file contains the field.

### Consequences

- Users set `userRole` locally without affecting the team's committed config.
- The config reader (`src/cli/config/reader.ts`) owns the default, not the config file.
- Tests that check config shape must distinguish between "reader supports X" and "project file contains X".
