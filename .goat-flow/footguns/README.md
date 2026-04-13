# Footguns

**Traps in the code itself.** A footgun exists whether or not an agent triggers it - it's a property of how the codebase is structured. Example: "renaming one doc breaks 5 others because of dense cross-referencing." The trap is in the architecture, not in what the agent did.

If the agent did something wrong → `.goat-flow/lessons/` instead.

Every entry MUST include file path evidence. Line numbers should be kept current - the quality audit penalizes stale file:line refs in its context score.

Prefer category bucket files such as `hooks.md`, `setup.md`, or `auditor.md` with file-level frontmatter:

```yaml
---
category: hooks
---
```

Inside a bucket, add entries as `## Footgun:` blocks. Legacy single-entry files still work during migration, but category buckets are the preferred format.
