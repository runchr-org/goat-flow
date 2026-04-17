/**
 * Unit tests for M05 factual-claim extraction.
 *
 * Counts asserted against runtime-imported constants to avoid hard-coding
 * values that change when skills or checks are added. Path resolution uses
 * a stub ReadonlyFS so tests stay hermetic.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scanCountClaims,
  scanPathReferences,
} from "../../src/cli/audit/check-factual-claims.js";
import { SKILL_NAMES } from "../../src/cli/constants.js";
import { SETUP_CHECKS } from "../../src/cli/audit/check-goat-flow.js";
import { AGENT_CHECKS } from "../../src/cli/audit/check-agent-setup.js";
import { HARNESS_CHECKS } from "../../src/cli/audit/harness/index.js";
import type { AuditContext } from "../../src/cli/audit/types.js";
import type { ReadonlyFS } from "../../src/cli/types.js";

function stubFS(existsSet: Set<string>): ReadonlyFS {
  return {
    exists: (p: string) => existsSet.has(p),
    readFile: () => null,
    lineCount: () => 0,
    readJson: () => null,
    listDir: () => [],
    isExecutable: () => false,
    glob: () => [],
  };
}

function stubCtx(fs: ReadonlyFS): AuditContext {
  return { fs } as unknown as AuditContext;
}

describe("scanCountClaims: skill count", () => {
  it("flags a wrong skill count as WARNING", () => {
    const actual = SKILL_NAMES.length;
    const wrong = actual + 2;
    const findings = scanCountClaims(
      "README.md",
      `We ship ${wrong} skills as of today.`,
    );
    const drift = findings.find((f) => f.rule === "skill-count-drift");
    assert.ok(drift, "expected skill-count drift");
    assert.equal(drift!.severity, "warning");
    assert.match(drift!.message, new RegExp(`${wrong} skills`));
    assert.match(drift!.message, new RegExp(`${actual}`));
  });

  it("does not flag the correct skill count", () => {
    const findings = scanCountClaims(
      "README.md",
      `We ship ${SKILL_NAMES.length} skills.`,
    );
    assert.equal(findings.length, 0);
  });
});

describe("scanCountClaims: harness and agent counts", () => {
  it("flags wrong harness check count", () => {
    const wrong = HARNESS_CHECKS.length + 5;
    const findings = scanCountClaims(
      "docs/x.md",
      `The ${wrong} checks across 5 concerns are deterministic.`,
    );
    assert.ok(findings.some((f) => f.rule === "harness-check-count-drift"));
  });

  it("flags wrong agent-per-check count", () => {
    const wrong = AGENT_CHECKS.length + 3;
    const findings = scanCountClaims(
      "docs/x.md",
      `${wrong} checks per configured agent.`,
    );
    assert.ok(findings.some((f) => f.rule === "agent-check-count-drift"));
  });

  it("flags wrong setup check count", () => {
    const wrong = SETUP_CHECKS.length + 1;
    const findings = scanCountClaims(
      "docs/x.md",
      `${wrong} checks on goat-flow-owned surfaces.`,
    );
    assert.ok(findings.some((f) => f.rule === "setup-check-count-drift"));
  });
});

describe("scanCountClaims: code-block guard", () => {
  it("does not flag counts inside a code block", () => {
    const text = [
      "```",
      `${SKILL_NAMES.length + 10} skills`,
      "```",
      "",
      `Actual: ${SKILL_NAMES.length} skills.`,
    ].join("\n");
    const findings = scanCountClaims("x.md", text);
    assert.equal(findings.length, 0);
  });
});

describe("scanPathReferences", () => {
  it("flags a missing path as INFO", () => {
    const fs = stubFS(new Set());
    const findings = scanPathReferences(
      "architecture.md",
      "See `src/does/not/exist.ts` for details.",
      stubCtx(fs),
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0]!.severity, "info");
    assert.equal(findings[0]!.rule, "path-ref-unresolved");
  });

  it("does not flag a resolvable path", () => {
    const fs = stubFS(new Set(["src/cli/cli.ts"]));
    const findings = scanPathReferences(
      "architecture.md",
      "Entry is `src/cli/cli.ts`.",
      stubCtx(fs),
    );
    assert.equal(findings.length, 0);
  });

  it("skips glob patterns", () => {
    const fs = stubFS(new Set());
    const findings = scanPathReferences(
      "architecture.md",
      "Steps at `workflow/setup/0*.md`.",
      stubCtx(fs),
    );
    assert.equal(findings.length, 0);
  });

  it("does not flag paths inside code blocks", () => {
    const fs = stubFS(new Set());
    const text = [
      "```",
      "`src/ghost.ts`",
      "```",
      "Real mention: `src/real.ts`",
    ].join("\n");
    const findings = scanPathReferences("architecture.md", text, stubCtx(fs));
    assert.equal(
      findings.length,
      1,
      "only outside-block path should be flagged",
    );
  });

  it("trims trailing punctuation from path candidates", () => {
    const fs = stubFS(new Set(["src/cli/cli.ts"]));
    const findings = scanPathReferences(
      "architecture.md",
      "See `src/cli/cli.ts`, and so on.",
      stubCtx(fs),
    );
    assert.equal(findings.length, 0);
  });
});
