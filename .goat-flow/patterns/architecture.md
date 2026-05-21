---
category: architecture
last_reviewed: 2026-05-22
---

## Pattern: Use POSIX-shape paths for every user-visible string
**Context:** Anywhere a `path.*` result is embedded in CLI output, prompts, audit findings, JSON payloads, dashboard rendering, log messages, or shell snippets the user/agent will execute. Distinct from `fs` operations, which accept either separator.
**Approach:** Centralise the "host -> display" conversion at the emission boundary. Local helpers like `evidencePath`, `displayTemplatePath`, `relPosix`, `toBashPath`, `toShellProjectPath` all do `.replace(/\\/g, "/")` (and use `path.posix.join` when composing with a known POSIX sub-path, to avoid `resolve()` drive-prefixing POSIX inputs on Windows). The fs side keeps using native `join`/`resolve`/`relative`. A single repo grep for `\\\\` in test output assertions or for `path.relative` / `path.resolve` adjacent to a `lines.push(...)` flags candidate sites.

## Pattern: Model cross-platform PTY launches as pure spawn specs
**Context:** Terminal or runner integrations that must work on native Windows and POSIX shells.
**Approach:** Keep shell/args/env selection in a pure helper that accepts an explicit platform, keep Windows runner-path ranking in its own helper, test both branches directly with synthetic `win32` / `linux` / `darwin` inputs, then finish with one host-local real spawn repro for the current OS. This keeps Linux/macOS behavior pinned even when the live bug only shows up on Windows.

## Pattern: Summary surfaces should use cheap evidence and reserve full proofs for drill-ins
**Context:** Dashboard home cards, aggregate setup summaries, or any overview route that only needs to answer "is this mechanism installed?" rather than "does the full runtime proof pass right now?"
**Approach:** Split expensive validation by intent. Let summary surfaces use the cheapest evidence that still answers the summary question, such as file presence, cached facts, or a downgraded evidence level. Keep full runtime probes, self-tests, and live enforcement checks on explicit deep paths like per-agent audits, quality pages, or dedicated verification commands. Verify both paths separately: one route-scoped test that proves the summary path stays fast, and one deeper-path test that proves the runtime check still exists where it matters.

## Pattern: Tail-driven state for streaming TUI heuristics
**Context:** Any state machine that classifies streaming PTY / WebSocket / SSE output where the producer is a third-party TUI (coding agent, language REPL, build tool) whose chunk boundaries, redraw patterns, and decorative glyphs are not under your control. Symptom of the antipattern: every new producer version requires extending an allowlist (spinner glyph, status word, OSC title pattern), and the badge / status flickers on chunks that don't fit the enumeration.
**Approach:** Make the merged tail (last N chars of accumulated output) the source of truth for state, and reduce the per-chunk classifier to a *trigger* for re-evaluating that state — never a hard gate that can clear it. Concretely:

1. On every chunk: append to `outputTail`, slice to a bounded window (e.g. 5000 chars).
2. Compute the desired state by running the heuristic against the normalized visible *end* of the tail (e.g. last 1500 plain-text chars), not against the latest chunk alone.
3. If the chunk-level classifier returns "positive" (matched a known signal): use it as a fast-path to set the state immediately or schedule a reveal.
4. If the chunk-level classifier returns "negative": fall back to the tail check. Only act on the negative when the tail also no longer matches at its visible end. Unknown chunks (new spinner, unrecognized redraw, future runner glyph) become no-ops — they can't kill state as long as the prompt / signal is still visible.

Why this is structurally better than enumerating glyphs: the input space of "decorative TUI redraws" is unbounded by design. A tail-end heuristic depends only on the *content the producer drew*, not the *bytes the producer chose to redraw it with*. State naturally clears when the producer scrolls past the matched content. Evidence: `src/dashboard/dashboard-terminal.ts` (search: `AWAITING_INPUT_TAIL_VISIBLE_RANGE`) for the workspace waiting-status state machine — replaced three rounds of per-runner spinner-glyph fixes (`●`, `◦`, braille) with one tail-driven check that's immune to new glyphs. Pinned by `test/unit/dashboard-terminal-launch.test.ts` (search: `keeps the badge on across unknown chunks`), (search: `keeps the badge on across unknown chunks for ANSI-heavy prompt tails`), and (search: `clears the badge once runner output pushes the prompt`).
**Trade-off to watch:** The badge can stay sticky for a brief window after the user responds (until accumulated output pushes the prompt out of the visible tail). This is acceptable for a status indicator because stickiness > flicker for glance-readability, but document the trade-off so future maintainers don't reintroduce per-chunk hard-gating to "fix" the lag.
