/**
 * Setup-detection helpers for dashboard routes.
 * These helpers keep project inspection and setup payload shaping out of the
 * main HTTP server so route code can stay focused on request handling.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getAgentProfiles } from "../agents/registry.js";
import { detectSetupStack } from "../detect/project-stack.js";
import { createFS } from "../facts/fs.js";

const AGENT_PROFILES = getAgentProfiles();

interface ExistingArtifacts {
  skills: boolean;
  instructionsRepoWide: boolean;
  instructionsPathScoped: boolean;
  lessons: boolean;
  footguns: boolean;
  config: boolean;
}

type SetupCommands = ReturnType<typeof detectSetupStack>["commands"];

/** Detect which supported agent surfaces already exist in the project. */
function detectScaffoldedAgents(projectPath: string): Record<string, boolean> {
  return Object.fromEntries(
    AGENT_PROFILES.map((agent) => {
      const markers = [
        agent.instructionFile,
        agent.settingsFile,
        agent.hookConfigFile,
        agent.hooksDir,
      ].filter((value): value is string => typeof value === "string");
      const present = markers.some((marker) =>
        existsSync(join(projectPath, marker)),
      );
      return [agent.id, present];
    }),
  );
}

/** Detect existing goat-flow artifacts (skills, instructions, lessons, footguns, config). */
function detectExistingArtifacts(projectPath: string): ExistingArtifacts {
  const existing: ExistingArtifacts = {
    skills: false,
    instructionsRepoWide: false,
    instructionsPathScoped: false,
    lessons: false,
    footguns: false,
    config: false,
  };

  const skillRoots = [
    ...new Set(AGENT_PROFILES.map((agent) => agent.skillsDir)),
  ];
  for (const root of skillRoots) {
    const skillsDir = join(projectPath, root);
    if (existsSync(skillsDir)) {
      try {
        if (readdirSync(skillsDir).some((entry) => entry.startsWith("goat-"))) {
          existing.skills = true;
          break;
        }
      } catch {
        /* unreadable */
      }
    }
  }

  existing.instructionsRepoWide = existsSync(
    join(projectPath, ".github", "copilot-instructions.md"),
  );
  existing.instructionsPathScoped = existsSync(
    join(projectPath, ".github", "instructions"),
  );
  existing.lessons =
    existsSync(join(projectPath, ".goat-flow", "lessons")) ||
    existsSync(join(projectPath, "ai", "lessons"));
  existing.footguns =
    existsSync(join(projectPath, ".goat-flow", "footguns")) ||
    existsSync(join(projectPath, "docs", "footguns")) ||
    existsSync(join(projectPath, "docs", "footguns.md"));
  existing.config = existsSync(join(projectPath, ".goat-flow", "config.yaml"));

  return existing;
}

/** Detect non-goat-flow agent config files (.github/instructions, CLAUDE.md, etc.). */
function detectNonGoatFlowConfig(projectPath: string): string[] {
  const nonGoatFlow: string[] = [];
  const checks: [string[], string][] = [
    [[".github", "instructions"], ".github/instructions/"],
    [["CLAUDE.md"], "CLAUDE.md"],
    [["AGENTS.md"], "AGENTS.md"],
    [["CODEX.md"], "CODEX.md"],
    [[".cursorrules"], ".cursorrules"],
  ];
  for (const [segments, label] of checks) {
    if (existsSync(join(projectPath, ...segments))) nonGoatFlow.push(label);
  }
  return nonGoatFlow;
}

/** Build the full `/api/setup/detect` payload for one project path. */
export function buildSetupDetectPayload(projectPath: string): {
  languages: string[];
  frameworks: string[];
  commands: SetupCommands;
  agents: Record<string, boolean>;
  existing: ExistingArtifacts;
  nonGoatFlow: string[];
} {
  const stack = detectSetupStack(createFS(projectPath));
  return {
    languages: stack.languages,
    frameworks: stack.frameworks,
    commands: stack.commands,
    agents: detectScaffoldedAgents(projectPath),
    existing: detectExistingArtifacts(projectPath),
    nonGoatFlow: detectNonGoatFlowConfig(projectPath),
  };
}

/** Heuristically treat a directory as a project when it has common repo markers. */
export function isProjectDirectory(dirPath: string): boolean {
  return [
    "package.json",
    "go.mod",
    "Cargo.toml",
    "composer.json",
    "pyproject.toml",
    ...AGENT_PROFILES.map((agent) => agent.instructionFile),
  ].some((file) => {
    try {
      statSync(join(dirPath, file));
      return true;
    } catch {
      return false;
    }
  });
}
