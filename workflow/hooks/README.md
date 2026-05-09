# workflow/hooks/

Copyable hook scripts and agent-config templates for the GOAT Flow enforcement layer.

## Hook Scripts

| Script | Event | Required? | Purpose |
|--------|-------|-----------|---------|
| `deny-dangerous.sh` | PreToolUse | Required | Runtime hook. Blocks rm -rf, all git push (ADR-025), chmod 777, pipe-to-shell, .env edits, --no-verify |
| `deny-dangerous.self-test.sh` | Self-test helper | Required with `deny-dangerous.sh` | Sourced by `deny-dangerous.sh --self-test`; keeps the runtime hook smaller without weakening the verification corpus |

## Agent Event Name Mapping

| Purpose | Claude Code | Gemini CLI | Codex CLI |
|---------|-------------|------------|-----------|
| Block before tool runs | PreToolUse | BeforeTool | PreToolUse in `.codex/hooks.json` with the shipped deny hook matched to `Bash` |
| Permission deny list | `.claude/settings.json` deny patterns | `.gemini/settings.json` deny patterns | Filesystem permission profile in `.codex/config.toml`; command denies in the Bash hook |
| Config format | JSON | JSON | TOML + JSON |

## Setup

1. Copy the required hook files to your agent's hooks directory: `deny-dangerous.sh` and `deny-dangerous.self-test.sh`.
2. Copy the matching agent-config template(s) for your runtime:
   - Claude: `agent-config/claude.json` -> `.claude/settings.json`
   - Gemini: `agent-config/gemini.json` -> `.gemini/settings.json`
   - Codex: `agent-config/codex.toml` -> `.codex/config.toml` and `agent-config/codex-hooks.json` -> `.codex/hooks.json`
3. goat-flow core ships only the deny hook. Post-turn validation hooks are a project-specific concern - see the note below.

All hook paths use `$(git rev-parse --show-toplevel)` so they work regardless of the agent's working directory.

## Post-Turn Linting (project-specific, not shipped)

goat-flow does not ship a post-turn lint hook. Every project has different linters, configs, and performance constraints. If you want post-turn validation, write a project-specific script for the Claude `Stop`, Gemini `AfterAgent`, or Codex `Stop` event and register it in that agent's settings file.

## Codex Permissions

Codex does not read Claude's `settings.json` `permissions.allow` or `permissions.deny` syntax. The equivalent file-access layer is a TOML permission profile selected by `default_permissions` in `.codex/config.toml`; goat-flow's Codex template denies common secret-bearing project paths there while leaving `.env.example` readable. Shell command patterns still belong in `.codex/hooks.json` through the Bash-matched `PreToolUse` deny hook.
