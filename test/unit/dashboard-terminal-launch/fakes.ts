export type TimerControls = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
};

export function createFakeTimers(): TimerControls & {
  /**
   * Advances all due timeout and interval callbacks in timestamp order.
   */
  tick(durationMs: number): void;
  /**
   * Reports outstanding timers so tests can catch leaked fallback work.
   */
  pending(): number;
} {
  let now = 0;
  let nextId = 1;
  const timers = new Map<
    number,
    { at: number; callback: () => void; intervalMs?: number }
  >();
  const cancelled = new Set<number>();
  const fakeSetTimeout = ((
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) => {
    const id = nextId;
    nextId += 1;
    timers.set(id, {
      at: now + (ms ?? 0),
      callback: () => callback(...args),
    });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  // Fired intervals can be cleared by their own callback; cancelled keeps that
  // clear from being lost after the callback returns.
  const fakeClearTimeout = ((handle?: ReturnType<typeof setTimeout>) => {
    const id = Number(handle);
    if (!timers.delete(id)) cancelled.add(id);
  }) as typeof clearTimeout;
  const fakeSetInterval = ((
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) => {
    const id = nextId;
    nextId += 1;
    timers.set(id, {
      at: now + (ms ?? 0),
      callback: () => callback(...args),
      intervalMs: ms ?? 0,
    });
    return id as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;
  // Shares cancellation bookkeeping with timeouts because browser helpers use
  // both APIs through the same VM-injected fake clock.
  const fakeClearInterval = ((handle?: ReturnType<typeof setInterval>) => {
    const id = Number(handle);
    if (!timers.delete(id)) cancelled.add(id);
  }) as typeof clearInterval;
  return {
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    /**
     * Invariant: one tick drains every callback due at or before the target
     * before moving the fake clock to the target timestamp.
     */
    tick(durationMs: number): void {
      const target = now + durationMs;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        timers.delete(id);
        now = timer.at;
        timer.callback();
        if (timer.intervalMs !== undefined && !cancelled.has(id)) {
          timers.set(id, { ...timer, at: now + timer.intervalMs });
        }
        cancelled.delete(id);
      }
      now = target;
    },
    // A non-zero pending count after a scenario catches leaked fallback work.
    pending(): number {
      return timers.size;
    },
  };
}

export class FakeTerminal {
  cols = 80;
  rows = 24;
  _addonFit?: FakeFitAddon;
  dataHandler?: (data: string) => void;
  written: string[] = [];

  /**
   * Stores the fit addon so terminal setup can run without loading xterm.
   */
  loadAddon(addon: FakeFitAddon): void {
    this._addonFit = addon;
  }

  /**
   * DOM mounting is outside these tests; the method only satisfies xterm's API.
   */
  open(): void {}

  /**
   * Mutates `written` by appending output that helpers would write into xterm.
   */
  write(data: string): void {
    this.written.push(data);
  }

  /**
   * Focus changes are not observable in this harness.
   */
  focus(): void {}

  /**
   * Disposal side effects are asserted through session refs, not xterm internals.
   */
  dispose(): void {}

  /**
   * Keyboard shortcut wiring is not under test in this launch-focused suite.
   */
  attachCustomKeyEventHandler(): void {}

  /**
   * Tests drive input through dashboardSendToTerminalSession instead of xterm events.
   */
  onData(handler: (data: string) => void): void {
    this.dataHandler = handler;
  }

  /**
   * Simulates xterm input events emitted toward the PTY.
   */
  emitData(data: string): void {
    this.dataHandler?.(data);
  }

  /**
   * Resize paths are triggered through the fake ResizeObserver when needed.
   */
  onResize(): void {}

  /**
   * Keeps paste tests on the no-selection branch unless a test overrides xterm.
   */
  hasSelection(): boolean {
    return false;
  }

  /**
   * Mirrors xterm's empty-selection return value for clipboard tests.
   */
  getSelection(): string {
    return "";
  }

  buffer = {
    active: {
      length: 0,
      /**
       * Forces helpers to rely on session outputTail, the state these tests set.
       */
      getLine(): null {
        return null;
      },
    },
  };
}

export class FakeFitAddon {
  /**
   * Layout measurements are not meaningful in the VM harness.
   */
  fit(): void {}
}

export class FakeResizeObserver {
  /**
   * Observed elements are static fake DOM nodes, so no callback is needed.
   */
  observe(): void {}

  /**
   * Disconnect is present so terminal cleanup can call the browser API shape.
   */
  disconnect(): void {}
}

export class FakeDashboardWebSocket {
  static OPEN = 1;
  readyState = 1;
  sent: string[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;

  /**
   * Registers constructed sockets so tests can drive open/message/close events.
   */
  constructor(
    public readonly url: string,
    public readonly instances: FakeDashboardWebSocket[],
  ) {
    instances.push(this);
  }

  /**
   * Records browser-to-server terminal payloads for assertions.
   */
  send(payload: string): void {
    this.sent.push(payload);
  }

  /**
   * Simulates browser close semantics and notifies the dashboard helper.
   */
  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

/**
 * Creates the mutable WebSocket double used by tests that only assert terminal
 * wire payloads; `readyState` stays writable for retry and reconnect scenarios.
 */
export function makeCapturingWebSocket(sent: string[]): {
  readyState: number;
  /**
   * Mutates the provided array with raw browser wire payloads.
   */
  send(payload: string): void;
} {
  return {
    readyState: 1,
    // Side effect: appends raw browser wire payloads for order-sensitive checks.
    send(payload: string): void {
      sent.push(payload);
    },
  };
}

/**
 * Creates the minimum browser global surface needed by dashboard-terminal.ts
 * because these tests load the classic dashboard script in a VM, not a browser.
 */
export function makeBrowserTerminalGlobals(): {
  globals: Record<string, unknown>;
  sockets: FakeDashboardWebSocket[];
  terminals: FakeTerminal[];
} {
  const sockets: FakeDashboardWebSocket[] = [];
  const terminals: FakeTerminal[] = [];
  const WebSocketCtor = class extends FakeDashboardWebSocket {
    /**
     * Binds the browser-facing constructor to this test's socket registry.
     */
    constructor(url: string) {
      super(url, sockets);
    }
  };
  const TerminalCtor = class extends FakeTerminal {
    /** Registers each constructed terminal so tests can inspect launch state. */
    constructor() {
      super();
      terminals.push(this);
    }
  };
  return {
    sockets,
    terminals,
    globals: {
      window: {
        Terminal: TerminalCtor,
        FitAddon: { FitAddon: FakeFitAddon },
        // Dashboard helpers register listeners, but these tests invoke events directly.
        addEventListener(): void {
          return;
        },
        // Cleanup calls this even though the fake window has no listener registry.
        removeEventListener(): void {
          return;
        },
      },
      document: {
        // Stable dimensions let terminal setup run without a real layout engine.
        getElementById(): { innerHTML: string; offsetWidth: number } {
          return { innerHTML: "", offsetWidth: 80 };
        },
      },
      location: { protocol: "http:", host: "127.0.0.1:31337" },
      navigator: {
        clipboard: {
          readText: async (): Promise<string> => "",
          writeText: async (): Promise<void> => {},
        },
      },
      ResizeObserver: FakeResizeObserver,
      WebSocket: WebSocketCtor,
    },
  };
}
