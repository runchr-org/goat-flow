# Agent Config — Codex

## Paths

| Resource | Path |
|----------|------|
| Instruction file | `AGENTS.md` |
| Config file | `.codex/config.toml` |
| Skills directory | `.agents/skills/` |
| Hooks directory | `.codex/hooks/` + `scripts/` |
| Execpolicy | `.codex/rules/deny-dangerous.star` |

## Owns

AGENTS.md, `.codex/`, and shared `.goat-flow/`.

`.agents/skills/` is a **shared surface** — both Codex and Gemini use it as their skills directory. Either agent's setup can create/update skills here.

## Hands off

CLAUDE.md, GEMINI.md, `.claude/`, `.gemini/`.

## Agent-specific setup

### Codex mechanics

- AGENTS.md is the root instruction file (not CLAUDE.md)
- Hook events: `SessionStart`, `UserPromptSubmit`, `Stop`, `AfterToolUse`, `AfterAgent`
- No PreToolUse — use execpolicy rules for command blocking
- `apply_patch` for edits (not Edit/Write tool)
- No `/compact`, no `/clear` — context is per-task

### Hooks + Execpolicy

After completing step 03 (skills):
- Apply `workflow/hooks/agent-config/codex.toml` as the base for `.codex/config.toml`
- Optional recommended addition: copy `stop-lint.sh` from `workflow/hooks/` to `.codex/hooks/`, then enable the commented `hooks.stop` block if you want post-turn validation feedback.
- If you enable `stop-lint.sh`, adapt the `# CUSTOMIZE` sections:
  1. Read package manifests (`package.json`, `composer.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `build.gradle`/`pom.xml`) to discover available lint/type-check tools
  2. Check for tool config files that indicate which tools are active (`.eslintrc*`, `phpstan.neon`, `.rubocop.yml`, `pyproject.toml [tool.ruff]`, `golangci.yml`, `biome.json`)
  3. Use local binaries over global (`vendor/bin/phpstan` not `phpstan`, `node_modules/.bin/eslint` not `eslint`)
  4. Match the tool to what the project actually uses — don't add phpstan to a project that uses psalm
- Create `.codex/rules/deny-dangerous.star` (Starlark execpolicy):
  - `forbidden`: rm -rf (unscoped), git push main/master, force push, chmod 777, pipe-to-shell, .env mods, --no-verify
  - `prompt`: git commit, git push (non-main), sudo, scoped rm -rf
  - `allow`: everything else

### Dual-agent repos

If `.claude/` and `CLAUDE.md` exist, leave them untouched. AGENTS.md MUST reference CLAUDE.md in its router table.

### Adaptation notes

- Ask First MUST use the explicit 5-item micro-checklist (Codex has weaker guardrails than Claude)
- LOG MUST include dual-agent coordination if Claude files exist

### Verification

- `.codex/config.toml` exists with the expected default registrations
- `.codex/rules/deny-dangerous.star` exists with forbidden patterns
- Hook scripts are executable
- If `stop-lint.sh` is installed, it reports errors by default and `GOAT_LINT_ENFORCE=1` makes it exit non-zero

---

Begin setup: proceed to `01-system-overview.md`
