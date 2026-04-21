/**
 * Prompt-library helpers for the dashboard Alpine app.
 * These keep filtering, grouping, and prompt text transforms out of app.ts.
 */

type PresetCategory = { id: string; label: string };
type RenderedPresetEntry =
  | { kind: "header"; id: string; label: string }
  | { kind: "row"; preset: Preset };

interface DashboardPromptsContext {
  presets: Preset[];
  presetFilter: string;
  presetSearch: string;
  presetFavorites: string[];
  selectedPreset: Preset | null;
  activeRunner: RunnerId;
  flatPresetOrder: string[];
  presetsByCategory: Array<{ id: string; label: string; items: Preset[] }>;
  filteredPresets: Preset[];
  adaptPrompt(prompt: string, runner?: RunnerId): string;
  copyText(text: string): void;
  _saveDashboardState(): void;
}

/** Toggle a preset favorite state and persist the combined dashboard state. */
function dashboardToggleFavorite(
  ctx: DashboardPromptsContext,
  id: string,
): void {
  const idx = ctx.presetFavorites.indexOf(id);
  if (idx === -1) ctx.presetFavorites.push(id);
  else ctx.presetFavorites.splice(idx, 1);
  ctx._saveDashboardState();
}

/** Check whether a preset is marked as a favorite. */
function dashboardIsFavorite(
  ctx: DashboardPromptsContext,
  id: string,
): boolean {
  return ctx.presetFavorites.includes(id);
}

/** Move the preview selection up (-1) or down (1) in screen order, with wrap. */
function dashboardSelectPresetByOffset(
  ctx: DashboardPromptsContext,
  delta: number,
): void {
  const order = ctx.flatPresetOrder;
  if (order.length === 0) return;
  const currentId = ctx.selectedPreset?.id;
  const currentIdx = currentId ? order.indexOf(currentId) : -1;
  const nextIdx =
    currentIdx === -1
      ? delta > 0
        ? 0
        : order.length - 1
      : (currentIdx + delta + order.length) % order.length;
  const nextId = order[nextIdx];
  const next = ctx.presets.find((p) => p.id === nextId);
  if (!next) return;
  ctx.selectedPreset = next;
  requestAnimationFrame(() => {
    const el = document.getElementById(`preset-row-${nextId}`);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
}

/** Return the preset category filters. */
function dashboardPresetCats(ctx: DashboardPromptsContext): PresetCategory[] {
  const cats = new Map<string, string>();
  const labelOverrides: Record<string, string> = { qa: "QA" };
  for (const p of ctx.presets) {
    if (!cats.has(p.cat)) {
      cats.set(
        p.cat,
        labelOverrides[p.cat] ?? p.cat.charAt(0).toUpperCase() + p.cat.slice(1),
      );
    }
  }
  return [
    { id: "all", label: "All" },
    { id: "favorites", label: "\u2605 Favorites" },
    ...Array.from(cats, ([id, label]) => ({ id, label })),
  ];
}

/**
 * Favorites stay pinned to the top unless the user explicitly switches into
 * the favorites-only filter, which keeps mixed browsing fast on large lists.
 */
function dashboardFilteredPresets(ctx: DashboardPromptsContext): Preset[] {
  let list: Preset[];
  if (ctx.presetFilter === "favorites") {
    list = ctx.presets.filter((p) => ctx.presetFavorites.includes(p.id));
  } else {
    list =
      ctx.presetFilter === "all"
        ? ctx.presets
        : ctx.presets.filter((p) => p.cat === ctx.presetFilter);
  }
  if (ctx.presetSearch.trim()) {
    const q = ctx.presetSearch.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q),
    );
  } else if (ctx.presetFilter !== "favorites") {
    const favSet = new Set(ctx.presetFavorites);
    list = [
      ...list.filter((p) => favSet.has(p.id)),
      ...list.filter((p) => !favSet.has(p.id)),
    ];
  }
  return list;
}

/** Presets grouped by category for the Prompts page grouped rendering. */
function dashboardPresetsByCategory(
  ctx: DashboardPromptsContext,
): Array<{ id: string; label: string; items: Preset[] }> {
  const cats = dashboardPresetCats(ctx).filter(
    (c) => c.id !== "all" && c.id !== "favorites",
  );
  return cats.map((cat) => ({
    id: cat.id,
    label: cat.label,
    items: ctx.presets.filter((p) => p.cat === cat.id),
  }));
}

/** Build the unified list rows for the Prompts page. */
function dashboardRenderedPresetEntries(
  ctx: DashboardPromptsContext,
): RenderedPresetEntry[] {
  const entries: RenderedPresetEntry[] = [];
  if (ctx.presetFilter === "all" && !ctx.presetSearch.trim()) {
    for (const group of ctx.presetsByCategory) {
      if (group.items.length === 0) continue;
      entries.push({
        kind: "header",
        id: group.id,
        label: `${group.label} (${group.items.length})`,
      });
      for (const p of group.items) entries.push({ kind: "row", preset: p });
    }
    return entries;
  }
  for (const p of ctx.filteredPresets) entries.push({ kind: "row", preset: p });
  return entries;
}

/** Return preset IDs in screen order for keyboard navigation. */
function dashboardFlatPresetOrder(ctx: DashboardPromptsContext): string[] {
  if (ctx.presetFilter === "all" && !ctx.presetSearch.trim()) {
    const ids: string[] = [];
    for (const group of ctx.presetsByCategory) {
      for (const p of group.items) ids.push(p.id);
    }
    return ids;
  }
  return ctx.filteredPresets.map((p) => p.id);
}

/** Return escaped, optionally search-highlighted HTML for the prompt preview. */
function dashboardHighlightedPromptHtml(ctx: DashboardPromptsContext): string {
  const prompt = ctx.adaptPrompt(ctx.selectedPreset?.prompt ?? "");
  const escaped = prompt
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const query = ctx.presetSearch.trim();
  if (!query) return escaped;
  const qEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(qEscaped, "gi");
  return escaped.replace(re, "<mark>$&</mark>");
}

/** Adapt a preset prompt to the syntax expected by the selected runner. */
function dashboardAdaptPrompt(
  ctx: DashboardPromptsContext,
  prompt: string,
  runner?: RunnerId,
): string {
  const r = runner ?? ctx.activeRunner;
  if (r === "codex") return prompt.replace(/^\/goat\b/, "$goat");
  return prompt;
}

/** Copy a preset prompt after applying runner-specific syntax tweaks. */
function dashboardCopyPreset(
  ctx: DashboardPromptsContext,
  prompt: string,
): void {
  ctx.copyText(ctx.adaptPrompt(prompt));
}
