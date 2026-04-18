# Decision Records

This directory now has two live layers plus a historical summary:

- **Core ADRs**: current architectural decisions that still define the framework.
- **Secondary ADRs**: current but narrower repo, product-surface, or tooling decisions.
- **Deleted historical topics**: superseded, merged, or overly narrow records whose surviving meaning is summarized below and preserved in git history.

## Core ADRs

- `ADR-008` - reference-based setup prompts
- `ADR-018` - config + learning-loop storage model
- `ADR-028` - shared skill conventions extraction
- `ADR-029` - instruction budget constraint
- `ADR-030` - skill consolidation and canonical-skill doctrine
- `ADR-031` - setup file ownership
- `ADR-036` - audit as the sole evaluation engine
- `ADR-039` - optional project calibration config
- `ADR-041` - cold-path truth maintenance
- `ADR-043` - active-plan marker
- `ADR-045` - no standalone `goat-verify`
- `ADR-046` - skill naming/routing cleanup

## Secondary ADRs

- `ADR-003` - confusion-log removal
- `ADR-004` - preflight skill replaced by security skill
- `ADR-019` - no implementation skill
- `ADR-022` - autonomous skill mode
- `ADR-033` - critique as a core feature
- `ADR-034` - quality-check expansion
- `ADR-035` - remove Copilot
- `ADR-040` - remove `stop-lint.sh` from core

## Deleted Historical Topics

The following topics were removed as standalone ADR files on 2026-04-18 after their surviving guidance was folded into umbrella records:

- confusion-log disposition now lives in `ADR-003`
- shared-conventions history (keep inline / expand inline / flush-protocol enforcement) now lives in `ADR-028`
- dispatcher counting and the original 9→6 consolidation pass now live in `ADR-030`
- category-bucket learning-loop format now lives in `ADR-018`
- local-only `userRole` config handling now lives in `ADR-039`
- retired scanner-era simplifications and heuristics are preserved in `ADR-036` and git history
- the retired spec-artifact workflow is preserved in git history; the current replacement is milestone files plus goat-review Spec Drift
- evidence lifecycle state markers now live in `ADR-041`
- dispatcher build history now lives in `ADR-030`
- audit-era agent-check regrouping now lives in `ADR-036`
- the shared-preamble pattern from the retired `RULES.md` cleanup now lives in `ADR-045`
- repo-layout history, the ask-first hook lesson, the older skill-copy model, narrow tooling ADRs, and harness-card presentation are preserved in git history rather than the live ADR set
- the deferred public-audit skill-integrity note was removed from the live ADR set; cold-path truth maintenance remains in `ADR-041`
