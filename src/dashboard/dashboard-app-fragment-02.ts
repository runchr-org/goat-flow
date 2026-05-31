function dashboardAppFragment04(): DashboardAppFragment {
  return {
    showCustomPromptEditor: false,

    editingCustomPromptId: null as string | null,

    customPromptDraft: dashboardDefaultCustomPromptDraft(),

    customPromptSurfaceDraft: "",

    customPromptSubmitAttempted: false,

    showPromptStartPicker: false,

    customPromptStartId: "",

    presetFilter: "all",

    presetSearch: "",

    presetFavorites: readStoredStringArray("goat-flow-preset-favorites"),

    /** Toggle a preset favorite state and persist the combined dashboard state. */
    toggleFavorite(id: string) {
      dashboardToggleFavorite(this, id);
    },

    /** Check whether a preset is marked as a favorite. */
    isFavorite(id: string): boolean {
      return dashboardIsFavorite(this, id);
    },

    /** Select a prompt row and show its preview, leaving custom edit mode. */
    selectPreset(preset: Preset) {
      this.selectedPreset = preset;
      this.showCustomPromptEditor = false;
      this.editingCustomPromptId = null;
      this.customPromptSubmitAttempted = false;
      this.showPromptStartPicker = false;
    },

    /** Move the preview selection up (-1) or down (1) in screen order, with wrap. */
    selectPresetByOffset(delta: number) {
      dashboardSelectPresetByOffset(this, delta);
      if (this.selectedPreset) {
        this.showCustomPromptEditor = false;
        this.editingCustomPromptId = null;
        this.customPromptSubmitAttempted = false;
        this.showPromptStartPicker = false;
      }
    },

    /** Return the preset category filters. */
    get presetCats(): PresetCategory[] {
      return dashboardPresetCats(this);
    },

    /** Compact prerequisite/fit badges for a preset row or detail view. */
    presetBadges(preset: Preset): PresetBadge[] {
      return dashboardPresetBadges(preset);
    },

    /** Route chip label for a prompt card or detail view. */
    presetRouteLabel(preset: Preset): string {
      return dashboardPresetRouteLabel(preset);
    },

    /** Left-edge category accent for a prompt card. */
    presetCategoryAccent(preset: Preset): string {
      return dashboardPresetCategoryAccent(preset);
    },

    /** Built-in presets plus local browser custom prompts. */
    get allPresets(): Preset[] {
      return dashboardAllPresets(this);
    },

    /**
     * Favorites stay pinned to the top unless the user explicitly switches into
     * the favorites-only filter, which keeps mixed browsing fast on large lists.
     */
    get filteredPresets(): Preset[] {
      return dashboardFilteredPresets(this);
    },

    /** Presets grouped by category for the Prompts page grouped rendering. */
    get presetsByCategory(): Array<{
      id: string;
      label: string;
      items: Preset[];
    }> {
      return dashboardPresetsByCategory(this);
    },

    /**
     * Unified sequence of entries for the Prompts page list: inserts category
     * headers before each group in grouped mode, falls back to flat rows
     * otherwise. Rendered with a single `template x-for` in prompts.html.
     */
    get renderedPresetEntries(): Array<
      | { kind: "header"; id: string; label: string }
      | { kind: "row"; preset: Preset }
    > {
      return dashboardRenderedPresetEntries(this);
    },

    /**
     * Flat list of preset IDs in screen order for keyboard nav. Uses grouped
     * order when the list is grouped (filter=all + no search); otherwise
     * falls back to filteredPresets order.
     */
    get flatPresetOrder(): string[] {
      return dashboardFlatPresetOrder(this);
    },

    /**
     * Escaped, optionally search-highlighted HTML for the prompt preview.
     * Escapes user-facing content before injecting <mark> tags so the preview
     * stays safe when rendered via x-html.
     */
    get highlightedPromptHtml(): string {
      return dashboardHighlightedPromptHtml(this);
    },

    /** Adapt a preset prompt to the syntax expected by the selected runner. */
    adaptPrompt(prompt: string, runner?: RunnerId): string {
      return dashboardAdaptPrompt(this, prompt, runner);
    },

    /** Copy a preset prompt after applying runner-specific syntax tweaks. */
    copyPreset(prompt: string) {
      dashboardCopyPreset(this, prompt);
    },

    /** Return custom prompt route options with descriptions. */
    customPromptRouteOptions(): CustomPromptRouteOption[] {
      return dashboardCustomPromptRouteOptions();
    },

    /** Return the selected custom prompt route metadata. */
    selectedCustomPromptRoute(): CustomPromptRouteOption {
      return dashboardSelectedCustomPromptRoute(this.customPromptDraft);
    },

    /** Return grouped custom prompt flag metadata. */
    customPromptFlagGroups(): CustomPromptFlagGroup[] {
      return dashboardCustomPromptFlagGroups();
    },

    /** Check whether a custom prompt flag should be disabled. */
    customPromptFlagDisabled(flag: CustomPromptFlagOption): boolean {
      return (
        flag.field === "globalSafe" &&
        this.customPromptDraft.requiresGoatFlowInstall
      );
    },

    /** Keep Global safe false when a prompt requires target goat-flow install. */
    syncCustomPromptFlag(flag: CustomPromptFlagOption) {
      if (
        flag.field === "requiresGoatFlowInstall" &&
        this.customPromptDraft.requiresGoatFlowInstall
      ) {
        this.customPromptDraft.globalSafe = false;
      }
    },

    /** Return validation errors for the current custom prompt draft. */
    customPromptErrors(): CustomPromptValidationError[] {
      return dashboardValidateCustomPromptDraftDetails(this);
    },
  };
}

