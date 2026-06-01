/**
 * Dashboard terminal availability, xterm asset loading, and session launch helpers.
 */
async function dashboardSendToProjectTarget(
  ctx: DashboardTerminalContext,
  prompt: string,
  target: ServerSessionInfo,
): Promise<void> {
  if (target.projectPath !== ctx.projectPath) {
    ctx.showToast("Target session is not in this project", true);
    return;
  }
  if (ctx.isSessionBoundLocally(target.id)) {
    ctx.activeSessionId = target.id;
    ctx.activeView = "workspace";
    ctx.workspacePanel = "terminal";
  } else {
    await ctx.openServerSession(target);
  }
  const prepared = ctx.adaptPrompt(prompt, target.runner);
  /** Retry a project-scoped send until the target terminal is ready. */
  const deliver = async (attempts: number): Promise<void> => {
    const refs = ctx._terminalRefs[ctx.activeSessionId ?? ""];
    if (refs?.ws && refs.ws.readyState === WebSocket.OPEN) {
      ctx.sendToTerminal(prepared, { adapt: false });
      return;
    }
    if (attempts > 20) {
      ctx.showToast("Could not connect to terminal", true);
      return;
    }
    await new Promise<void>((r) => setTimeout(r, 100));
    return deliver(attempts + 1);
  };
  await deliver(0);
}

/** Refresh terminal feature availability from the health endpoint. */
async function dashboardCheckTerminalAvailable(
  ctx: DashboardTerminalContext,
): Promise<void> {
  try {
    const res = await dashboardFetch("/api/health");
    if (res.ok) {
      const payload = readRecord(await res.json(), "Health response");
      ctx.availableRunners = Array.isArray(payload.availableRunners)
        ? payload.availableRunners
            .map((runner) => readRunnerId(runner))
            .filter((runner): runner is RunnerId => runner !== null)
        : [];
      ctx.terminalAvailable =
        payload.nodePtyAvailable === true && ctx.availableRunners.length > 0;
      ctx.platformHint =
        typeof payload.platformHint === "string" ? payload.platformHint : null;
      ctx.idleTimeoutMinutes =
        typeof payload.idleTimeoutMinutes === "number"
          ? payload.idleTimeoutMinutes
          : 480;
      const [firstRunner] = ctx.availableRunners;
      if (firstRunner) ctx.activeRunner = firstRunner;
      if (
        ctx.terminalAvailable &&
        (ctx.activeView === "workspace" || ctx.activeView === "setup")
      ) {
        void dashboardWarmXterm(ctx);
      }
    }
  } catch {
    ctx.terminalAvailable = false;
  }
  void ctx.updateSessionCount();
}

/** Refresh terminal session state from the server. */
async function dashboardUpdateSessionCount(
  ctx: DashboardTerminalContext,
): Promise<void> {
  if (sessionRefreshPromise) return sessionRefreshPromise;
  sessionRefreshPromise = new Promise<void>((resolve) => {
    sessionRefreshDebounceTimer = setTimeout(() => {
      void dashboardUpdateSessionCountImpl(ctx).finally(() => {
        sessionRefreshPromise = null;
        sessionRefreshDebounceTimer = null;
        resolve();
      });
    }, SESSION_REFRESH_DEBOUNCE_MS);
  });
  return sessionRefreshPromise;
}

async function dashboardUpdateSessionCountImpl(
  ctx: DashboardTerminalContext,
): Promise<void> {
  try {
    const res = await dashboardFetch("/api/terminal/sessions");
    const payload = readRecord(await res.json(), "Terminal sessions response");
    ctx.terminalSessionCount =
      typeof payload.activeCount === "number" ? payload.activeCount : 0;
    if (typeof payload.maxSessions === "number") {
      ctx.serverMaxSessions = payload.maxSessions;
    }
    ctx.serverSessions = Array.isArray(payload.sessions)
      ? payload.sessions
          .map((session) => readServerSessionInfo(session))
          .filter((session): session is ServerSessionInfo => session !== null)
          .map((session) => ({
            ...session,
            projectName: ctx.displayNameFor(session.projectPath),
          }))
      : [];
    const activeIds = new Set(ctx.serverSessions.map((session) => session.id));
    for (const session of ctx.sessions) {
      if (session.ended || session.connected || activeIds.has(session.id)) {
        continue;
      }
      dashboardClearAwaitingInputTimer(ctx, session.id);
      dashboardClearTerminalLoadingTimers(ctx, session.id);
      session.ended = true;
      session.awaitingInput = false;
      ctx._forgetSavedSession(session.id);
    }
  } catch {
    /* ignore */
  }
}

