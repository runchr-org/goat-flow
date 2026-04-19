---
category: hooks
last_reviewed: 2026-04-19
---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **Notification/compact hook was silently dead** (resolved 2026-04-19) — Claude Code's hook events are `PreCompact` / `PostCompact`; `Notification` + matcher `"compact"` was never a real event, so the hook's echo-state-after-compaction command never fired. M17-2 removed the entire compaction-hook machinery from settings files, scanner (`detectCompactionHookExists`, `compactionHookExists` fact, `compaction_support` capability), harness check (`check-recovery.ts` `compactionHook`), tests, and docs. The recovery concern now has two checks: `milestone-tracking` and `session-logs`.
- **Codex has no compaction notification hook** (resolved 2026-04-19) — rolled up into the Notification/compact removal above. Platform-parity gap is moot now that no agent registers a compaction hook.
- **Post-turn hook swallows failures with `|| true`** (resolved 2026-04-14) — goat-flow removed `stop-lint.sh` from core in v1.1.0 per ADR-015; post-turn lint hooks are project-specific. Consumer projects on pre-v1.1 installs should update their local `stop-lint.sh` to default `GOAT_LINT_ENFORCE=1`. Originally surfaced by Codex critiques on downstream consumer projects (the-summit-chatroom and blundergoat-platform) where `|| true` after lint commands hid failures; goat-flow itself never shipped the trap.
- **git diff --stat is unreliable for scope detection** (resolved 2026-04-03) - Skill templates rewritten in M17; auto-detect now uses staged changes first, then falls back to unstaged and full diff.
- **Advisory hooks create unfixable quality warning after setup** (resolved 2026-04-14) - Hook scripts now ship in enforce mode by default (`GOAT_LINT_ENFORCE` defaults to 1).
- **Codex hooks registered in config.toml instead of hooks.json** (resolved 2026-04-15) - Moved hook definitions to `.codex/hooks.json` per official Codex docs; TOML hook sections were silently ignored.
- **Codex hook migrations drift across live files, templates, installer, and docs** (resolved 2026-04-15) - Restored missing `.codex/hooks/deny-dangerous.sh` and aligned all four Codex hook surfaces (live files, templates, installer, docs).
- **Deny hook blocks read-only commands containing dangerous string literals** (resolved 2026-04-17) - `.claude/hooks/deny-dangerous.sh` now includes a read-only tool whitelist (grep, rg, cat, head, tail, less, more, wc, file, diff, printf, echo, read, sed-without-`-i`) that skips pattern matching when the command verb is read-only AND there is no output redirection or pipe. Pipe-to-shell (`| bash`, `| python`) still blocks regardless of verb. Self-test covers 5 false-positive cases and 2 bypass-attempt cases (`.claude/hooks/deny-dangerous.sh:88-96`). Template at `workflow/hooks/deny-dangerous.sh` and per-agent hooks at `.codex/hooks/` and `.gemini/hooks/` synced to the same implementation (2026-04-17).
