/**
 * Dashboard terminal endpoints: POST /api/terminal/create rejects unknown runners without launching
 * a fallback, list/sessions return their empty-state shapes when nothing is running, and
 * /upload-image rejects unsafe session ids, unknown sessions (404), empty or too-many file arrays,
 * malformed JSON, and oversized bodies (JSON 413).
 */
import {
  assert,
  describe,
  expectRecord,
  fetchJson,
  it,
  PROJECT_PATH,
  TERMINAL_UPLOAD_MAX_BODY_BYTES,
} from "./dashboard-server.helpers.js";

const TERMINAL_MAX_SESSIONS = 10;

describe("dashboard terminal endpoints", () => {
  it("POST /api/terminal/create rejects unknown runners without launching a fallback", async () => {
    const { res, body } = await fetchJson("/api/terminal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "",
        projectPath: PROJECT_PATH,
        runner: "cursor",
      }),
    });
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Terminal create error");
    assert.equal(data.path, "body.runner");
    assert.match(String(data.error), /unknown runner: cursor/);
  });

  it("GET /api/terminal/list returns an empty list when no sessions are running", async () => {
    const { res, body } = await fetchJson("/api/terminal/list");
    assert.equal(res.status, 200);
    assert.deepEqual(body, []);
  });

  it("GET /api/terminal/sessions returns the empty-state shape", async () => {
    const { res, body } = await fetchJson("/api/terminal/sessions");
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Terminal sessions response");
    assert.ok(Array.isArray(data.sessions));
    assert.deepEqual(data.sessions, []);
    assert.equal(data.maxSessions, TERMINAL_MAX_SESSIONS);
    assert.equal(data.activeCount, 0);
  });

  it("POST /api/terminal/:id/upload-image rejects an unsafe session id", async () => {
    const { res, body } = await fetchJson(
      "/api/terminal/..%2Fevil/upload-image",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [] }),
      },
    );
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Upload bad-id error");
    assert.match(String(data.error), /Invalid session id/);
  });

  it("POST /api/terminal/:id/upload-image returns 404 for an unknown session id", async () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16, 0xff),
    ]);
    const { res, body } = await fetchJson(
      "/api/terminal/sess-not-real/upload-image",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "x.png", data: png.toString("base64") }],
        }),
      },
    );
    assert.equal(res.status, 404);
    const data = expectRecord(body, "Upload missing-session error");
    assert.match(String(data.error), /Session not found/);
  });

  it("POST /api/terminal/:id/upload-image rejects an empty files array", async () => {
    const { res, body } = await fetchJson("/api/terminal/sess-x/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [] }),
    });
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Upload empty-files error");
    assert.equal(data.path, "body.files");
    assert.match(String(data.error), /at least one file/);
  });

  it("POST /api/terminal/:id/upload-image rejects too many files in one request", async () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16, 0xff),
    ]);
    const oneFile = { name: "x.png", data: png.toString("base64") };
    const { res, body } = await fetchJson("/api/terminal/sess-x/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [oneFile, oneFile, oneFile, oneFile, oneFile, oneFile],
      }),
    });
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Upload too-many error");
    assert.equal(data.path, "body.files");
    assert.match(String(data.error), /at most 5 file/);
  });

  it("POST /api/terminal/:id/upload-image rejects malformed JSON", async () => {
    const { res, body } = await fetchJson("/api/terminal/sess-x/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Upload bad-json error");
    assert.match(String(data.error), /invalid JSON/);
  });

  it("POST /api/terminal/:id/upload-image returns JSON 413 for oversized bodies", async () => {
    const { res, body } = await fetchJson("/api/terminal/sess-x/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(TERMINAL_UPLOAD_MAX_BODY_BYTES + 1),
    });
    assert.equal(res.status, 413);
    const data = expectRecord(body, "Upload oversized error");
    assert.match(String(data.error), /Upload body too large/);
  });
});
