/**
 * Audit skill-reference pointer rule: it fails when a skill-reference pack exists but CLAUDE.md lacks the
 * required READ rule and Router Table pointer, when no skill-reference or skill-playbooks pack is present, or
 * when the skill-reference directory has no README.md; it passes when the pack and both pointers are present.
 */
import {
  PROJECT_ROOT,
  assert,
  createFS,
  describe,
  it,
  join,
  makeTempProject,
  readFileSync,
  runAudit,
  writeAuditSetupFixture,
} from "./helpers.js";

describe("audit skill-reference pointer rule", () => {
  it("fails when skill-reference exists but CLAUDE.md lacks the required routing", async () => {
    const project = await makeTempProject((root) =>
      writeAuditSetupFixture(root, {
        skillReferenceDir: true,
        instructionPointer: false,
      }),
    );
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const check = report.scopes.setup.checks.find(
        (entry) => entry.id === "instruction-file-skill-reference-pointer",
      );

      assert.equal(report.status, "fail");
      assert.equal(check?.status, "fail");
      assert.match(check?.failure?.message ?? "", /CLAUDE\.md/);
      assert.match(check?.failure?.message ?? "", /READ rule/);
      assert.match(check?.failure?.message ?? "", /Router Table pointer/);
      assert.match(check?.failure?.howToFix ?? "", /Before declaring any tool/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("audit skill-reference pointer rule", () => {
  it("fails when the project has no skill-reference or skill-playbooks pack", async () => {
    const project = await makeTempProject((root) =>
      writeAuditSetupFixture(root, {
        skillReferenceDir: false,
        instructionPointer: false,
      }),
    );
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const check = report.scopes.setup.checks.find(
        (entry) => entry.id === "instruction-file-skill-reference-pointer",
      );

      assert.equal(report.status, "fail");
      assert.equal(check?.status, "fail");
      assert.match(
        check?.failure?.message ?? "",
        /Shared reference\/playbook pack/,
      );
      assert.match(
        check?.failure?.message ?? "",
        /\.goat-flow\/skill-reference\/README\.md/,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("audit skill-reference pointer rule", () => {
  it("fails when the skill-reference directory exists without README.md", async () => {
    const project = await makeTempProject((root) =>
      writeAuditSetupFixture(root, {
        skillReferenceDir: true,
        skillReferenceReadme: false,
        instructionPointer: true,
      }),
    );
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const check = report.scopes.setup.checks.find(
        (entry) => entry.id === "instruction-file-skill-reference-pointer",
      );

      assert.equal(report.status, "fail");
      assert.equal(check?.status, "fail");
      assert.match(
        check?.failure?.message ?? "",
        /Shared reference\/playbook pack/,
      );
      assert.match(check?.failure?.message ?? "", /README\.md/);
      assert.equal(
        check?.failure?.evidence,
        ".goat-flow/skill-reference/README.md",
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("audit skill-reference pointer rule", () => {
  it("keeps setup snippets aligned with the audit remediation contract", () => {
    const executionLoop = readFileSync(
      join(PROJECT_ROOT, "workflow/setup/reference/execution-loop.md"),
      "utf-8",
    );
    const instructionStep = readFileSync(
      join(PROJECT_ROOT, "workflow/setup/02-instruction-file.md"),
      "utf-8",
    );

    for (const content of [executionLoop, instructionStep]) {
      assert.match(
        content,
        /Before declaring any tool or capability unavailable/,
      );
      assert.match(content, /\.goat-flow\/skill-playbooks\//);
      assert.match(content, /Availability Check/);
    }
    assert.match(
      instructionStep,
      /Tool playbooks \(README index for CLI\/MCP availability checks; examples: browser-use, page-capture, skill-quality-testing\)/,
    );
    assert.match(
      instructionStep,
      /\.goat-flow\/skill-playbooks\/` - read BEFORE declaring a tool unavailable/,
    );
  });
});

describe("audit skill-reference pointer rule", () => {
  it("passes when skill-reference exists and CLAUDE.md contains the READ rule and Router Table pointer", async () => {
    const project = await makeTempProject((root) =>
      writeAuditSetupFixture(root, {
        skillReferenceDir: true,
        instructionPointer: true,
      }),
    );
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const check = report.scopes.setup.checks.find(
        (entry) => entry.id === "instruction-file-skill-reference-pointer",
      );

      assert.equal(
        report.scopes.setup.status,
        "pass",
        `Expected pass but got: ${JSON.stringify(report.scopes)}`,
      );
      assert.equal(check?.status, "pass");
    } finally {
      await project.cleanup();
    }
  });
});
