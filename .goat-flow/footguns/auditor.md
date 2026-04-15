---
category: auditor
---

## Footgun: Audit validates hook file content but not hook runtime behavior

**Status:** active | **Created:** 2026-04-05 | **Evidence:** ACTUAL_MEASURED

The audit checks that hook files exist and pass `bash -n` syntax check, but never verifies hooks actually execute. A hook with correct syntax but wrong permissions, missing dependencies (jq not installed), or broken JSON field paths passes the audit at 100% while providing zero enforcement at runtime.

**Evidence:**
- 4+ sessions across 112 (Claude Insights data) derailed by sub-agent permission failures hitting hooks that the audit had already validated
- `deny-dangerous.sh` sed fallback truncates commands with escaped quotes - audit checks syntax, not correctness

**Impact:** Users may trust a passing harness audit as "hooks are working" when it means "hooks exist and have valid bash syntax." The gap between file validation and runtime behavior is invisible.

**Prevention:**
1. Add a setup completion smoke test: pipe a known-blocked command through the deny hook and verify exit code 2
2. Audit should verify hook registration matches hook files (file exists → must be registered, registered → file must exist)
3. Consider a `goat-flow verify` command that does runtime checks vs the current `goat-flow audit` which does static checks

---

## Footgun: Audit howToFix emits commands the deny hook blocks

**Status:** active | **Created:** 2026-04-15 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Running `goat-flow audit` and following its fix suggestions triggers deny-hook blocks. The framework's repair guidance contradicts its own safety layer.

**Why it happens:** `src/cli/audit/check-agent-setup.ts:142` generates howToFix text containing `` `rm -rf ${path}` `` for deprecated skill directories. The deny hook at `.claude/hooks/deny-dangerous.sh:122-128` blocks `rm -rf` unless the target is scoped (e.g. `./node_modules`). The howToFix emits paths like `.claude/skills/goat-audit` which don't match the scoping allowlist.

**Evidence:**
- `src/cli/audit/check-agent-setup.ts:142` — ``howToFix: `Remove the deprecated ${found.length === 1 ? "directory" : "directories"}: ${paths.map((p) => `\`rm -rf ${p}\``).join(", ")}.` ``
- Live block confirmed: attempting the suggested fix was blocked by the deny hook with "BLOCKED: rm -rf without safe scoping"

**Prevention:**
1. Emit hook-compatible commands in howToFix: `rm dir/SKILL.md && rmdir dir/` instead of `rm -rf dir/`
2. Or emit non-command guidance: "Delete the directory manually" instead of shell commands
3. Add a test that every howToFix suggestion is not blocked by the project's own deny hook

---

## Footgun: Harness verifies post-turn hooks but not PreToolUse deny registration

**Status:** active | **Created:** 2026-04-15 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A project can pass the harness audit at 100% without the deny hook being wired to PreToolUse. The actual safety layer for dangerous shell commands is not verified.

**Why it happens:** `src/cli/audit/harness/check-verification.ts:23-54` (`hooksRegistered` check) only examines `postTurnRegistered` and `postTurnExists`. It does not check whether the deny hook is registered in the agent's PreToolUse hook configuration. The build checks in `check-agent-setup.ts` verify deny file/pattern presence but not the PreToolUse registration wiring.

**Evidence:**
- `src/cli/audit/harness/check-verification.ts:33` — `if (af.hooks.postTurnRegistered && !af.hooks.postTurnExists)` — only post-turn
- `src/cli/audit/harness/check-verification.ts:43` — `if (af.hooks.postTurnExists && !af.hooks.postTurnRegistered)` — only post-turn
- This repo happens to be correctly wired (`.claude/settings.json:51-60`) but the framework does not prove that

**Prevention:**
1. Add a harness check that verifies PreToolUse registration for deny hooks, not just deny file existence
2. Consider adding a runtime smoke test: pipe a known-blocked command through the deny hook and verify it returns exit code 2

---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **Scanner AP2 penalizes project-specific skills** (resolved 2026-04-01) — Removed AP2 check and `ap-fix-skill-names` fragment; scanner now only validates goat-flow's own skills.
- **Audit passes when configured agent's instruction file is missing** (resolved 2026-04-13) — Added `configured-agent-present` and `agent-artifacts-consistent` checks to cross-reference config.yaml against detected agents.
- **ask_first structural sync check generates false positives via glob-unaware comparison** (resolved 2026-04-13) — Added `normalizePath()` to strip glob suffixes before comparing config paths against instruction file content.
- **Scanner reports enforcement features it didn't detect** (resolved 2026-04-13) — Scanner removed in v1.1.0; hook facts now read from actual file content via `enrichDenyFromExecpolicy()`.
- **Scanner gives 100% while generated files are broken** (resolved 2026-04-13) — Scanner/rubric engine removed in v1.1.0; replaced with structural build checks plus pass/fail harness completeness checks.
- **Setup reports scanner metrics as audit results** (resolved 2026-04-13) — Scanner removed; `cli.ts` now calls `runAudit()` and reports actual hook file counts.
