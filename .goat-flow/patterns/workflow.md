---
category: workflow
last_reviewed: 2026-05-20
---

## Pattern: Blocked ≠ impossible
**Context:** A deny hook blocks a command.
**Approach:** Deny hooks block dangerous patterns, not all operations. When a command is blocked, spend 2 seconds thinking about the safe alternative before asking the user or giving up. `rm -rf dir/` → `rm dir/file && rmdir dir/`. `mv old new` → `mv -n old new`.

## Pattern: Deny-rule grammar matrix before mirror fanout
**Context:** Adding or changing a deny hook rule for an external CLI with subcommands, inherited flags, or pipeline use.
**Approach:** Before syncing hook mirrors, write self-tests that cover the command grammar, not only the incident command. Include: direct write form, global flags before the topic, inherited flags after the topic, short flag forms, wrapper prefixes (`env`, `command`, `sudo` when supported), pipeline consumers (`xargs`), API write-method forms, and at least one read-only allow control. Then run the canonical self-test before copying to installed hooks.
