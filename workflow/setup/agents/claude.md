# Agent Config — Claude Code

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `CLAUDE.md` |
| Settings | `.claude/settings.json` |
| Skills directory | `.claude/skills/` |
| Hooks directory | `.claude/hooks/` |

## Owns

CLAUDE.md, `.claude/`, and shared `.goat-flow/`.

## Hands off

AGENTS.md, GEMINI.md, `.agents/`, `.gemini/`, `.codex/`, `.github/copilot-instructions.md`.

## Agent-specific setup

### Hooks

After completing step 05 (skills), wire hooks:
- Copy scripts from `workflow/hooks/` to `.claude/hooks/`: `deny-dangerous.sh` (required), `stop-lint.sh` (required)
- Copy `workflow/hooks/agent-config/claude.json` as the base for `.claude/settings.json`. Customise deny patterns and hook paths for this project.
- If hooks already exist in `.claude/settings.json`, migrate inline commands to external scripts under `.claude/hooks/` before adding new hooks.
- After copying hook scripts, adapt the `# CUSTOMIZE` sections in stop-lint.sh:
  1. Read package manifests (`package.json`, `composer.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `build.gradle`/`pom.xml`) to discover available lint/type-check tools
  2. Check for tool config files that indicate which tools are active (`.eslintrc*`, `phpstan.neon`, `.rubocop.yml`, `pyproject.toml [tool.ruff]`, `golangci.yml`, `biome.json`)
  3. Use local binaries over global (`vendor/bin/phpstan` not `phpstan`, `node_modules/.bin/eslint` not `eslint`)
  4. Match the tool to what the project actually uses — don't add phpstan to a project that uses psalm
- If the project uses a code formatter (prettier, biome, etc.), add `.goat-flow/skill-conventions.md` and `.goat-flow/**/*.md` to the formatter's ignore file (`.prettierignore`, `biome.json` ignores, etc.). Verify YAML examples in skill-conventions.md still use `---` delimiters after formatting.

### Conditional rules

For large codebases, add `<important if="...">` tags to CLAUDE.md to scope rules to relevant contexts:
```
<important if="editing PHP files">
PHPStan level 10 must pass. Run: vendor/bin/phpstan analyse
</important>
```
Only Claude Code supports this syntax.

### Verification

- `.claude/settings.json` is valid JSON
- `bash -n` passes on each hook script
- deny-dangerous.sh blocks: rm -rf, git push main, --force, chmod 777
- stop-lint.sh exits 0 even when errors found

---

Begin setup: proceed to `01-system-overview.md`
