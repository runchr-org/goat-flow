import { runContentQualityChecks } from "./check-content-quality.js";
import { runFactualClaimChecks } from "./check-factual-claims.js";
import { runSnapshotClaimChecks } from "./check-snapshot-claims.js";
import type { AuditContext, ContentReport } from "./types.js";

/** Combine content-quality + factual-claim + snapshot-claim findings into a ContentReport. */
export function computeContent(ctx: AuditContext): ContentReport {
  const quality = runContentQualityChecks(ctx);
  const factual = runFactualClaimChecks(ctx);
  const snapshot = runSnapshotClaimChecks(ctx);
  const findings = [
    ...quality.findings,
    ...factual.findings,
    ...snapshot.findings,
  ];
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const infos = findings.filter((f) => f.severity === "info").length;
  return {
    status: warnings === 0 ? "pass" : "fail",
    findings,
    warnings,
    infos,
    filesScanned:
      quality.filesScanned + factual.filesScanned + snapshot.filesScanned,
  };
}
