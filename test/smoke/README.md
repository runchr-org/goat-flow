# Smoke Tests (Layer 7)

Real agent tests — spawns Claude Code in `--print` mode against fixture projects.

**Cost:** ~$0.50-2.00 per test. Run on release branches only, not every PR.

## Running

```bash
# Requires ANTHROPIC_API_KEY
GOAT_SMOKE=1 npm test -- test/smoke/
```

## How It Works

1. Copy a fixture project to a temp directory
2. Spawn `claude --print` with the eval's scenario prompt
3. Capture: files read, files changed, agent output
4. Score against the eval's behavioral gates
5. Report: pass/fail per gate, anti-patterns detected, time taken

## Adding a Smoke Test

1. Create an eval in `ai-docs/evals/` (see FORMAT.md)
2. The eval's behavioral gates become the scoring contract
3. Reference a fixture project for the workspace
4. Add to `smoke-runner.test.ts`

## Timeout

5 minutes per test. If the agent hits the timeout, the test fails with
"TIMEOUT" and reports what was completed.
