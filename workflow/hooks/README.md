# workflow/hooks/

Copyable hook scripts and agent-config templates for the GOAT Flow enforcement layer. These replace the prose instructions in `workflow/runtime/enforcement.md` with actual scripts you can drop into your project.

## Hook Scripts

| Script | Event | Required? | Purpose |
|--------|-------|-----------|---------|
| `deny-dangerous.sh` | PreToolUse | Required | Blocks rm -rf, git push main, force push, chmod 777, pipe-to-shell, .env edits, --no-verify |
| `stop-lint.sh` | Stop | Required | Stack-adaptive lint/type checks after each turn. Exits 0 always. |
| `format-file.sh` | PostToolUse | Recommended | Auto-formats files by extension after Edit/Write. Skip if no formatter. |
| `guard-write-size.sh` | PreToolUse | Optional | Blocks writes that remove >80% of a file (catches accidental gutting) |
| `context-validation.yml` | CI | Optional | GitHub Actions workflow for validating instruction files and skills |

## Agent Event Name Mapping

| Purpose | Claude Code | Gemini CLI | Codex CLI |
|---------|-------------|------------|-----------|
| Block before tool runs | PreToolUse | BeforeTool | execpolicy (.star rules, shell only) |
| Check after each turn | Stop | AfterAgent | Stop |
| Format after edit/write | PostToolUse | AfterTool | AfterToolUse |
| Permission deny list | .claude/settings.json | .gemini/settings.json | execpolicy (shell only) |
| Config format | JSON | JSON | TOML + Starlark |

## Setup

1. Copy the hook scripts to your agent's hooks directory (e.g., `.claude/hooks/`).
2. Copy the matching template from `agent-config/` to your settings file (e.g., `.claude/settings.json`).
3. Customize `stop-lint.sh` for your stack (the CUSTOMIZE comments mark the extension points).
4. Remove `format-file.sh` registration if your project has no formatter.

All hook paths use `$(git rev-parse --show-toplevel)` so they work regardless of the agent's working directory.
