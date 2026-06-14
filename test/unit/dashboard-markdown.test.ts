/**
 * Unit tests for browser-side markdown rendering, YAML stripping, and fallback behavior.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, it } from "node:test";

import { load } from "js-yaml";
import MarkdownIt from "markdown-it";

/** Rendered markdown plus optional frontmatter returned by the browser helper. */
interface RenderMarkdownResult {
  html: string;
  frontmatter: Record<string, unknown> | null;
}

type RenderMarkdown = (
  text: string,
  opts?: { frontmatter?: "strip" | "passthrough"; breaks?: boolean },
) => RenderMarkdownResult;

/** Mocked browser global shape used to load a fresh markdown renderer instance. */
interface MarkdownTestWindow {
  markdownit: typeof MarkdownIt;
  jsyaml: { load: typeof load };
  renderMarkdown?: RenderMarkdown;
}

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
let importCounter = 0;

/** Load a fresh renderer instance into a mocked browser global. */
async function loadRenderer(): Promise<RenderMarkdown> {
  const testWindow: MarkdownTestWindow = {
    markdownit: MarkdownIt,
    jsyaml: { load },
  };
  Reflect.set(globalThis, "window", testWindow);
  await import(`../../src/dashboard/markdown.ts?case=${importCounter++}`);
  assert.equal(typeof testWindow.renderMarkdown, "function");
  return testWindow.renderMarkdown;
}

function plainInputBytes(bytes: number): string {
  const chunk = "plain dashboard markdown ";
  return chunk.repeat(Math.ceil(bytes / chunk.length)).slice(0, bytes);
}

function timedRender(
  renderMarkdown: RenderMarkdown,
  input: string,
): { durationMs: number; result: RenderMarkdownResult } {
  const start = performance.now();
  const result = renderMarkdown(input);
  return { durationMs: performance.now() - start, result };
}

describe("dashboard markdown renderer", () => {
  it("parses nested YAML frontmatter and strips it by default", async () => {
    const renderMarkdown = await loadRenderer();
    const result = renderMarkdown(`---
title: Renderer
tags:
  - dashboard
  - markdown
published: true
---
# Body
`);

    assert.deepEqual(result.frontmatter, {
      title: "Renderer",
      tags: ["dashboard", "markdown"],
      published: true,
    });
    assert.match(result.html, /<h1>Body<\/h1>/);
    assert.doesNotMatch(result.html, /title: Renderer/);
  });

  it("preserves leading delimiter blocks that are not YAML metadata", async () => {
    const renderMarkdown = await loadRenderer();
    const result = renderMarkdown(`---
Visible markdown
---
# Body
`);

    assert.equal(result.frontmatter, null);
    assert.match(result.html, /Visible markdown/);
    assert.match(result.html, /<h1>Body<\/h1>/);
  });

  it("escapes raw HTML and does not render javascript links", async () => {
    const renderMarkdown = await loadRenderer();
    const result = renderMarkdown(
      `[bad](javascript:alert(1)) <script>alert(1)</script>`,
    );

    assert.doesNotMatch(result.html, /<script/i);
    assert.doesNotMatch(result.html, /href="javascript:/i);
    assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });

  it("renders GFM tables with table structure", async () => {
    const renderMarkdown = await loadRenderer();
    const result = renderMarkdown("| A | B |\n|---|---|\n| 1 | 2 |\n");

    assert.match(result.html, /<table>/);
    assert.match(result.html, /<th>A<\/th>/);
    assert.match(result.html, /<td>2<\/td>/);
  });

  it("preserves fenced code indentation and language hints", async () => {
    const renderMarkdown = await loadRenderer();
    const result = renderMarkdown("```ts\n  const x = 1;\n```\n");

    assert.match(result.html, /<code class="language-ts">/);
    assert.match(result.html, /  const x = 1;/);
  });

  it("renders a 500KB plain input under the performance sanity budget", async () => {
    const renderMarkdown = await loadRenderer();
    renderMarkdown(plainInputBytes(16 * 1024));

    const baseline = timedRender(renderMarkdown, plainInputBytes(100 * 1024));
    const input = plainInputBytes(500 * 1024);
    const { durationMs, result } = timedRender(renderMarkdown, input);
    const budgetMs = Math.max(2_000, baseline.durationMs * 12);

    assert.ok(result.html.length > input.length);
    assert.ok(
      durationMs < budgetMs,
      `expected 500KB render <${budgetMs.toFixed(1)}ms after 100KB baseline ${baseline.durationMs.toFixed(1)}ms, got ${durationMs.toFixed(1)}ms`,
    );
  });

  it("renders a real dashboard footgun file without exposing frontmatter", async () => {
    const renderMarkdown = await loadRenderer();
    const raw = readFileSync(
      resolve(
        PROJECT_ROOT,
        ".goat-flow",
        "learning-loop",
        "footguns",
        "dashboard.md",
      ),
      "utf-8",
    );
    const result = renderMarkdown(raw);

    assert.equal(result.frontmatter?.category, "dashboard");
    assert.match(result.html, /<h2>/);
    assert.doesNotMatch(result.html, /last_reviewed:/);
  });
});
