import { CLIError } from "./cli-error.js";
import { writeOutput } from "./cli-output.js";
import type { ParsedCLI } from "./cli-types.js";

/** Render hook state as a compact terminal table. */
function renderHooksText(hooks: Array<Record<string, unknown>>): string {
  const lines = ["Hook state", ""];
  for (const hook of hooks) {
    const agents =
      hook.agents && typeof hook.agents === "object"
        ? (hook.agents as Record<string, Record<string, unknown>>)
        : {};
    const agentBits = Object.entries(agents).map(([agentId, state]) => {
      if (state.supported === false) return `${agentId}: not-supported`;
      const installed = state.installed === true ? "installed" : "missing";
      const drift = typeof state.drift === "string" ? ` (${state.drift})` : "";
      return `${agentId}: ${installed}${drift}`;
    });
    lines.push(
      `${String(hook.id)}  ${hook.enabled === true ? "enabled" : "disabled"}  ${agentBits.join(", ")}`,
    );
  }
  return lines.join("\n");
}

function requireHookId(options: ParsedCLI): string {
  if (options.hookId) return options.hookId;
  throw new CLIError(`hooks ${options.hookSubcommand} requires <hook-id>.`, 2);
}

function renderHooksResult(
  options: ParsedCLI,
  result: { hooks: unknown[] },
): void {
  writeOutput(
    options,
    options.format === "json"
      ? JSON.stringify(result, null, 2)
      : renderHooksText(result.hooks as Array<Record<string, unknown>>),
  );
}

function renderHookToggleResult(options: ParsedCLI, hook: unknown): void {
  writeOutput(
    options,
    options.format === "json"
      ? JSON.stringify({ hook }, null, 2)
      : renderHooksText([hook] as Array<Record<string, unknown>>),
  );
}

/** Handle hook registry/list/toggle/sync commands. */
export async function handleHooksCommand(options: ParsedCLI): Promise<void> {
  const {
    applyHookState,
    HookRegistrarError,
    readAllHookStates,
    syncHookStates,
  } = await import("./server/hook-registrar.js");

  try {
    switch (options.hookSubcommand) {
      case "list":
        renderHooksResult(options, {
          hooks: readAllHookStates(options.projectPath),
        });
        return;
      case "sync":
        renderHooksResult(options, {
          hooks: syncHookStates(options.projectPath),
        });
        return;
      case "enable":
      case "disable":
        renderHookToggleResult(
          options,
          applyHookState(
            requireHookId(options),
            options.hookSubcommand === "enable",
            options.projectPath,
          ),
        );
        return;
    }
  } catch (err) {
    if (err instanceof HookRegistrarError) {
      throw new CLIError(err.message, err.statusCode === 404 ? 2 : 1);
    }
    throw err;
  }

  throw new CLIError(
    "Usage: goat-flow hooks <list|sync|enable <hook-id>|disable <hook-id>> [path]",
    2,
  );
}
