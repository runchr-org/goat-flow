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
  it("detects awaiting-input when Claude Code lays out the footer with CHA cursor-absolute jumps", () => {
    // Real Claude Code TUI fragment: it positions every word of the
    // "Esc to cancel · Tab to amend" footer with CHA (ESC[<col>G).
    // Before the parser fix the words collapsed to "Esctocanceltoamend"
    // and every word-boundary regex failed.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const claudeFooter =
      "\x1b[2G\x1b[38;5;246mEsc\x1b[6Gto\x1b[9Gcancel\x1b[16G·" +
      "\x1b[18GTab\x1b[22Gto\x1b[25Gamend\x1b[31G·\x1b[33Gctrl+e\x1b[40Gto\x1b[43Gexplain";
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(claudeFooter), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", claudeFooter),
      true,
    );
  });

  it("detects awaiting-input when Claude Code marks numbered choices with ❯ and CHA layout", () => {
    // Real Claude Code permission prompt: marker is U+276F (❯), not [›>],
    // and the words inside each option are positioned by CHA. Even after
    // CHA is normalised to spaces the marker class must accept ❯.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const claudePrompt = [
      "Do you want to proceed?",
      "❯\x1b[4G\x1b[38;5;246m1.\x1b[7G\x1b[38;5;153mYes",
      "",
      " \x1b[4G\x1b[38;5;246m2.\x1b[7G\x1b[38;5;153mNo",
    ].join("\n");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(claudePrompt), true);
  });

  it("detects awaiting-input when a runner broadcasts an Action Required OSC title", () => {
    // codex and gemini signal blocked state through the terminal title bar
    // (OSC 0). The dashboard never reads xterm's title, so the OSC payload
    // itself is the only signal we get in outputTail.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const codexBell =
      "Running tool…\n\x1b]0;[ ! ] Action Required | goat-flow\x07";
    const geminiBell =
      "Waiting on user…\n\x1b]0;✋  Action Required (goat-flow)\x07";
    const explicitAwaiting = "Idle\n\x1b]0;awaiting confirmation - copilot\x07";
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(codexBell), true);
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(geminiBell), true);
    assert.equal(
      helpers.dashboardOutputLooksAwaitingInput(explicitAwaiting),
      true,
    );
    // ESC \ string-terminator form must work too.
    assert.equal(
      helpers.dashboardOutputLooksAwaitingInput(
        "tool running\n\x1b]0;[ ! ] Action Required\x1b\\",
      ),
      true,
    );
  });

  it("does not trip awaiting-input on benign OSC titles or text containing 'action required'", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    // Plain working title - no awaiting signal.
    assert.equal(
      helpers.dashboardOutputLooksAwaitingInput(
        "\x1b]0;~/projects/goat-flow\x07All checks passing.",
      ),
      false,
    );
    // "Action Required" inside body prose, no title, no numbered prompt.
    assert.equal(
      helpers.dashboardOutputLooksAwaitingInput(
        "Reading ticket: Action Required by Friday.\nDone.",
      ),
      false,
    );
  });

  it("clears awaiting-input state when later output resumes normally", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );

    const prompt = "Do you want to proceed?\n1. Yes\n2. Explain\n3. No";
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", prompt),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "",
        "Do\x1b[1Cyou\x1b[1Cwant\x1b[1Cto\x1b[1Cproceed?\n1. Yes\n2. Explain\n3. No",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, "\nContinuing..."),
      false,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, "\r✻ Thinking…"),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, "\r✢ Thinking…"),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, prompt, "\nRunning..."),
      false,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, "\n   "),
      true,
    );
  });

  it("detects awaiting-input prompts split across terminal chunks", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );

    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "Do you want to run this command?\n",
        "1. Yes\n2. Yes, and don't ask again for [...] in this repo\n3. No, and tell Copilot what to do differently (Esc to stop)",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "Allow execution of [bash]\n",
        "1. Allow once\n2. Allow for this session\n3. No, suggest changes (esc)",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "Would you like to run the following command?\n",
        "1. Yes, proceed\n2. Yes, and don't ask again for commands that start with 'ls'\n3. No, and tell Codex what to do differently\n(esc)",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "Bash command ...\nDo you want to proceed?\n",
        "1. Yes\n2. No\nEsc to cancel · Tab to amend · ctrl+e to explain",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        true,
        "Do you want to run this command?\n",
        "1. Yes\n2. Yes, and don't ask again\n3. No",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        "Do you want to run this command?\n1. Yes\n",
        "2. No\nEsc to cancel",
      ),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        false,
        [
          "Do you want to run this command?",
          "1. Yes",
          "2. No",
          "1",
          "Running command...",
          "Done.",
        ].join("\n"),
        "\nNext steps:\n1. Inspect the result\n2. Update the docs\n",
      ),
      false,
    );
  });

  // Per-runner fixture-driven tests. Each fixture is captured under node-pty
  // from the live runner. Positive fixtures pin the prompts the heuristic must
  // catch; negative fixtures pin the running-state output the heuristic must
  // NOT false-fire on.
  const AWAITING_FIXTURE_DIR = resolve(
    PROJECT_ROOT,
    "test",
    "unit",
    "__fixtures__",
    "awaiting-input",
  );

  /**
   * Loads captured PTY bytes so prompt detection is pinned to real runner output.
   */
  function loadFixture(name: string): string {
    return readFileSync(resolve(AWAITING_FIXTURE_DIR, name), "utf-8");
  }

  it("detects Claude Code workspace trust prompt from captured PTY bytes", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("claude-trust.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      true,
    );
    // A transient redraw frame after the prompt must keep the state on.
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, bytes, "\r✻ Thinking…"),
      true,
    );
  });

  it("detects Claude Code in-session Bash approval prompt from captured PTY bytes", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("claude-bash-approval.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      true,
    );
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, bytes, "\r✻ Thinking…"),
      true,
    );
  });

  it("detects Codex workspace trust prompt from captured PTY bytes (CUP layout)", () => {
    // Codex lays each word out with `ESC[r;cH` (CUP) instead of CHA, and never
    // emits an inter-line `\r\n`. Without the CUP→newline normalisation the
    // numbered-choices regex never sees a newline between `1.` and `2.`.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("codex-startup.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      true,
    );
  });

  it("detects Copilot workspace trust prompt from captured PTY bytes (boxed layout)", () => {
    // Copilot renders the prompt inside a `│ ... │` border. Without the
    // box-drawing strip the numbered-choices regex never sees `\n\s*1.`.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("copilot-startup.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      true,
    );
  });

  it("detects Gemini workspace trust prompt from captured PTY bytes (● bullet + box)", () => {
    // Gemini uses `●` as the selection bullet (not `❯`) and wraps the menu in
    // a `│ ... │` border. The fix extends the bullet class and strips box.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("gemini-startup.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), true);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      true,
    );
  });

  it("does NOT false-fire on captured running output from Claude Code", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("claude-running.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), false);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      false,
    );
  });

  it("does NOT false-fire on captured running output from Codex", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("codex-running.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), false);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      false,
    );
  });

  it("does NOT false-fire on captured running output from Copilot", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("copilot-running.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), false);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      false,
    );
  });

  it("does NOT false-fire on captured running output from Gemini", () => {
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const bytes = loadFixture("gemini-running.txt");
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bytes), false);
    assert.equal(
      helpers.dashboardNextAwaitingInputState(false, "", bytes),
      false,
    );
  });

  it("keeps awaiting state across Claude Code's lone-bullet spinner frame", () => {
    // Live investigation (browser console, 2026-05-21) traced the milestone badge
    // failure to this exact chunk: Claude Code paints a single `●` (U+25CF)
    // in dim grey via CHA/CUP cursor walks about twice per second while a
    // prompt is visible. Before the fix the chunk had `chunkHasText === true`
    // (the lone `●` survives ANSI stripping and trim), fell through every
    // classifier in `dashboardNextAwaitingInputState`, and the message
    // handler's else-branch cleared the 1200ms reveal timer - so the badge
    // never appeared even though the prompt was clearly on screen.
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
    );
    const prompt =
      "Do you want to proceed?\n❯ 1. Yes\n  2. No\n\nEsc to cancel · Tab to amend · ctrl+e to explain";
    const bulletOn =
      "\r\x1b[25A\x1b[38;5;246m●\x1b[39m\r" +
      "\r\n".repeat(25) +
      "\x1b[1C\x1b[4A\x1b[1D\x1b[4B";
    const bulletOff =
      "\r\x1b[25A\x1b[38;5;246m \x1b[39m\r" +
      "\r\n".repeat(25) +
      "\x1b[1C\x1b[4A\x1b[1D\x1b[4B";
    // Sanity: the lone-bullet chunk on its own is a transient redraw.
    assert.equal(helpers.dashboardOutputLooksAwaitingInput(bulletOn), false);
    // The bullet-on frame must KEEP the awaiting state when prompt is in tail.
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, bulletOn),
      true,
    );
    // The bullet-off frame (already empty after stripping) keeps state too.
    assert.equal(
      helpers.dashboardNextAwaitingInputState(true, prompt, bulletOff),
      true,
    );
    // Alternating bullet frames simulating ~2 seconds of spinner ticks must
    // never knock the state down.
    let state = true;
    let tail = prompt;
    for (let i = 0; i < 8; i += 1) {
      const chunk = i % 2 === 0 ? bulletOn : bulletOff;
      state = helpers.dashboardNextAwaitingInputState(state, tail, chunk);
      tail = (tail + chunk).slice(-5000);
      assert.equal(state, true, `spinner frame ${i} cleared the state`);
    }
    // Genuine "moved on" output (the user pressed 1, Claude continues) still
    // clears: the chunk is non-bullet text without prompt markers.
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        true,
        prompt,
        "\nRunning command...\nDone.\n",
      ),
      false,
    );
    // Real running output starting with `●` followed by text is NOT a lone
    // bullet - it must still be classifiable as non-redraw so the badge does
    // clear when Claude prints status lines like `● Now let me read…`.
    assert.equal(
      helpers.dashboardNextAwaitingInputState(
        true,
        prompt,
        "● Now let me read the remaining skills and check key supporting docs.",
      ),
      false,
    );
  });

  it("keeps the badge on across unknown chunks while the session is awaiting", () => {
    // Output chunks never prove the user moved on. Earlier fixes tried
    // glyph allowlists, OSC preservation, and tail-window heuristics, but
    // each failed on a real runner redraw pattern; only user input or
    // lifecycle events can clear the awaiting state.
    const { globals, sockets } = makeBrowserTerminalGlobals();
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
      globals,
    );
    const session = {
      id: "session-defensive",
      runner: "claude" as const,
      promptLabel: "Defensive test",
      projectPath: "/tmp/example",
      cwd: "/tmp/example",
      targetPath: "/tmp/example",
      startTime: Date.now(),
      lastInputTime: Date.now(),
      connected: false,
      ended: false,
      awaitingInput: false,
      outputTail: "",
      loadingPhase: "ready",
      loadingShowSlowHint: false,
      loadingShowRetry: false,
      age: "",
      presetId: null,
    };
    const ctx = makeContext({
      activeSessionId: "session-defensive",
      sessions: [session],
      _terminalRefs: { "session-defensive": {} },
    });
    helpers.dashboardConnectTerminal(
      ctx,
      "session-defensive",
      "/ws/terminal/session-defensive",
    );
    const socket = sockets[0];
    assert.ok(socket);
    socket.onopen?.();

    // 1. Prompt chunk arrives. Heuristic fires → reveal timer scheduled.
    socket.onmessage?.({
      data: JSON.stringify({
        type: "output",
        data:
          "Do you want to proceed?\n❯ 1. Yes\n  2. No\n\n" +
          "Esc to cancel · Tab to amend · ctrl+e to explain",
      }),
    });
    assert.equal(session.awaitingInput, false, "badge waits for reveal delay");

    // 2. Send 8 chunks of UNKNOWN glyph nobody added to the classifier yet.
    //    These are non-empty (chunkHasText=true), don't match any positive
    //    pattern, and aren't in the spinner-glyph class. Old behavior:
    //    every one of these would call dashboardClearAwaitingInputTimer.
    //    New behavior: tail still has prompt in last 1500 chars, so no clear.
    for (let i = 0; i < 8; i += 1) {
      socket.onmessage?.({
        data: JSON.stringify({
          type: "output",
          // A made-up "future" runner spinner glyph not in our class.
          data: "\r\x1b[2m⚡\x1b[0m",
        }),
      });
    }

    // 3. Tick past the 1200ms reveal delay. The timer survived.
    timers.tick(1500);
    assert.equal(
      session.awaitingInput,
      true,
      "badge fires after reveal delay despite unknown glyph chunks",
    );

    // 4. More unknown chunks after badge is showing. State must persist.
    for (let i = 0; i < 4; i += 1) {
      socket.onmessage?.({
        data: JSON.stringify({
          type: "output",
          data: "\r\x1b[2m⚡\x1b[0m",
        }),
      });
    }
    assert.equal(
      session.awaitingInput,
      true,
      "badge stays on through more unknown chunks",
    );
  });

  /*
   * Fixture covers the ANSI-heavy prompt-tail regression where the visible
   * question can disappear from a too-short raw tail window.
   */
  it("keeps the badge on across unknown chunks for ANSI-heavy prompt tails", () => {
    // Gemini/Copilot captured prompts contain enough ANSI and box drawing
    // bytes that raw tail.slice(-1500) can miss the visible prompt. R4's
    // visible-tail check uses a 3000-byte raw slice (~1500 plain chars
    // post-stripping for ANSI-heavy runners) so both body content AND OSC
    // titles survive into the matcher.
    const { globals, sockets } = makeBrowserTerminalGlobals();
    const timers = createFakeTimers();
    const helpers = loadHelpers(
      async () => ({ json: async () => ({}) }) as Response,
      timers,
      globals,
    );
    const session = {
      id: "session-ansi-heavy",
      runner: "antigravity" as const,
      promptLabel: "ANSI-heavy test",
      projectPath: "/tmp/example",
      cwd: "/tmp/example",
      targetPath: "/tmp/example",
      startTime: Date.now(),
      lastInputTime: Date.now(),
      connected: false,
      ended: false,
      awaitingInput: false,
      outputTail: "",
      loadingPhase: "ready",
      loadingShowSlowHint: false,
      loadingShowRetry: false,
      age: "",
      presetId: null,
    };
    const ctx = makeContext({
      activeSessionId: "session-ansi-heavy",
      sessions: [session],
      _terminalRefs: { "session-ansi-heavy": {} },
    });
    helpers.dashboardConnectTerminal(
      ctx,
      "session-ansi-heavy",
      "/ws/terminal/session-ansi-heavy",
    );
    const socket = sockets[0];
    assert.ok(socket);
    socket.onopen?.();

    socket.onmessage?.({
      data: JSON.stringify({
        type: "output",
        // Fixture purpose: Gemini's ANSI-heavy prompt previously pushed the
        // visible question outside the raw 1500-byte tail window.
        data: loadFixture("gemini-startup.txt"),
      }),
    });
    assert.equal(session.awaitingInput, false, "badge waits for reveal delay");

    socket.onmessage?.({
      data: JSON.stringify({
        type: "output",
        data: "\r\x1b[2m⚡\x1b[0m",
      }),
    });
    timers.tick(1500);
    assert.equal(
      session.awaitingInput,
      true,
      "badge fires when the normalized visible tail still shows the prompt",
    );
  });
});
