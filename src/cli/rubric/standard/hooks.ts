import type { CheckDef, FactContext, CheckResult } from "../../types.js";
import {
  buildHooksCheckResult,
  getDenyPatterns,
  getEnvDenyCoverage,
  formatMissingEnvDenyActions,
  getPostTurnHookStatus,
  getPostTurnHookMessage,
  getMissingRegisteredHookPaths,
  getNonExecutableRegisteredHookPaths,
  countUsableRegisteredHookPaths,
} from "./hook-helpers.js";

/** Standard-tier checks for hook registration and behavior (2.2.x). */
export const hookChecks: CheckDef[] = [
  // 2.2.1 (Settings/config valid) removed - redundant with AP5 (-5 for invalid settings.json). Double-penalization flagged by SBAO audit.

  {
    id: "2.2.2",
    name: "Post-turn hook registered and enforces validation",
    tier: "standard",
    category: "Hooks",
    pts: 2,
    confidence: "high",
    priority: "required",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const status = getPostTurnHookStatus(ctx);
        return buildHooksCheckResult(
          "2.2.2",
          "Post-turn hook registered and enforces validation",
          status.notConfigured ? "na" : status.passes ? "pass" : "fail",
          status.passes ? 2 : 0,
          status.notConfigured ? 0 : 2,
          "high",
          getPostTurnHookMessage(ctx, status),
        );
      },
    },
    recommendation:
      "Post-turn hooks are optional. If you configure one, make it run real validation (lint, typecheck, format-check) so the hook provides trustworthy feedback instead of a no-op wrapper.",
    recommendationKey: "create-post-turn-hook",
  },
  {
    id: "2.2.2a",
    name: "Registered hook paths exist",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const hasRegisteredHooks = ctx.agentFacts.hooks.postTurnRegistered;
        if (!hasRegisteredHooks) {
          return buildHooksCheckResult(
            "2.2.2a",
            "Registered hook paths exist",
            "na",
            0,
            0,
            "high",
            "No registered hook paths to validate",
          );
        }

        const missing = getMissingRegisteredHookPaths(ctx);
        const nonExecutable = getNonExecutableRegisteredHookPaths(ctx);
        if (missing.length === 0) {
          if (nonExecutable.length === 0) {
            const usableCount = countUsableRegisteredHookPaths(ctx);
            return buildHooksCheckResult(
              "2.2.2a",
              "Registered hook paths exist",
              "pass",
              1,
              1,
              "high",
              `All ${usableCount} registered hook paths resolve on disk and are executable`,
            );
          }

          return buildHooksCheckResult(
            "2.2.2a",
            "Registered hook paths exist",
            "fail",
            0,
            1,
            "high",
            `Hook registration points at non-executable script files: ${nonExecutable.join(", ")}. Fix permissions with chmod +x so the registered hook can actually run.`,
          );
        }

        return buildHooksCheckResult(
          "2.2.2a",
          "Registered hook paths exist",
          "fail",
          0,
          1,
          "high",
          `Hook registration points at missing script files: ${missing.join(", ")}. Fix the registered path or create the missing hook script.`,
        );
      },
    },
    recommendation:
      "A hook registration pointing at a missing or non-executable script silently fails -- the agent gets no validation feedback and you think enforcement is active when it isn't. Ensure every registered hook path points to an existing executable script.",
    recommendationKey: "create-post-turn-hook",
  },
  // 2.2.3 (Post-turn hook does not swallow failures) removed - redundant with AP6 (-5 for swallowed failures). Double-penalization flagged by SBAO audit.
  {
    id: "2.2.4a",
    name: "Deny hook has blocking logic",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.4a",
            name: "Deny hook has blocking logic",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No deny hook",
          };
        }
        return {
          id: "2.2.4a",
          name: "Deny hook has blocking logic",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyHasBlocks ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyHasBlocks ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.agentFacts.hooks.denyHasBlocks
            ? "Deny hook has real blocking logic"
            : "Deny hook exists but has no blocking logic (just exit 0)",
        };
      },
    },
    recommendation:
      "A deny hook that only does `exit 0` provides zero protection -- dangerous commands pass through unchecked while giving you false confidence that enforcement is active. Add real blocking patterns (exit 2 for matched dangerous commands) so the hook actually prevents harm.",
    recommendationKey: "add-deny-blocks",
  },
  {
    id: "2.2.4b",
    name: "Post-turn hook has validation logic",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.postTurnExists === false) {
          return {
            id: "2.2.4b",
            name: "Post-turn hook has validation logic",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message: "No post-turn hook",
          };
        }
        return {
          id: "2.2.4b",
          name: "Post-turn hook has validation logic",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.postTurnHasValidation ? "pass" : "fail",
          points: ctx.agentFacts.hooks.postTurnHasValidation ? 1 : 0,
          maxPoints: 1,
          confidence: "medium",
          message: ctx.agentFacts.hooks.postTurnHasValidation
            ? "Post-turn hook runs lint/typecheck/format checks"
            : "Post-turn hook exists but no lint/typecheck/format commands were detected. Expected shellcheck, eslint, tsc, prettier --check, `npm run lint`, or `bash scripts/preflight-checks.sh` instead of a bare `exit 0` wrapper.",
        };
      },
    },
    recommendation:
      "A post-turn hook that only does `exit 0` is a no-op wrapper -- it runs after every agent action but catches nothing. Replace it with real validation commands (shellcheck, tsc --noEmit, eslint, prettier --check) so code quality is enforced mechanically, not by hope.",
    recommendationKey: "create-post-turn-hook",
  },
  {
    id: "2.2.4c",
    name: "Compaction hook registered",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    na: (ctx) => ctx.agentFacts.agent.settingsFile === null,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => ({
        id: "2.2.4c",
        name: "Compaction hook registered",
        tier: "standard",
        category: "Hooks",
        status: ctx.agentFacts.hooks.compactionHookExists ? "pass" : "fail",
        points: ctx.agentFacts.hooks.compactionHookExists ? 1 : 0,
        maxPoints: 1,
        confidence: "medium",
        message: ctx.agentFacts.hooks.compactionHookExists
          ? "Notification hook for compaction found - context preserved across long sessions"
          : "No compaction hook - context may be lost during long sessions. Add a Notification hook with compact matcher.",
      }),
    },
    recommendation:
      "During long sessions, context compaction silently drops the current task, modified file list, and active constraints. Without a compaction hook that re-injects this state, agents resume after compaction with amnesia -- forgetting what they were doing and which files they changed.",
    recommendationKey: "add-compaction-hook",
  },
  {
    id: "2.2.5a",
    name: "Deny hook uses safe JSON parsing",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5a",
            name: "Deny hook uses safe JSON parsing",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message: "No deny hook",
          };
        }
        if (ctx.agentFacts.hooks.denyIsConfigBased) {
          return {
            id: "2.2.5a",
            name: "Deny hook uses safe JSON parsing",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message:
              "Deny is config-based (settings.json or execpolicy) - JSON parsing check not applicable",
          };
        }
        return {
          id: "2.2.5a",
          name: "Deny hook uses safe JSON parsing",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyUsesJq ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyUsesJq ? 1 : 0,
          maxPoints: 1,
          confidence: "medium",
          message: ctx.agentFacts.hooks.denyUsesJq
            ? "Deny hook uses jq for JSON parsing (portable)"
            : "Deny hook uses grep -P or regex for JSON parsing - use jq instead (grep -P is not portable to macOS)",
        };
      },
    },
    recommendation:
      "Using grep -P for JSON parsing breaks on macOS (PCRE not available in BSD grep), so the deny hook silently fails to parse input and passes all commands through. Use jq for portable JSON parsing, with a sed fallback if jq is missing.",
    recommendationKey: "fix-deny-json-parsing",
  },
  {
    id: "2.2.5b",
    name: "Deny hook handles command chaining",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5b",
            name: "Deny hook handles command chaining",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message: "No deny hook",
          };
        }
        if (ctx.agentFacts.hooks.denyIsConfigBased) {
          return {
            id: "2.2.5b",
            name: "Deny hook handles command chaining",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message:
              "Deny is config-based (settings.json or execpolicy) - chaining check not applicable",
          };
        }
        return {
          id: "2.2.5b",
          name: "Deny hook handles command chaining",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyHandlesChaining ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyHandlesChaining ? 1 : 0,
          maxPoints: 1,
          confidence: "medium",
          message: ctx.agentFacts.hooks.denyHandlesChaining
            ? "Deny hook splits on && || ; before checking patterns"
            : 'Deny hook does not handle command chaining - "echo hello && rm -rf /" would bypass detection',
        };
      },
    },
    recommendation:
      "Without command-chaining awareness, an agent can bypass the deny hook with `echo hello && rm -rf /` -- the hook sees the full string, doesn't match its patterns, and lets the destructive command through. Split on &&, ||, and ; then check each segment independently.",
    recommendationKey: "fix-deny-chaining",
  },
  {
    id: "2.2.5c",
    name: "Deny hook blocks rm -rf",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5c",
            name: "Deny hook blocks rm -rf",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No deny hook",
          };
        }
        return {
          id: "2.2.5c",
          name: "Deny hook blocks rm -rf",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyBlocksRmRf ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyBlocksRmRf ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.agentFacts.hooks.denyBlocksRmRf
            ? "Deny hook blocks rm -rf"
            : "Deny hook does not block rm -rf - the most dangerous destructive command must be blocked",
        };
      },
    },
    recommendation:
      "rm -rf is the single most dangerous command an agent can run -- it recursively deletes files with no confirmation and no undo. If the deny hook doesn't block both rm -rf and rm -fr, one hallucinated path argument can destroy your project or system.",
    recommendationKey: "fix-deny-rm-rf",
  },
  {
    id: "2.2.5d",
    name: "Read-deny covers sensitive paths",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        // Codex has no Read-deny mechanism - execpolicy only blocks shell commands, not file reads
        if (ctx.agentFacts.agent.id === "codex") {
          return {
            id: "2.2.5d",
            name: "Read-deny covers sensitive paths",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message:
              "Codex has no Read-deny mechanism (execpolicy covers shell commands only)",
          };
        }
        if (ctx.agentFacts.settings.exists === false) {
          return {
            id: "2.2.5d",
            name: "Read-deny covers sensitive paths",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "medium",
            message: "No settings file",
          };
        }
        return {
          id: "2.2.5d",
          name: "Read-deny covers sensitive paths",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.readDenyCoversSecrets ? "pass" : "fail",
          points: ctx.agentFacts.hooks.readDenyCoversSecrets ? 1 : 0,
          maxPoints: 1,
          confidence: "medium",
          message: ctx.agentFacts.hooks.readDenyCoversSecrets
            ? "Read-deny patterns cover .env, .ssh, .aws, and key/credential files"
            : "Read-deny patterns are missing coverage for common sensitive paths (.env, .ssh, .aws, .pem/.key/credentials)",
        };
      },
    },
    recommendation:
      "Without Read-deny patterns for sensitive paths, agents can read .env files, SSH keys, AWS credentials, and PEM files -- then echo their contents into chat history, logs, or error messages. Add Read deny for .env*, .ssh/**, .aws/**, *.pem, *.key, and credentials* to prevent secret exposure.",
    recommendationKey: "fix-read-deny-secrets",
  },
  {
    id: "2.2.5g",
    name: "Edit/Write deny mirrors Read deny for .env",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "medium",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.agent.id === "codex") {
          return buildHooksCheckResult(
            "2.2.5g",
            "Edit/Write deny mirrors Read deny for .env",
            "na",
            0,
            0,
            "medium",
            "Codex uses execpolicy, not settings deny",
          );
        }
        const denyPatterns = getDenyPatterns(ctx);
        if (denyPatterns === null) {
          return buildHooksCheckResult(
            "2.2.5g",
            "Edit/Write deny mirrors Read deny for .env",
            "na",
            0,
            0,
            "medium",
            "No deny patterns configured",
          );
        }
        const { hasReadEnv, hasEditEnv, hasWriteEnv } =
          getEnvDenyCoverage(denyPatterns);
        if (!hasReadEnv) {
          return buildHooksCheckResult(
            "2.2.5g",
            "Edit/Write deny mirrors Read deny for .env",
            "na",
            0,
            0,
            "medium",
            "No Read deny for .env - check 2.2.5d covers this",
          );
        }
        const pass = hasEditEnv && hasWriteEnv;
        return {
          id: "2.2.5g",
          name: "Edit/Write deny mirrors Read deny for .env",
          tier: "standard",
          category: "Hooks",
          status: pass ? "pass" : "fail",
          points: pass ? 1 : 0,
          maxPoints: 1,
          confidence: "medium",
          message: pass
            ? "Edit and Write deny patterns exist for .env alongside Read deny"
            : `Read(.env) is denied but ${formatMissingEnvDenyActions(hasEditEnv, hasWriteEnv)} is not - agents can still modify secrets`,
        };
      },
    },
    recommendation:
      "Denying Read on .env but not Edit/Write creates a gap -- agents cannot read secrets but can still overwrite them with garbage or inject malicious values. Add Edit(**/.env*) and Write(**/.env*) so the deny surface is complete and agents cannot corrupt secret files.",
    recommendationKey: "fix-edit-write-deny-env",
  },
  {
    id: "2.2.5e",
    name: "Deny hook blocks force push",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5e",
            name: "Deny hook blocks force push",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No deny hook",
          };
        }
        return {
          id: "2.2.5e",
          name: "Deny hook blocks force push",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyBlocksForcePush ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyBlocksForcePush ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.agentFacts.hooks.denyBlocksForcePush
            ? "Deny hook blocks force push"
            : "Deny hook does not block force push - agents must never force push",
        };
      },
    },
    recommendation:
      "Force push rewrites shared branch history -- other developers' work disappears from the remote with no undo. If the deny hook doesn't block --force on git push, one agent mistake can destroy an entire team's commit history.",
    recommendationKey: "fix-deny-force-push",
  },
  {
    id: "2.2.5f",
    name: "Deny hook blocks chmod 777",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5f",
            name: "Deny hook blocks chmod 777",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No deny hook",
          };
        }
        return {
          id: "2.2.5f",
          name: "Deny hook blocks chmod 777",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyBlocksChmod ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyBlocksChmod ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.agentFacts.hooks.denyBlocksChmod
            ? "Deny hook blocks chmod 777"
            : "Deny hook does not block chmod 777 - world-writable permissions are a security risk",
        };
      },
    },
    recommendation:
      "chmod 777 makes files world-readable, world-writable, and world-executable -- a critical security vulnerability that exposes secrets and allows arbitrary modification. Agents sometimes set 777 as a quick fix for permission errors; blocking it forces proper permission handling.",
    recommendationKey: "fix-deny-chmod",
  },
  {
    id: "2.2.5i",
    name: "Deny hook blocks pipe-to-shell",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    confidence: "high",
    priority: "optional",
    hidden: true,
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: "2.2.5i",
            name: "Deny hook blocks pipe-to-shell",
            tier: "standard",
            category: "Hooks",
            status: "na",
            points: 0,
            maxPoints: 0,
            confidence: "high",
            message: "No deny hook",
          };
        }
        return {
          id: "2.2.5i",
          name: "Deny hook blocks pipe-to-shell",
          tier: "standard",
          category: "Hooks",
          status: ctx.agentFacts.hooks.denyBlocksPipeToShell ? "pass" : "fail",
          points: ctx.agentFacts.hooks.denyBlocksPipeToShell ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: ctx.agentFacts.hooks.denyBlocksPipeToShell
            ? "Deny hook blocks pipe-to-shell commands"
            : "Deny hook does not block pipe-to-shell commands like `curl | bash` or `wget | sh`, which let agents execute remote code without inspection",
        };
      },
    },
    recommendation:
      "Pipe-to-shell patterns like `curl | bash` and `wget | sh` execute remote code without inspection -- the agent downloads and runs arbitrary scripts in a single command. Block these patterns so agents must download scripts to disk first, where they can be reviewed before execution.",
    recommendationKey: "fix-deny-pipe-to-shell",
  },
  // 2.2.5 (Preflight script exists) removed - framework-internal scripts, not a user project quality signal.
  // 2.2.6 (Context validation script) removed - same rationale.
  // 2.2.7 (Ask First mechanical enforcement) removed - see ADR-006.
  // The hook blocks normal development on framework projects. Ask First
  // boundaries remain as policy in the instruction file.

  {
    id: "2.2.8",
    name: "Agent ignore files for sensitive paths",
    tier: "standard",
    category: "Hooks",
    pts: 1,
    partialPts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { copilotignore, cursorignore } = ctx.facts.shared.ignoreFiles;
        const readDeny = ctx.agentFacts.hooks.readDenyCoversSecrets;
        const hasAny = copilotignore || cursorignore || readDeny;
        const all = [
          copilotignore ? ".copilotignore" : null,
          cursorignore ? ".cursorignore" : null,
          readDeny ? "settings.json Read deny" : null,
        ].filter(Boolean);
        return {
          id: "2.2.8",
          name: "Agent ignore files for sensitive paths",
          tier: "standard",
          category: "Hooks",
          status: hasAny ? "pass" : "fail",
          points: hasAny ? 1 : 0,
          maxPoints: 1,
          confidence: "high",
          message: hasAny
            ? `Sensitive path protection: ${all.join(", ")}`
            : "No .copilotignore, .cursorignore, or Read deny patterns for sensitive files (.env, secrets, keys)",
        };
      },
    },
    recommendation:
      "Without agent-ignore files, agents can index and read sensitive files (.env, secrets/, *.pem, *.key) during code search and context gathering -- potentially leaking credentials into chat history. Create .copilotignore/.cursorignore or add Read deny patterns in settings.json to exclude sensitive paths from agent access.",
    recommendationKey: "create-ignore-files",
  },
];
