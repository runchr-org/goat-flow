# ADR-035: Remove Copilot from goat-flow

**Date:** 2026-04-13
**Status:** Accepted

## Context

Seven-agent critique of goat-flow v1.1.0 independently flagged Copilot support as an unresolved inconsistency. The repo simultaneously tells four different Copilot stories:

1. **README.md** - says Copilot is "bridge-only" and not a first-class audit/setup agent
2. **project-structure.json** - says `.github/skills/` is optional/unsupported
3. **workflow/setup/agents/copilot.md** - exists as a full setup guide, and `docs/skills/README.md` documents Copilot skill paths
4. **Installed surfaces** - the repo ships full `.github/skills/goat-*` directories, and `preflight-checks.sh` validates `.github/skills/` version parity

Meanwhile, the audit system (`config.yaml`) only supports claude, codex, gemini. `.github/skills/` drifts outside the public audit model - an installed surface with no validation coverage beyond version parity in preflight.

The retired private setup validator ignored `.github/skills/` entirely, creating asymmetric validation.

## Decision

Remove Copilot from goat-flow entirely. Copilot integration will be maintained separately outside this repo.

## Rationale

- **Consistency over coverage.** The framework's value proposition is coherent, auditable agent configuration. A half-supported agent that appears in some validators but not others undermines that proposition.
- **Bridge-only was never committed to.** If Copilot is bridge-only, it shouldn't have installed skills or a setup guide. If it has those, it's not bridge-only.
- **Separate maintenance is simpler.** Copilot's skill format, instruction file location (`.github/copilot-instructions.md`), and hook model differ enough from the claude/codex/gemini trio that maintaining it in the same repo adds complexity without proportional value.
- **Audit coverage gap.** The audit system can't validate Copilot surfaces. Adding Copilot as a fourth agent would require significant audit/dashboard work for a surface that has a smaller user base.

## Consequences

- `.github/skills/` directory will be deleted from the goat-flow repo
- `workflow/setup/agents/copilot.md` will be deleted
- All Copilot references in README, docs, project-structure.json, preflight, and validate scripts will be removed
- Copilot users will need to maintain their integration separately
- The goat-flow agent model becomes a clean 3-agent system (claude, codex, gemini)
