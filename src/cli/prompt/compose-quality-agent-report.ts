/**
 * Composer for the shared "write the JSON report" contract block.
 *
 * `appendAgentReportContract` appends the filename convention, the bash snippet
 * that builds the gitignored output path, the JSON body shape, the per-field
 * rules, and the validate-before-confirming step to an agent-setup quality prompt,
 * so every agent report writes to the same contract.
 */
import type { AgentId } from "../types.js";
import type { QualityHistoryEntry } from "../quality/history.js";
import { QUALITY_REPORT_KIND, type QualityMode } from "../quality/schema.js";
import { getPackageVersion } from "../paths.js";
import {
  inferQualityScope,
  jsonString,
  qualityModeLabel,
  shellSingleQuote,
  toShellProjectPath,
  type QualityPayload,
} from "./compose-quality-common.js";

export function appendAgentReportContract(
  lines: string[],
  input: {
    agent: AgentId;
    projectPath: string;
    auditStatus: QualityPayload["auditStatus"];
    qualityMode: QualityMode;
    priorReport: QualityHistoryEntry | null;
    runDate: string;
  },
): void {
  lines.push("### Write the JSON report");
  lines.push("");
  lines.push(
    "Do **not** emit the JSON as a fenced block in your reply. Write it as a file to `.goat-flow/logs/quality/` - that path is gitignored and expected. No tracked-file writes or implementation edits are permitted.",
  );
  lines.push("");
  lines.push(
    "**CRITICAL:** After writing the file, verify it was saved by running `ls -la .goat-flow/logs/quality/` and confirming the file appears with non-zero size. If missing, retry the write. A quality report that exists only in conversation history is invisible to `goat-flow quality history` and `goat-flow quality diff`.",
  );
  lines.push("");
  lines.push("**Filename format:** `YYYY-MM-DD-HHMM-<agent>-<rand5>.json`");
  lines.push("");
  lines.push("Where:");
  lines.push(
    "- `YYYY-MM-DD-HHMM` is the current local date and 24-hour time (e.g. `2026-04-19-1430`)",
  );
  lines.push(`- \`<agent>\` is the literal string \`${input.agent}\``);
  lines.push(
    "- `<rand5>` is 5 lowercase alphanumeric characters (a-z, 0-9) that you generate fresh to avoid collisions with other parallel runs",
  );
  lines.push("");
  lines.push(
    "**Derive the date/time/random parts via your shell** (so the filename reflects when the report was actually written, not when this prompt was generated). On Linux/macOS:",
  );
  lines.push("");
  lines.push("```bash");
  lines.push('STAMP="$(date +"%Y-%m-%d-%H%M")"      # e.g. 2026-04-19-1430');
  lines.push("RAND=\"$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 5)\"");
  lines.push(
    `QUALITY_DIR=${shellSingleQuote(toShellProjectPath(input.projectPath, ".goat-flow/logs/quality"))}`,
  );
  lines.push(`FILE="\${QUALITY_DIR}/\${STAMP}-${input.agent}-\${RAND}.json"`);
  lines.push('mkdir -p "$QUALITY_DIR"');
  lines.push("# (then write the JSON below to $FILE)");
  lines.push("```");
  lines.push("");
  lines.push("**JSON body shape:**");
  lines.push("");
  lines.push("```json");
  lines.push("{");
  lines.push(`  "report_kind": ${jsonString(QUALITY_REPORT_KIND)},`);
  lines.push(`  "goat_flow_version": ${jsonString(getPackageVersion())},`);
  lines.push(`  "agent": ${jsonString(input.agent)},`);
  lines.push(`  "project_path": ${jsonString(input.projectPath)},`);
  lines.push(`  "run_date": ${jsonString(input.runDate)},`);
  lines.push(`  "audit_status": ${jsonString(input.auditStatus)},`);
  lines.push(`  "scope": ${jsonString(inferQualityScope(input.projectPath))},`);
  lines.push(`  "rubric_version": ${jsonString(getPackageVersion())},`);
  lines.push(`  "quality_mode": ${jsonString(input.qualityMode)},`);
  lines.push(
    `  "prior_report_id": ${input.priorReport ? jsonString(input.priorReport.id) : "null"},`,
  );
  lines.push('  "scores": {');
  lines.push(
    '    "setup": { "total": 0, "accuracy": 0, "relevance": 0, "completeness": 0, "friction": 0 },',
  );
  lines.push(
    '    "system": { "total": 0, "usefulness": 0, "signal_to_noise": 0, "adaptability": 0, "learnability": 0 }',
  );
  lines.push("  },");
  lines.push('  "findings": [');
  lines.push("    {");
  lines.push(
    '      "type": "setup_quality", "severity": "MAJOR", "file": ".goat-flow/architecture.md", "line": null,',
  );
  lines.push(
    `      "summary": "One-line finding summary", "detail": "Why it matters; include a semantic anchor when the evidence should survive as a durable learning-loop artifact.", "evidence_quality": "OBSERVED", "evidence_method": "static-analysis", "delta_tag": ${input.priorReport ? '"new"' : "null"}`,
  );
  lines.push("    }");
  lines.push("  ]");
  lines.push("}");
  lines.push("```");
  lines.push("");
  lines.push("JSON rules:");
  lines.push(
    "- `scores.*` axis values must use exact `0 | 5 | 10 | 15 | 20 | 25` increments and each axis sum must equal its `total` exactly.",
  );
  lines.push(
    "- Allowed `type` values: `setup_quality`, `skill_flaw`, `contradiction`, `false_path`, `content_quality`, `framework_flaw`.",
  );
  lines.push("- Allowed `severity` values: `BLOCKER`, `MAJOR`, `MINOR`.");
  lines.push(
    "- `evidence_quality` is REQUIRED on every finding. Allowed values: `OBSERVED` (verified in code/output), `INFERRED` (state what's missing). Omitting this field causes the report to be rejected.",
  );
  lines.push(
    "- `evidence_method` is REQUIRED on every finding (schema v2, 2026-04-19+). Allowed values: `runtime-probe` (you invoked commands/tools to verify - e.g. `npx eslint`, `bash <hook>`), `static-analysis` (you read files only), `mixed` (both methods for this specific finding). A finding labelled `OBSERVED` via `static-analysis` can still miss runtime-only defects; labelling the method honestly lets cross-report triangulation flag methodology gaps.",
  );
  lines.push(
    "- Runtime-backed findings SHOULD include compact evidence fields when useful: `evidence_command` (the command), `evidence_exit_code` (integer), `evidence_summary` (literal pass/fail or warning summary), `evidence_warning_count` (integer), and `evidence_excerpt` (short single-line excerpt). Do not paste raw terminal blocks into JSON.",
  );
  lines.push(
    '- `scope` is REQUIRED at top level. Set `framework-self` if you detect this is the goat-flow repo itself (heuristic: `package.json` contains `"name": "@blundergoat/goat-flow"`). Otherwise set `consumer`.',
  );
  lines.push(
    `- \`rubric_version\` is REQUIRED at top level; copy the template value (\`"${getPackageVersion()}"\`). The Rating bands section above is the rubric - future readers use this version tag to trace which band anchors produced your scores.`,
  );
  lines.push(
    `- \`quality_mode\` is REQUIRED for new reports generated from this prompt. Use \`${jsonString(input.qualityMode)}\` for this ${qualityModeLabel(input.qualityMode)} assessment.`,
  );
  lines.push(
    `- \`prior_report_id\` must be ${input.priorReport ? `\`${input.priorReport.id}\`` : "`null`"} for this run. This makes \`delta_tag\` traceable to the same-agent baseline and prevents readers from treating \`new\` as newly introduced without a diff.`,
  );
  lines.push(
    "- `line` must be a positive integer OR `null`. Never `0`. For file-wide findings with no specific line, use `null`.",
  );
  lines.push(
    "- Live review findings should cite `file` + semantic anchor after re-reading the cited file and anchor. Durable footguns, lessons, patterns, and decisions must use file paths plus semantic anchors rather than line numbers.",
  );
  if (input.priorReport) {
    lines.push(
      '- `delta_tag` is REQUIRED on every current finding and must be either `"new"` or `"persisted"`.',
    );
  } else {
    lines.push(
      "- `delta_tag` must be `null` or omitted when no prior report context exists.",
    );
  }
  lines.push(
    "- Do NOT include an `id` field. The CLI attaches positional finding ids deterministically when the report is loaded.",
  );
  lines.push(
    "- Do NOT include extra top-level keys or extra finding keys outside this contract. Unknown keys are rejected.",
  );
  lines.push(
    "- `summary` and `detail` MUST be single-line strings. No literal newlines, tabs, or other control characters. If you need to reference multi-line command output, summarise the outcome in prose - do NOT paste raw terminal blocks into JSON string fields. Pasted multi-line content produces unparseable JSON and the report is lost.",
  );
  lines.push(
    "- If you write the file via a bash heredoc, QUOTE the delimiter (`<<'EOF'`, not `<<EOF`). Unquoted delimiters make the shell interpret `` `backticks` `` as command substitution, which silently eats your inline code references.",
  );
  lines.push("");
  lines.push("**Validate before confirming.** After writing the file, run:");
  lines.push("");
  lines.push("```bash");
  lines.push(
    'goat-flow quality validate "$FILE"   # or: node --import tsx src/cli/cli.ts quality validate "$FILE"',
  );
  lines.push("```");
  lines.push("");
  lines.push(
    "If validate exits non-zero, read the reported error, fix the JSON, and re-write the file. Do NOT emit the confirmation below until validate passes.",
  );
  lines.push("");
  lines.push(
    "If command execution is unavailable, do not claim validation passed. Confirm instead with: `Wrote unvalidated quality report to .goat-flow/logs/quality/<your-filename>.json; validation unavailable: <exact reason>`.",
  );
  lines.push("");
  lines.push(
    "**End of response:** After validate passes, confirm in prose with a single line: `Wrote quality report to .goat-flow/logs/quality/<your-filename>.json`. Do not include the JSON inline in your reply.",
  );
  lines.push("");
}
