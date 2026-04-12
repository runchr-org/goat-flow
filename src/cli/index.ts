/**
 * Programmatic entry point for goat-flow as a library.
 * Re-exports the stable audit, prompt, config, and utility APIs used by tests and external consumers.
 */

export type {
  AgentId,
  AgentProfile,
  ProjectFacts,
  AgentFacts,
  SharedFacts,
  StackInfo,
  ReadonlyFS,
  CLIOptions,
} from "./types.js";

export { createFS } from "./facts/fs.js";
