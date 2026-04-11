# Testing

Run all tests: `npm test`

## Test Layers

```
Layer 1: Fixture Projects     test/fixtures/projects/           End-to-end scan against known states
Layer 2: Rubric Check Tests   test/unit/evaluate-check.test.ts  Individual rubric checks with pass/fail mock context
Layer 3: Hook Behavior Tests  test/unit/deny-dangerous.test.ts  Hook and deny-policy behavior
Layer 4: Contract Tests       test/contract/                   Path resolution, migration, and instruction-quality checks
Layer 5: Integration Tests    test/integration/                In-memory and fixture-backed scanner/setup regressions
Layer 6: Journey Tests        test/journeys/                   Behavioral eval parsing and journey coverage
Layer 7: Agent Smoke Tests    test/smoke/                      Real agent runs (CI-only, expensive)
```

## Adding a Fixture Project

1. Create `test/fixtures/projects/<name>/` with the project files
2. Add `fixture.json` with expected results:
   ```json
   {
     "agentFilter": "claude",
     "expected": { "claude": { "percentage": 100, "grade": "A" } }
   }
   ```
3. Overlay fixtures use `"extends": "../base-fixture"` to inherit files
4. Add a test in `test/integration/project-fixtures.test.ts`

## Adding a Rubric Check Test

```typescript
import { getCheck } from '../../src/cli/rubric/registry.js';
import { createMockContext } from '../helpers/mock-context.js';

describe('Check X.Y.Z: Name', () => {
  const check = getCheck('X.Y.Z');
  assert.ok(check);

  it('passes when ...', () => {
    const ctx = createMockContext({ agentFacts: { /* overrides */ } });
    const result = runSingleCheck(check, ctx);
    assert.equal(result.status, 'pass');
  });
});
```

The `createMockContext()` defaults match a passing-minimal project. Override only the fields under test.

## Adding an Anti-Pattern Test

```typescript
const ap = getAntiPattern('APXX');
const result = runSingleAntiPattern(ap, ctx);
assert.equal(result.triggered, true);
assert.equal(result.deduction, -N);
```

## Adding a Behavioral Journey

Behavioral journeys validate agent workflow contracts from `.goat-flow/evals/`.

1. Create an eval in `.goat-flow/evals/` following `FORMAT.md`:
   - YAML frontmatter with `name`, `origin`, `agents`, `skill`
   - `### Scenario` with a code-fenced prompt
   - `### Expected Behavior` with checkbox gates (`- [ ] Agent does X`)
   - `### Anti-Patterns` with failure modes to watch for
2. The eval is automatically picked up by `test/journeys/scanner-journeys.test.ts`
3. Layer 6 validates the eval is parseable and well-formed
4. Layer 7 (smoke tests) runs the prompt against a real agent and scores gates

## Running Smoke Tests (Layer 7)

```bash
# Requires ANTHROPIC_API_KEY
GOAT_SMOKE=1 npm test -- test/smoke/
```

Cost: ~$0.50-2.00 per test. Only run locally when validating workflow changes.

## Test Helpers

| Helper | Purpose |
|--------|---------|
| `test/helpers/mock-context.ts` | Build mock `FactContext` with defaults |
| `test/helpers/mock-fs.ts` | In-memory filesystem for isolated tests |
| `test/helpers/hook-runner.ts` | Pipe JSON to hook scripts, capture results |
| `test/helpers/fixture-scanner.ts` | Scan fixture projects in temp directories |

## CI

Layers 1-6 run on every PR via `.github/workflows/ci.yml`.
Layer 7 (smoke tests) runs on release branches only.
