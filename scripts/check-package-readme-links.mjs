#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

/** Return true when a Markdown href does not need a packed-file check. */
function isIgnoredHref(href) {
  return (
    href.length === 0 ||
    href.startsWith("#") ||
    href.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(href)
  );
}

/** Strip fragment/query/title syntax down to a package-relative path. */
function normalizeMarkdownHref(rawHref) {
  const trimmed = rawHref.trim();
  const href = trimmed.startsWith("<")
    ? trimmed.replace(/^<|>$/g, "")
    : (trimmed.match(/^\S+/)?.[0] ?? "");
  if (isIgnoredHref(href)) return null;

  const withoutFragment = href.split("#", 1)[0] ?? "";
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? "";
  if (withoutQuery.length === 0) return null;

  const normalized = posix.normalize(withoutQuery).replace(/^\.\//, "");
  if (normalized === "." || normalized.startsWith("../")) return null;
  return normalized;
}

/** Extract package-local Markdown link/image targets from README content. */
export function extractPackageLocalReadmeLinks(readmeText) {
  const links = [];
  const inlineLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

  for (const match of readmeText.matchAll(inlineLinkPattern)) {
    const rawHref = match[1];
    if (rawHref === undefined) continue;
    const target = normalizeMarkdownHref(rawHref);
    if (target !== null) links.push(target);
  }

  return [...new Set(links)].sort();
}

/** Validate README package-local links against npm pack output paths. */
export function validatePackageReadmeLinks(readmeText, packedPaths) {
  const packed = new Set(packedPaths);
  const links = extractPackageLocalReadmeLinks(readmeText);
  const missing = links.filter((target) => !packed.has(target));
  return { links, missing };
}

/** Parse the `npm pack --dry-run --json` payload into package paths. */
export function parsePackFileList(packJson) {
  const parsed = JSON.parse(packJson);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first || !Array.isArray(first.files)) {
    throw new Error("npm pack JSON did not include a files array");
  }
  return first.files
    .map((entry) => entry?.path)
    .filter((path) => typeof path === "string")
    .sort();
}

/** Run npm pack and return the dry-run package paths. */
function readPackFileList() {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      encoding: "utf-8",
      env: {
        ...process.env,
        npm_config_cache:
          process.env.npm_config_cache ?? "/tmp/goat-flow-npm-cache",
      },
    },
  );
  return parsePackFileList(output);
}

/** CLI entry point. */
function main() {
  const packedPaths = readPackFileList();
  const readmeText = readFileSync("README.md", "utf-8");
  const result = validatePackageReadmeLinks(readmeText, packedPaths);
  if (result.missing.length > 0) {
    console.error("Package README link check: FAIL");
    for (const target of result.missing) {
      console.error(`  - README.md references unpacked package path: ${target}`);
    }
    process.exit(1);
  }
  console.log(
    `Package README link check: PASS (${result.links.length} relative links checked against ${packedPaths.length} packed files)`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
