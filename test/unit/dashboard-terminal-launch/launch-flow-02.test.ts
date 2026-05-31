import {
  assert,
  assertExists,
  createFakeTimers,
  DASHBOARD_APP_PATH,
  DASHBOARD_TERMINAL_PATH,
  delay,
  describe,
  FakeDashboardWebSocket,
  FakeFitAddon,
  FakeResizeObserver,
  FakeTerminal,
  it,
  loadHelpers,
  loadFixture,
  makeBrowserTerminalGlobals,
  makeCapturingWebSocket,
  makeContext,
  makeLaunchPromptContext,
  PROJECT_ROOT,
  readFileSync,
  readDashboardAppSource,
  readDashboardTerminalSource,
  resolve,
  SETUP_VIEW_PATH,
  WORKSPACE_VIEW_PATH,
} from "./helpers.js";

describe("dashboard terminal launch flow", () => {
  it("retries up to the cap while Claude composer stays parked at pasted-text", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
          outputTail:
            "[Pasted text #1 +2 lines]\n────────────────\npaste again to expand ❯",
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Setup prompt\nsecond line",
        { adapt: false },
      ),
      true,
    );

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #1 +2 lines]",
    );
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);

    for (
      let index = 0;
      index < helpers.TERMINAL_PASTE_SUBMIT_MAX_RETRIES;
      index += 1
    ) {
      timers.tick(helpers.TERMINAL_PASTE_SUBMIT_RETRY_CADENCE_MS);
    }

    assert.equal(
      sent.length,
      1 + 1 + helpers.TERMINAL_PASTE_SUBMIT_MAX_RETRIES,
    );
    assert.equal(timers.pending(), 0);
  });

  it("stops the Claude pasted-text retry loop once output advances", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
          outputTail:
            "[Pasted text #1 +2 lines]\n────────────────\npaste again to expand ❯",
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Setup prompt\nsecond line",
        { adapt: false },
      ),
      true,
    );

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #1 +2 lines]",
    );
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);
    ctx.sessions[0]!.outputTail = "Running quality assessment";
    timers.tick(helpers.TERMINAL_PASTE_SUBMIT_RETRY_CADENCE_MS);

    const expectedPasteAndSubmitSendCount = 2;
    assert.equal(sent.length, expectedPasteAndSubmitSendCount);
    assert.equal(timers.pending(), 0);
  });

  it("ignores Claude paste markers when no submit is pending", async () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #1 +2 lines]",
    );

    assert.equal(sent.length, 0);
  });

  it("waits for Claude pasted-text marker to settle before submitting multiline paste", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Setup prompt\nsecond line",
        { adapt: false },
      ),
      true,
    );

    assert.deepStrictEqual(JSON.parse(sent[0] ?? "{}"), {
      type: "input",
      data: "\x1b[200~Setup prompt\nsecond line\x1b[201~",
    });
    const expectedQueuedInitialSendCount = 1;
    assert.equal(sent.length, expectedQueuedInitialSendCount);

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #1 +2 lines]",
    );

    assert.equal(sent.length, expectedQueuedInitialSendCount);
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);

    assert.deepStrictEqual(JSON.parse(sent[1] ?? "{}"), {
      type: "input",
      data: "\r",
    });
    assert.equal(timers.pending(), 0);
  });

  it("submits Antigravity multiline pasted terminal text after the pasted-text marker", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "antigravity",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Setup prompt\nsecond line",
        { adapt: false },
      ),
      true,
    );

    assert.deepStrictEqual(JSON.parse(sent[0] ?? "{}"), {
      type: "input",
      data: "\x1b[200~Setup prompt\nsecond line\x1b[201~",
    });
    assert.equal(sent.length, 1);

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted Text: 2 lines]",
    );

    assert.equal(sent.length, 1);
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);

    assert.deepStrictEqual(JSON.parse(sent[1] ?? "{}"), {
      type: "input",
      data: "\r",
    });
    assert.equal(timers.pending(), 0);
  });

  it("retries delayed paste submit when the websocket is briefly unavailable", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const websocket = makeCapturingWebSocket(sent);
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: websocket,
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Attached files\nsecond line",
        { adapt: false },
      ),
      true,
    );

    assert.equal(sent.length, 1);
    websocket.readyState = 0;
    timers.tick(helpers.TERMINAL_CLAUDE_PASTE_NO_MARKER_FALLBACK_DELAY_MS);
    assert.equal(sent.length, 1);
    assert.equal(timers.pending(), 1);

    websocket.readyState = 1;
    timers.tick(helpers.TERMINAL_PASTE_SUBMIT_RETRY_CADENCE_MS);
    assert.deepStrictEqual(JSON.parse(sent[1] ?? "{}"), {
      type: "input",
      data: "\r",
    });
    assert.equal(timers.pending(), 0);
  });

  it("queues later delayed Claude pastes behind the pending submit", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const sent: string[] = [];
    const ctx = makeContext({
      activeSessionId: "session-upload",
      sessions: [
        {
          id: "session-upload",
          runner: "claude",
          promptLabel: "Upload target",
          projectPath: "/tmp/example",
          cwd: "/tmp/example",
          targetPath: "/tmp/example",
          startTime: Date.now(),
          lastInputTime: 0,
          connected: true,
          ended: false,
          awaitingInput: false,
          age: "0s",
          presetId: null,
        },
      ],
      _terminalRefs: {
        "session-upload": {
          ws: makeCapturingWebSocket(sent),
        },
      },
    });

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "First\nprompt",
        { adapt: false },
      ),
      true,
    );
    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "session-upload",
        "Second\nprompt",
        { adapt: false },
      ),
      true,
    );

    const expectedQueuedInitialSendCount = 1;
    assert.equal(sent.length, expectedQueuedInitialSendCount);
    assert.deepStrictEqual(JSON.parse(sent[0] ?? "{}"), {
      type: "input",
      data: "\x1b[200~First\nprompt\x1b[201~",
    });
    assert.equal(
      ctx._terminalRefs["session-upload"]?.pasteSubmitQueue?.length,
      1,
    );

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #1 +1 lines]",
    );

    assert.equal(sent.length, expectedQueuedInitialSendCount);
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);
    const expectedQueuedFlushSendCount = 3;
    assert.equal(sent.length, expectedQueuedFlushSendCount);

    assert.deepStrictEqual(JSON.parse(sent[1] ?? "{}"), {
      type: "input",
      data: "\r",
    });
    assert.deepStrictEqual(JSON.parse(sent[2] ?? "{}"), {
      type: "input",
      data: "\x1b[200~Second\nprompt\x1b[201~",
    });

    helpers.dashboardHandlePasteSubmitOutput(
      ctx,
      "session-upload",
      "[Pasted text #2 +1 lines]",
    );
    timers.tick(helpers.TERMINAL_PASTE_MARKER_SETTLE_DELAY_MS);
    assert.deepStrictEqual(JSON.parse(sent[3] ?? "{}"), {
      type: "input",
      data: "\r",
    });
  });

  it("clears pending delayed paste submit state when user input takes over", async () => {
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
    );
    const ctx = makeLaunchPromptContext();

    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "launch-session",
        "First\nprompt",
        { adapt: false },
      ),
      true,
    );
    assert.equal(
      helpers.dashboardSendToTerminalSession(
        ctx,
        "launch-session",
        "Second\nprompt",
        { adapt: false },
      ),
      true,
    );

    helpers.dashboardClearPasteSubmitState(ctx, "launch-session");
    timers.tick(15000);

    assert.equal(
      ctx._terminalRefs["launch-session"]?.pasteSubmitTimer,
      undefined,
    );
    assert.equal(
      ctx._terminalRefs["launch-session"]?.pasteSubmitQueue,
      undefined,
    );
    assert.equal(ctx.sent.length, 1);
  });

  it("starts xterm loading before create returns and connects after both finish", async () => {
    const calls: string[] = [];
    let resolveXterm!: () => void;
    const xtermReady = new Promise<void>((resolve) => {
      resolveXterm = resolve;
    });
    const helpers = loadHelpers(async (input, init) => {
      calls.push(`fetch:${init?.method ?? "GET"}:${String(input)}`);
      return {
        json: async () => ({
          id: "session-1",
          wsUrl: "/ws/terminal/session-1",
        }),
      } as Response;
    });
    const ctx = makeContext({
      // Holding xterm readiness open proves backend create can start before
      // the browser terminal assets finish loading.
      async loadXterm(): Promise<void> {
        calls.push("loadXterm");
        await xtermReady;
        calls.push("loadXterm:ready");
      },
      // The attach call is order-sensitive: it must happen after loadXterm and $nextTick.
      connectTerminal(sessionId: string, wsUrl: string): void {
        calls.push(`connect:${sessionId}:${wsUrl}`);
      },
      // Count refresh is only evidence here that the successful launch path completed.
      async updateSessionCount(): Promise<void> {
        calls.push("updateSessionCount");
      },
      // Terminal attach must wait for Alpine to render the workspace container.
      async $nextTick(): Promise<void> {
        calls.push("$nextTick");
      },
    });

    const launchPromise = helpers.dashboardLaunchInTerminal(ctx, "", "claude", {
      promptLabel: "Manual session",
    });
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(calls[0], "loadXterm");
    assert.equal(calls[1], "fetch:POST:/api/terminal/create");
    assert.ok(
      !calls.includes("connect:session-1:/ws/terminal/session-1"),
      "terminal should not attach until xterm has loaded",
    );
    resolveXterm();
    await launchPromise;

    assert.equal(ctx.sessions.length, 1);
    assert.equal(ctx.sessions[0]?.promptLabel, "Manual session");
    assert.equal(ctx.sessions[0]?.loadingPhase, "connecting");
    assert.equal(ctx._terminalRefs["session-1"]?.retryPrompt, "");
    assert.equal(
      ctx._terminalRefs["session-1"]?.retryPromptLabel,
      "Manual session",
    );
    assert.equal(ctx.sessionTitles["session-1"], "Manual session");
    assert.equal(ctx.activeView, "workspace");
    assert.equal(ctx.workspacePanel, "terminal");
    assert.ok(
      calls.indexOf("loadXterm") <
        calls.indexOf("fetch:POST:/api/terminal/create"),
      "xterm loading should start before the create POST resolves",
    );
    assert.ok(
      calls.indexOf("$nextTick") <
        calls.indexOf("connect:session-1:/ws/terminal/session-1"),
      "the workspace container should render before the terminal attaches",
    );
    assert.ok(
      calls.indexOf("loadXterm:ready") <
        calls.indexOf("connect:session-1:/ws/terminal/session-1"),
      "xterm should load before the browser terminal attaches",
    );
    assert.ok(calls.includes("updateSessionCount"));
    assert.deepStrictEqual(ctx.toasts, []);
  });

  it("coalesces bursty terminal session refreshes behind one fetch", async () => {
    const timers = createFakeTimers();
    let fetchCount = 0;
    const expectedServerMaxSessions = 4;
    const helpers = loadHelpers(async (input) => {
      fetchCount += 1;
      assert.equal(String(input), "/api/terminal/sessions");
      return {
        json: async () => ({
          activeCount: 2,
          maxSessions: expectedServerMaxSessions,
          sessions: [],
        }),
      } as Response;
    }, timers);
    const ctx = makeContext();

    const first = helpers.dashboardUpdateSessionCount(ctx);
    const second = helpers.dashboardUpdateSessionCount(ctx);

    timers.tick(49);
    await Promise.resolve();
    assert.equal(fetchCount, 0);
    timers.tick(1);
    await Promise.all([first, second]);

    const expectedCoalescedFetchCount = 1;
    const expectedRefreshedSessionCount = 2;
    assert.equal(fetchCount, expectedCoalescedFetchCount);
    assert.equal(ctx.terminalSessionCount, expectedRefreshedSessionCount);
    assert.equal(ctx.serverMaxSessions, expectedServerMaxSessions);

    const third = helpers.dashboardUpdateSessionCount(ctx);
    timers.tick(50);
    await third;
    const expectedSecondRefreshFetchCount = 2;
    assert.equal(fetchCount, expectedSecondRefreshFetchCount);
  });
});
