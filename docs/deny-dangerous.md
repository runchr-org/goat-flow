# deny-dangerous

`deny-dangerous` is the shared name goat-flow uses for its dangerous-command guardrails.
The exact mechanism depends on the agent runtime.

## Surfaces

| Surface | Path | Used by | Role |
|---------|------|---------|------|
| Shared hook template | `workflow/hooks/deny-dangerous.sh` + `workflow/hooks/deny-dangerous.self-test.sh` | Claude, Codex, Copilot | Runtime shell hook plus sourced self-test corpus. Blocks dangerous Bash tool calls before execution. Antigravity is capability-limited at v1.0.1 — no hook directory documented upstream — so it does not ship a deny hook in goat-flow v1.8.0 |
| Local validation helper | `scripts/deny-dangerous.sh` + `scripts/deny-dangerous.self-test.sh` | Repo maintenance | Checks whether a command string would be allowed or blocked; does not intercept runtime execution |

## Agent mapping

| Agent | Runtime mechanism | Primary location |
|-------|-------------------|------------------|
| Claude Code | `PreToolUse` shell hook plus settings deny patterns | `.claude/hooks/deny-dangerous.sh`, `.claude/settings.json` |
| Antigravity | Capability-limited at v1.0.1 — no hook directory or ignore-file convention documented upstream. Manifest profile records hook fields as `null`; audit checks skip the deny-mechanism step for this agent. Sandbox/approval lives in user-level `~/.config/antigravity/config.toml` rather than a repo-local file | _none_ (revisit when `agy` documents a hooks path) |
| Codex | `PreToolUse` shell hook plus config TOML permission profile | `.codex/hooks/deny-dangerous.sh`, `.codex/hooks.json`, `.codex/config.toml` |
| Copilot CLI | `preToolUse` hook registered in `.github/hooks/hooks.json` | `.github/hooks/deny-dangerous.sh`, `.github/hooks/hooks.json` |

## What it blocks

The shipped template is intended to block or prompt on the common high-risk command classes:

- unscoped `rm -rf`
- all git push (ADR-025)
- GitHub writes via `gh`, including issue/PR comments, releases, workflow runs, secrets/variables, and `gh api` write methods
- `chmod 777`
- pipe-to-shell and pipe-to-interpreter patterns like `curl | bash`
- direct literal `.env` / `.env.*` access, except read-only `.env.example` inspection
- `git --no-verify`
- `git reset --hard`
- `git clean -f`
- destructive database commands
- direct literal access to secret paths such as `.env`, `.env.local`, `.ssh`, `.aws`, `credentials`, `secrets`, `.pem`, `.key`, `.pfx`, `.gnupg`; `.env.example` is allowed only for read-only inspection

## Important distinction

These files are command guards, not general ignore files.

- Claude sensitive-file exclusion is primarily `permissions.deny` in `.claude/settings.json`, with a `Read(.env.example)` allowlist for non-secret examples.
- Antigravity has no repo-local sensitive-file exclusion documented upstream at v1.0.1; sandbox/approval is controlled via the `--sandbox` flag and `proceed-in-sandbox` permission mode (configured in user-level `~/.config/antigravity/config.toml`).
- Codex has no Claude-compatible `settings.json` permission syntax. Sensitive project-file exclusions use `.codex/config.toml` permission profiles; trailing `/**` subtree denies are safe in the base template, while exact-path rules are added only for files that exist in the checkout. The Bash-matched deny hook in `.codex/hooks/deny-dangerous.sh` remains the command guard and allows read-only `.env.example` inspection.
- Copilot uses `.copilotignore` for context exclusion and `.github/hooks/deny-dangerous.sh` for runtime command blocking.

## Verification

Runtime and local verification are different:

- `bash workflow/hooks/deny-dangerous.sh --self-test=smoke`
  Runs the install-safe representative self-test for the shared hook template and sibling corpus.
- `bash scripts/deny-dangerous.sh --self-test=full`
  Runs the full repo-local regression corpus for the local helper and sibling corpus.
- `bash scripts/deny-dangerous.sh --check "git push origin main"`
  Shows whether the local helper would allow or block a specific command string.

## Limitations

The guardrails are intentionally simple and pattern-based.

- They match direct literal command strings, not full shell semantics.
- They do not reliably catch variable indirection, aliases, encoded commands, or arbitrary interpreter code.
- Codex hooks can receive Bash, `apply_patch`, and MCP tool events, but goat-flow's shipped deny hook is registered for Bash command safety only. Codex still documents incomplete coverage for richer shell paths and some non-shell tools.
- `goat-flow audit` validates static setup and registration; it does not prove a hook executed successfully at runtime.

## Source of truth

If this doc drifts, prefer the live templates and agent setup docs:

- `workflow/hooks/deny-dangerous.sh`
- `workflow/hooks/deny-dangerous.self-test.sh`
- `workflow/hooks/README.md`
- `workflow/setup/agents/claude.md`
- `workflow/setup/agents/antigravity.md`
- `workflow/setup/agents/codex.md`
- `workflow/setup/agents/copilot.md`
