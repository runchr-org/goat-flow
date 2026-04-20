/**
 * HTTP server for the local goat-flow dashboard.
 * It serves the frontend shell, exposes audit, quality, setup, and terminal endpoints.
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { getPackageVersion, getTemplatePath } from "../paths.js";
import { getKnownAgentIds } from "../agents/registry.js";
import {
  assembleDashboardHtml,
  loadDashboardPresets,
} from "./dashboard-assets.js";
import { createDashboardRouteHandlers } from "./dashboard-routes.js";
import type { Runner } from "./types.js";
import type { TerminalManager } from "./terminal.js";
import { MAX_SESSIONS } from "./terminal.js";
import type { WebSocketServer, WebSocket as WsWebSocket } from "ws";

const KNOWN_AGENT_IDS = getKnownAgentIds();
/** Recognized runner identifiers for terminal session creation. */
const VALID_RUNNERS = new Set<string>(KNOWN_AGENT_IDS);
const DEFAULT_RUNNER: Runner = KNOWN_AGENT_IDS[0] ?? "claude";
/** Maximum request body size accepted by POST endpoints */
const MAX_BODY_BYTES = 64 * 1024; // 64 KB
/** Current goat-flow package version for dashboard UI */
const PACKAGE_VERSION = getPackageVersion();

