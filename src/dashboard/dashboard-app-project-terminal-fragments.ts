/**
 * Project, terminal, and skill-evaluator action fragments for the dashboard Alpine app.
 * dashboardMergeAppFragments stitches these into one app object. These fragments own the standalone
 * skill evaluator (drop/upload/paste markdown, then POST for a quality verdict), project-list
 * management methods, clipboard + toast utilities, the full terminal-session method surface, and the
 * small time-formatting helpers. As elsewhere, most methods are thin `this`-bound shims over shared
 * `dashboard*` helpers; the few with logic inline (clipboard fallback, scrollback export, time
 * formatting) are self-contained and noted on their own doc comments.
 */

/**
 * Build the skill-evaluator and project-list fragment: drop/remove/run methods for the ad-hoc
 * markdown evaluator plus the saved-project add/sort/audit methods. Most methods delegate to shared
 * helpers, but runSkillEvaluator owns its fetch inline because it has a one-off request/response
 * shape, and it catches a failure into the evaluator's error field and reports it in-view rather
 * than throwing, so a bad evaluate request never breaks the app. Merged by dashboardMergeAppFragments.
 */
function dashboardAppFragment13(): DashboardAppFragment {
  return {
    /** drop handler - read every dropped .md file and append to the list. */
    skillEvaluatorDrop(event: DragEvent) {
      event.preventDefault();
      this.skillEvaluatorDragActive = false;
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;
      void this._ingestSkillEvaluatorFiles(files);
    },

    /** Remove one already-attached file by name. */
    removeSkillEvaluatorFile(name: string) {
      this.skillEvaluatorFiles = this.skillEvaluatorFiles.filter(
        (file: { name: string; content: string }) => file.name !== name,
      );
    },

    /**
     * POST the dropped/pasted markdown to the quality evaluate endpoint and store the verdict.
     * Returns early (no request) when neither files nor content are present, setting a prompt.
     * On a fetch/parse failure it does not propagate the error; instead it recovers by writing the
     * message into skillEvaluatorError and reports it in-view, so a bad request never breaks the
     * app. Loading state is always cleared in finally.
     */
    async runSkillEvaluator() {
      this.skillEvaluatorError = null;
      this.skillEvaluatorResult = null;
      this.skillEvaluatorReportCopied = false;
      if (this._skillEvaluatorReportCopiedTimer) {
        clearTimeout(this._skillEvaluatorReportCopiedTimer);
        this._skillEvaluatorReportCopiedTimer = null;
      }
      const hasFiles = this.skillEvaluatorFiles.length > 0;
      const hasContent = this.skillEvaluatorContent.trim().length > 0;
      if (!hasFiles && !hasContent) {
        this.skillEvaluatorError =
          "Drop .md files, upload, or paste markdown first.";
        return;
      }
      this.skillEvaluatorLoading = true;
      try {
        const url = `/api/quality/evaluate?path=${encodeURIComponent(this.projectPath)}`;
        const body: Record<string, unknown> = {};
        if (hasFiles) {
          body.files = this.skillEvaluatorFiles;
        } else {
          body.content = this.skillEvaluatorContent;
        }
        body.kind = "skill";
        const name = this.skillEvaluatorName.trim();
        if (name.length > 0) body.suggestedName = name;
        const res = await dashboardFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = readRecord(await res.json(), "Evaluate result");
        const error = readErrorMessage(data);
        if (error) {
          this.skillEvaluatorError = error;
          return;
        }
        this.skillEvaluatorResult = data;
      } catch (err) {
        this.skillEvaluatorError =
          err instanceof Error ? err.message : String(err);
      } finally {
        this.skillEvaluatorLoading = false;
      }
    },

    // -- Projects --
    async addProject() {
      await dashboardAddProject(this);
    },

    /** Remove a project from the saved workspace list. */
    removeProject(path: string) {
      dashboardRemoveProject(this, path);
    },

    /** Sort saved projects by the active key and direction. */
    sortProjects(key: ProjectSortKey) {
      dashboardSortProjects(this, key);
    },

    /** Sort projects by visible columns while keeping the derived "name" column first-class. */
    get sortedProjectsList(): ProjectEntry[] {
      return dashboardSortedProjectsList(this);
    },

    /** Refresh audit status for every saved project. */
    async auditAllProjects() {
      await dashboardAuditAllProjects(this);
    },

    /** Load saved dashboard state from disk, with localStorage as a migration fallback. */
    async _loadSavedDashboardState() {
      await dashboardLoadSavedDashboardState(this);
    },

    /** Persist the current dashboard state to localStorage and the server store. */
    _saveDashboardState() {
      dashboardSaveDashboardState(this);
    },

    /** Begin editing the current project's title (inline header rename). */
    startEditProjectTitle() {
      dashboardStartEditProjectTitle(this);
    },

    /** Commit the inline-edited title for the current project path. An empty
     *  or whitespace-only draft clears the override so the path basename wins. */
    saveProjectTitle() {
      dashboardSaveProjectTitle(this);
    },

    /** Discard the inline-edited title. */
    cancelEditProjectTitle() {
      dashboardCancelEditProjectTitle(this);
    },

    /** Persist the current project list through the shared dashboard state store. */
    _saveProjectsList() {
      this._saveDashboardState();
    },

    // -- Clipboard + Toast --
    /**
     * Copy text to the clipboard, preferring the async Clipboard API. When that throws (the API is
     * undefined in insecure contexts, or the promise rejects) it recovers via a hidden-textarea
     * `execCommand("copy")` fallback instead of surfacing the error. Returns whether the copy
     * succeeded by either path; false means both the modern API and the legacy fallback failed.
     */
    async copyTextToClipboard(text: string): Promise<boolean> {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Falls through to legacy textarea+execCommand on TypeError (clipboard
        // API undefined in insecure contexts) or any Promise reject reason.
        void err;
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional fallback for insecure contexts without Clipboard API
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    },

    /** Copy text and flash the "Copied!" button label, reverting to "Copy" after 2s. Fire-and-forget: the copy result is ignored. */
    copyText(text: string) {
      void this.copyTextToClipboard(text);
      this.copyLabel = "Copied!";
      setTimeout(() => {
        this.copyLabel = "Copy";
      }, 2000);
    },

    /** Show a temporary toast message. */
    showToast(msg: string, isError?: boolean) {
      this.toast = msg;
      this.toastError = isError ?? false;
      setTimeout(() => {
        this.toast = "";
      }, 4000);
    },

    // -- Terminal --
    async checkTerminalAvailable() {
      await dashboardCheckTerminalAvailable(this);
    },
  };
}

/**
 * Build the terminal-session method fragment: the full surface for launching, attaching,
 * reconnecting, switching, exporting, and ending browser/backend terminal sessions. Almost every
 * method intentionally delegates to a shared `dashboard*` terminal helper, because the WebSocket and
 * xterm mechanics are shared with the non-fragmented code paths and must stay in one place; the
 * fragment is just the named Alpine entry points. exportSession is the deliberate exception and
 * builds the scrollback download inline. Merged into the app by dashboardMergeAppFragments.
 */
function dashboardAppFragment14(): DashboardAppFragment {
  return {
    /** Refresh terminal session state from the server. */
    async updateSessionCount() {
      await dashboardUpdateSessionCount(this);
    },

    /** Clear non-active (terminated/starting) sessions, preserving running ones. */
    async endAllSessions() {
      await dashboardEndAllSessions(this);
    },

    /** Retry a terminal session that failed or stalled before first output. */
    async retryTerminalSession(sessionId: string) {
      await dashboardRetryTerminalSession(this, sessionId);
    },

    /** Load the xterm.js globals on demand before any terminal view is rendered. */
    async loadXterm() {
      await dashboardLoadXterm(this);
    },

    /** Launch a preset prompt in the selected runner. */
    async launchPreset(
      prompt: string,
      runner?: RunnerId,
      label?: string,
      options?: {
        presetId?: string | null;
        cwdPath?: string | null;
        targetPath?: string | null;
      },
    ) {
      await dashboardLaunchPreset(this, prompt, runner, label, options);
    },

    /** Drop a session id from every project's saved list, pruning empty entries. */
    _forgetSavedSession(sessionId: string) {
      dashboardForgetSavedSession(this, sessionId);
    },

    /** Persist a launch-time title for reconnect and refresh recovery. */
    rememberSessionTitle(sessionId: string, title: string | null | undefined) {
      dashboardRememberSessionTitle(this, sessionId, title);
    },

    /** Add an ended local session to the Workspace recent-history list. */
    rememberRecentSession(session: LocalSession) {
      dashboardRememberRecentSession(this, session);
    },

    /** Resolve the display title for a terminal session. */
    sessionTitleFor(session: ServerSessionInfo | LocalSession | null): string {
      return dashboardSessionTitle(this, session);
    },

    /** Detach the current browser terminal while preserving reconnect metadata. */
    detachTerminal(forProjectPath?: string) {
      dashboardDetachTerminal(this, forProjectPath);
    },

    /** Reconnect the workspace to every saved backend session for this project. */
    async reconnectTerminal(): Promise<boolean> {
      return dashboardReconnectTerminal(this);
    },

    /** Create a new backend terminal session and open it in the workspace. */
    async launchInTerminal(
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
    ) {
      await dashboardLaunchInTerminal(this, prompt, runner, {
        promptLabel,
        presetId,
        cwdPath,
        targetPath,
      });
    },

    /** Bind a browser xterm instance to a backend PTY session. */
    connectTerminal(sessionId: string, wsUrl: string) {
      dashboardConnectTerminal(this, sessionId, wsUrl);
    },

    /** End a local terminal session and release its browser bindings. */
    endSession(sessionId: string) {
      dashboardEndSession(this, sessionId);
    },

    /**
     * Download one terminal tab's scrollback as a .txt file built from its xterm buffer. Dumps the
     * normal buffer and, when a TUI has switched to the alternate screen, appends that view under a
     * divider so the export captures what the user currently sees. Returns early (no download) when
     * the session has no live xterm instance; trailing blank lines are trimmed from the normal buffer.
     */
    exportSession(sessionId: string) {
      const refs = this._terminalRefs[sessionId];
      if (!refs?.xterm) return;
      const xterm = refs.xterm;
      const dumpBuffer = (buf: XTermBuffer): string => {
        const lines: string[] = [];
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
        while (lines.length > 0 && lines[lines.length - 1] === "") {
          lines.pop();
        }
        return lines.join("\n");
      };
      const normalText = dumpBuffer(xterm.buffer.normal);
      const altActive = xterm.buffer.active === xterm.buffer.alternate;
      const altText = altActive ? dumpBuffer(xterm.buffer.alternate) : "";
      const parts: string[] = [];
      if (normalText) parts.push(normalText);
      if (altText) {
        parts.push(
          "",
          "--- alternate screen (current TUI view) ---",
          "",
          altText,
        );
      }
      const text = parts.join("\n");
      const session = this.sessions.find(
        (s: LocalSession) => s.id === sessionId,
      );
      const runner = session?.runner ?? "terminal";
      const shortId = sessionId.slice(0, 8);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${runner}-${shortId}.txt`;
      downloadLink.click();
      URL.revokeObjectURL(url);
    },

    /** Exit the active terminal session from the workspace view. */
    exitTerminal() {
      dashboardExitTerminal(this);
    },

    /** Switch the workspace to an existing local terminal session. */
    switchToSession(sessionId: string) {
      dashboardSwitchToSession(this, sessionId);
    },

    /** Attach the workspace to an existing backend terminal session. */
    async openServerSession(serverSession: ServerSessionInfo) {
      await dashboardOpenServerSession(this, serverSession);
    },

    /** Terminate a backend terminal session by ID. */
    async endServerSession(sessionId: string) {
      await dashboardEndServerSession(this, sessionId);
    },

    // -- Computed Properties --
    auditDetailAgent: null as string | null,
  };
}

/**
 * Build the time-formatting helper fragment: pure relative-time formatters the templates bind to.
 * No state or I/O - they turn a date into a short "Xm/h/d ago" label. The two differ only in their
 * null/zero handling, called out on each method. Merged into the app by dashboardMergeAppFragments.
 */
function dashboardAppFragment15(): DashboardAppFragment {
  return {
    // -- Helpers --
    /**
     * Format a past date as a coarse "just now / Xm / Xh / Xd ago" label for activity timestamps.
     * A null date returns "" (render nothing); negative/future deltas are not specially handled.
     */
    formatTimeAgo(date: string | Date | null): string {
      if (!date) return "";
      const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000,
      );
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    },

    /**
     * Format an audit's age like formatTimeAgo, but tuned for "freshness" copy. A null date reads
     * "just now" (treat a never-stamped audit as current, not blank), the elapsed time is clamped at
     * zero so clock skew never shows a negative age, and hours are shown up to 72h before switching
     * to days so a recent multi-day audit still reads in hours.
     */
    formatAuditAge(date: string | Date | null): string {
      if (!date) return "just now";
      const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(date).getTime()) / 1000),
      );
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 72) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    },
  };
}