/** Clear non-active (terminated/starting) terminal sessions, preserving running ones. */
async function dashboardEndAllSessions(
  ctx: DashboardTerminalContext,
): Promise<void> {
  try {
    const res = await dashboardFetch("/api/terminal/sessions");
    const payload = readRecord(await res.json(), "Terminal sessions response");
    const sessions = Array.isArray(payload.sessions)
      ? payload.sessions
          .map((session) => readServerSessionInfo(session))
          .filter((session): session is ServerSessionInfo => session !== null)
      : [];
    const inactive = sessions.filter((session) => session.status !== "active");
    const activeIds = new Set(
      sessions
        .filter((session) => session.status === "active")
        .map((session) => session.id),
    );
    const localRecentCount = ctx.recentTerminalSessions.length;
    for (const session of inactive) {
      await dashboardFetch(`/api/terminal/${session.id}`, {
        method: "DELETE",
      });
    }
    ctx.recentTerminalSessions = [];
    const keptRefs: typeof ctx._terminalRefs = {};
    for (const id of Object.keys(ctx._terminalRefs)) {
      if (activeIds.has(id)) {
        const active = ctx._terminalRefs[id];
        if (active) keptRefs[id] = active;
      } else {
        const refs = ctx._terminalRefs[id];
        dashboardClearTerminalLoadingTimers(ctx, id);
        if (refs?.cleanup) refs.cleanup();
      }
    }
    ctx._terminalRefs = keptRefs;
    const keptProjects: typeof ctx._projectSessions = {};
    for (const key of Object.keys(ctx._projectSessions)) {
      const kept = (ctx._projectSessions[key] ?? []).filter((s) =>
        activeIds.has(s.sessionId),
      );
      if (kept.length > 0) keptProjects[key] = kept;
    }
    ctx._projectSessions = keptProjects;
    for (const key of Object.keys(ctx._projectActiveSession)) {
      const activeSessionForProject = ctx._projectActiveSession[key];
      if (activeSessionForProject && !activeIds.has(activeSessionForProject)) {
        const projectSessions = keptProjects[key];
        if (projectSessions?.[0]) {
          ctx._projectActiveSession[key] = projectSessions[0].sessionId;
        } else {
          Reflect.deleteProperty(ctx._projectActiveSession, key);
        }
      }
    }
    ctx.sessions = ctx.sessions.filter((s) => activeIds.has(s.id));
    if (ctx.activeSessionId && !activeIds.has(ctx.activeSessionId)) {
      ctx.activeSessionId = null;
    }
    for (const [presetId, state] of Object.entries(ctx.promptRunStates)) {
      if (
        state === "running" &&
        !ctx.sessions.some((s) => s.presetId === presetId)
      ) {
        ctx.promptRunStates[presetId] = "pass";
      }
    }
    await ctx.updateSessionCount();
    const count = inactive.length + localRecentCount;
    ctx.showToast(
      count > 0
        ? `Cleared ${count} recent session${count !== 1 ? "s" : ""}`
        : "No recent sessions to clear",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.showToast("Failed to clear sessions: " + msg, true);
  }
}

/** Load the xterm.js globals on demand before any terminal view is rendered. */
function removeXtermAssetElements(): void {
  document
    .querySelector('link[rel="stylesheet"][href="/assets/xterm.css"]')
    ?.remove();
  document.querySelector('script[src="/assets/xterm.js"]')?.remove();
  document.querySelector('script[src="/assets/addon-fit.js"]')?.remove();
}

function waitForAssetElement(
  element: HTMLLinkElement | HTMLScriptElement,
  label: string,
): Promise<void> {
  if (element.dataset["loaded"] === "true") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} load timeout`));
    }, 5000);
    const cleanup = (): void => {
      clearTimeout(timer);
      element.removeEventListener("load", onLoad);
      element.removeEventListener("error", onError);
    };
    const onLoad = (): void => {
      cleanup();
      element.dataset["loaded"] = "true";
      resolve();
    };
    const onError = (): void => {
      cleanup();
      reject(new Error(`${label} load failed`));
    };
    element.addEventListener("load", onLoad, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

/** Load xterm CSS once, reusing an existing tag so reconnects do not duplicate assets. */
async function loadXtermStylesheet(): Promise<void> {
  const existing = document.querySelector<HTMLLinkElement>(
    'link[rel="stylesheet"][href="/assets/xterm.css"]',
  );
  if (existing) {
    await waitForAssetElement(existing, "xterm.css");
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/xterm.css";
  const loaded = waitForAssetElement(link, "xterm.css");
  document.head.appendChild(link);
  await loaded;
}

/** Load one xterm script asset, waiting for existing tags when another tab started first. */
async function loadXtermScript(src: string, label: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`,
  );
  if (existing) {
    await waitForAssetElement(existing, label);
    return;
  }
  const script = document.createElement("script");
  script.src = src;
  const loaded = waitForAssetElement(script, label);
  document.head.appendChild(script);
  await loaded;
}

