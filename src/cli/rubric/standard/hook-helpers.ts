/**
 * Hook check helpers - builders for deny, post-turn, and registration checks.
 */
import type { FactContext, CheckResult } from "../../types.js";

/** Build a standard-tier hook check result with shared Hooks category metadata. */
export function buildHooksCheckResult(
  id: string,
  name: string,
  status: CheckResult["status"],
  points: number,
  maxPoints: number,
  confidence: CheckResult["confidence"],
  message: string,
): CheckResult {
  return {
    id,
    name,
    tier: "standard",
    category: "Hooks",
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
  const denyText = denyPatterns.join(" ");
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
  if (!hasEditEnv) missing.push("Edit(.env)");
  if (!hasWriteEnv) missing.push("Write(.env)");
  return missing.join(" and ");
}

/** Return the settings path that should contain hook registrations for this agent. */
function getHookSettingsPath(ctx: FactContext): string {
  return ctx.agentFacts.agent.settingsFile ?? "agent hook config";
}

/** Build the failure message for a missing hook registration. */
function formatMissingHookRegistrationMessage(
  ctx: FactContext,
  hookKind: "post-turn",
  eventName: string,
  expectedPath: string,
): string {
  const settingsPath = getHookSettingsPath(ctx);
  return `Expected ${hookKind} hook registration in ${settingsPath}: event "${eventName}" should point at ${expectedPath}, but no matching hook entry was found. Add the hook in settings so the script is actually invoked.`;
}

/** Gather the facts needed to score the post-turn hook registration and enforcement check. */
export function getPostTurnHookStatus(ctx: FactContext): {
  registered: boolean;
  exists: boolean;
  hasValidation: boolean;
  registeredPath: string | null;
  notConfigured: boolean;
  passes: boolean;
} {
  const registered = ctx.agentFacts.hooks.postTurnRegistered;
  const exists = ctx.agentFacts.hooks.postTurnExists;
  const hasValidation = ctx.agentFacts.hooks.postTurnHasValidation;
  const registeredPath = ctx.agentFacts.hooks.postTurnRegisteredPath;
  const notConfigured = registered === false && registeredPath === null;
  return {
    registered,
    exists,
    hasValidation,
    registeredPath,
    notConfigured,
    passes: registered && exists && hasValidation,
  };
}

/** Build the user-facing status message for the post-turn hook registration and enforcement check. */
export function getPostTurnHookMessage(
  ctx: FactContext,
  status: ReturnType<typeof getPostTurnHookStatus>,
): string {
  if (status.notConfigured) {
    return "No post-turn hook configured. That's acceptable if validation happens elsewhere (CI, pre-commit, or manual verification).";
  }

  if (status.registered === false) {
    return formatMissingHookRegistrationMessage(
      ctx,
      "post-turn",
      ctx.agentFacts.agent.hookEvents.postTurn,
      `${ctx.agentFacts.agent.hooksDir ?? "."}/post-turn-hook.sh`,
    );
  }

  if (status.exists === false) {
    return `Post-turn hook is registered at ${status.registeredPath} but the script file does not exist. Registered hooks only count when the referenced post-turn hook path resolves on disk.`;
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

  return missing;
}

/** Return the list of registered hook paths that exist but are not executable. */
export function getNonExecutableRegisteredHookPaths(
  ctx: FactContext,
): string[] {
  const nonExecutable: string[] = [];

  if (
    ctx.agentFacts.hooks.postTurnRegistered &&
    ctx.agentFacts.hooks.postTurnExists &&
    ctx.agentFacts.hooks.postTurnExecutable === false &&
    ctx.agentFacts.hooks.postTurnRegisteredPath
  ) {
    nonExecutable.push(`Stop: ${ctx.agentFacts.hooks.postTurnRegisteredPath}`);
  }

  return nonExecutable;
}

/** Count the registered hook paths that both exist and are executable. */
export function countUsableRegisteredHookPaths(ctx: FactContext): number {
  let count = 0;
  if (
    ctx.agentFacts.hooks.postTurnRegistered &&
    ctx.agentFacts.hooks.postTurnExists &&
    ctx.agentFacts.hooks.postTurnExecutable
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
