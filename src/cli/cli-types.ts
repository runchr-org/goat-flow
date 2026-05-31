import type { CLIOptions } from "./types.js";
import type { QualityMode } from "./quality/schema.js";

/** Supported CLI subcommand names. */
export type Command =
  | "setup"
  | "install"
  | "audit"
  | "quality"
  | "status"
  | "dashboard"
  | "info"
  | "manifest"
  | "events"
  | "hooks"
  | "menu"
  | "stats"
  | "skill";

export type SkillSubcommand = "new";
export type EventsSubcommand = "tail";
export type HookSubcommand = "list" | "enable" | "disable" | "sync";
export const HOOK_SUBCOMMANDS = new Set<string>([
  "list",
  "enable",
  "disable",
  "sync",
]);

export type QualitySubcommand =
  | "prompt"
  | "history"
  | "diff"
  | "validate"
  | "candidacy";

export interface CandidacyInputArg {
  mode: "draft" | "description";
  value: string;
}

export interface ParsedArgValues {
  format?: string;
  json?: boolean;
  agent?: string;
  mode?: string;
  all?: boolean;
  harness?: boolean;
  "check-drift"?: boolean;
  "check-content"?: boolean;
  "no-audit-details"?: boolean;
  check?: boolean;
  apply?: boolean;
  force?: boolean;
  "update-config-version"?: boolean;
  "clean-deprecated"?: boolean;
  verbose?: boolean;
  output?: string;
  dev?: boolean;
  help?: boolean;
  version?: boolean;
  limit?: string;
  draft?: string;
  interactive?: boolean;
  name?: string;
  yes?: boolean;
}

export const COMMANDS: Command[] = [
  "setup",
  "install",
  "audit",
  "quality",
  "status",
  "dashboard",
  "info",
  "manifest",
  "events",
  "hooks",
  "menu",
  "stats",
  "skill",
];

export const REMOVED_COMMANDS: Record<string, string> = {
  review:
    '"review" was removed in v1.1.0. Use "audit --harness" for deterministic harness scoring or "quality" for agent-driven assessment.',
  scan: '"scan" was removed in v1.1.0. Use "audit" for setup validation.',
  check:
    '"check" was removed in v1.1.0. Use "audit --check-drift" for deterministic drift/content checks.',
};

export const VALID_FORMATS = ["json", "text", "markdown", "sarif"] as const;

/** Fully resolved CLI options including the dispatched command. */
export interface ParsedCLI extends CLIOptions {
  command: Command;
  harness: boolean;
  checkDrift: boolean;
  checkContent: boolean;
  auditDetails: boolean;
  check: boolean;
  apply: boolean;
  force: boolean;
  updateConfigVersion: boolean;
  cleanDeprecated: boolean;
  qualitySubcommand: QualitySubcommand;
  qualityDiffPair: string | null;
  qualityValidatePath: string | null;
  qualityMode: QualityMode | null;
  candidacyInput: CandidacyInputArg | null;
  skillSubcommand: SkillSubcommand | null;
  skillDescription: string | null;
  skillDraftPath: string | null;
  skillName: string | null;
  skillInteractive: boolean;
  skillSkipConfirm: boolean;
  eventsSubcommand: EventsSubcommand | null;
  eventsLimit: number;
  hookSubcommand: HookSubcommand | null;
  hookId: string | null;
  all: boolean;
}

export type SkillCLIFields = Pick<
  ParsedCLI,
  | "skillSubcommand"
  | "skillDescription"
  | "skillDraftPath"
  | "skillName"
  | "skillInteractive"
  | "skillSkipConfirm"
>;