async function dashboardLoadXterm(
  ctx: DashboardTerminalContext,
): Promise<void> {
  if (ctx._xtermLoaded) return;
  if (!xtermLoadPromise) {
    xtermLoadPromise = (async () => {
      await loadXtermStylesheet();
      // The fit addon patches the global Terminal constructor, so xterm itself
      // has to finish loading before the addon script is appended.
      await loadXtermScript("/assets/xterm.js", "xterm.js");
      await loadXtermScript("/assets/addon-fit.js", "fit addon");
      getXtermConstructors();
    })();
  }
  try {
    await xtermLoadPromise;
    ctx._xtermLoaded = true;
  } catch (err) {
    xtermLoadPromise = null;
    removeXtermAssetElements();
    throw err;
  }
}

/** Warm xterm.js in the background so the first launch does less visible work. */
async function dashboardWarmXterm(
  ctx: DashboardTerminalContext,
): Promise<void> {
  if (!ctx.terminalAvailable || ctx._xtermLoaded) return;
  try {
    await ctx.loadXterm();
  } catch {
    // Surface load failures only on explicit launch.
  }
}

/** Launch a preset prompt in the selected runner. */
async function dashboardLaunchPreset(
  ctx: DashboardTerminalContext,
  prompt: string,
  runner?: RunnerId,
  label?: string,
  options: {
    presetId?: string | null;
    cwdPath?: string | null;
    targetPath?: string | null;
  } = {},
): Promise<void> {
  if (ctx.launching) return;
  const preset =
    (options.presetId
      ? (ctx.allPresets.find((p) => p.id === options.presetId) ?? null)
      : null) ??
    ctx.allPresets.find(
      (p) =>
        ctx.adaptPrompt(p.prompt) === ctx.adaptPrompt(prompt) ||
        (typeof label === "string" && p.name === label),
    ) ??
    null;
  const promptLabel = label || preset?.name || "Custom prompt";
  const presetId = preset?.id || options.presetId || null;
  const runnerResolved = runner || ctx.activeRunner;
  if (presetId) ctx.promptRunStates[presetId] = "running";
  let adapted = ctx.adaptPrompt(prompt, runnerResolved);
  adapted +=
    "\n\n" + dashboardGlobalLaunchContext(ctx, runnerResolved, preset ?? null);
  if (ctx.userRole === "investigator") {
    adapted =
      "You are in investigator mode. Read-only - investigate, plan, and review only. Do NOT make any code changes.\n\n" +
      adapted;
  } else if (ctx.userRole === "tester") {
    adapted =
      "You are in tester mode. Test-focused - generate test plans, verify coverage, run QA analysis. Do NOT make code changes beyond test files.\n\n" +
      adapted;
  }
  await ctx.launchInTerminal(adapted, runnerResolved, {
    promptLabel,
    presetId,
    cwdPath: options.cwdPath ?? null,
    targetPath: options.targetPath ?? ctx.projectPath,
  });
}

/** Drop a session id from every project's saved list, pruning empty entries. */
function dashboardForgetSavedSession(
  ctx: DashboardTerminalContext,
  sessionId: string,
): void {
  for (const [path, list] of Object.entries(ctx._projectSessions)) {
    const filtered = list.filter((sv) => sv.sessionId !== sessionId);
    if (filtered.length === 0) {
      Reflect.deleteProperty(ctx._projectSessions, path);
    } else if (filtered.length !== list.length) {
      ctx._projectSessions[path] = filtered;
    }
    if (ctx._projectActiveSession[path] === sessionId) {
      const first = filtered[0];
      if (first) {
        ctx._projectActiveSession[path] = first.sessionId;
      } else {
        Reflect.deleteProperty(ctx._projectActiveSession, path);
      }
    }
  }
}

