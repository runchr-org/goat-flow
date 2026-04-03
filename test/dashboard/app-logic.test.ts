/**
 * Dashboard structural tests — verify the HTML contains
 * the correct Alpine.js bindings and UI elements.
 * No browser needed — just parse the HTML as text.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync(join(import.meta.dirname, '../../src/dashboard/index.html'), 'utf-8');

describe('Dashboard HTML structure', () => {
  it('has workspace view (not separate launcher/terminal)', () => {
    assert.ok(html.includes("activeView === 'workspace'"), 'Should have workspace view');
    assert.ok(!html.includes("activeView === 'launcher'"), 'Should NOT have separate launcher view');
    // Terminal view may exist as node-pty-missing message but not as primary view
  });

  it('has 2-way toggle (Scanner/Workspace)', () => {
    assert.ok(html.includes("activeView = 'scan'"), 'Should have Scanner tab');
    assert.ok(html.includes("activeView = 'workspace'"), 'Should have Workspace tab');
  });

  it('has split-pane layout with prompts left + terminal right', () => {
    assert.ok(html.includes('workspacePanel'), 'Should have workspacePanel state for mobile toggle');
    assert.ok(html.includes("workspacePanel = 'prompts'"), 'Should have prompts panel');
    assert.ok(html.includes("workspacePanel = 'terminal'"), 'Should have terminal panel');
  });

  it('has mobile sub-tab toggle', () => {
    assert.ok(html.includes('md:hidden') && html.includes('workspacePanel'), 'Should have mobile-only panel toggle');
  });

  it('has search input for presets', () => {
    assert.ok(html.includes('presetSearch'), 'Should have presetSearch state');
    assert.ok(html.includes('x-model="presetSearch"'), 'Should bind search input');
    assert.ok(html.includes('Search prompts'), 'Should have search placeholder');
  });

  it('has clear button for search', () => {
    assert.ok(html.includes('presetSearch = \'\'') || html.includes("presetSearch = ''"), 'Should have clear search button');
  });

  it('has expandable preset items', () => {
    assert.ok(html.includes('expanded: false'), 'Should have expandable state per item');
    assert.ok(html.includes('expanded = !expanded'), 'Should toggle on click');
  });

  it('has Copy + Launch + Send buttons on presets', () => {
    assert.ok(html.includes('copyPreset'), 'Should have Copy button');
    assert.ok(html.includes('launchPreset'), 'Should have Launch button');
    assert.ok(html.includes('sendToTerminal'), 'Should have Send button');
  });

  it('Launch shows when no session, Send shows when session active', () => {
    assert.ok(html.includes('!terminalSessionId || terminalEnded'), 'Launch visible when no session');
    assert.ok(html.includes('terminalSessionId && !terminalEnded') && html.includes('sendToTerminal'), 'Send visible when session active');
  });

  it('has sticky category filter pills', () => {
    assert.ok(html.includes('sticky'), 'Category filters should be sticky');
    assert.ok(html.includes('presetFilter'), 'Should have filter state');
  });

  it('has compact setup launcher at bottom of panel', () => {
    assert.ok(html.includes('Run Setup'), 'Should have setup launcher');
    assert.ok(html.includes('setupAgent'), 'Should have agent selector');
    assert.ok(html.includes('setupRunner'), 'Should have runner selector');
    assert.ok(html.includes('launchSetup'), 'Should have launch setup button');
  });

  it('has no-session placeholder in terminal panel', () => {
    assert.ok(html.includes('No active terminal session'), 'Should show placeholder when no session');
    assert.ok(html.includes('!terminalSessionId'), 'Placeholder visible when no session');
  });

  it('has node-pty missing explanation', () => {
    assert.ok(html.includes('Terminal not available'), 'Should explain when node-pty missing');
    assert.ok(html.includes('node-pty'), 'Should mention node-pty');
    assert.ok(html.includes('pnpm approve-builds'), 'Should suggest pnpm fix');
  });

  it('has End Session button (not Back to Launcher)', () => {
    assert.ok(html.includes('End Session'), 'Should say End Session');
    assert.ok(!html.includes('Back to Launcher'), 'Should NOT say Back to Launcher');
  });

  it('has New Session button on ended overlay', () => {
    assert.ok(html.includes('New Session'), 'Should say New Session');
    assert.ok(!html.includes('Return to Launcher'), 'Should NOT say Return to Launcher');
  });

  it('exitTerminal stays in current view', () => {
    // The exitTerminal function should NOT set activeView
    const exitMatch = html.match(/exitTerminal\(\)\s*\{[\s\S]*?\n\s{4}\}/);
    assert.ok(exitMatch, 'Should find exitTerminal function');
    assert.ok(!exitMatch[0].includes("activeView = 'launcher'"), 'Should NOT switch to launcher');
    assert.ok(!exitMatch[0].includes("activeView = 'scan'"), 'Should NOT switch to scan');
  });
});

describe('Dashboard app state', () => {
  it('has workspacePanel state', () => {
    assert.ok(html.includes("workspacePanel: 'prompts'"), 'Should initialize with prompts panel');
  });

  it('has presetSearch state', () => {
    assert.ok(html.includes("presetSearch: ''"), 'Should initialize empty search');
  });

  it('filteredPresets includes search filtering', () => {
    assert.ok(
      html.includes('presetSearch') && html.includes('filteredPresets'),
      'filteredPresets should reference presetSearch',
    );
    // Verify the search logic exists
    assert.ok(html.includes('.toLowerCase().includes(q)'), 'Should filter by lowercase match');
  });

  it('has sendToTerminal method', () => {
    assert.ok(html.includes('sendToTerminal(text)') || html.includes('sendToTerminal('), 'Should have sendToTerminal method');
    assert.ok(html.includes("type: 'input'"), 'Should send input type via WebSocket');
  });

  it('has projectName and projectColor computed', () => {
    assert.ok(html.includes('get projectName()'), 'Should have projectName getter');
    assert.ok(html.includes('get projectColor()'), 'Should have projectColor getter');
  });

  it('has clipboard paste handler (Ctrl+V)', () => {
    assert.ok(html.includes('attachCustomKeyEventHandler'), 'Should intercept keyboard events');
    assert.ok(html.includes("e.key === 'v'") || html.includes("key === 'v'"), 'Should handle Ctrl+V');
    assert.ok(html.includes('navigator.clipboard.readText'), 'Should read from clipboard API');
  });

  it('has clipboard copy handler (Ctrl+C with selection)', () => {
    assert.ok(html.includes('hasSelection'), 'Should check for text selection');
    assert.ok(html.includes('getSelection'), 'Should get selected text');
    assert.ok(html.includes('navigator.clipboard.writeText'), 'Should write to clipboard API');
  });

  it('has ResizeObserver for terminal', () => {
    assert.ok(html.includes('ResizeObserver'), 'Should use ResizeObserver');
    assert.ok(html.includes('ro.observe'), 'Should observe terminal container');
    assert.ok(html.includes('ro.disconnect'), 'Should disconnect on cleanup');
  });

  it('launchInTerminal switches to workspace + terminal panel', () => {
    assert.ok(html.includes("this.activeView = 'workspace'"), 'Should switch to workspace');
    assert.ok(html.includes("this.workspacePanel = 'terminal'"), 'Should switch to terminal panel on mobile');
  });

  it('Ctrl+Shift+D works in workspace view', () => {
    assert.ok(
      html.includes("activeView === 'workspace'") && html.includes("e.key === 'D'"),
      'Ctrl+Shift+D should check for workspace view',
    );
  });
});