function dashboardAppFragment05(): DashboardAppFragment {
  return {
    /** Return the first validation error for one draft field. */
    customPromptFieldError(field: string): string {
      return dashboardCustomPromptFieldError(this, field);
    },

    /** Return non-blocking prompt-body guidance. */
    customPromptWarning(): string {
      return dashboardCustomPromptPromptWarning(this);
    },

    /** Return the current target surface tags. */
    customPromptSurfaceTags(): string[] {
      return dashboardCustomPromptSurfaceTags(this);
    },

    /** Return available target surface suggestions. */
    customPromptSurfaceSuggestions(): string[] {
      return dashboardCustomPromptSurfaceSuggestions(this);
    },

    /** Add a target surface tag. */
    addCustomPromptSurface(surface: string) {
      dashboardAddCustomPromptSurface(this, surface);
    },

    /** Commit the typed target surface tag, if any. */
    commitCustomPromptSurfaceDraft() {
      dashboardAddCustomPromptSurface(
        this,
        this.customPromptSurfaceDraft ?? "",
      );
    },

    /** Remove a target surface tag. */
    removeCustomPromptSurface(surface: string) {
      dashboardRemoveCustomPromptSurface(this, surface);
    },

    /** Return a live preset-shaped preview for the custom prompt draft. */
    customPromptPreview(): Preset {
      return dashboardPreviewCustomPromptPreset(this);
    },

    /** Return preview name text, including an explicit placeholder. */
    customPromptPreviewName(): string {
      return this.customPromptDraft.name.trim() || "Untitled custom prompt";
    },

    /** Return preview description text, including an explicit placeholder. */
    customPromptPreviewDescription(): string {
      return this.customPromptDraft.desc.trim() || "No description yet";
    },

    /** Focus a custom prompt editor control after Alpine renders it. */
    focusCustomPromptField(id = "custom-prompt-name") {
      const self = this as typeof this & AlpineMagics<typeof this>;
      void self.$nextTick(() => {
        requestAnimationFrame(() => {
          const field = document.getElementById(id);
          if (field instanceof HTMLElement) field.focus();
        });
      });
    },

    /** Focus the first invalid custom prompt field. */
    focusFirstCustomPromptError() {
      const first = this.customPromptErrors()[0];
      this.focusCustomPromptField(first?.anchor ?? "custom-prompt-name");
    },

    /** Open a blank custom prompt editor. */
    openNewCustomPrompt() {
      dashboardOpenNewCustomPrompt(this);
      this.showPromptStartPicker = false;
      this.customPromptStartId = "";
      this.focusCustomPromptField();
    },

    /** Edit the currently selected custom prompt. */
    editSelectedCustomPrompt() {
      dashboardOpenEditCustomPrompt(this, this.selectedPreset);
      this.showPromptStartPicker = false;
      this.focusCustomPromptField();
    },

    /** Start a new custom prompt from the selected preset. */
    duplicateSelectedCustomPrompt() {
      dashboardDuplicateCustomPrompt(this, this.selectedPreset);
      this.showPromptStartPicker = false;
      this.customPromptStartId = "";
      this.focusCustomPromptField();
    },

    /** Start a new custom prompt from one selected existing prompt. */
    startCustomPromptFromPreset() {
      dashboardStartCustomPromptFromPresetId(this, this.customPromptStartId);
      this.showPromptStartPicker = false;
      this.customPromptStartId = "";
      this.focusCustomPromptField();
    },

    /** Save the custom prompt editor draft. */
    saveCustomPrompt(): CustomPrompt | null {
      this.customPromptSubmitAttempted = true;
      const saved = dashboardSaveCustomPrompt(this);
      if (!saved) this.focusFirstCustomPromptError();
      return saved;
    },

    /** Save the draft and immediately launch it with the active runner. */
    async saveAndRunCustomPrompt() {
      const saved = this.saveCustomPrompt();
      if (!saved) return;
      const preset = dashboardCustomPromptToPreset(saved);
      await this.launchPreset(preset.prompt, this.activeRunner, preset.name, {
        presetId: preset.id,
      });
    },

    /** Delete the selected custom prompt after confirmation. */
    deleteSelectedCustomPrompt() {
      dashboardDeleteSelectedCustomPrompt(this);
    },

    /** Cancel custom prompt editing without changing persisted prompts. */
    cancelCustomPromptEdit() {
      this.showCustomPromptEditor = false;
      this.editingCustomPromptId = null;
      this.customPromptSubmitAttempted = false;
      this.showPromptStartPicker = false;
    },

    /** Return quality-page prompt modes. */
    get qualityModes(): QualityModeOption[] {
      return dashboardQualityModes(this);
    },

    /** Return the selected quality mode option. */
    get selectedQualityModeMeta(): QualityModeOption | null {
      return dashboardSelectedQualityModeMeta(this);
    },

    /** Return the label to use for quality-mode terminal sessions. */
    qualityLaunchLabel(): string {
      return dashboardQualityLaunchLabel(this);
    },

    /** Return the selected setup target's instruction/config surfaces. */
    setupInstructionSurfaces(): string {
      return dashboardSetupInstructionSurfaces(this);
    },

    /** Send text to the active terminal session and focus it. */
    sendToTerminal(
      text: string,
      { adapt = true }: { adapt?: boolean } = {},
    ): boolean {
      return dashboardSendToTerminal(this, text, { adapt });
    },

    /** Send a preset prompt to an active session in the current project. */
    async sendToProjectTarget(prompt: string, target: ServerSessionInfo) {
      await dashboardSendToProjectTarget(this, prompt, target);
    },

    // --- Terminal image drag-drop ---
    handleTerminalDragEnter(event: DragEvent) {
      if (!this._dragHasImageFiles(event)) return;
      if (!this.activeSessionId || this.terminalEnded) return;
      this._terminalDragDepth = Number(this._terminalDragDepth) + 1;
      this.terminalDragActive = true;
    },
  };
}

