/**
 * Redaction helpers for local evidence envelopes.
 *
 * Sensitive runtime values are recorded as hashes plus byte length so local
 * continuity can confirm "same/different" without persisting prompt text,
 * terminal output, uploads, screenshots, or raw tool bodies.
 */
import { createHash } from "node:crypto";

/** Hash-only representation of sensitive evidence text safe for local persistence. */
export interface RedactedEvidenceValue {
  kind: "redacted";
  label: string;
  sha256: string;
  length: number;
}

/**
 * Return a deterministic hash/length summary for sensitive text.
 *
 * @param label - human-readable evidence field name being redacted
 * @param value - sensitive text to hash without storing raw content
 * @returns redacted evidence metadata that can compare same/different values
 */
export function redactEvidenceText(
  label: string,
  value: string,
): RedactedEvidenceValue {
  const buffer = Buffer.from(value, "utf-8");
  return {
    kind: "redacted",
    label,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    length: buffer.byteLength,
  };
}

/**
 * Runtime guard used by envelope payload validation.
 *
 * @param value - unknown JSON value from an evidence envelope payload
 * @returns true when the value matches the redacted evidence shape
 */
export function isRedactedEvidenceValue(
  value: unknown,
): value is RedactedEvidenceValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.kind === "redacted" &&
    typeof record.label === "string" &&
    typeof record.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(record.sha256) &&
    typeof record.length === "number" &&
    Number.isInteger(record.length) &&
    record.length >= 0
  );
}
