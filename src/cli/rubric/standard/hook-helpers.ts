/**
 * Hook check helpers — builders for deny, post-turn, post-tool, and registration checks.
 */
import type { FactContext, CheckResult } from '../../types.js';


/** Build a standard-tier hook check result with shared Hooks category metadata. */
export function buildHooksCheckResult(
  id: string,
  name: string,
  status: CheckResult['status'],
  points: number,
  maxPoints: number,
  confidence: CheckResult['confidence'],
  message: string,
): CheckResult {
  return {
    id,
    name,
    tier: 'standard',
    category: 'Hooks',
    status,
    points,
    maxPoints,
    confidence,
    message,
  };
}

/** Return the configured settings-based deny patterns when they exist. */
export function getDenyPatterns(ctx: FactContext): string[] | null {
  if (
    !ctx.agentFacts.settings.hasDenyPatterns ||
    !ctx.agentFacts.settings.parsed
  )
    return null;

  const permissions = (
    ctx.agentFacts.settings.parsed as Record<string, unknown>
  ).permissions as Record<string, unknown> | undefined;
  return Array.isArray(permissions?.deny)
    ? (permissions.deny as string[])
    : null;
}

/** Detect which `.env` operations are covered by the deny pattern set. */
export function getEnvDenyCoverage(denyPatterns: string[]): {
  hasReadEnv: boolean;
  hasEditEnv: boolean;
  hasWriteEnv: boolean;
} {
  const denyText = denyPatterns.join(' ');
  return {
    hasReadEnv: /Read\(.*\.env/.test(denyText),
    hasEditEnv: /Edit\(.*\.env/.test(denyText),
    hasWriteEnv: /Write\(.*\.env/.test(denyText),
  };
}

/** Format the missing `.env` deny actions for the failure message. */
export function formatMissingEnvDenyActions(
  hasEditEnv: boolean,
  hasWriteEnv: boolean,
): string {
  const missing: string[] = [];
  if (!hasEditEnv) missing.push('Edit(.env)');
  if (!hasWriteEnv) missing.push('Write(.env)');
  return missing.join(' and ');
}

/** Return the settings path that should contain hook registrations for this agent. */
function getHookSettingsPath(ctx: FactContext): string {
  return ctx.agentFacts.agent.settingsFile ?? 'agent hook config';
}

/** Build the failure message for a missing hook registration. */
function formatMissingHookRegistrationMessage(
  ctx: FactContext,
  hookKind: 'post-turn' | 'post-tool',
  eventName: string,
  expectedPath: string,
): string {
  const settingsPath = getHookSettingsPath(ctx);
  const formatterDetail =
    hookKind === 'post-tool' && ctx.facts.stack.formatCommand
      ? ` Formatter detected: ${ctx.facts.stack.formatCommand}.`
      : '';
  return `Expected ${hookKind} hook registration in ${settingsPath}: event "${eventName}" should point at ${expectedPath}, but no matching hook entry was found.${formatterDetail} Add the hook in settings so the script is actually invoked.`;
}

/** Gather the facts needed to score the post-tool hook check. */
function getPostToolHookStatus(ctx: FactContext): {
  noFormatter: boolean;
  registered: boolean;
  exists: boolean;
  schemaOk: boolean;
  registeredPath: string | null;
  passes: boolean;
} {
  const noFormatter = ctx.facts.stack.formatCommand === null;
  const registered = ctx.agentFacts.hooks.postToolRegistered;
  const exists = ctx.agentFacts.hooks.postToolExists;
  const schemaOk = ctx.agentFacts.hooks.postToolUsesExpectedPathField;
  return {
    noFormatter,
    registered,
    exists,
    schemaOk,
    registeredPath: ctx.agentFacts.hooks.postToolRegisteredPath,
    passes: noFormatter || (exists && schemaOk),
  };
}

/** Build the user-facing status message for the post-tool hook check. */
function getPostToolHookMessage(
  ctx: FactContext,
  status: ReturnType<typeof getPostToolHookStatus>,
): string {
  if (status.noFormatter) {
    return 'No formatter - skip is correct';
  }

  if (status.registered && status.exists === false) {
    return `Post-tool hook is registered at ${status.registeredPath} but the script file does not exist`;
  }

  if (
    ctx.agentFacts.agent.id === 'claude' &&
    status.exists &&
    status.schemaOk === false
  ) {
    return `Post-tool hook exists at ${status.registeredPath} but reads the wrong PostToolUse payload field. Expected top-level .file_path`;
  }

  if (status.exists && status.schemaOk) {
    return `Post-tool hook registered: ${status.registeredPath}`;
  }

  return formatMissingHookRegistrationMessage(
    ctx,
    'post-tool',
    ctx.agentFacts.agent.hookEvents.postTool,
    `${ctx.agentFacts.agent.hooksDir ?? '.'}/format-file.sh`,
  );
}

/** Build the final check result for the post-tool hook-or-skip rule. */
export function buildPostToolHookCheckResult(ctx: FactContext): CheckResult {
  const status = getPostToolHookStatus(ctx);
  return {
    id: '2.2.4',
    name: 'Post-tool hook or documented skip',
    tier: 'standard',
    category: 'Hooks',
    status: status.passes ? 'pass' : 'fail',
    points: status.passes ? 1 : 0,
    maxPoints: 1,
    confidence: 'high',
    message: getPostToolHookMessage(ctx, status),
  };
}

/** Gather the facts needed to score the post-turn hook registration and enforcement check. */
export function getPostTurnHookStatus(ctx: FactContext): {
  registered: boolean;
  exists: boolean;
  hasValidation: boolean;
  registeredPath: string | null;
  passes: boolean;
} {
  const registered = ctx.agentFacts.hooks.postTurnRegistered;
  const exists = ctx.agentFacts.hooks.postTurnExists;
  const hasValidation = ctx.agentFacts.hooks.postTurnHasValidation;
  return {
    registered,
    exists,
    hasValidation,
    registeredPath: ctx.agentFacts.hooks.postTurnRegisteredPath,
    passes: registered && exists && hasValidation,
  };
}

/** Build the user-facing status message for the post-turn hook registration and enforcement check. */
export function getPostTurnHookMessage(
  ctx: FactContext,
  status: ReturnType<typeof getPostTurnHookStatus>,
): string {
  if (status.registered === false) {
    return formatMissingHookRegistrationMessage(
      ctx,
      'post-turn',
      ctx.agentFacts.agent.hookEvents.postTurn,
      `${ctx.agentFacts.agent.hooksDir ?? '.'}/stop-lint.sh`,
    );
  }

  if (status.exists === false) {
    return `Post-turn hook is registered at ${status.registeredPath} but the script file does not exist. Registered hooks only count when the referenced stop-lint script resolves on disk.`;
  }

  if (status.hasValidation === false) {
    return `Post-turn hook is registered at ${status.registeredPath} but no lint, typecheck, or format-check commands were detected. Expected real enforcement such as shellcheck, eslint, tsc, phpstan, or prettier --check instead of a wrapper that only echoes and exits 0.`;
  }

  return `Post-turn hook registered and runs validation: ${status.registeredPath}`;
}

/** Return the list of registered hook paths whose backing script files are missing. */
export function getMissingRegisteredHookPaths(ctx: FactContext): string[] {
  const missing: string[] = [];

  if (
    ctx.agentFacts.hooks.postTurnRegistered &&
    ctx.agentFacts.hooks.postTurnExists === false &&
    ctx.agentFacts.hooks.postTurnRegisteredPath
  ) {
    missing.push(`Stop: ${ctx.agentFacts.hooks.postTurnRegisteredPath}`);
  }

  if (
    ctx.agentFacts.hooks.postToolRegistered &&
    ctx.agentFacts.hooks.postToolExists === false &&
    ctx.agentFacts.hooks.postToolRegisteredPath
  ) {
    missing.push(`PostToolUse: ${ctx.agentFacts.hooks.postToolRegisteredPath}`);
  }

  return missing;
}

/** Count the registered hook paths that already resolve on disk. */
export function countExistingRegisteredHookPaths(ctx: FactContext): number {
  let count = 0;
  if (
    ctx.agentFacts.hooks.postTurnRegistered &&
    ctx.agentFacts.hooks.postTurnExists
  ) {
    count++;
  }
  if (
    ctx.agentFacts.hooks.postToolRegistered &&
    ctx.agentFacts.hooks.postToolExists
  ) {
    count++;
  }
  return count;
}

/**
 * Tier 2 - Standard (58 pts on a fully configured project; varies with N/A checks)
 * Skills, hooks, learning loop, router, architecture, local context.
 * These checks represent the operational layer that makes GOAT Flow effective.
 */
