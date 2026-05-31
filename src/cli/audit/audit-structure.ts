import { loadManifest } from "../manifest/manifest.js";
import type { ProjectStructure } from "./types.js";

/** Build the audit-facing `ProjectStructure` from the validated manifest.
 *  Replaces the previous pass-through from raw JSON (`getProjectStructure()`),
 *  which allowed malformed shapes to leak into audit logic. */
export function buildProjectStructure(): ProjectStructure {
  const manifest = loadManifest();
  return {
    required_files: manifest.required_files,
    required_dirs: manifest.required_dirs,
    skills: {
      canonical: [...manifest.facts.skills.names],
      stale_names: [...manifest.facts.skills.stale_names],
      references: manifest.skills.references ?? {},
    },
    agents: Object.fromEntries(
      Object.entries(manifest.agents).map(([id, agent]) => [
        id,
        {
          instruction_file: agent.instruction_file,
          skills_dir: agent.skills_dir,
          ...(agent.hooks_dir !== undefined
            ? { hooks_dir: agent.hooks_dir }
            : {}),
          ...(agent.settings !== undefined ? { settings: agent.settings } : {}),
          ...(agent.hooks !== undefined ? { hooks: agent.hooks } : {}),
        },
      ]),
    ),
  };
}
