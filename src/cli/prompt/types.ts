/**
 * Type contracts for prompt fragments and composed setup output.
 * These interfaces let prompt composition stay structured until the final render step.
 */
import type { AgentId, Tier } from "../types.js";

/** Phase a fragment belongs to: one of the scoring tiers or anti-pattern */
export type FragmentPhase = Tier | "anti-pattern";

/** Whether a fragment creates new content or fixes existing content */
export type FragmentKind = "create" | "fix";

/** A structured prompt fragment with recommendation key, phase, and instruction. */
export interface Fragment {
  /** Must match a CheckDef.recommendationKey or AntiPatternDef.recommendationKey */
  key: string;
  phase: FragmentPhase;
  category: string;
  /** 'create' = setup instruction, 'fix' = repair existing. Setup mode only emits 'create'. */
  kind: FragmentKind;
  /** Markdown instruction for the agent to execute */
  instruction: string;
  /** Agent-specific instruction overrides (replaces `instruction` for that agent) */
  agentOverrides?: Partial<Record<AgentId, string>>;
}

/**
 * A single actionable task in a setup prompt.
 * Bridges TemplateRef (what file to create from what template) with
 * Fragment (adaptation guidance and fix instructions).
 */
export interface SetupTask {
  /** Display number within the phase, e.g., "1", "2" */
  num: number;
  /** File to create or fix in the target project */
  outputPath: string;
  /** Absolute path to the goat-flow template to read */
  templatePath: string;
  /** Project-specific adaptation guidance */
  adapt: string;
  /** Concrete verification step */
  verify: string;
}

/** Variables extracted from scan report for template substitution */
export interface PromptVariables {
  agentId: AgentId;
  agentName: string;
  instructionFile: string;
  settingsFile: string;
  skillsDir: string;
  hooksDir: string;
  languages: string;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
  formatCommand: string;
  grade: string;
  percentage: string;
  failedCount: string;
  passedCount: string;
  totalCount: string;
  date: string;
  /**
   * Scan evidence keyed by recommendation key - populated from check/AP results
   * so fragments can include specific details (stale refs, bloat patterns, etc.)
   */
  evidence: Record<string, string>;
}
