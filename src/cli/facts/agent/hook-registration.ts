import type { AgentProfile, ReadonlyFS } from "../../types.js";
import { pushUniquePath } from "./routing.js";

/** Result of resolving one hook event to its registered script path. */
interface HookRegistrationMatch {
  registered: boolean;
  path: string | null;
}

/** Normalize hook command arguments into a repo-relative shell-script path. */
function normalizeHookPath(candidate: string): string | null {
  if (!candidate) return null;
  let path = candidate.trim();
  if (!path) return null;
  path = path.replace(/^['"`]|['"`]$/g, "");
  // Hook launchers prefix the script path with a resolved repo root, either as
  // an inline substitution ($(git rev-parse --show-toplevel)/...sh) or a shell
  // variable ($root/...sh, $REPO/...sh) populated earlier in the command. Strip
  // either prefix so callers see a repo-relative script path.
  const substitutionMatch = path.match(/\$(?:\([^)]*\)|\{?\w+\}?)\/(.*\.sh)$/);
  if (substitutionMatch && substitutionMatch[1]) {
    path = substitutionMatch[1];
  }
  if (!path.endsWith(".sh")) return null;
  return path;
}

/** Extract normalized shell-script paths from one hook command string. */
function extractHookPathsFromCommand(command: string): string[] {
  const pathCandidates: string[] = [];
  const quotedMatches = command.matchAll(/["']([^"']+\.sh)["']/g);
  for (const match of quotedMatches) {
    const path = match[1];
    if (path === undefined) continue;
    const normalized = normalizeHookPath(path);
    if (normalized) pushUniquePath(pathCandidates, normalized);
  }

  const unquotedMatches = command.matchAll(/([^\s"'`]+\.sh)/g);
  for (const match of unquotedMatches) {
    const path = match[1];
    if (path === undefined) continue;
    const normalized = normalizeHookPath(path);
    if (normalized) pushUniquePath(pathCandidates, normalized);
  }

  return pathCandidates;
}

/** Return the preferred shell-script path referenced by a list of hook commands. */
function preferredHookPathFromCommands(commands: string[]): string | null {
  const paths: string[] = [];
  for (const command of commands) {
    const candidates = extractHookPathsFromCommand(command);
    for (const candidate of candidates) pushUniquePath(paths, candidate);
  }
  return (
    paths.find((path) => path.endsWith("/deny-dangerous.sh")) ??
    paths.find((path) => path.endsWith("/guard-repository-writes.sh")) ??
    paths[0] ??
    null
  );
}

/** Return the parsed `hooks` object from settings when it exists. */
function readHooksObject(
  settingsParsed: unknown,
): Record<string, unknown> | null {
  if (!settingsParsed || typeof settingsParsed !== "object") return null;
  const hooks = (settingsParsed as Record<string, unknown>).hooks;
  if (!hooks || typeof hooks !== "object") return null;
  return hooks as Record<string, unknown>;
}

/** Return one Antigravity top-level hook definition by goat-flow hook id. */
function readAntigravityHookDefinition(
  hookConfigParsed: unknown,
  hookId: string,
): Record<string, unknown> | null {
  if (!hookConfigParsed || typeof hookConfigParsed !== "object") return null;
  const definition = (hookConfigParsed as Record<string, unknown>)[hookId];
  if (!definition || typeof definition !== "object") return null;
  return definition as Record<string, unknown>;
}

/** Extract the shell command from one hook entry when it uses command mode. */
function hasSupportedHookType(hookObj: Record<string, unknown>): boolean {
  return (
    hookObj.type === undefined ||
    hookObj.type === "command" ||
    hookObj.type === "Command"
  );
}

/** Read one shell command field from a normalized hook object. */
function readHookCommand(hookObj: Record<string, unknown>): string | null {
  if (typeof hookObj.bash === "string") return hookObj.bash;
  if (typeof hookObj.command === "string") return hookObj.command;
  const nestedCommand = hookObj.command;
  if (!nestedCommand || typeof nestedCommand !== "object") return null;
  return typeof (nestedCommand as Record<string, unknown>).bash === "string"
    ? ((nestedCommand as Record<string, unknown>).bash as string)
    : null;
}

/** Extract the shell command from supported hook payload shapes. */
function extractCommandFromHook(hook: unknown): string | null {
  if (!hook || typeof hook !== "object") return null;
  const hookObj = hook as Record<string, unknown>;
  if (!hasSupportedHookType(hookObj)) return null;
  return readHookCommand(hookObj);
}

/** Extract all shell commands declared inside one event registration entry. */
function extractCommandsFromEventEntry(entry: unknown): string[] {
  if (!entry || typeof entry !== "object") return [];
  const directCommand = extractCommandFromHook(entry);
  if (directCommand !== null) return [directCommand];
  const eventHooks = (entry as Record<string, unknown>).hooks;
  if (!Array.isArray(eventHooks)) return [];

  const commands: string[] = [];
  for (const hook of eventHooks) {
    const command = extractCommandFromHook(hook);
    if (command !== null) commands.push(command);
  }
  return commands;
}

/** Normalize one event's hook registration into a simple registered/path pair. */
function normalizeEventConfig(
  hooks: Record<string, unknown>,
  event: string | null,
): HookRegistrationMatch {
  if (!event) return { registered: false, path: null };
  const rawEvent = hooks[event];
  if (rawEvent === undefined) return { registered: false, path: null };
  if (!Array.isArray(rawEvent)) return { registered: false, path: null };

  const commands: string[] = [];
  for (const entry of rawEvent) {
    commands.push(...extractCommandsFromEventEntry(entry));
  }

  const path = preferredHookPathFromCommands(commands);
  return { registered: path !== null, path };
}

/** Load the hook-registration config for the current agent. */
export function readHookConfig(
  fs: ReadonlyFS,
  agent: AgentProfile,
  settingsParsed: unknown,
  settingsValid: boolean,
): { parsed: unknown; valid: boolean } {
  if (!agent.hookConfigFile) {
    return { parsed: null, valid: false };
  }
  if (agent.hookConfigFile === agent.settingsFile) {
    return { parsed: settingsParsed, valid: settingsValid };
  }
  const parsed = fs.readJson(agent.hookConfigFile);
  return { parsed, valid: parsed !== null };
}

/** Collect registered post-turn hook paths for the current agent. */
export function buildHookRegistration(
  agent: AgentProfile,
  hookConfigParsed: unknown,
): {
  postTurnRegistered: boolean;
  postTurnRegisteredPath: string | null;
} {
  const hooks = readHooksObject(hookConfigParsed);
  if (!hooks) {
    return {
      postTurnRegistered: false,
      postTurnRegisteredPath: null,
    };
  }

  if (!agent.hookEvents) {
    return { postTurnRegistered: false, postTurnRegisteredPath: null };
  }
  const postTurn = normalizeEventConfig(hooks, agent.hookEvents.postTurn);
  return {
    postTurnRegistered: postTurn.registered,
    postTurnRegisteredPath: postTurn.path,
  };
}

/** Check whether the deny hook is registered as a pre-tool-use hook in settings. */
export function buildDenyRegistration(
  agent: AgentProfile,
  hookConfigParsed: unknown,
): { denyIsRegistered: boolean; denyRegisteredPath: string | null } {
  if (agent.id === "antigravity") {
    if (!agent.hookEvents) {
      return { denyIsRegistered: false, denyRegisteredPath: null };
    }
    const denyDefinition =
      readAntigravityHookDefinition(hookConfigParsed, "deny-dangerous") ??
      readAntigravityHookDefinition(
        hookConfigParsed,
        "guard-repository-writes",
      );
    if (!denyDefinition || denyDefinition.enabled === false) {
      return { denyIsRegistered: false, denyRegisteredPath: null };
    }
    const preTool = normalizeEventConfig(
      denyDefinition,
      agent.hookEvents.preTool,
    );
    return {
      denyIsRegistered: preTool.registered,
      denyRegisteredPath: preTool.path,
    };
  }

  const hooks = readHooksObject(hookConfigParsed);
  if (!hooks) {
    return { denyIsRegistered: false, denyRegisteredPath: null };
  }

  if (!agent.hookEvents) {
    return { denyIsRegistered: false, denyRegisteredPath: null };
  }
  const preTool = normalizeEventConfig(hooks, agent.hookEvents.preTool);
  return {
    denyIsRegistered: preTool.registered,
    denyRegisteredPath: preTool.path,
  };
}