/** Detach the current browser terminal while preserving reconnect metadata. */
function dashboardDetachTerminal(
  ctx: DashboardTerminalContext,
  forProjectPath?: string,
): void {
  ctx._detaching = true;
  const savePath = forProjectPath || ctx.projectPath;
  const toSave: SavedSession[] = ctx.sessions
    .filter((s) => s.projectPath === savePath && !s.ended)
    .map((s) => ({
      sessionId: s.id,
      startTime: s.startTime,
      prompt: s.promptLabel,
      agent: s.runner,
      cwd: s.cwd,
      targetPath: s.targetPath,
    }));
  if (toSave.length > 0) {
    ctx._projectSessions[savePath] = toSave;
    const activeId = ctx.activeSessionId;
    const fallback = toSave[0];
    if (activeId && toSave.some((s) => s.sessionId === activeId)) {
      ctx._projectActiveSession[savePath] = activeId;
    } else if (fallback) {
      ctx._projectActiveSession[savePath] = fallback.sessionId;
    }
  } else {
    Reflect.deleteProperty(ctx._projectSessions, savePath);
    Reflect.deleteProperty(ctx._projectActiveSession, savePath);
  }
  for (const id of Object.keys(ctx._terminalRefs)) {
    const refs = ctx._terminalRefs[id];
    dashboardClearTerminalLoadingTimers(ctx, id);
    if (refs?.cleanup) refs.cleanup();
  }
  ctx._terminalRefs = {};
  ctx.sessions = [];
  ctx.activeSessionId = null;
  ctx.promptRunStates = {};
  ctx._detaching = false;
}

/** Reconnect the workspace to every saved backend session for this project. */
async function dashboardReconnectTerminal(
  ctx: DashboardTerminalContext,
): Promise<boolean> {
  const savedList = ctx._projectSessions[ctx.projectPath];
  const aliveMap = new Map<string, ServerSessionInfo>();
  try {
    const res = await dashboardFetch("/api/terminal/sessions");
    const payload = readRecord(await res.json(), "Terminal sessions response");
    if (Array.isArray(payload.sessions)) {
      for (const raw of payload.sessions) {
        const session = readServerSessionInfo(raw);
        if (session) aliveMap.set(session.id, session);
      }
    }
  } catch {
    Reflect.deleteProperty(ctx._projectSessions, ctx.projectPath);
    Reflect.deleteProperty(ctx._projectActiveSession, ctx.projectPath);
    return false;
  }
  if (!savedList || savedList.length === 0) {
    const activeId = ctx.activeSessionId;
    const activeServerSession = activeId ? aliveMap.get(activeId) : null;
    if (!activeServerSession) return false;
    await ctx.openServerSession(activeServerSession);
    return true;
  }
  const liveSaved = savedList.filter((sv) => aliveMap.has(sv.sessionId));
  if (liveSaved.length === 0) {
    Reflect.deleteProperty(ctx._projectSessions, ctx.projectPath);
    Reflect.deleteProperty(ctx._projectActiveSession, ctx.projectPath);
    return false;
  }
  ctx._projectSessions[ctx.projectPath] = liveSaved;
  const self = ctx as DashboardTerminalContext &
    AlpineMagics<DashboardTerminalContext>;
  await ctx.loadXterm();
  for (const saved of liveSaved) {
    const alive = aliveMap.get(saved.sessionId);
    if (!alive) continue;
    const session: LocalSession = {
      id: saved.sessionId,
      runner: saved.agent,
      promptLabel: saved.prompt,
      projectPath: alive.projectPath,
      cwd: alive.cwd || saved.cwd || alive.projectPath,
      targetPath: alive.targetPath || saved.targetPath || alive.projectPath,
      startTime: saved.startTime,
      lastInputTime: alive.lastInputAt,
      connected: false,
      ended: false,
      awaitingInput: false,
      outputTail: "",
      loadingPhase: "connecting",
      loadingShowSlowHint: false,
      loadingShowRetry: false,
      age: "",
      presetId: null,
    };
    ctx.rememberSessionTitle(session.id, session.promptLabel);
    ctx.sessions.push(session);
    ctx._terminalRefs[session.id] = {
      retryPrompt: "",
      retryPromptLabel: session.promptLabel,
      retryPresetId: null,
      retryCwdPath: session.cwd,
      retryTargetPath: session.targetPath,
    };
    dashboardArmTerminalLoadingTimers(ctx, session.id, session);
  }
  const savedActiveId = ctx._projectActiveSession[ctx.projectPath];
  const first = liveSaved[0];
  ctx.activeSessionId =
    savedActiveId && liveSaved.some((s) => s.sessionId === savedActiveId)
      ? savedActiveId
      : (first?.sessionId ?? null);
  ctx.activeView = "workspace";
  ctx.workspacePanel = "terminal";
  await self.$nextTick();
  for (const saved of liveSaved) {
    ctx.connectTerminal(saved.sessionId, `/ws/terminal/${saved.sessionId}`);
  }
  void ctx.updateSessionCount();
  return true;
}

