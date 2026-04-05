# ADR-020: Category Bucket Learning Loop Files

**Status:** Superseded by ADR-021
**Date:** 2026-04-03

## Context

ADR-018 moved the learning loop out of monolithic `docs/footguns.md` and
`ai/lessons.md` into directories with one file per entry. That solved merge
conflicts, but it created a new scaling problem: mature projects now collect
dozens of tiny files, making review noisy and navigation awkward.

We want a middle ground:
- not one giant log for all lessons or all footguns
- not one file per incident forever
- still easy to grep, merge, and validate mechanically

## Decision

Adopt **category bucket files** as the preferred learning-loop format.

- Lessons live in category files such as `verification.md`, `workflow.md`,
  `coordination.md`
- Footguns live in category files such as `hooks.md`, `setup.md`, `scanner.md`
- Each bucket file has YAML frontmatter with `category`
- Entries are stored inside the bucket as markdown sections:
  - lessons: `## Lesson:` or `## Pattern:`
  - footguns: `## Footgun:`

Legacy one-entry files remain readable during migration, but new guidance,
scanning, and migrations should prefer category buckets.

## Rationale

- Fewer files than one-entry-per-file, without returning to monolithic logs
- Easier review: related incidents stay together
- Easier curation: duplicates and stale entries are more visible within a theme
- Still grep-friendly and markdown-native
- Keeps committed vs local split from ADR-018 unchanged

## Consequences

- Scanner logic must count entries inside bucket files, not just markdown files
- Prompts, setup templates, and docs must teach `category:` bucket files
- Migration helpers should emit bucket files rather than per-entry files
- Existing repos do not need a flag day: legacy entry files still parse while
  teams gradually regroup them into categories
