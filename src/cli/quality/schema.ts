/**
 * Public quality-report schema API.
 * Keeps callers on one import path while validation internals live in smaller modules.
 */
export {
  QUALITY_MODES,
  QUALITY_REPORT_KIND,
  type QualityFinding,
  type QualityMode,
  type QualityReport,
  type SavedQualityFinding,
  type SavedQualityReport,
} from "./schema-types.js";
export {
  parseQualityReport,
  parseSavedQualityReport,
} from "./schema-parser.js";