/** Create a new backend terminal session and open it in the workspace. */
async function dashboardLaunchInTerminal(
  ctx: DashboardTerminalContext,
  prompt: string,
  runner: RunnerId = "claude",
  {
    promptLabel = null,
    presetId = null,
    cwdPath = null,
    targetPath = null,
  }: {
    promptLabel?: string | null;
    presetId?: string | null;
    cwdPath?: string | null;
    targetPath?: string | null;
  } = {},
): Promise<void> {
  if (
    Math.max(ctx.sessions.length, ctx.serverSessions.length) >=
    ctx.serverMaxSessions
  ) {
    ctx.showMaxSessionsModal = true;
    return;
  }
  let createdSessionId: string | null = null;
  ctx.launching = true;
  try {
    const self = ctx as DashboardTerminalContext &
      AlpineMagics<DashboardTerminalContext>;
    const selectedTargetPath = targetPath || ctx.projectPath;
    const controllingCwd = cwdPath || selectedTargetPath;
    let xtermPromise: Promise<{ ok: true } | { ok: false; error: unknown }>;
    try {
      xtermPromise = ctx.loadXterm().then(
        () => ({ ok: true }) as const,
        (error: unknown) => ({ ok: false, error }) as const,
      );
    } catch (error) {
      xtermPromise = Promise.resolve({ ok: false, error });
    }
    const res = await dashboardFetch("/api/terminal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "",
        projectPath: controllingCwd,
        targetPath: selectedTargetPath,
        runner,
      }),
    });
    const payload = readRecord(await res.json(), "Terminal create response");
    const error = readErrorMessage(payload);
    if (error) throw new Error(error);
    const id = readString(payload.id);
    const wsUrl = readString(payload.wsUrl);
    if (!id || !wsUrl) {
      throw new Error("Terminal create response returned an invalid payload");
    }
    const session: LocalSession = {
      id,
      runner,
      promptLabel: promptLabel || "Custom prompt",
      projectPath: selectedTargetPath,
      cwd: controllingCwd,
      targetPath: selectedTargetPath,
      startTime: Date.now(),
      lastInputTime: Date.now(),
      connected: false,
      ended: false,
      awaitingInput: false,
      outputTail: "",
      loadingPhase: "connecting",
      loadingShowSlowHint: false,
      loadingShowRetry: false,
      age: "",
      presetId,
    };
    createdSessionId = session.id;
    ctx.rememberSessionTitle(session.id, session.promptLabel);
    ctx.sessions.push(session);
    ctx._terminalRefs[session.id] = {
      retryPrompt: prompt,
      retryPromptLabel: session.promptLabel,
      retryPresetId: presetId,
      retryCwdPath: controllingCwd,
      retryTargetPath: selectedTargetPath,
    };
    dashboardArmTerminalLoadingTimers(ctx, session.id, session);
    ctx.activeSessionId = session.id;
    ctx.activeView = "workspace";
    ctx.workspacePanel = "terminal";
    await self.$nextTick();
    const xtermResult = await xtermPromise;
    if (!xtermResult.ok) throw xtermResult.error;
    ctx.connectTerminal(session.id, wsUrl);
    dashboardScheduleLaunchPrompt(ctx, session.id, prompt);
    void ctx.updateSessionCount();
  } catch (err) {
    if (createdSessionId) {
      const failedSessionId = createdSessionId;
      const refs = ctx._terminalRefs[failedSessionId];
      dashboardClearTerminalLoadingTimers(ctx, failedSessionId);
      if (refs?.cleanup) refs.cleanup();
      Reflect.deleteProperty(ctx._terminalRefs, failedSessionId);
      ctx.sessions = ctx.sessions.filter((s) => s.id !== failedSessionId);
      if (ctx.activeSessionId === failedSessionId) {
        ctx.activeSessionId = ctx.sessions[0]?.id || null;
      }
      dashboardFetch(`/api/terminal/${failedSessionId}`, {
        method: "DELETE",
      }).catch(() => {});
      void ctx.updateSessionCount();
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Maximum") || msg.includes("concurrent")) {
      ctx.showMaxSessionsModal = true;
    } else {
      ctx.showToast(msg, true);
    }
  }
  ctx.launching = false;
}

/** Bind a browser xterm instance to a backend PTY session. */
