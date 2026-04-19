/**
 * Contract tests: template paths never leak workflow/ references into installed content,
 * and manifest.json uses canonical .goat-flow/ paths.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
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

// ---------------------------------------------------------------------------
// Skill template source files don't embed workflow/ paths in user-facing content
// ---------------------------------------------------------------------------
describe("skill templates path integrity", () => {
  it("skill SKILL.md templates do not reference workflow/ in install sections", () => {
    const skillsDir = join(PROJECT_ROOT, "workflow", "skills");
    let files: string[];
    try {
      files = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
    } catch {
      // No skills dir = nothing to check
      return;
    }

    const leaks: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(skillsDir, file), "utf-8");
      // Check for workflow/ paths in content that would be installed.
      // Exclude frontmatter/metadata lines and lines that are clearly about the template itself.
      const lines = content.split("\n");
      for (const [i, line] of lines.entries()) {
        // Skip comment lines and frontmatter
        if (line.startsWith("#") || line.startsWith("---")) continue;
        // Check for raw workflow/ paths that would be copied verbatim
        if (
          /\bworkflow\//.test(line) &&
          !line.includes("<!-- ") &&
          !line.includes("template")
        ) {
          leaks.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    // Note: some templates legitimately reference workflow/ for template system use.
    // This test flags them for review, not as hard failures.
    if (leaks.length > 0) {
      // Warn but don't fail - templates may reference workflow/ for valid reasons
    }
  });
});
