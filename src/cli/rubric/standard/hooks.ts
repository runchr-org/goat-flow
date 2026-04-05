import type { CheckDef, FactContext, CheckResult } from '../../types.js';
import {
  buildHooksCheckResult,
  getDenyPatterns,
  getEnvDenyCoverage,
  formatMissingEnvDenyActions,
  buildPostToolHookCheckResult,
  getPostTurnHookStatus,
  getPostTurnHookMessage,
  getMissingRegisteredHookPaths,
  countExistingRegisteredHookPaths,
} from './hook-helpers.js';

/** Standard-tier checks for hook registration and behavior (2.2.x). */
export const hookChecks: CheckDef[] = [
  {
    id: '2.2.1',
    name: 'Settings/config valid',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    na: (ctx) => ctx.agentFacts.agent.settingsFile === null,
    detect: { type: 'json_valid', path: '{settings_file}' },
    recommendation: 'Fix settings.json - invalid JSON',
    recommendationKey: 'fix-settings-json',
  },
  {
    id: '2.2.2',
    name: 'Post-turn hook registered and enforces validation',
    tier: 'standard',
    category: 'Hooks',
    pts: 2,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const status = getPostTurnHookStatus(ctx);
        return buildHooksCheckResult(
          '2.2.2',
          'Post-turn hook registered and enforces validation',
          status.passes ? 'pass' : 'fail',
          status.passes ? 2 : 0,
          2,
          'high',
          getPostTurnHookMessage(ctx, status),
        );
      },
    },
    recommendation:
      'Register a real stop-lint hook and make sure it runs lint, typecheck, or format-check commands instead of a no-op wrapper',
    recommendationKey: 'create-stop-lint',
  },
  {
    id: '2.2.2a',
    name: 'Registered hook paths exist',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const hasRegisteredHooks =
          ctx.agentFacts.hooks.postTurnRegistered ||
          ctx.agentFacts.hooks.postToolRegistered;
        if (!hasRegisteredHooks) {
          return buildHooksCheckResult(
            '2.2.2a',
            'Registered hook paths exist',
            'na',
            0,
            0,
            'high',
            'No registered hook paths to validate',
          );
        }

        const missing = getMissingRegisteredHookPaths(ctx);
        if (missing.length === 0) {
          const existingCount = countExistingRegisteredHookPaths(ctx);
          return buildHooksCheckResult(
            '2.2.2a',
            'Registered hook paths exist',
            'pass',
            1,
            1,
            'high',
            `All ${existingCount} registered hook paths resolve on disk`,
          );
        }

        return buildHooksCheckResult(
          '2.2.2a',
          'Registered hook paths exist',
          'fail',
          0,
          1,
          'high',
          `Hook registration points at missing script files: ${missing.join(', ')}. Fix the registered path or create the missing hook script.`,
        );
      },
    },
    recommendation:
      'If settings register a hook command, the referenced hook script must exist at that exact path',
    recommendationKey: 'create-stop-lint',
  },
  {
    id: '2.2.3',
    name: 'Post-turn hook does not swallow failures',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.postTurnExists === false) {
          return {
            id: '2.2.3',
            name: 'Post-turn hook does not swallow failures',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No post-turn hook to check',
          };
        }
        return {
          id: '2.2.3',
          name: 'Post-turn hook does not swallow failures',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.postTurnSwallowsFailures
            ? 'fail'
            : 'pass',
          points: ctx.agentFacts.hooks.postTurnSwallowsFailures ? 0 : 1,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.postTurnSwallowsFailures
            ? 'Post-turn hook swallows validation failures with `|| true`. Expected lint/typecheck/format checks to fail the hook honestly; current setup will hide broken validation runs.'
            : 'Post-turn hook preserves validation failures (no || true on validation commands)',
        };
      },
    },
    recommendation:
      'Remove `|| true` after lint/typecheck/format commands in stop-lint.sh so validation failures are surfaced honestly',
    recommendationKey: 'fix-hook-exit',
  },
  {
    id: '2.2.4',
    name: 'Post-tool hook or documented skip',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'required',
    detect: {
      type: 'custom',
      fn: buildPostToolHookCheckResult,
    },
    recommendation:
      'Create format-file hook or document why it was skipped (no formatter). Claude PostToolUse hooks must read top-level `.file_path` from stdin JSON.',
    recommendationKey: 'create-format-hook',
  },
  {
    id: '2.2.4d',
    name: 'Post-tool hook reads expected JSON key',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.facts.stack.formatCommand === null) {
          return buildHooksCheckResult(
            '2.2.4d',
            'Post-tool hook reads expected JSON key',
            'na',
            0,
            0,
            'high',
            'No formatter detected - post-tool schema check not applicable',
          );
        }
        if (ctx.agentFacts.hooks.postToolRegistered === false) {
          return buildHooksCheckResult(
            '2.2.4d',
            'Post-tool hook reads expected JSON key',
            'na',
            0,
            0,
            'high',
            'No post-tool hook registered',
          );
        }
        if (ctx.agentFacts.hooks.postToolExists === false) {
          return buildHooksCheckResult(
            '2.2.4d',
            'Post-tool hook reads expected JSON key',
            'na',
            0,
            0,
            'high',
            'Registered post-tool hook file is missing',
          );
        }

        return buildHooksCheckResult(
          '2.2.4d',
          'Post-tool hook reads expected JSON key',
          ctx.agentFacts.hooks.postToolUsesExpectedPathField ? 'pass' : 'fail',
          ctx.agentFacts.hooks.postToolUsesExpectedPathField ? 1 : 0,
          1,
          'high',
          ctx.agentFacts.hooks.postToolUsesExpectedPathField
            ? 'Post-tool hook reads the expected top-level path field from the event payload'
            : `Post-tool hook at ${ctx.agentFacts.hooks.postToolRegisteredPath} reads the wrong JSON key. Expected top-level \`.file_path\` for the current agent event schema.`,
        );
      },
    },
    recommendation:
      'Update the post-tool hook to read the event schema the agent actually emits. Claude PostToolUse hooks should read top-level `.file_path`.',
    recommendationKey: 'create-format-hook',
  },
  {
    id: '2.2.4e',
    name: 'Post-tool hook skips agent config dirs',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.facts.stack.formatCommand === null) {
          return buildHooksCheckResult(
            '2.2.4e',
            'Post-tool hook skips agent config dirs',
            'na',
            0,
            0,
            'medium',
            'No formatter detected - config-dir skip check not applicable',
          );
        }
        if (ctx.agentFacts.hooks.postToolRegistered === false) {
          return buildHooksCheckResult(
            '2.2.4e',
            'Post-tool hook skips agent config dirs',
            'na',
            0,
            0,
            'medium',
            'No post-tool hook registered',
          );
        }
        if (ctx.agentFacts.hooks.postToolExists === false) {
          return buildHooksCheckResult(
            '2.2.4e',
            'Post-tool hook skips agent config dirs',
            'na',
            0,
            0,
            'medium',
            'Registered post-tool hook file is missing',
          );
        }

        return buildHooksCheckResult(
          '2.2.4e',
          'Post-tool hook skips agent config dirs',
          ctx.agentFacts.hooks.postToolSkipsAgentConfigPaths ? 'pass' : 'fail',
          ctx.agentFacts.hooks.postToolSkipsAgentConfigPaths ? 1 : 0,
          1,
          'medium',
          ctx.agentFacts.hooks.postToolSkipsAgentConfigPaths
            ? 'Post-tool hook skips agent config directories before formatting'
            : `Post-tool hook at ${ctx.agentFacts.hooks.postToolRegisteredPath} does not clearly skip agent config directories. Add guards for paths under \`.claude/\`, \`.agents/\`, and \`.gemini/\`.`,
        );
      },
    },
    recommendation:
      'Format hooks should skip agent-owned config directories (`.claude/`, `.agents/`, `.gemini/`) instead of rewriting runtime files.',
    recommendationKey: 'create-format-hook',
  },
  {
    id: '2.2.4a',
    name: 'Deny hook has blocking logic',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.4a',
            name: 'Deny hook has blocking logic',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No deny hook',
          };
        }
        return {
          id: '2.2.4a',
          name: 'Deny hook has blocking logic',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyHasBlocks ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyHasBlocks ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.denyHasBlocks
            ? 'Deny hook has real blocking logic'
            : 'Deny hook exists but has no blocking logic (just exit 0)',
        };
      },
    },
    recommendation:
      'Deny hook should contain actual blocking patterns (exit 2 for dangerous commands), not just exit 0',
    recommendationKey: 'add-deny-blocks',
  },
  {
    id: '2.2.4b',
    name: 'Post-turn hook has validation logic',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.postTurnExists === false) {
          return {
            id: '2.2.4b',
            name: 'Post-turn hook has validation logic',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message: 'No post-turn hook',
          };
        }
        return {
          id: '2.2.4b',
          name: 'Post-turn hook has validation logic',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.postTurnHasValidation ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.postTurnHasValidation ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: ctx.agentFacts.hooks.postTurnHasValidation
            ? 'Post-turn hook runs lint/typecheck/format checks'
            : 'Post-turn hook exists but no lint/typecheck/format commands were detected. Expected shellcheck, eslint, tsc, prettier --check, `npm run lint`, or `bash scripts/preflight-checks.sh` instead of a bare `exit 0` wrapper.',
        };
      },
    },
    recommendation:
      'Post-turn hook should run actual validation (shellcheck, typecheck, lint, format check), not just exit 0',
    recommendationKey: 'add-stop-lint-validation',
  },
  {
    id: '2.2.4c',
    name: 'Compaction hook registered',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    na: (ctx) => ctx.agentFacts.agent.settingsFile === null,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => ({
        id: '2.2.4c',
        name: 'Compaction hook registered',
        tier: 'standard',
        category: 'Hooks',
        status: ctx.agentFacts.hooks.compactionHookExists ? 'pass' : 'fail',
        points: ctx.agentFacts.hooks.compactionHookExists ? 1 : 0,
        maxPoints: 1,
        confidence: 'medium',
        message: ctx.agentFacts.hooks.compactionHookExists
          ? 'Notification hook for compaction found - context preserved across long sessions'
          : 'No compaction hook - context may be lost during long sessions. Add a Notification hook with compact matcher.',
      }),
    },
    recommendation:
      'Register a Notification hook for compaction that re-injects current task, modified files, and constraints after context compaction',
    recommendationKey: 'add-compaction-hook',
  },
  {
    id: '2.2.5a',
    name: 'Deny hook uses safe JSON parsing',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5a',
            name: 'Deny hook uses safe JSON parsing',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message: 'No deny hook',
          };
        }
        if (ctx.agentFacts.hooks.denyIsConfigBased) {
          return {
            id: '2.2.5a',
            name: 'Deny hook uses safe JSON parsing',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message:
              'Deny is config-based (settings.json or execpolicy) - JSON parsing check not applicable',
          };
        }
        return {
          id: '2.2.5a',
          name: 'Deny hook uses safe JSON parsing',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyUsesJq ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyUsesJq ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: ctx.agentFacts.hooks.denyUsesJq
            ? 'Deny hook uses jq for JSON parsing (portable)'
            : 'Deny hook uses grep -P or regex for JSON parsing - use jq instead (grep -P is not portable to macOS)',
        };
      },
    },
    recommendation:
      'Deny hook should use jq for JSON input parsing, not grep -P (which is unavailable on macOS). Fall back to sed if jq is not installed.',
    recommendationKey: 'fix-deny-json-parsing',
  },
  {
    id: '2.2.5b',
    name: 'Deny hook handles command chaining',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5b',
            name: 'Deny hook handles command chaining',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message: 'No deny hook',
          };
        }
        if (ctx.agentFacts.hooks.denyIsConfigBased) {
          return {
            id: '2.2.5b',
            name: 'Deny hook handles command chaining',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message:
              'Deny is config-based (settings.json or execpolicy) - chaining check not applicable',
          };
        }
        return {
          id: '2.2.5b',
          name: 'Deny hook handles command chaining',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyHandlesChaining ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyHandlesChaining ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: ctx.agentFacts.hooks.denyHandlesChaining
            ? 'Deny hook splits on && || ; before checking patterns'
            : 'Deny hook does not handle command chaining - "echo hello && rm -rf /" would bypass detection',
        };
      },
    },
    recommendation:
      'Deny hook should split commands on &&, ||, and ; then check each segment independently. Without this, chained dangerous commands bypass detection.',
    recommendationKey: 'fix-deny-chaining',
  },
  {
    id: '2.2.5c',
    name: 'Deny hook blocks rm -rf',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5c',
            name: 'Deny hook blocks rm -rf',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No deny hook',
          };
        }
        return {
          id: '2.2.5c',
          name: 'Deny hook blocks rm -rf',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyBlocksRmRf ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyBlocksRmRf ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.denyBlocksRmRf
            ? 'Deny hook blocks rm -rf'
            : 'Deny hook does not block rm -rf - the most dangerous destructive command must be blocked',
        };
      },
    },
    recommendation:
      'Deny hook MUST block rm -rf (and rm -fr). This is the single most dangerous command an agent can run.',
    recommendationKey: 'fix-deny-rm-rf',
  },
  {
    id: '2.2.5d',
    name: 'Read-deny covers sensitive paths',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        // Codex has no Read-deny mechanism - execpolicy only blocks shell commands, not file reads
        if (ctx.agentFacts.agent.id === 'codex') {
          return {
            id: '2.2.5d',
            name: 'Read-deny covers sensitive paths',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message:
              'Codex has no Read-deny mechanism (execpolicy covers shell commands only)',
          };
        }
        if (ctx.agentFacts.settings.exists === false) {
          return {
            id: '2.2.5d',
            name: 'Read-deny covers sensitive paths',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'medium',
            message: 'No settings file',
          };
        }
        return {
          id: '2.2.5d',
          name: 'Read-deny covers sensitive paths',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.readDenyCoversSecrets ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.readDenyCoversSecrets ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: ctx.agentFacts.hooks.readDenyCoversSecrets
            ? 'Read-deny patterns cover .env, .ssh, .aws, and key/credential files'
            : 'Read-deny patterns are missing coverage for common sensitive paths (.env, .ssh, .aws, .pem/.key/credentials)',
        };
      },
    },
    recommendation:
      'Settings permissions.deny should include Read patterns for: .env*, .ssh/**, .aws/**, *.pem, *.key, credentials*. These prevent agents from reading secrets.',
    recommendationKey: 'fix-read-deny-secrets',
  },
  {
    id: '2.2.5g',
    name: 'Edit/Write deny mirrors Read deny for .env',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.agent.id === 'codex') {
          return buildHooksCheckResult(
            '2.2.5g',
            'Edit/Write deny mirrors Read deny for .env',
            'na',
            0,
            0,
            'medium',
            'Codex uses execpolicy, not settings deny',
          );
        }
        const denyPatterns = getDenyPatterns(ctx);
        if (denyPatterns === null) {
          return buildHooksCheckResult(
            '2.2.5g',
            'Edit/Write deny mirrors Read deny for .env',
            'na',
            0,
            0,
            'medium',
            'No deny patterns configured',
          );
        }
        const { hasReadEnv, hasEditEnv, hasWriteEnv } =
          getEnvDenyCoverage(denyPatterns);
        if (!hasReadEnv) {
          return buildHooksCheckResult(
            '2.2.5g',
            'Edit/Write deny mirrors Read deny for .env',
            'na',
            0,
            0,
            'medium',
            'No Read deny for .env - check 2.2.5d covers this',
          );
        }
        const pass = hasEditEnv && hasWriteEnv;
        return {
          id: '2.2.5g',
          name: 'Edit/Write deny mirrors Read deny for .env',
          tier: 'standard',
          category: 'Hooks',
          status: pass ? 'pass' : 'fail',
          points: pass ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: pass
            ? 'Edit and Write deny patterns exist for .env alongside Read deny'
            : `Read(.env) is denied but ${formatMissingEnvDenyActions(hasEditEnv, hasWriteEnv)} is not - agents can still modify secrets`,
        };
      },
    },
    recommendation:
      'If Read(**/.env*) is denied, also add Edit(**/.env*) and Write(**/.env*) to permissions.deny. Without these, agents can still modify secret files even though they cannot read them.',
    recommendationKey: 'fix-edit-write-deny-env',
  },
  {
    id: '2.2.5e',
    name: 'Deny hook blocks force push',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5e',
            name: 'Deny hook blocks force push',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No deny hook',
          };
        }
        return {
          id: '2.2.5e',
          name: 'Deny hook blocks force push',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyBlocksForcePush ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyBlocksForcePush ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.denyBlocksForcePush
            ? 'Deny hook blocks force push'
            : 'Deny hook does not block force push - agents must never force push',
        };
      },
    },
    recommendation:
      'Deny hook MUST block force push (--force flag on git push). Force push can destroy shared branch history.',
    recommendationKey: 'fix-deny-force-push',
  },
  {
    id: '2.2.5f',
    name: 'Deny hook blocks chmod 777',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5f',
            name: 'Deny hook blocks chmod 777',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No deny hook',
          };
        }
        return {
          id: '2.2.5f',
          name: 'Deny hook blocks chmod 777',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyBlocksChmod ? 'pass' : 'fail',
          points: ctx.agentFacts.hooks.denyBlocksChmod ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.denyBlocksChmod
            ? 'Deny hook blocks chmod 777'
            : 'Deny hook does not block chmod 777 - world-writable permissions are a security risk',
        };
      },
    },
    recommendation:
      'Deny hook MUST block chmod 777. World-writable permissions are a security vulnerability.',
    recommendationKey: 'fix-deny-chmod',
  },
  {
    id: '2.2.5i',
    name: 'Deny hook blocks pipe-to-shell',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'optional',
    hidden: true,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        if (ctx.agentFacts.hooks.denyExists === false) {
          return {
            id: '2.2.5i',
            name: 'Deny hook blocks pipe-to-shell',
            tier: 'standard',
            category: 'Hooks',
            status: 'na',
            points: 0,
            maxPoints: 0,
            confidence: 'high',
            message: 'No deny hook',
          };
        }
        return {
          id: '2.2.5i',
          name: 'Deny hook blocks pipe-to-shell',
          tier: 'standard',
          category: 'Hooks',
          status: ctx.agentFacts.hooks.denyBlocksPipeToShell
            ? 'pass'
            : 'fail',
          points: ctx.agentFacts.hooks.denyBlocksPipeToShell ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: ctx.agentFacts.hooks.denyBlocksPipeToShell
            ? 'Deny hook blocks pipe-to-shell commands'
            : 'Deny hook does not block pipe-to-shell commands like `curl | bash` or `wget | sh`, which let agents execute remote code without inspection',
        };
      },
    },
    recommendation:
      'Deny hook MUST block pipe-to-shell patterns such as `curl | bash` and `wget | sh`. Agents should download scripts for inspection instead of piping them straight into a shell.',
    recommendationKey: 'fix-deny-pipe-to-shell',
  },
  {
    id: '2.2.5',
    name: 'Preflight script',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: { type: 'file_exists', path: 'scripts/preflight-checks.sh' },
    recommendation: 'Create scripts/preflight-checks.sh',
    recommendationKey: 'create-preflight-script',
  },
  {
    id: '2.2.6',
    name: 'Context validation',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'composite',
      mode: 'any',
      checks: [
        { type: 'file_exists', path: 'scripts/context-validate.sh' },
        {
          type: 'file_exists',
          path: '.github/workflows/context-validation.yml',
        },
      ],
    },
    recommendation: 'Create context validation script or CI workflow',
    recommendationKey: 'create-context-validation',
  },
  // 2.2.7 (Ask First mechanical enforcement) removed - see ADR-006.
  // The hook blocks normal development on framework projects. Ask First
  // boundaries remain as policy in the instruction file.



  {
    id: '2.2.8',
    name: 'Agent ignore files for sensitive paths',
    tier: 'standard',
    category: 'Hooks',
    pts: 1,
    partialPts: 1,
    confidence: 'high',
    priority: 'recommended',
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const { copilotignore, cursorignore } = ctx.facts.shared.ignoreFiles;
        const readDeny = ctx.agentFacts.hooks.readDenyCoversSecrets;
        const hasAny = copilotignore || cursorignore || readDeny;
        const all = [
          copilotignore ? '.copilotignore' : null,
          cursorignore ? '.cursorignore' : null,
          readDeny ? 'settings.json Read deny' : null,
        ].filter(Boolean);
        return {
          id: '2.2.8',
          name: 'Agent ignore files for sensitive paths',
          tier: 'standard',
          category: 'Hooks',
          status: hasAny ? 'pass' : 'fail',
          points: hasAny ? 1 : 0,
          maxPoints: 1,
          confidence: 'high',
          message: hasAny
            ? `Sensitive path protection: ${all.join(', ')}`
            : 'No .copilotignore, .cursorignore, or Read deny patterns for sensitive files (.env, secrets, keys)',
        };
      },
    },
    recommendation:
      'Create .copilotignore and/or .cursorignore with patterns for .env*, secrets/, *.pem, *.key. For Claude Code, add Read(**/.env*) deny patterns to settings.json.',
    recommendationKey: 'create-ignore-files',
  },
];
