# ADR-020: Defer Copilot CLI as a first-class supported agent

**Status:** Deferred
**Date:** 2026-04-18

## Context

goat-flow currently supports three agents as first-class: Claude Code, Codex, and Gemini CLI. Each has a full audit/setup/dashboard path, a per-agent workflow guide, installed skills, hooks, a settings surface, and a deny mechanism — all enumerated in `workflow/manifest.json` and driven off a single shared `AgentId` type in `src/cli/types.ts:7`.

GitHub Copilot CLI now exposes the same categories of customization surface the other three agents already use:

- **Instructions.** `.github/copilot-instructions.md` applies repo-wide, `.github/instructions/**/*.instructions.md` applies by `applyTo` glob, and root `AGENTS.md` is loaded alongside both. Precedence and merge behaviour are defined and deterministic for the same-file case, non-deterministic only when two files conflict (https://docs.github.com/en/enterprise-cloud%40latest/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions).
- **Skills.** `.github/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`, optional `license`, `allowed-tools`) — the same shape as the goat skills already shipped under `.claude/skills/` and `.agents/skills/`. Invocation is `/<skill-name>` and `/skills list` (https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills).
- **Hooks.** `.github/hooks/hooks.json` (single file, `version: 1`, `hooks` object keyed by event: `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`). Commands have `bash` and `powershell` variants, `timeoutSec` (default 30), and a per-hook `env` map (https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks).
- **Agents.** Four built-in subagents (`explore`, `task`, `general-purpose`, `code-review`) plus `/fleet` for parallel subtask decomposition cover the subagent needs goat-flow relies on elsewhere. Repository custom agents in `.github/agents/` are supported but are not required to reach parity (https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/invoke-custom-agents, https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet).

The framework has a single-source-of-truth path that prevents prior multi-source drift: `workflow/manifest.json` declares each agent's instruction file, skills dir, hooks dir, and settings path; `src/cli/audit/check-agent-setup.ts` reads those paths via `ctx.structure.agents[agentId]` rather than hardcoding them; `src/cli/detect/agents.ts` and the `AgentId` union in `src/cli/types.ts` are the only places that enumerate agents. Adding Copilot requires filling in the same manifest row and widening the type — not spreading Copilot-specific logic across the audit, scanner, or dashboard.

## Decision

Do **not** treat `copilot` as a first-class `AgentId` until runtime parity actually exists across the manifest, registry, setup flow, audit flow, and dashboard. Keep the live support matrix at `claude | codex | gemini` for now.

Copilot remains a tracked future direction, not a shipped support claim. The runtime and manifest must stay honest until all of the following land in one coherent change:

1. `src/cli/types.ts`, `src/cli/agents/registry.ts`, `src/cli/detect/agents.ts`, and the dashboard all accept `copilot`.
2. `workflow/manifest.json` includes a real `copilot` block with audited install surfaces.
3. Setup ships a real Copilot guide plus concrete instruction / skills / hooks surfaces in `.github/`.
4. Audit, setup prompts, quality prompts, and CI all stop describing Copilot as bridge-only or unsupported.

## Out of scope for this ADR

- **Repository custom agents (`.github/agents/`).** The built-in `explore` / `task` / `general-purpose` / `code-review` agents plus `/fleet` cover current needs. `.github/agents/` is revisited only if a concrete specialization gap appears.
- **Bridge files** between agent instruction files. The same-concept-same-description rule in `CLAUDE.md` already forces parity without introducing a second editable source.
- **Per-model guidance.** Model selection (Opus vs Sonnet vs Codex) is agent-configuration, not framework scope.

## Consequences

- **Positive:** The repo stops making a user-visible support claim that the runtime cannot honor.
- **Positive:** The manifest, CLI, audit, dashboard, and docs stay aligned on the current three-agent reality.
- **Negative:** Copilot remains out of scope for the current release until parity lands in code, not just in prose.
- **Neutral:** The contextual research in this ADR still documents the likely future implementation surface when Copilot support is revived.

## Implementation track

No active implementation track. Any future Copilot work should restart from a new, parity-backed milestone set rather than treating this deferred ADR as already accepted.

## Related decisions

- **ADR-009** — skill-consolidation doctrine. Any Copilot-specific skill divergence has to pass the same justification gate (distinct artefact, hard workflow gate, special failure mode, or repeatable structured output).
- **ADR-013** — audit as the sole evaluation engine. Copilot must audit through the same `workflow/manifest.json`-driven path, not a second scoring lane.
- **ADR-017** — active-plan marker. Any future Copilot work should live in a dedicated non-active plan directory until it becomes the active plan.

## Revisit Triggers

Revisit if any of the following hold:

- Copilot CLI deprecates or materially changes the `.github/copilot-instructions.md`, `.github/skills/`, or `.github/hooks/hooks.json` surfaces this ADR depends on.
- The four-surface instruction composition (`AGENTS.md` + `copilot-instructions.md` + `.github/instructions/**` + local) starts producing non-deterministic conflicts that the setup guide cannot resolve by structural rules.
- `.github/skills/` parity cannot be maintained against the canonical `.claude/skills/` copies without silent divergence.
- A concrete specialization gap in the built-in agent set appears that `/fleet` cannot close, forcing reconsideration of `.github/agents/`.
