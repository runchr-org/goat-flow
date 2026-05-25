/**
 * Registry of goat-flow-shipped hook scripts.
 *
 * The registry is the dashboard/CLI authority for togglable hooks. The
 * manifest remains the authority for which agents have hook support.
 */
import type { AgentId } from "../types.js";

type HookEvent = "PreToolUse" | "PostToolUse";

export interface HookSpec {
  id: string;
  displayName: string;
  description: string;
  event: HookEvent;
  matcher: string;
  scriptFiles: string[];
  primaryScript: string;
  togglable: boolean;
  defaultEnabled: boolean;
  requiresConfirmDialog: boolean;
  unsupportedAgents?: Partial<Record<AgentId, string>>;
}

const GRUFF_ANTIGRAVITY_UNSUPPORTED_REASON =
  "Antigravity PostToolUse hooks do not expose the completed tool's edited file path; gruff-on-change requires that file path to run per-file checks.";

const HOOKS: HookSpec[] = [
  {
    id: "deny-destructive-commands",
    displayName: "Deny destructive commands",
    description:
      "Block risky shell operations such as recursive deletion, chmod 777, pipe-to-shell, file truncation, destructive database commands, and opaque shell execution.",
    event: "PreToolUse",
    matcher: "Bash",
    scriptFiles: ["deny-destructive-commands.sh"],
    primaryScript: "deny-destructive-commands.sh",
    togglable: true,
    defaultEnabled: true,
    requiresConfirmDialog: true,
  },
  {
    id: "deny-secret-access",
    displayName: "Deny secret access",
    description:
      "Block Bash access to .env files, SSH/AWS/GCP credentials, key material, package credentials, and other common secret paths.",
    event: "PreToolUse",
    matcher: "Bash",
    scriptFiles: ["deny-secret-access.sh"],
    primaryScript: "deny-secret-access.sh",
    togglable: true,
    defaultEnabled: true,
    requiresConfirmDialog: true,
  },
  {
    id: "deny-git-mutations",
    displayName: "Deny git mutations",
    description:
      "Block agent-side git commits, git pushes, destructive git flags, and GitHub write operations through gh.",
    event: "PreToolUse",
    matcher: "Bash",
    scriptFiles: ["deny-git-mutations.sh"],
    primaryScript: "deny-git-mutations.sh",
    togglable: true,
    defaultEnabled: true,
    requiresConfirmDialog: true,
  },
  {
    id: "gruff-on-change",
    displayName: "gruff on change",
    description: "Run gruff-* on each edited file and surface findings inline.",
    event: "PostToolUse",
    matcher: "Edit|Write|MultiEdit",
    scriptFiles: ["gruff-on-change.sh"],
    primaryScript: "gruff-on-change.sh",
    togglable: true,
    defaultEnabled: false,
    requiresConfirmDialog: false,
    unsupportedAgents: {
      antigravity: GRUFF_ANTIGRAVITY_UNSUPPORTED_REASON,
    },
  },
];

const HOOKS_BY_ID = new Map(HOOKS.map((hook) => [hook.id, hook]));

export function listHookSpecs(): HookSpec[] {
  return [...HOOKS];
}

export function getHookSpec(hookId: string): HookSpec | null {
  return HOOKS_BY_ID.get(hookId) ?? null;
}

export function isValidHookIdShape(hookId: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/u.test(hookId);
}
