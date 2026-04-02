---
name: Agent offered to commit after completing work
created: '2026-03-31'
type: pattern
---

**What happened:** After executing M1 (Fixes & Hygiene) — 27 files changed, 216 tests passing — the agent ended its summary with "Want me to commit, or continue with P9/P17/P4?" This violated two explicit rules: CLAUDE.md says "Never: Commit unless asked" and the system instructions say "MUST NOT commit changes unless the user explicitly asks." The agent knew both rules and broke them anyway.

**Why this is a fundamental failure:** The agent's job is to make changes. The user's job is to decide when those changes are ready to be committed. Offering to commit is the agent inserting itself into a decision that isn't its own. It's not a minor style issue — it's a boundary violation. The rules exist in CLAUDE.md, in the system instructions, and in the deny hooks (`Bash(git commit*)` is in `.claude/settings.json`). Three layers of prevention, all ignored because the agent treated "I just finished a big task" as implicit permission to suggest the next git operation.

**This is also a Claude Code systemic issue:** Claude models have a strong tendency to suggest committing after completing work. This isn't unique to this project — it's a default behavior pattern that overrides explicit instructions. The deny hook blocks the command itself, but it can't block the agent from asking. The only fix is behavioral: the agent must internalize that committing is never its suggestion to make.

**Prevention:** After completing work, report what was done and stop. Do not mention commits, committing, pushing, PRs, or any git write operation. There is no acceptable trigger — `Bash(*git commit*)` and `Bash(*git push*)` are in `.claude/settings.json` deny rules (lines 4-5), so the agent literally cannot run these commands even if the user asks. Committing is the user's action, performed outside the agent session.
