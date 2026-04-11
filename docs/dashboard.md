# Dashboard Reference

Launch: `goat-flow dashboard` (or `goat-flow dashboard --dev` for live reload)

## Views

### Home

Overview landing page. Shows "What to do next" action cards based on your latest scan results, per-agent score bars broken down by tier, and quick-launch buttons for the setup wizard and terminal. When all agents score an A, the action cards are replaced with a success banner.

### Scanner

Scan results in a single scrollable page. Each rubric check shows pass/fail with a severity badge and can be expanded inline for details. Recommendations are clickable and link directly to setup guidance. Run a new scan or re-scan after changes without leaving the page.

### Workspace

Split-pane layout. The left panel is a prompt library with category filters and search -- select a prompt to preview it or send it straight to the terminal. The right panel is a live terminal session (xterm.js over WebSocket) where you run agent commands. On mobile the panels collapse into a tab toggle.

### Rubrics

Reference list of every rubric check and anti-pattern the scanner evaluates. Filter by tier (Foundation, Standard) to see check IDs, point values, and descriptions. Useful for understanding exactly what the scanner scores and how to improve.

### Projects

Multi-project browser. Lists all registered project paths with their latest scan grade and score. "Scan All" re-scans every project in one click. Select a project to switch context and view its results in the Scanner view.

### Wizard

Guided setup flow. Detects your project stack and existing configuration, lets you pick a target agent (Claude, Codex, Gemini), then generates a setup prompt you can preview and launch directly in a terminal session.

## Help

Getting-started page for new users. Explains what goat-flow is, how scoring works, what skills and hooks do, the learning loop, and the execution loop. Accessible from the "?" button in the nav bar.

## Terminal

- Supports Claude, Codex, Gemini, Copilot runners
- WebSocket-based PTY sessions via xterm.js
- 60-minute idle timeout with auto-kill
- Maximum 3 concurrent sessions
- Session state: running / ended / error

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Run scan, return JSON results |
| `/api/setup` | POST | Generate setup prompt |
| `/api/terminal/create` | POST | Start a terminal session |
| `/api/terminal/kill` | POST | End a terminal session |
