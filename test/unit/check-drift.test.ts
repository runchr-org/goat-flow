/**
 * Unit tests for M04 drift-detection helpers.
 *
 * skillContentsEquivalent is the semantic-equality primitive: parses YAML
 * frontmatter, strips null/undefined leaves, compares structurally; body is
 * normalized via trimEnd() + single trailing newline. These tests pin the
 * normalization so preflight false-positives (key reorder, trailing newline,
 * bare YAML key) stay suppressed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseMarkdownFrontmatter,
  skillContentsEquivalent,
} from "../../src/cli/audit/check-drift.js";

describe("parseMarkdownFrontmatter", () => {
  it("returns empty frontmatter + raw body when no frontmatter present", () => {
    const { frontmatter, body } = parseMarkdownFrontmatter("# Title\nbody\n");
    assert.deepEqual(frontmatter, {});
    assert.equal(body, "# Title\nbody\n");
  });

  it("parses frontmatter and separates body", () => {
    const raw = "---\nname: goat\ndescription: dispatcher\n---\n# Body\n";
    const { frontmatter, body } = parseMarkdownFrontmatter(raw);
    assert.deepEqual(frontmatter, { name: "goat", description: "dispatcher" });
    assert.equal(body, "# Body\n");
  });

  it("strips null/undefined leaves from parsed frontmatter (bare YAML key)", () => {
    const raw = "---\nname: goat\ndescription:\n---\nbody";
    const { frontmatter } = parseMarkdownFrontmatter(raw);
    // `description:` parses as null and must not appear in the structural form.
    assert.deepEqual(frontmatter, { name: "goat" });
  });

  it("parses CRLF frontmatter the same as LF", () => {
    const raw =
      "---\r\nname: goat\r\ndescription: dispatcher\r\n---\r\n# Body\r\n";
    const { frontmatter, body } = parseMarkdownFrontmatter(raw);
    assert.deepEqual(frontmatter, { name: "goat", description: "dispatcher" });
    assert.equal(body, "# Body\r\n");
  });

  it("malformed YAML does not throw; preserves raw for downstream diff", () => {
    const raw = "---\nname: goat\n  - broken: [unclosed\n---\n# Body\n";
    const { frontmatter, body } = parseMarkdownFrontmatter(raw);
    assert.deepEqual(frontmatter, {
      __parseError: "name: goat\n  - broken: [unclosed",
    });
    assert.equal(body, "# Body\n");
  });
});

describe("skillContentsEquivalent", () => {
  it("identical strings are equivalent", () => {
    const raw = "---\nname: x\n---\n# body\n";
    assert.equal(skillContentsEquivalent(raw, raw), true);
  });

  it("frontmatter key reorder is equivalent (no false positive)", () => {
    const a = "---\nname: x\ndescription: y\n---\n# body\n";
    const b = "---\ndescription: y\nname: x\n---\n# body\n";
    assert.equal(skillContentsEquivalent(a, b), true);
  });

  it("trailing-newline difference is equivalent (body normalized)", () => {
    const a = "---\nname: x\n---\n# body";
    const b = "---\nname: x\n---\n# body\n\n\n";
    assert.equal(skillContentsEquivalent(a, b), true);
  });

  it("body content difference is not equivalent", () => {
    const a = "---\nname: x\n---\n# body\n";
    const b = "---\nname: x\n---\n# different body\n";
    assert.equal(skillContentsEquivalent(a, b), false);
  });

  it("frontmatter value difference is not equivalent", () => {
    const a = "---\nname: x\n---\n# body\n";
    const b = "---\nname: y\n---\n# body\n";
    assert.equal(skillContentsEquivalent(a, b), false);
  });

  it("bare key (null) vs missing key is equivalent after null-strip", () => {
    const a = "---\nname: x\ndescription:\n---\n# body\n";
    const b = "---\nname: x\n---\n# body\n";
    assert.equal(skillContentsEquivalent(a, b), true);
  });

  it("missing frontmatter is not equivalent to present frontmatter", () => {
    const a = "---\nname: x\n---\n# body\n";
    const b = "# body\n";
    assert.equal(skillContentsEquivalent(a, b), false);
  });

  it("leading blank lines in body do not cause false positive", () => {
    const a = "---\nname: x\n---\n\n\n# body\n";
    const b = "---\nname: x\n---\n# body\n";
    assert.equal(skillContentsEquivalent(a, b), true);
  });
});
