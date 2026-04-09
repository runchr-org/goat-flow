import type { CheckDef, FactContext, CheckResult } from "../../types.js";
import {
  getRequiredRouterPathCheckResult,
  getRouterSkillsCheckResult,
} from "./router-helpers.js";

/** Standard-tier checks for the router table and path resolution (2.4.x). */
export const routerChecks: CheckDef[] = [
  {
    id: "2.4.1",
    name: "Router section exists",
    tier: "standard",
    category: "Router Table",
    pts: 1,
    confidence: "high",
    priority: "required",
    detect: {
      type: "grep",
      path: "{instruction_file}",
      pattern: "router|## Router",
    },
    recommendation:
      "Without a router table, agents waste turns searching for files they need -- grepping randomly for architecture docs, config files, or coding standards. A router table maps resource names to exact paths so agents navigate the project in one lookup instead of a multi-turn search.",
    recommendationKey: "add-router",
  },
  {
    id: "2.4.2",
    name: "Router references resolve",
    tier: "standard",
    category: "Router Table",
    pts: 3,
    partialPts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult => {
        const { paths, resolved, unresolved } = ctx.agentFacts.router;
        if (paths.length === 0) {
          return {
            id: "2.4.2",
            name: "Router references resolve",
            tier: "standard",
            category: "Router Table",
            status: "fail",
            points: 0,
            maxPoints: 3,
            confidence: "high",
            message:
              "No router paths found. Expected the router table to include backtick-wrapped repo paths or directories that agents can navigate to.",
          };
        }
        if (unresolved.length === 0) {
          return {
            id: "2.4.2",
            name: "Router references resolve",
            tier: "standard",
            category: "Router Table",
            status: "pass",
            points: 3,
            maxPoints: 3,
            confidence: "high",
            message: `All ${resolved} router paths resolve`,
          };
        }
        if (resolved > 0) {
          return {
            id: "2.4.2",
            name: "Router references resolve",
            tier: "standard",
            category: "Router Table",
            status: "partial",
            points: 1,
            maxPoints: 3,
            confidence: "high",
            message: `${resolved}/${paths.length} router paths resolve. Missing paths: ${unresolved.join(", ")}. Fix or remove the broken entries so the router is trustworthy.`,
            evidence: unresolved.join(", "),
          };
        }
        return {
          id: "2.4.2",
          name: "Router references resolve",
          tier: "standard",
          category: "Router Table",
          status: "fail",
          points: 0,
          maxPoints: 3,
          confidence: "high",
          message: `None of the ${paths.length} router paths resolve. Replace the router entries with real repo paths before relying on it.`,
        };
      },
    },
    recommendation:
      "Broken router entries send agents to files that don't exist -- the agent follows the path, hits a missing file, and either hallucinates content or wastes turns searching for the real location. Fix every reference so the router table is a reliable map, not a source of confusion.",
    recommendationKey: "fix-router-refs",
  },
  {
    id: "2.4.3",
    name: "Skills referenced in router",
    tier: "standard",
    category: "Router Table",
    pts: 1,
    confidence: "high",
    priority: "recommended",
    detect: {
      type: "custom",
      fn: getRouterSkillsCheckResult,
    },
    recommendation:
      "Without skills in the router table, agents can't discover available workflows -- they don't know skills exist or where to find them. Routing skill directories means agents can look up and invoke the right skill instead of improvising.",
    recommendationKey: "route-skills",
  },

  // === 2.4.4-2.4.8 Router completeness (5 pts) ===
  {
    id: "2.4.4",
    name: "Learning loop in router",
    tier: "standard",
    category: "Router Table",
    pts: 1,
    confidence: "high",
    priority: "optional",
    na: (ctx) =>
      !ctx.agentFacts.instruction.content?.toLowerCase().includes("router"),
    detect: {
      type: "grep",
      path: "{instruction_file}",
      section: "router",
      pattern: "lessons|footguns|learning",
    },
    recommendation:
      "If lessons and footguns directories aren't in the router, agents won't check them before acting -- they don't know the learning loop exists. Adding these paths means agents read past mistakes before repeating them.",
    recommendationKey: "route-learning-loop",
  },
  {
    id: "2.4.5",
    name: "Architecture in router",
    tier: "standard",
    category: "Router Table",
    pts: 1,
    confidence: "high",
    priority: "optional",
    na: (ctx) =>
      !ctx.agentFacts.instruction.content?.toLowerCase().includes("router"),
    detect: {
      type: "grep",
      path: "{instruction_file}",
      section: "router",
      pattern: "architecture|arch",
    },
    recommendation:
      "Without architecture.md in the router, agents making structural decisions won't find or read the canonical architecture doc. They'll guess at boundaries, dependencies, and invariants instead of consulting the source of truth.",
    recommendationKey: "route-architecture",
  },
  // 2.4.6 (evals in router) removed - evals system removed in v1.1.0 (M09).
  // 2.4.7 (handoff template in router) removed - handoff is workspace-level, not a rubric concern.
  {
    id: "2.4.8",
    name: "Config in router",
    tier: "standard",
    category: "Router Table",
    pts: 1,
    confidence: "high",
    priority: "optional",
    na: (ctx) =>
      !ctx.agentFacts.instruction.content?.toLowerCase().includes("router"),
    detect: {
      type: "custom",
      fn: (ctx: FactContext): CheckResult =>
        getRequiredRouterPathCheckResult(
          "2.4.8",
          "Config in router",
          ".goat-flow/config.yaml",
          "Add the config path so agents can find project settings without guessing.",
          ctx,
        ),
    },
    recommendation:
      "Without config.yaml in the router, agents needing project settings (line limits, path overrides, thresholds) will either use defaults or guess. Routing the config path means agents find and respect your custom configuration instead of working against it.",
    recommendationKey: "route-config",
  },
];