function dashboardAppFragment06(): DashboardAppFragment {
  return {
    /** Keep image drops routed to the active terminal pane instead of the browser. */
    handleTerminalDragOver(event: DragEvent) {
      if (!this._dragHasImageFiles(event)) return;
      // Setting dropEffect on the dataTransfer is what lets browsers fire `drop`
      // on this pane instead of routing the file to the OS handler.
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    },

    /** Clear terminal drag state when the nested drag counter returns to zero. */
    handleTerminalDragLeave(_event: DragEvent) {
      this._terminalDragDepth = Math.max(0, this._terminalDragDepth - 1);
      if (this._terminalDragDepth === 0) this.terminalDragActive = false;
    },

    /** Upload dropped image files to the active terminal session. */
    async handleTerminalDrop(event: DragEvent) {
      this._terminalDragDepth = 0;
      this.terminalDragActive = false;
      if (!this.activeSessionId || this.terminalEnded) {
        this.showToast("No active terminal session for upload", true);
        return;
      }
      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) {
        this.showToast(
          "Only image files (.png, .jpg, .webp, .gif) can be dropped here",
          true,
        );
        return;
      }
      await this._uploadTerminalImages(files);
    },

    /** Detect image-file drags before showing the terminal drop target. */
    _dragHasImageFiles(event: DragEvent): boolean {
      const items = event.dataTransfer?.items;
      if (!items || items.length === 0) return false;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item?.kind === "file" && item.type.startsWith("image/"))
          return true;
      }
      return false;
    },

    /** Encode and send dropped images to the backend terminal upload route; reports upload errors as toasts. */
    async _uploadTerminalImages(files: File[]) {
      const sessionId = this.activeSessionId;
      if (!sessionId) return;
      this.terminalUploading = true;
      try {
        const encoded = await encodeTerminalUploadFiles(files);
        const res = await dashboardFetch(
          `/api/terminal/${encodeURIComponent(sessionId)}/upload-image`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: encoded }),
          },
        );
        const payload = readRecord(
          await res.json(),
          "Terminal upload response",
        );
        const error = readErrorMessage(payload);
        if (error) {
          this.showToast(error, true);
          return;
        }
        showTerminalUploadResult(
          this,
          sessionId,
          readTerminalUploadResult(payload),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.showToast(msg || "Terminal image upload failed", true);
      } finally {
        this.terminalUploading = false;
      }
    },
    // --- Init ---
    /** Register Alpine watchers and swallows lazy terminal warmup errors because init must keep mounting. */
    init() {
      dashboardInit(this as DashboardAlpineContext);
    },

    // -- Navigation --
    comingSoonMeta(view: string): { title: string; desc: string } | null {
      const meta: Record<string, { title: string; desc: string }> = {};
      return meta[view] ?? null;
    },

    /** Return whether a requested dashboard view is still routed to the coming-soon panel. */
    isComingSoonView(view?: string): boolean {
      return this.comingSoonMeta(view ?? this.activeView) !== null;
    },

    /** Toggle and persist the collapsed state of the dashboard side navigation. */
    toggleSideNav() {
      this.sideNavCollapsed = !this.sideNavCollapsed;
      localStorage.setItem(
        "gf-side-nav-collapsed",
        String(this.sideNavCollapsed),
      );
    },

    // -- API Calls --
    /** Load an audit snapshot; reports network/server errors as toasts because the dashboard must stay usable. */
    async runAudit(fresh = false) {
      this.auditing = true;
      this.toast = "";
      try {
        const freshParam = fresh ? "&fresh=true" : "";
        const res = await dashboardFetch(
          `/api/audit?path=${encodeURIComponent(this.projectPath)}&quality=true${freshParam}`,
        );
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const payload = readRecord(await res.json(), "Audit response");
        const error = readErrorMessage(payload);
        if (error) throw new Error(error);
        const cached = payload.cached === true;
        const cachedAt =
          typeof payload.cachedAt === "string" ? payload.cachedAt : null;
        this.report = readDashboardReport(payload);
        this.auditCached = cached;
        this.lastAuditTime = cachedAt ? new Date(cachedAt) : new Date();
        if (fresh) {
          this.setupOutputs = {};
          this._setupOutputProjectPath = this.projectPath;
          if (this.activeView === "setup") this.scheduleSetupPrompt();
        }
        if (this.activeView === "home") {
          void this.generateHomeQualitySummary();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.showToast(
          msg.includes("Failed to fetch")
            ? "Server not running. Start with: goat-flow dashboard ."
            : msg,
          true,
        );
      }
      this.auditing = false;
      if (!this.agentsLoaded) {
        void this.fetchInstalledAgents().then((loaded: boolean) => {
          if (!loaded) this.agentsLoaded = true;
        });
      }
    },
  };
}
