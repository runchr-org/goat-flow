/**
 * Unit tests for packed README link validation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPackageLocalReadmeLinks,
  parsePackFileList,
  validatePackageReadmeLinks,
} from "../../scripts/check-package-readme-links.mjs";

describe("package README link validation", () => {
  it("extracts relative Markdown links and ignores external or anchor links", () => {
    assert.deepEqual(
      extractPackageLocalReadmeLinks(
        [
          "[CLI](docs/cli.md)",
          "![Preview](docs/assets/dashboard-preview.png)",
          "[External](https://example.invalid/docs/cli.md)",
          "[Anchor](#usage)",
        ].join("\n"),
      ),
      ["docs/assets/dashboard-preview.png", "docs/cli.md"],
    );
  });

  it("fails links that exist in the repo but are absent from npm pack output", () => {
    const result = validatePackageReadmeLinks(
      "[CLI](docs/cli.md)\n[Dashboard](docs/dashboard.md)\n",
      ["README.md", "docs/cli.md"],
    );

    assert.deepEqual(result.links, ["docs/cli.md", "docs/dashboard.md"]);
    assert.deepEqual(result.missing, ["docs/dashboard.md"]);
  });

  it("parses npm pack dry-run JSON paths", () => {
    assert.deepEqual(
      parsePackFileList(
        JSON.stringify([
          {
            files: [
              { path: "README.md" },
              { path: "docs/cli.md" },
              { path: "docs/assets/dashboard-preview.png" },
            ],
          },
        ]),
      ),
      ["README.md", "docs/assets/dashboard-preview.png", "docs/cli.md"],
    );
  });
});
