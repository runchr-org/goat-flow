import { loadManifest } from "../manifest/manifest.js";
import type { AuditContext } from "./types.js";

/**
 * Decide whether drift should auto-run without --check-drift.
 *
 * Multi-agent projects leave satellite skill dirs (`.agents/skills/`,
 * `.claude/skills/`, etc.) stale after a single-agent migration completes.
 * The existing drift machinery detects `manifest.stale_names` orphans but
 * is off by default, so `audit --agent claude` on a project that also ships
 * AGENTS.md exits "pass" while the Codex / Antigravity skill dirs still hold
 * pre-v1.2 names. When more than one agent instruction file is present on
 * disk we run drift automatically. Evidence: n=4 migrations reviewed
 * 2026-04-20 all had stale satellite dirs surviving a "pass" audit.
 *
 * The signal is computed from the manifest-backed instruction paths rather
 * than `ctx.agents`, which has already been narrowed by `--agent` upstream.
 * Using the filtered list would hide the multi-agent signal exactly when it
 * matters - the single-agent-filter case is the one stale satellites exploit.
 *
 * Single-agent projects preserve the prior opt-in behaviour.
 */
export function shouldAutoRunDrift(ctx: AuditContext): boolean {
  const manifest = loadManifest();
  let instructionFilesPresent = 0;
  for (const agent of Object.values(manifest.agents)) {
    if (ctx.fs.exists(agent.instruction_file)) instructionFilesPresent++;
  }
  return instructionFilesPresent > 1;
}
