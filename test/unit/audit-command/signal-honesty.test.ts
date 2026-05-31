/**
 * Harness signal honesty: doc-path extraction keeps repo paths while ignoring npm scopes and home paths, the
 * doc-paths-resolve check rejects path-line references (even when the base file exists) and scans glossary paths
 * safely, and the execution-loop and feedback-loop checks reject out-of-section step words and invalid line refs.
 */
import {
  HARNESS_CHECKS,
  assert,
  computeHarness,
  describe,
  extractBacktickPaths,
  it,
  join,
  makeCtx,
  stubAgentFacts,
  stubFS,
} from "./helpers.js";

describe("harness signal honesty", () => {
  it("doc path extraction ignores npm scopes and home paths but keeps repo paths", () => {
    assert.deepEqual(
      extractBacktickPaths(
        "`@acme/theme` `@vendia/serverless-express` `~/.local/bin` `HL7/FHIR` `.goat-flow/code-map.md` `docs/missing.md` `README.md:1`",
      ),
      [".goat-flow/code-map.md", "docs/missing.md", "README.md:1"],
    );
  });
});

describe("harness signal honesty", () => {
  it("doc-paths-resolve rejects path-line references even when the base file exists", () => {
    const check = HARNESS_CHECKS.find((c) => c.id === "doc-paths-resolve")!;
    const result = check.run(
      makeCtx({
        fs: stubFS({
          readFile: (path) => {
            if (path === ".goat-flow/architecture.md")
              return "# Architecture\n";
            if (path === ".goat-flow/glossary.md") {
              return [
                "# Glossary",
                "",
                "| Term | Canonical File |",
                "|------|----------------|",
                "| Audit | `src/cli/audit/types.ts:6` |",
              ].join("\n");
            }
            return null;
          },
          exists: (path) => path === "src/cli/audit/types.ts",
        }),
      }),
    );

    assert.equal(result.status, "fail");
    assert.deepEqual(result.findings, [
      "All 0 architecture.md path references resolve",
      ".goat-flow/glossary.md: line-number path `src/cli/audit/types.ts:6` is brittle; use `src/cli/audit/types.ts` plus a semantic anchor",
    ]);
  });
});

describe("harness signal honesty", () => {
  it("doc-paths-resolve rejects root-level path-line references", () => {
    const check = HARNESS_CHECKS.find((c) => c.id === "doc-paths-resolve")!;
    const result = check.run(
      makeCtx({
        fs: stubFS({
          readFile: (path) => {
            if (path === ".goat-flow/architecture.md") {
              return "# Architecture\n\nSee `README.md:1`.\n";
            }
            if (path === ".goat-flow/glossary.md") return "# Glossary\n";
            if (path === "README.md") return "# Project\n";
            return null;
          },
          exists: (path) => path === "README.md",
        }),
      }),
    );

    assert.equal(result.status, "fail");
    assert.deepEqual(result.findings, [
      ".goat-flow/architecture.md: line-number path `README.md:1` is brittle; use `README.md` plus a semantic anchor",
    ]);
  });
});

describe("harness signal honesty", () => {
  it("doc-paths-resolve scans glossary paths without failing on external glossary tokens", () => {
    const check = HARNESS_CHECKS.find((c) => c.id === "doc-paths-resolve")!;
    const result = check.run(
      makeCtx({
        fs: stubFS({
          readFile: (path) => {
            if (path === ".goat-flow/architecture.md")
              return "# Architecture\n";
            if (path === ".goat-flow/glossary.md") {
              return [
                "# Glossary",
                "",
                "| Term | Canonical File |",
                "|------|----------------|",
                "| Theme package | `@acme/theme` |",
                "| FHIR shorthand | `HL7/FHIR` |",
                "| OAuth matcher | `src/Security/OAuthRequestMatcher.php` |",
                "| Missing owner | `missing/path.md` |",
              ].join("\n");
            }
            return null;
          },
          exists: (path) => path !== "missing/path.md",
        }),
      }),
    );

    assert.equal(result.status, "fail");
    assert.deepEqual(result.findings, [
      "All 0 architecture.md path references resolve",
      ".goat-flow/glossary.md: unresolved `missing/path.md`",
    ]);
  });
});

describe("harness signal honesty", () => {
  it("execution loop smoke check only accepts step words inside the section", () => {
    const instruction = [
      "# Agent",
      "",
      "READ SCOPE ACT VERIFY",
      "",
      "## Execution Loop",
      "",
      "This section exists but does not define the loop steps.",
    ].join("\n");
    const agent = stubAgentFacts();
    const ctx = makeCtx({
      agents: [
        {
          ...agent,
          instruction: {
            ...agent.instruction,
            content: instruction,
            lineCount: instruction.split(/\r?\n/u).length,
          },
        },
      ],
    });
    const { scope } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "execution-loop-present",
    );

    assert.equal(check?.status, "fail");
    assert.match(
      check?.failure?.message ?? "",
      /under the "Execution Loop" heading/,
    );
  });
});

describe("harness signal honesty", () => {
  it("feedback-loop harness fails on invalid line refs", () => {
    const facts = makeCtx().facts;
    const ctx = makeCtx({
      facts: {
        ...facts,
        shared: {
          ...facts.shared,
          footguns: {
            ...facts.shared.footguns,
            invalidLineRefs: ["src/auth.ts:999 (missing semantic anchor)"],
            buckets: [],
          },
        },
      },
    });
    const { concerns, scope } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "feedback-loop-active",
    );

    assert.equal(check?.status, "fail");
    assert.equal(concerns.feedback_loop.status, "fail");
    assert.match(check?.failure?.message ?? "", /invalid learning-loop/);
  });
});
