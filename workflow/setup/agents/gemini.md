# Agent Config — Gemini CLI

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `GEMINI.md` |
| Settings | `.gemini/settings.json` |
| Skills directory | `.agents/skills/` |
| Hooks directory | `.gemini/hooks/` |
| Hook events | `BeforeTool`, `AfterTool`, `AfterAgent`, `SessionEnd` |

## Owns

GEMINI.md, `.gemini/`, and shared `.goat-flow/`.

`.agents/skills/` is a **shared surface** — both Codex and Gemini use it as their skills directory. Either agent's setup can create/update skills here.

## Hands off

CLAUDE.md, AGENTS.md, `.claude/`, `.codex/`.

## Agent-specific setup

### Hooks

After completing step 03 (skills):
- Copy scripts from `workflow/hooks/` to `.gemini/hooks/`: `deny-dangerous.sh` (required)
- Copy `workflow/hooks/agent-config/gemini.json` as base for `.gemini/settings.json`
- Optional recommended addition: copy `stop-lint.sh` to `.gemini/hooks/` and enable the commented `AfterAgent` block if you want post-turn validation feedback.
- If you enable `stop-lint.sh`, adapt the `# CUSTOMIZE` sections:
  1. Read package manifests (`package.json`, `composer.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `build.gradle`/`pom.xml`) to discover available lint/type-check tools
  2. Check for tool config files that indicate which tools are active (`.eslintrc*`, `phpstan.neon`, `.rubocop.yml`, `pyproject.toml [tool.ruff]`, `golangci.yml`, `biome.json`)
  3. Use local binaries over global (`vendor/bin/phpstan` not `phpstan`, `node_modules/.bin/eslint` not `eslint`)
  4. Match the tool to what the project actually uses — don't add phpstan to a project that uses psalm
- Create `.geminiignore` with secret patterns: `.env*`, `**/secrets/`, `**/*.pem`, `**/*.key`

### Verification

- `.gemini/settings.json` is valid JSON
- `bash -n` passes on each hook script
- If `stop-lint.sh` is installed, it reports errors by default and `GOAT_LINT_ENFORCE=1` makes it exit non-zero

---

Begin setup: proceed to `01-system-overview.md`
