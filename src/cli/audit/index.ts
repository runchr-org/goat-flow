/**
 * Public barrel for the audit module.
 */
export { runAudit } from "./audit.js";
export type { AuditOptions } from "./audit.js";
export {
  renderAuditText,
  renderAuditJson,
  renderAuditMarkdown,
} from "./render.js";
export type {
  AuditReport,
  AuditScope,
  AuditConcern,
  AuditConcernKey,
  AuditFailure,
} from "./types.js";
