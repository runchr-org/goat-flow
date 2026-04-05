/**
 * JSON renderer for machine-readable scan output.
 * Keep it minimal so report structure is defined by the shared `ScanReport` types rather than renderer-side policy.
 */
import type { ScanReport } from '../types.js';

/** Serialise a scan report to pretty-printed JSON */
export function renderJson(report: ScanReport): string {
  return JSON.stringify(report, null, 2);
}
