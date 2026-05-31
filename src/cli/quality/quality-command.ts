/**
 * Dispatch layer for the `goat-flow quality` command and its subcommands (history, diff,
 * candidacy, validate, and the default prompt builder). Each subcommand is a focused async
 * handler; the public entry point only routes by `options.qualitySubcommand`.
 *
 * Heavy modules (history, candidacy, audit, prompt composition) are dynamically imported inside
 * each handler so the CLI startup path stays lean and only loads what a given invocation needs.
 * All filesystem and process behaviour is injected through QualityCommandDeps so the handlers
 * stay testable; this module performs no I/O of its own beyond reading files the user pointed at.
 */
import { basename } from "node:path";
import type { AgentId } from "../types.js";
import type { CandidacyResult } from "./candidacy.js";
import type { ParsedCLI } from "../cli-types.js";

type CLIErrorConstructor = new (message: string, exitCode: number) => Error;

/**
 * Injected collaborators the quality handlers depend on, kept as an interface so the command can
 * be exercised in tests without touching the real CLI error type or stdout. Supplied by the CLI
 * wiring layer; handlers never construct these themselves.
 */
export interface QualityCommandDeps {
  CLIError: CLIErrorConstructor;
  formatCandidacyArtifact(
    recommendation: CandidacyResult["recommendedArtifact"],
  ): string;
  /** Returns the agent ids the CLI accepts for `--agent`; first entry is used as the usage hint. */
  validAgents(): AgentId[];
  /** Writes the rendered command output to the destination chosen by `options` (stdout or file). */
  writeOutput(options: ParsedCLI, rendered: string): void;
}

