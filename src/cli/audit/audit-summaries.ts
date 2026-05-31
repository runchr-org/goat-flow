import type { AuditContext } from "./types.js";

/** Build summary details for the setup scope (worst-case across all agents). */
export function setupSummary(ctx: AuditContext): Record<string, string> {
  const totalSkills = ctx.structure.skills.canonical.length;
  if (ctx.agents.length === 0) {
    return {
      skills: `0/${totalSkills} installed (no supported agents)`,
      config: ctx.config.exists
        ? "valid, no supported agents"
        : "invalid or missing",
      instructionFile: "0 lines (no supported agents)",
    };
  }
  let minSkills = totalSkills;
  let maxLines = 0;
  for (const af of ctx.agents) {
    minSkills = Math.min(minSkills, af.skills.found.length);
    maxLines = Math.max(maxLines, af.instruction.lineCount);
  }
  const configValid = ctx.config.exists && ctx.config.valid;
  const configVersion = ctx.config.config.version;

  return {
    skills: `${minSkills}/${totalSkills} installed`,
    config: configValid
      ? `valid, version ${configVersion}`
      : "invalid or missing",
    instructionFile: `${maxLines} lines (max across agents)`,
  };
}

/** Build summary details for the agent scope */
export function agentSummary(ctx: AuditContext): Record<string, string> {
  const tc = ctx.config.config.toolchain;
  const parts: string[] = [];
  if (tc.test.length > 0) parts.push("test");
  if (tc.lint.length > 0) parts.push("lint");
  if (tc.build.length > 0) parts.push("build");

  const hookInfo: string[] = [];
  for (const af of ctx.agents) {
    if (af.hooks.denyExists || af.hooks.denyIsConfigBased) {
      hookInfo.push(`${af.agent.id}:deny installed`);
    }
  }

  return {
    toolchain:
      parts.length > 0
        ? parts.join(" + ") + " configured"
        : "not configured (optional)",
    hooks:
      ctx.agents.length === 0
        ? "not applicable (no supported agents)"
        : hookInfo.length > 0
          ? hookInfo.join(", ")
          : "none installed",
  };
}
