import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanReport } from '../types.js';

/**
 * Render a self-contained HTML dashboard with scan data embedded.
 * Uses CDN links for Alpine.js and Tailwind CSS (requires network).
 */
export function renderHtml(report: ScanReport): string {
  const html = loadFile('dashboard/index.html');
  const jsonData = JSON.stringify(report);

  // Inject report data
  // Escape </script> in JSON to prevent breaking out of the script context
  const safeJson = jsonData.replace(/<\//g, '<\\/');
  const injection = `<script>window.__GOAT_FLOW_REPORT__ = ${safeJson};</script>`;
  return html.replace('</body>', `${injection}\n</body>`);
}

/** Load a file from the package root by walking up from dist/cli/render/ */
function loadFile(name: string): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    try { return readFileSync(join(dir, name), 'utf-8'); } catch { /* up */ }
    dir = dirname(dir);
  }
  throw new Error(`${name} not found. Reinstall goat-flow.`);
}