async function handleQualityHistorySubcommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  const {
    buildQualityHistoryRows,
    loadQualityHistory,
    renderQualityHistoryText,
    selectQualityHistoryEntries,
  } = await import("./history.js");

  const history = loadQualityHistory(options.projectPath);
  for (const warning of history.warnings) {
    console.error(warning);
  }

  const selectedEntries = selectQualityHistoryEntries(history.entries, {
    agent: options.agent,
    limit: options.includeAll ? null : 20,
    qualityMode: options.qualityMode,
  });
  const rows = buildQualityHistoryRows(history.entries, {
    agent: options.agent,
    limit: options.includeAll ? null : 20,
    qualityMode: options.qualityMode,
  });
  if (options.format === "json") {
    deps.writeOutput(
      options,
      JSON.stringify(
        {
          reports: selectedEntries.map((entry) => ({
            id: entry.id,
            path: entry.path,
            report: entry.report,
          })),
          deltas: rows.map((row) => ({
            id: row.id,
            setup_delta: row.setupDelta,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  deps.writeOutput(
    options,
    renderQualityHistoryText(rows, {
      agent: options.agent,
      qualityMode: options.qualityMode,
      includeAll: options.includeAll,
    }),
  );
}

async function handleQualityDiffSubcommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  const { buildQualityDiff, loadQualityHistory, renderQualityDiffText } =
    await import("./history.js");

  const history = loadQualityHistory(options.projectPath);
  for (const warning of history.warnings) {
    console.error(warning);
  }

  const diff = buildQualityDiff(history.entries, {
    agent: options.agent,
    pair: options.qualityDiffPair,
    qualityMode: options.qualityMode,
  });
  if (!diff.ok) throw new deps.CLIError(diff.error, 2);

  if (options.format === "json") {
    deps.writeOutput(options, JSON.stringify(diff.diff, null, 2));
    return;
  }

  deps.writeOutput(options, renderQualityDiffText(diff.diff));
}

async function handleQualityCandidacySubcommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  if (!options.candidacyInput) {
    throw new deps.CLIError(
      "quality candidacy: pass --draft <path> or a description string.",
      2,
    );
  }
  const { runCandidacyCheck } = await import("./candidacy.js");
  const { readFileSync, existsSync } = await import("node:fs");
  let result;
  if (options.candidacyInput.mode === "draft") {
    const path = options.candidacyInput.value;
    if (!existsSync(path)) {
      throw new deps.CLIError(`quality candidacy: file not found: ${path}`, 2);
    }
    result = runCandidacyCheck({
      kind: "draft",
      content: readFileSync(path, "utf-8"),
      suggestedName: basename(path).replace(/\.md$/, ""),
    });
  } else {
    result = runCandidacyCheck({
      kind: "description",
      text: options.candidacyInput.value,
    });
  }
  if (options.format === "json") {
    deps.writeOutput(options, JSON.stringify(result, null, 2));
    return;
  }
  const lines: string[] = [];
  lines.push(
    `Recommended artifact: ${deps.formatCandidacyArtifact(result.recommendedArtifact)}`,
  );
  lines.push(`Confidence: ${Math.round(result.confidence * 100)}%`);
  if (result.reasoning.length > 0) {
    lines.push("");
    lines.push("Reasoning:");
    for (const reason of result.reasoning) lines.push(`  - ${reason}`);
  }
  if (result.nextSteps.length > 0) {
    lines.push("");
    lines.push("Next steps:");
    for (const step of result.nextSteps) {
      lines.push(
        `  - ${step.action}${step.template ? ` (template: ${step.template})` : ""}`,
      );
    }
  }
  deps.writeOutput(options, lines.join("\n"));
}

async function handleQualityValidateSubcommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  if (!options.qualityValidatePath) {
    throw new deps.CLIError(
      "quality validate requires a path to the report file.",
      2,
    );
  }
  const { readFileSync, existsSync } = await import("node:fs");
  const { parseQualityReport } = await import("./schema.js");
  const path = options.qualityValidatePath;
  if (!existsSync(path)) {
    throw new deps.CLIError(`quality validate: file not found: ${path}`, 2);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    throw new deps.CLIError(
      `quality validate: invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`,
      2,
    );
  }
  const parsed = parseQualityReport(raw);
  if (!parsed.ok) {
    throw new deps.CLIError(
      `quality validate: schema error in ${path}: ${parsed.error}`,
      2,
    );
  }
  deps.writeOutput(options, `OK ${path}`);
}

async function handleQualityPromptSubcommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  if (!options.agent) {
    throw new deps.CLIError(
      `quality requires --agent. Usage: goat-flow quality . --agent ${deps.validAgents()[0] ?? "claude"}`,
      2,
    );
  }

  const { createFS } = await import("../facts/fs.js");
  const { runAudit } = await import("../audit/audit.js");
  const { composeQuality } = await import("../prompt/compose-quality.js");
  const { findLatestQualityReport } = await import("./history.js");
  const { loadConfig } = await import("../config/reader.js");
  const { extractSharedFacts } = await import("../facts/shared/index.js");

  const fs = createFS(options.projectPath);
  let auditReport = null;
  try {
    auditReport = runAudit(fs, options.projectPath, {
      agentFilter: options.agent,
      harness: true,
    });
  } catch {
    // Quality prompts still render with degraded audit context.
  }

  const qualityMode = options.qualityMode ?? "agent-setup";
  const { entry: priorReport, warnings: historyWarnings } =
    findLatestQualityReport(options.projectPath, options.agent, qualityMode);
  for (const warning of historyWarnings) {
    console.error(warning);
  }
  const sharedFacts = extractSharedFacts(
    fs,
    loadConfig(options.projectPath, fs),
  );

  const result = composeQuality({
    agent: options.agent,
    projectPath: options.projectPath,
    auditReport,
    priorReport,
    qualityMode,
    sharedFacts,
  });

  if (options.format === "json") {
    deps.writeOutput(options, JSON.stringify(result, null, 2));
  } else {
    deps.writeOutput(options, result.prompt);
  }
}

/** Dispatch quality subcommands through focused branch handlers. */
export async function handleQualityCommand(
  options: ParsedCLI,
  deps: QualityCommandDeps,
): Promise<void> {
  if (options.qualitySubcommand === "history") {
    await handleQualityHistorySubcommand(options, deps);
    return;
  }
  if (options.qualitySubcommand === "diff") {
    await handleQualityDiffSubcommand(options, deps);
    return;
  }
  if (options.qualitySubcommand === "candidacy") {
    await handleQualityCandidacySubcommand(options, deps);
    return;
  }
  if (options.qualitySubcommand === "validate") {
    await handleQualityValidateSubcommand(options, deps);
    return;
  }
  await handleQualityPromptSubcommand(options, deps);
}
