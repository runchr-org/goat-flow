import type { CheckDef } from "../../types.js";
import { skillChecks } from "./skills.js";
import { hookChecks } from "./hooks.js";
import { learningLoopChecks } from "./learning-loop.js";
import { routerChecks } from "./router.js";
import { architectureChecks } from "./architecture.js";
import { localContextChecks } from "./local-context.js";
import { signalChecks } from "./signals.js";
import { promotedChecks } from "./promoted.js";

/**
 * Tier 2 - Standard
 * Skills, hooks, learning loop, router, architecture, local context, signals,
 * plus checks promoted from the former Full tier.
 */
export const standardChecks: CheckDef[] = [
  ...skillChecks,
  ...hookChecks,
  ...learningLoopChecks,
  ...routerChecks,
  ...architectureChecks,
  ...localContextChecks,
  ...signalChecks,
  ...promotedChecks,
];
