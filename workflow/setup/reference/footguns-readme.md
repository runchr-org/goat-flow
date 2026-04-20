# Footguns

**Traps in the code itself.** A footgun exists whether or not an agent triggers it - it's a property of how the codebase is structured. Example: "renaming one doc breaks 5 others because of dense cross-referencing." The trap is in the architecture, not in what the agent did.

If the agent did something wrong → `.goat-flow/lessons/` instead.

Every entry MUST include file path evidence. Line numbers should be kept current - the quality audit penalizes stale file:line refs in its context score.

Each file:line ref must be in its own backtick span. Do not combine multiple refs inside a single backtick (e.g. `` `file1:N, file2:M` `` fails the staleness checker - use `` `file1:N` `` and `` `file2:M` `` separately).

Agents should scan only entries above the `## Resolved Entries` section. Resolved entries are historical record, not active traps.

Prefer category bucket files such as `hooks.md`, `setup.md`, or `auditor.md`. Every bucket file MUST start with a YAML frontmatter block that includes BOTH a `category` and a `last_reviewed` date (ISO `YYYY-MM-DD`). `goat-flow stats --check` fails when `last_reviewed` is missing.

```yaml
---
category: hooks
last_reviewed: 2026-04-20
---
```

Inside a bucket, add entries as `## Footgun:` blocks. Each entry MUST begin with a `**Status:**` line (one of `active`, `mitigated`, `resolved`) followed by a `**Created:**` date line in `YYYY-MM-DD` form:

```markdown
## Footgun: <short name>

**Status:** active | **Created:** 2026-04-20 | **Evidence:** OBSERVED

<body>
```

Entries without `**Status:**` cannot be split into active-vs-resolved by the audit scanner. Legacy single-entry files still work during migration, but category buckets with the frontmatter + `**Status:**` contract are the preferred and audited format.
