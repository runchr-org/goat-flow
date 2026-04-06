/**
 * Classify a project's goat-flow adoption state by probing for config files,
 * skill directories, and AI instruction markers. Used by both the dashboard
 * `/api/projects/status` endpoint and the `goat-flow status` CLI command.
 */

/** Minimal filesystem interface needed for project state detection. */
export interface StateFS {
  exists(path: string): boolean;
  readFile(path: string): string | null;
}

/** Recognised adoption states for a project. */
export type ProjectStateName = 'bare' | 'partial' | 'v0.9' | 'v1.0' | 'v1.1' | 'error';

/** Recommended next action for a given project state. */
export type ProjectAction = 'setup' | 'migration' | 'upgrade' | 'fix' | 'healthy' | 'none';

/** Classification result for a single project directory. */
export interface ProjectState {
  state: ProjectStateName;
  action: ProjectAction;
  details: string;
}

/** Detect which adoption stage a project is at based on its on-disk artifacts. */
// eslint-disable-next-line complexity -- intentionally branchy state machine
export function classifyProjectState(fs: StateFS): ProjectState {
  // Check for .goat-flow/config.yaml (v1.0+)
  const hasConfig = fs.exists('.goat-flow/config.yaml');

  // Check for current goat skills
  const hasCurrentSkills =
    fs.exists('.claude/skills/goat-debug/SKILL.md') ||
    fs.exists('.agents/skills/goat-debug/SKILL.md');

  // Check for old/renamed skills (pre-v1.0)
  const hasOldSkills =
    fs.exists('.claude/skills/goat-audit/SKILL.md') ||
    fs.exists('.agents/skills/goat-audit/SKILL.md') ||
    fs.exists('.claude/skills/goat-investigate/SKILL.md') ||
    fs.exists('.agents/skills/goat-investigate/SKILL.md');

  // Check for generic AI agent instructions (not goat-flow specific)
  const hasAIInstructions =
    fs.exists('.github/instructions') ||
    fs.exists('AGENTS.md') ||
    fs.exists('CLAUDE.md');

  if (hasConfig) {
    const configContent = fs.readFile('.goat-flow/config.yaml');
    const versionMatch = configContent?.match(/version:\s*["']?(\d+\.\d+\.\d+)/);
    const version = versionMatch?.[1] || '0.0.0';
    if (version === '1.1.0') {
      return { state: 'v1.1', action: 'healthy', details: 'Current version' };
    }
    return { state: 'v1.0', action: 'upgrade', details: `Version ${version} — upgrade available` };
  }

  if (hasOldSkills) {
    return { state: 'v0.9', action: 'migration', details: 'Old skill names found (goat-audit, goat-investigate, etc.)' };
  }
  if (hasCurrentSkills) {
    return { state: 'v1.0', action: 'upgrade', details: 'Skills found but no .goat-flow/ config' };
  }
  if (hasAIInstructions) {
    return { state: 'partial', action: 'setup', details: 'AI instructions exist but no goat-flow' };
  }
  return { state: 'bare', action: 'setup', details: 'No AI agent configuration found' };
}
