/**
 * Contract tests: template paths never leak workflow/ references into installed content,
 * and manifest.json uses canonical .goat-flow/ paths.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { loadManifest } from "../../src/cli/manifest/manifest.js";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");

// ---------------------------------------------------------------------------
// manifest.json required paths use .goat-flow/ prefix
// ---------------------------------------------------------------------------
describe("manifest.json paths", () => {
  it("required files use .goat-flow/ prefix", () => {
    const structure = loadManifest();
    const files = structure.required_files;
    for (const file of files) {
      assert.ok(
        file.startsWith(".goat-flow/"),
        `Required file "${file}" should use .goat-flow/ prefix`,
      );
    }
  });

  it("required dirs use .goat-flow/ prefix", () => {
    const structure = loadManifest();
    const dirs = structure.required_dirs;
    for (const dir of dirs) {
      assert.ok(
        dir.startsWith(".goat-flow/"),
        `Required dir "${dir}" should use .goat-flow/ prefix`,
      );
    }
  });
});

/** Walk markdown template files with an empty-output fallback for optional directories. */
function walkMarkdown(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkMarkdown(full));
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

describe("skill templates path integrity", () => {
  it("workflow/skills/ markdown never embeds workflow/ paths in installed content", () => {
    const skillsDir = join(PROJECT_ROOT, "workflow", "skills");
    const files = walkMarkdown(skillsDir);
    assert.ok(
      files.length > 0,
      `Expected SKILL.md / reference .md files under ${skillsDir} but walk returned zero`,
    );

    const leaks: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      let inFrontmatter = false;
      for (const [i, line] of lines.entries()) {
        if (line.trim() === "---") {
          inFrontmatter = !inFrontmatter;
          continue;
        }
        if (inFrontmatter) continue;
        if (line.includes("<!--")) continue;
        if (/\bworkflow\//.test(line)) {
          const rel = relative(PROJECT_ROOT, file);
          leaks.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    assert.equal(
      leaks.length,
      0,
      `workflow/ paths found in installed skill content - these break in consumer projects:\n${leaks.join("\n")}`,
    );
  });
});
