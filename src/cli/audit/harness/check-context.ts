/**
 * Context concern: Is the agent's map accurate and lean?
 * Consolidated from 7 → 4 checks.
 */
import type { AuditContext, QualityCheck } from "../types.js";
import { pass, partial, extractBacktickPaths } from "./helpers.js";

const instructionLineCount: QualityCheck = {
  id: "instruction-line-count",
  concern: "context",
  weight: 2,
  run: (ctx) => {
    const findings: string[] = [];
    const recs: string[] = [];
    const fixes: string[] = [];
    let worstScore = 100;
    for (const af of ctx.agents) {
      if (!af.instruction.exists) {
        findings.push(`${af.agent.id}: no instruction file`);
        recs.push(`Create ${af.agent.instructionFile}`);
        fixes.push(
          `Create ${af.agent.instructionFile} by running \`goat-flow setup\`.`,
        );
        worstScore = 0;
        continue;
      }
      const lines = af.instruction.lineCount;
      const target = ctx.config.config.lineLimits.target;
      const limit = ctx.config.config.lineLimits.limit;
      if (lines > limit) {
        findings.push(
          `${af.agent.id}: ${lines} lines (exceeds hard limit ${limit})`,
        );
        recs.push(`Reduce ${af.agent.instructionFile} below ${limit} lines`);
        fixes.push(
          `Reduce ${af.agent.instructionFile} to under ${limit} lines by moving verbose sections to .goat-flow/ docs.`,
        );
        worstScore = Math.min(worstScore, 30);
      } else if (lines > target) {
        findings.push(
          `${af.agent.id}: ${lines} lines (over target ${target}, under limit ${limit})`,
        );
        worstScore = Math.min(worstScore, 70);
      } else {
        findings.push(
          `${af.agent.id}: ${lines} lines (under target ${target})`,
        );
      }
    }
    if (worstScore === 100) return pass(findings);
    return partial(worstScore, findings, recs, fixes);
  },
};

const executionLoopPresent: QualityCheck = {
  id: "execution-loop-present",
  concern: "context",
  weight: 2,
  run: (ctx) => {
    const steps = ["read", "scope", "act", "verify"];
    const findings: string[] = [];
    const recs: string[] = [];
    let worstScore = 100;

    for (const af of ctx.agents) {
      if (!af.instruction.exists || !af.instruction.content) {
        findings.push(`${af.agent.id}: no instruction file to check`);
        worstScore = 0;
        continue;
      }
      const lower = af.instruction.content.toLowerCase();
      const found = steps.filter((s) => lower.includes(s));
      const missing = steps.filter((s) => !found.includes(s));

      if (missing.length === 0) {
        findings.push(`${af.agent.id}: execution loop has all 4 steps`);
      } else if (found.length >= 2) {
        findings.push(
          `${af.agent.id}: execution loop missing ${missing.join(", ")}`,
        );
        worstScore = Math.min(worstScore, 50);
      } else {
        findings.push(`${af.agent.id}: no execution loop detected`);
        recs.push(
          `Add a READ → SCOPE → ACT → VERIFY execution loop to ${af.agent.instructionFile}`,
        );
        worstScore = 0;
      }
    }
    if (worstScore === 100) return pass(findings);
    return partial(worstScore, findings, recs, [
      "Add an execution loop section with READ, SCOPE, ACT, VERIFY steps to the instruction file.",
    ]);
  },
};

/** Consolidated: router-table-resolves + architecture-refs-resolve + doc-paths-resolve + architecture-exists */
function checkAllDocPaths(ctx: AuditContext) {
  let totalPaths = 0;
  let resolvedCount = 0;
  const findings: string[] = [];

  // Router table paths
  for (const af of ctx.agents) {
    totalPaths += af.router.paths.length;
    resolvedCount += af.router.resolved;
    if (af.router.unresolved.length > 0) {
      findings.push(
        `${af.agent.id}: ${af.router.unresolved.length} dead router paths`,
      );
    }
  }

  // Architecture doc
  if (!ctx.facts.shared.architecture.exists) {
    findings.push("architecture.md does not exist");
  } else {
    const content = ctx.fs.readFile(".goat-flow/architecture.md");
    if (content) {
      const paths = extractBacktickPaths(content);
      totalPaths += paths.length;
      const unresolved = paths.filter((p) => !ctx.fs.exists(p));
      resolvedCount += paths.length - unresolved.length;
      if (unresolved.length > 0) {
        findings.push(`${unresolved.length} stale paths in architecture.md`);
      } else {
        findings.push(
          `All ${paths.length} architecture.md path references resolve`,
        );
      }
    }
  }

  // Other doc files
  const docFiles = [
    "CONTRIBUTING.md",
    ".goat-flow/code-map.md",
    "docs/cli.md",
    "docs/audit-and-critique.md",
  ];
  for (const file of docFiles) {
    const content = ctx.fs.readFile(file);
    if (!content) continue;
    const paths = extractBacktickPaths(content);
    totalPaths += paths.length;
    const unresolved = paths.filter((p) => !ctx.fs.exists(p));
    resolvedCount += paths.length - unresolved.length;
    if (unresolved.length > 0) {
      findings.push(`${unresolved.length} stale paths in ${file}`);
    }
  }

  return { totalPaths, resolvedCount, findings };
}

const docPathsResolve: QualityCheck = {
  id: "doc-paths-resolve",
  concern: "context",
  weight: 2,
  run: (ctx) => {
    const { totalPaths, resolvedCount, findings } = checkAllDocPaths(ctx);

    if (totalPaths === 0) {
      if (findings.length > 0) {
        return partial(30, findings, [
          "Fix missing docs and add backtick-quoted file paths for drift detection",
        ]);
      }
      return partial(
        50,
        ["No file path references found in docs to validate"],
        [
          "Add backtick-quoted file paths to docs so the audit can detect drift",
        ],
      );
    }
    if (resolvedCount === totalPaths) {
      return pass(
        [...findings, `All ${totalPaths} doc file paths resolve`].filter(
          (f) => !f.includes("stale"),
        ),
      );
    }
    const score = Math.round((resolvedCount / totalPaths) * 100);
    return partial(
      score,
      findings,
      ["Update stale paths in docs to match current file locations"],
      [
        "Update or remove dead paths in router table, architecture.md, and doc files.",
      ],
    );
  },
};

const footgunEvidence: QualityCheck = {
  id: "footgun-evidence",
  concern: "context",
  weight: 1,
  run: (ctx) => {
    const { footguns } = ctx.facts.shared;
    if (!footguns.exists || footguns.entryCount === 0) {
      return partial(
        50,
        ["No footgun entries"],
        ["Log footguns as they are discovered"],
        [
          "Add entries to .goat-flow/footguns/ bucket files as architectural traps are discovered.",
        ],
      );
    }
    if (footguns.staleRefs.length > 0) {
      return partial(
        60,
        [`${footguns.staleRefs.length} stale file:line references in footguns`],
        ["Update stale footgun references to current file:line locations"],
        [
          "Update stale file:line references in .goat-flow/footguns/ to match current source locations.",
        ],
      );
    }
    return pass([`${footguns.entryCount} footgun entries with valid evidence`]);
  },
};

export const CONTEXT_CHECKS: QualityCheck[] = [
  instructionLineCount,
  executionLoopPresent,
  docPathsResolve,
  footgunEvidence,
];
