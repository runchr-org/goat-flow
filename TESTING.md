# Testing

The test suite was removed during the v1.1.0 restructure (scan → audit/critique command model). M23 rebuilds it for the new model.

## Current state

`npm test` runs but discovers 0 tests. Preflight warns on this. Once M23 ships, the test suite will cover:

- Unit tests for config reader, classify-state, recommendations
- Integration tests for `audit` (build + quality) and `critique`
- Contract tests for cross-surface consistency (skill count, version, no-scan phrasing)
- Smoke tests for CLI scripts and preflight

## Running tests

```bash
npm test                    # Run all tests (currently 0)
npx tsc --noEmit            # Type-check without emitting
npx eslint src/cli/         # Lint
bash scripts/preflight-checks.sh  # Full preflight gate
```

## Adding tests

Tests live in `test/` with subdirectories: `unit/`, `integration/`, `contract/`, `smoke/`, `fixtures/`.

Use Node's built-in test runner (`node:test` + `node:assert`). No external test framework.
