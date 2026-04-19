/**
 * Runtime decoders for server-boundary payloads.
 *
 * Every ingress boundary (HTTP body, WebSocket message) must validate the
 * payload shape before dispatching. The previous code hand-rolled casts
 * like `JSON.parse(body) as { prompt?: string }`, which silently allows
 * arbitrary shapes through to downstream logic. M17-9 centralises the
 * per-boundary decoders here so failures return a typed `{ ok: false, error, path }`
 * instead of a stack trace at a later inner layer.
 *
 * Deliberately pure TS with no new runtime deps (zod, valibot, etc.) per
 * goat-flow's zero-new-dep policy. Narrow shapes are easy enough to validate
 * by hand.
 */
import type { AgentId } from "../types.js";
import type { ClientMessage, Runner } from "./types.js";

type DecodeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; path: string };

interface TerminalCreateBody {
  prompt: string;
  projectPath: string;
  runner: Runner;
}

interface ProjectsListBody {
  paths: string[];
}

function err(
  path: string,
  message: string,
): { ok: false; error: string; path: string } {
  return { ok: false, error: message, path };
}

function parseJson(body: string, path: string): DecodeResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(path, `invalid JSON: ${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Decode POST /api/terminal/create body.
 *  Applies the `runner` fallback to the given default when absent or unknown —
 *  preserves existing server behaviour where a missing/bad runner was tolerated. */
export function decodeTerminalCreateBody(
  body: string,
  options: { validRunners: ReadonlySet<string>; defaultRunner: AgentId },
): DecodeResult<TerminalCreateBody> {
  const parsed = parseJson(body, "body");
  if (!parsed.ok) return parsed;
  const raw = parsed.value;
  if (!isRecord(raw)) return err("body", "must be a JSON object");

  // prompt: optional string; empty string allowed (opens an idle shell).
  let prompt = "";
  if (Object.hasOwn(raw, "prompt")) {
    if (typeof raw.prompt !== "string") {
      return err("body.prompt", "must be a string");
    }
    prompt = raw.prompt;
  }

  // projectPath: optional string.
  let projectPath = "";
  if (Object.hasOwn(raw, "projectPath")) {
    if (typeof raw.projectPath !== "string") {
      return err("body.projectPath", "must be a string");
    }
    projectPath = raw.projectPath;
  }

  // runner: optional string; fall back to default when absent or unknown.
  let runner: AgentId = options.defaultRunner;
  if (Object.hasOwn(raw, "runner") && typeof raw.runner === "string") {
    if (options.validRunners.has(raw.runner)) {
      runner = raw.runner as AgentId;
    }
    // Unknown runner silently falls back to default; the server surfaces no
    // error to avoid breaking frontends that send legacy/stale values.
  }

  return { ok: true, value: { prompt, projectPath, runner } };
}

/** Decode POST /api/projects/list body. */
export function decodeProjectsListBody(
  body: string,
): DecodeResult<ProjectsListBody> {
  const parsed = parseJson(body, "body");
  if (!parsed.ok) return parsed;
  const raw = parsed.value;
  if (!isRecord(raw)) return err("body", "must be a JSON object");

  if (!Object.hasOwn(raw, "paths")) {
    return err("body.paths", "is required");
  }
  if (!Array.isArray(raw.paths)) {
    return err("body.paths", "must be an array");
  }
  const paths: string[] = [];
  for (const [index, item] of raw.paths.entries()) {
    if (typeof item !== "string") {
      return err(`body.paths[${index}]`, "must be a string");
    }
    paths.push(item);
  }

  return { ok: true, value: { paths } };
}

/** Decode a WebSocket frame into a typed ClientMessage or a typed error. */
export function decodeClientMessage(raw: string): DecodeResult<ClientMessage> {
  const parsed = parseJson(raw, "message");
  if (!parsed.ok) return parsed;
  const obj = parsed.value;
  if (!isRecord(obj)) return err("message", "must be a JSON object");

  if (obj.type === "input") {
    if (typeof obj.data !== "string") {
      return err("message.data", "must be a string on input messages");
    }
    return { ok: true, value: { type: "input", data: obj.data } };
  }
  if (obj.type === "resize") {
    if (typeof obj.cols !== "number" || !Number.isFinite(obj.cols)) {
      return err("message.cols", "must be a finite number on resize messages");
    }
    if (typeof obj.rows !== "number" || !Number.isFinite(obj.rows)) {
      return err("message.rows", "must be a finite number on resize messages");
    }
    return {
      ok: true,
      value: { type: "resize", cols: obj.cols, rows: obj.rows },
    };
  }
  return err(
    "message.type",
    `must be "input" or "resize" (got ${JSON.stringify(obj.type)})`,
  );
}
