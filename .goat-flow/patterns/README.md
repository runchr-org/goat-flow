# Patterns

**Proven approaches worth reusing.** A pattern exists because a problem was solved effectively and the approach generalises. Example: "after any skill rename, grep the entire repo for the old name across all three agent dirs."

If the agent did something wrong → `.goat-flow/lessons/` instead.
If the trap is in the code itself → `.goat-flow/footguns/` instead.

**"Add a pattern" = create/update an entry here.** Not runtime code, not test assertions, not inline comments. A pattern is a documentation artifact. If the user also wants a code change, they will ask for it separately.

## Automatic Capture Policy

Manual edits are normal: an explicit request to add or update a durable learning-loop entry means edit the Markdown in the correct directory. Programmatic automatic capture from terminal sessions, quality reports, PR reviews, or agent output is disabled unless `.goat-flow/config.yaml` explicitly sets `learning-loop.auto-capture.enabled: true` and a CLI-owned writer for that target exists. Prompts may suggest an entry, but automatic durable writes belong to CLI-owned code after opt-in.

Auto-capture candidates must follow Extract / Consolidate / Skip:

- Extract only when the item changes a future READ/SCOPE/ACT/VERIFY decision.
- Consolidate into an existing entry when the same root cause already exists.
- Skip raw tool output, successful smoke runs, UI/deploy churn, chain-of-thought, screenshots, raw JSON/HTML, duplicate dumps, and "I read the docs" summaries.

Every entry MUST include enough context that a fresh agent can apply it without prior session knowledge.

Prefer category bucket files such as `verification.md`, `refactoring.md`, or `architecture.md` with file-level frontmatter:

```yaml
---
category: verification
last_reviewed: 2026-05-02
---
```

Both `category` and `last_reviewed` are required. `last_reviewed` must be a strict `YYYY-MM-DD` date (no timestamps). Bump it when you add an entry or materially edit the body; cosmetic edits (typos, whitespace) do not require a bump.

Inside a bucket, add entries as `## Pattern:` blocks.