/** Read the request body as a string, capped at MAX_BODY_BYTES. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", reject);
  });
}

/** Send a JSON response. */
function jsonResponse(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** Configuration options for launching the dashboard server */
interface DashboardOptions {
  projectPath: string;
  dev?: boolean;
}

/** Handle returned by serveDashboard for closing the server and reading the port */
interface DashboardServer {
  close: () => Promise<void>;
  port: number;
}

/** Start the local dashboard server and expose its API endpoints. */
export function serveDashboard(
  options: DashboardOptions,
): Promise<DashboardServer> {
  return new Promise((resolveStart) => {
    const shellPath = getTemplatePath("dist/dashboard/index.html");
    const dashboardPresets = loadDashboardPresets();
    const devMode = options.dev === true;
    // In dev mode, re-read on every request. In prod, cache once.
    let cachedTemplate: string | null = devMode
      ? null
      : assembleDashboardHtml(shellPath);
    /** Read the current dashboard HTML shell, using the cache when possible. */
    function getTemplate(): string {
      if (devMode) return assembleDashboardHtml(shellPath);
      if (!cachedTemplate) cachedTemplate = assembleDashboardHtml(shellPath);
      return cachedTemplate;
    }
    const absDefault = resolve(options.projectPath);
    const {
      handleHtmlRequest,
      handleAssetRequest,
      handleAuditRequest,
      handleSetupDetectRequest,
      handleSetupRequest,
      handleQualityRequest,
      handleQualityHistoryRequest,
      handleBrowseRequest,
      handleAgentDetectRequest,
      handleProjectsListRequest,
      handleProjectsStatusRequest,
    } = createDashboardRouteHandlers({
      absDefault,
      devMode,
      getTemplate,
      packageVersion: PACKAGE_VERSION,
      dashboardPresets,
      jsonResponse,
      readBody,
    });

    // Live reload state (dev mode only)
    const liveReloadClients = new Set<WsWebSocket>();

    // Lazy-init terminal manager + WSS on first terminal request
    let managerPromise: Promise<TerminalManager> | null = null;
    let wssPromise: Promise<WebSocketServer> | null = null;

    /** Lazy-load the terminal manager the first time a terminal route is used. */
    async function getManager(): Promise<TerminalManager> {
      if (!managerPromise) {
        managerPromise = import("./terminal.js").then(
          ({ TerminalManager: TM }) => new TM(),
        );
      }
      return managerPromise;
    }

    /** Lazy-load the WebSocket server that bridges browser terminals to PTY sessions. */
    async function getWSS(): Promise<WebSocketServer> {
      if (!wssPromise) {
        wssPromise = import("ws").then(
          ({ WebSocketServer: WSS }) => new WSS({ noServer: true }),
        );
      }
      return wssPromise;
    }

    /** Map terminal-launch failures to the client-facing HTTP status codes we expose. */
    function terminalCreateStatus(message: string): number {
      return message.includes("Maximum") ||
        message.includes("not found") ||
        message.includes("not available") ||
        message.includes("not a directory") ||
        message.includes("does not exist") ||
        message.includes("too large")
        ? 400
        : 500;
    }

    /** Start a terminal session for the requested runner and workspace. */
    async function handleTerminalCreateRequest(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): Promise<boolean> {
      if (url.pathname !== "/api/terminal/create" || req.method !== "POST")
        return false;

      try {
        const manager = await getManager();
        const { decodeTerminalCreateBody } = await import("./decoders.js");
        const decoded = decodeTerminalCreateBody(await readBody(req), {
          validRunners: VALID_RUNNERS,
          defaultRunner: DEFAULT_RUNNER,
        });
        if (!decoded.ok) {
          jsonResponse(res, 400, { error: decoded.error, path: decoded.path });
          return true;
        }
        const { prompt, projectPath, runner } = decoded.value;
        const result = await manager.create(
          prompt,
          projectPath || absDefault,
          runner,
        );
        jsonResponse(res, 200, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        jsonResponse(res, terminalCreateStatus(message), { error: message });
      }
      return true;
    }

    /** Return the set of currently live terminal sessions. */
    async function handleTerminalListRequest(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): Promise<boolean> {
      if (url.pathname !== "/api/terminal/list" || req.method !== "GET")
        return false;

      try {
        const manager = await getManager();
        jsonResponse(res, 200, manager.list());
      } catch (err) {
        jsonResponse(res, 500, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return true;
    }

    /** Kill one terminal session and report whether it existed. */
    async function handleTerminalDeleteRequest(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): Promise<boolean> {
      if (!url.pathname.startsWith("/api/terminal/") || req.method !== "DELETE")
        return false;

      const id = url.pathname.slice("/api/terminal/".length);
      try {
        const manager = await getManager();
        const killed = manager.kill(id);
        if (killed) {
          jsonResponse(res, 200, { ok: true });
        } else {
          jsonResponse(res, 404, { error: "Session not found" });
        }
      } catch (err) {
        jsonResponse(res, 500, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return true;
    }

    /** Return terminal-backend health details for dashboard diagnostics. */
    async function handleHealthRequest(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): Promise<boolean> {
      if (url.pathname !== "/api/health" || req.method !== "GET") return false;

      try {
        const manager = await getManager();
        jsonResponse(res, 200, await manager.health());
      } catch (err) {
        jsonResponse(res, 500, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return true;
    }

    /** Return enriched terminal session info with age and idle duration. */
    async function handleTerminalSessionsRequest(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): Promise<boolean> {
      if (url.pathname !== "/api/terminal/sessions" || req.method !== "GET")
        return false;

      try {
        const manager = await getManager();
        const sessions = manager.list();
        const now = Date.now();
        const enriched = sessions.map((s) => ({
          ...s,
          age: Math.floor((now - new Date(s.createdAt).getTime()) / 1000),
          idleDuration: Math.floor((now - s.lastInputAt) / 1000),
        }));
        jsonResponse(res, 200, {
          sessions: enriched,
          maxSessions: MAX_SESSIONS,
          activeCount: sessions.length,
        });
      } catch (err) {
        jsonResponse(res, 500, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return true;
    }

    /** DNS rebinding protection: reject API requests with unexpected Host header. */
    function rejectBadHost(
      req: IncomingMessage,
      url: URL,
      res: ServerResponse,
    ): boolean {
      if (!url.pathname.startsWith("/api/")) return false;
      const host = req.headers.host;
      const addr = server.address();
      if (addr && typeof addr !== "string") {
        const allowed = [`127.0.0.1:${addr.port}`, `localhost:${addr.port}`];
        if (!host || !allowed.includes(host)) {
          console.warn(
            `[dashboard] Blocked ${req.method} ${url.pathname} - Host: ${host || "(none)"}`,
          );
          res.writeHead(403);
          res.end("Forbidden");
          return true;
        }
      }
      return false;
    }

    /** Dispatch one HTTP request across the dashboard routes in priority order. */
    async function handleRequest(
      req: IncomingMessage,
      res: ServerResponse,
    ): Promise<void> {
      const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "127.0.0.1"}`,
      );

      if (rejectBadHost(req, url, res)) return;

      // Log API requests in dev mode
      if (devMode && url.pathname.startsWith("/api/")) {
        console.log(`[dashboard] ${req.method} ${url.pathname}${url.search}`);
      }

      const routeHandlers = [
        () => Promise.resolve(handleHtmlRequest(url, res)),
        () => Promise.resolve(handleAssetRequest(url, res)),
        () => Promise.resolve(handleAuditRequest(url, res)),
        () => Promise.resolve(handleSetupDetectRequest(url, res)),
        () => handleSetupRequest(url, res),
        () => handleQualityRequest(url, res),
        () => handleQualityHistoryRequest(url, res),

        () => Promise.resolve(handleBrowseRequest(url, res)),
        () => Promise.resolve(handleAgentDetectRequest(url, res)),
        () => handleProjectsListRequest(req, url, res),
        () => Promise.resolve(handleProjectsStatusRequest(url, res)),
        () => handleTerminalCreateRequest(req, url, res),
        () => handleTerminalListRequest(req, url, res),
        () => handleTerminalSessionsRequest(req, url, res),
        () => handleTerminalDeleteRequest(req, url, res),
        () => handleHealthRequest(req, url, res),
      ];

      for (const route of routeHandlers) {
        if (await route()) return;
      }

      res.writeHead(404);
      res.end("Not found");
    }

    const server = createServer((req, res) => {
      handleRequest(req, res).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Internal error";
        const stack = err instanceof Error ? err.stack : "";
        console.error(`[dashboard] ${req.method} ${req.url} → 500: ${msg}`);
        if (stack) console.error(stack);
        if (!res.headersSent) {
          jsonResponse(res, 500, { error: msg });
        }
      });
    });

    // Dev mode: watch dashboard files and notify connected browsers
    let closeDevWatcher: (() => void) | null = null;
    if (devMode) {
      const dashDir = dirname(shellPath);
      /** Notify live-reload clients that dashboard assets changed. */
      const notifyReload = (): void => {
        for (const client of liveReloadClients) {
          try {
            client.send("reload");
          } catch {
            /* ignore */
          }
        }
      };
      let debounce: ReturnType<typeof setTimeout> | null = null;
      const watcher = watch(dashDir, { recursive: true }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(notifyReload, 100);
      });
      /** Close the dev-mode dashboard file watcher and release its process hook. */
      const closeWatcher = (): void => {
        watcher.close();
      };
      process.on("exit", closeWatcher);
      /** Release the dev watcher and its exit hook. */
      closeDevWatcher = () => {
        process.off("exit", closeWatcher);
        closeWatcher();
      };
      console.log("Dev mode: watching dist/dashboard/ for changes");
    }

    // WebSocket upgrade for terminal and live-reload sessions
    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);

      // Live reload WebSocket (dev mode)
      if (url.pathname === "/ws/livereload" && devMode) {
        void (async () => {
          try {
            const wss = await getWSS();
            wss.handleUpgrade(req, socket, head, (ws) => {
              liveReloadClients.add(ws as unknown as WsWebSocket);
              (ws as unknown as WsWebSocket).on("close", () => {
                liveReloadClients.delete(ws as unknown as WsWebSocket);
              });
            });
          } catch {
            socket.destroy();
          }
        })();
        return;
      }

      if (!url.pathname.startsWith("/ws/terminal/")) {
        socket.destroy();
        return;
      }

      // Origin check - reject non-localhost origins (DNS rebinding protection)
      const origin = req.headers.origin;
      const addr = server.address();
      if (origin && addr && typeof addr !== "string") {
        const expected = `http://127.0.0.1:${addr.port}`;
        if (origin !== expected && origin !== `http://localhost:${addr.port}`) {
          socket.destroy();
          return;
        }
      }

      const sessionId = url.pathname.slice("/ws/terminal/".length);

      void (async () => {
        try {
          const wss = await getWSS();
          const manager = await getManager();
          wss.handleUpgrade(req, socket, head, (ws) => {
            manager.attachWebSocket(sessionId, ws as unknown as WsWebSocket);
          });
        } catch {
          socket.destroy();
        }
      })();
    });

    // Gracefully stop any live terminal sessions before the process exits.
    let closePromise: Promise<void> | null = null;
    /** Close the dashboard server, watchers, and terminal sessions cleanly. */
    async function closeServer(): Promise<void> {
      if (closePromise) return closePromise;

      closePromise = (async () => {
        process.off("SIGTERM", doShutdown);
        process.off("SIGINT", doShutdown);
        closeDevWatcher?.();

        if (managerPromise) {
          const manager = await managerPromise;
          manager.shutdown();
        }
        if (wssPromise) {
          const wss = await wssPromise;
          await new Promise<void>((resolve) => {
            wss.close(() => {
              resolve();
            });
          });
        }
        await new Promise<void>((resolveClose, rejectClose) => {
          server.close((err) => {
            if (err) rejectClose(err);
            else resolveClose();
          });
          server.closeIdleConnections();
          server.closeAllConnections();
        });
      })();

      return closePromise;
    }

    /** Shut down the dashboard server's live terminal state before exiting the process. */
    const doShutdown = (): void => {
      void closeServer().finally(() => {
        process.exit(0);
      });
    };
    process.on("SIGTERM", doShutdown);
    process.on("SIGINT", doShutdown);

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") return;
      const url = `http://127.0.0.1:${addr.port}`;
      console.log(`Dashboard: ${url}`);
      // Warn once at startup when the embedded terminal backend is unavailable.
      void getManager()
        .then((m) => m.health())
        .then((h) => {
          if (!h.nodePtyAvailable) {
            console.log(
              "Note: Terminal feature unavailable (node-pty not installed)",
            );
            console.log(
              "  Fix: npm install node-pty (or: pnpm approve-builds)",
            );
            console.log(
              "  See: https://github.com/blundergoat/goat-flow#troubleshooting",
            );
          }
        })
        .catch(() => {
          console.log(
            "Note: Terminal feature unavailable (node-pty not installed)",
          );
          console.log("  Fix: npm install node-pty (or: pnpm approve-builds)");
          console.log(
            "  See: https://github.com/blundergoat/goat-flow#troubleshooting",
          );
        });
      resolveStart({
        port: addr.port,
        close: closeServer,
      });
    });
  }); // end Promise
}
