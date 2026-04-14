# Check Inventory

## 1. GOAT Flow Setup (4)

Source: `src/cli/audit/check-goat-flow.ts` | Run: `npx goat-flow audit .` | Gate: CI pass/fail

| ID | Name | What it checks | Source |
|----|------|---------------|--------|
| `required-files` | Required files | required_files from manifest.json exist | `check-goat-flow.ts:10` |
| `required-dirs` | Required directories | required_dirs from manifest.json exist | `check-goat-flow.ts:28` |
| `config-parses` | Config file | .goat-flow/config.yaml exists and is valid YAML | `check-goat-flow.ts:47` |
| `config-version` | Config version | Config version matches package version | `check-goat-flow.ts:71` |

## 2. Agent Setup Checks (4)

Source: `src/cli/audit/check-agent-setup.ts` | Run: `npx goat-flow audit . --agent claude` | Gate: CI pass/fail

| ID | Name | What it checks | Source |
|----|------|---------------|--------|
| `agent-instruction` | Agent instruction file | Instruction file exists (--agent mode), no orphaned artifacts (aggregate mode) | `check-agent-setup.ts:62` |
| `agent-skills` | Agent skills | All 7 skills installed, versions match, no deprecated dirs | `check-agent-setup.ts:152` |
| `agent-settings` | Agent settings | Settings file is valid JSON | `check-agent-setup.ts:168` |
| `agent-deny-hook` | Agent deny hook | Deny hook exists, syntax valid, patterns registered | `check-agent-setup.ts:248` |

## 3. AI Harness Quality Checks (18)

Source: `src/cli/audit/harness/` | Run: `npx goat-flow audit . --harness` | Gate: advisory only — scores and findings, never affects exit code

**Context (4):** `harness/check-context.ts`

| ID | What it checks |
|----|---------------|
| `instruction-line-count` | Instruction file within line limits |
| `execution-loop-present` | READ → SCOPE → ACT → VERIFY loop defined |
| `doc-paths-resolve` | Router table, architecture.md, and doc file paths all resolve |
| `footgun-evidence` | Footgun entries have file:line evidence |

**Constraints (5):** `harness/check-constraints.ts`

| ID | What it checks |
|----|---------------|
| `deny-covers-secrets` | Deny hook blocks .env, credentials, secrets |
| `deny-blocks-dangerous` | Deny hook blocks rm -rf, force push, etc. |
| `deny-blocks-pipe-to-shell` | Deny hook blocks curl\|sh, wget\|bash, etc. |
| `ask-first` | Ask First boundaries defined and synced with instruction file |
| `linter-registered` | Detected linters registered in toolchain.lint |

**Verification (4):** `harness/check-verification.ts`

| ID | What it checks |
|----|---------------|
| `toolchain-configured` | Test and lint commands defined in config.yaml |
| `hooks-registered` | Hook files match agent settings registrations |
| `commit-guidance` | Instruction file has commit/PR guidance |
| `post-turn-hook-quality` | Post-turn hook runs validation and reports failures honestly |

**Recovery (3):** `harness/check-recovery.ts`

| ID | What it checks |
|----|---------------|
| `milestone-tracking` | .goat-flow/tasks/ has milestone files with checkbox items |
| `session-logs` | .goat-flow/logs/sessions/ has entries |
| `compaction-hook` | Stop/compaction hook preserves context |

**Feedback Loop (2):** `harness/check-feedback-loop.ts`

| ID | What it checks |
|----|---------------|
| `feedback-loop-active` | Footguns and lessons exist with recent entries |
| `decisions-tracked` | .goat-flow/decisions/ has ADR files |
