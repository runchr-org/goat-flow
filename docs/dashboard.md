# Dashboard Reference

Launch: `goat-flow dashboard .` (or `goat-flow dashboard . --dev` for live reload)

## Views

### Home

Overview landing page. Shows "What to do next" action cards based on your latest audit results, per-agent status indicators, and quick-launch buttons for the setup wizard and terminal. When all agents pass audit, the action cards are replaced with a success banner.

### Audit

Audit results in a single scrollable page. Each scope (setup, project, integration) shows pass/fail status and can be expanded inline for details. Failures include actionable fix instructions. Run a new audit or re-audit after changes without leaving the page.

### Workspace

Split-pane layout. The left panel is a prompt library with category filters and search -- select a prompt to preview it or send it straight to the terminal. The right panel is a live terminal session (xterm.js over WebSocket) where you run agent commands. On mobile the panels collapse into a tab toggle.

### Rubrics

Reference list of every rubric check and anti-pattern the auditor evaluates. Filter by tier (Foundation, Standard) to see check IDs, point values, and descriptions. Useful for understanding exactly what the auditor checks and how to improve.

### Projects

Multi-project browser. Lists all registered project paths with their latest audit status. "Audit All" re-audits every project in one click. Select a project to switch context and view its results in the Audit view.

### Wizard

Guided setup flow. Detects your project stack and existing configuration, lets you pick a target agent (Claude, Codex, Gemini), then generates a setup prompt you can preview and launch directly in a terminal session.

### Critique

Generate and view agent critique prompts. Select a target agent, generate the critique, and preview the full prompt with embedded audit results.

### Settings

Project settings and configuration viewer.

### Help

Getting-started page for new users. Explains what goat-flow is, the audit/critique model, what skills and hooks do, the learning loop, and the execution loop. Accessible from the "?" button in the nav bar.

## Terminal

- Supports Claude, Codex, Gemini, Copilot runners
- WebSocket-based PTY sessions via xterm.js
- 60-minute idle timeout with auto-kill
- Maximum 3 concurrent sessions
- Session state: running / ended / error

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit` | GET | Run audit, return JSON results |
| `/api/setup` | GET | Generate setup prompt |
| `/api/critique` | GET | Generate critique prompt |
| `/api/setup/detect` | GET | Detect project stack and agents |
| `/api/health` | GET | Health check |
| `/api/rubrics` | GET | List all rubric checks and anti-patterns |
| `/api/agents/installed` | GET | Detect installed agent runtimes |
| `/api/projects/list` | GET | List registered projects |
| `/api/projects/status` | GET | Project state classification |
| `/api/terminal/create` | POST | Start a terminal session |
| `/api/terminal/list` | GET | List active terminal sessions |
| `/api/terminal/sessions` | GET | Session metadata |
| `/api/terminal/:id` | DELETE | End a terminal session |
