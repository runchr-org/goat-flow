/**
 * Shared wire types for dashboard terminal sessions.
 * Both the HTTP/WebSocket server and the frontend rely on these discriminated unions staying in sync.
 */
/** Messages sent from the browser terminal to the WebSocket server. */
export type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number };

/** Messages sent from the WebSocket server to the browser terminal. */
export type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'exit'; code: number; signal: string | null }
  | { type: 'error'; message: string }
  | { type: 'shutdown' };

/** Lifecycle state of a terminal session. */
export type SessionStatus = 'starting' | 'active' | 'terminated';

/** Supported CLI runners that can be spawned in a terminal session. */
export type Runner = 'claude' | 'codex' | 'gemini' | 'copilot';

/** Metadata for an active or recently terminated terminal session. */
export interface SessionInfo {
  id: string;
  status: SessionStatus;
  createdAt: string;
  projectPath: string;
  runner: Runner;
  /** Epoch milliseconds of last user input (for idle duration calculation) */
  lastInputAt: number;
}

/** Response body from the POST /api/sessions endpoint. */
export interface CreateResponse {
  id: string;
  status: SessionStatus;
  /** WebSocket URL for streaming terminal I/O */
  wsUrl: string;
}

/** Response body from the GET /api/health endpoint. */
export interface HealthResponse {
  /** Server uptime in seconds */
  uptime: number;
  activeSessions: number;
  /** Whether node-pty compiled successfully and is available */
  nodePtyAvailable: boolean;
  /** CLI runners detected on the system PATH */
  availableRunners: Runner[];
}
