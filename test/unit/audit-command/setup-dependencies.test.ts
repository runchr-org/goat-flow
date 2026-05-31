import {
  AUDIT_VERSION,
  SKILL_NAMES,
  assert,
  createFS,
  describe,
  it,
  makeTempProject,
  runAudit,
  writeProjectFile,
} from "./helpers.js";

describe("setup check dependency status", () => {
  it("aggregate audit ignores legacy config agents and checks all supported agents", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - claude\n  - codex\nskills:\n  install: all\n`,
      );
      await writeProjectFile(root, "CLAUDE.md", "# CLAUDE.md\n");
    });
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const instruction = report.scopes.agent.checks.find(
        (entry) => entry.id === "agent-instruction",
      );

      assert.equal(report.scopes.agent.status, "fail");
      assert.equal(instruction?.status, "fail");
      const message = instruction?.failure?.message ?? "";
      assert.match(message, /Supported agent instruction files missing/);
      assert.match(message, /codex \(AGENTS\.md\)/);
      assert.match(message, /antigravity \(AGENTS\.md\)/);
      assert.match(message, /copilot \(\.github\/copilot-instructions\.md\)/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("setup check dependency status", () => {
  it("aggregate audit names every missing supported agent in a partial install", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - claude\n  - codex\n  - antigravity\n  - copilot\nskills:\n  install: all\n`,
      );
      await writeProjectFile(root, "CLAUDE.md", "# CLAUDE.md\n");
    });
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const instruction = report.scopes.agent.checks.find(
        (entry) => entry.id === "agent-instruction",
      );
      const message = instruction?.failure?.message ?? "";

      assert.equal(instruction?.status, "fail");
      assert.match(message, /Supported agent instruction files missing/);
      assert.match(message, /codex \(AGENTS\.md\)/);
      assert.match(message, /antigravity \(AGENTS\.md\)/);
      assert.match(message, /copilot \(\.github\/copilot-instructions\.md\)/);
    } finally {
      await project.cleanup();
    }
  });
});

describe("setup check dependency status", () => {
  it("bare aggregate audit does not pass agent scope or claim skills are installed", async () => {
    const project = await makeTempProject(async () => {});
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const instruction = report.scopes.agent.checks.find(
        (entry) => entry.id === "agent-instruction",
      );

      assert.equal(report.status, "fail");
      assert.equal(report.scopes.agent.status, "fail");
      assert.equal(instruction?.status, "fail");
      assert.match(
        instruction?.failure?.message ?? "",
        /Supported agent instruction files missing/,
      );
      assert.match(
        report.scopes.agent.summary.agentSpecificEvidence ?? "",
        /agent-specific check\(s\) skipped in aggregate mode/,
      );
      assert.equal(
        report.scopes.setup.summary.skills,
        `0/${SKILL_NAMES.length} installed`,
      );
    } finally {
      await project.cleanup();
    }
  });
});

describe("setup check dependency status", () => {
  it("fails dependent per-agent checks when the primary instruction file is missing", async () => {
    const project = await makeTempProject(async (root) => {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        `version: "${AUDIT_VERSION}"\nagents:\n  - antigravity\n`,
      );
    });
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: "antigravity",
        harness: false,
      });
      const statuses = Object.fromEntries(
        report.scopes.agent.checks.map((entry) => [entry.id, entry.status]),
      );

      assert.equal(statuses["agent-instruction"], "fail");
      assert.equal(statuses["agent-skills"], "fail");
      assert.equal(statuses["agent-settings"], "fail");
      assert.equal(statuses["agent-guardrails"], "fail");
    } finally {
      await project.cleanup();
    }
  });
});

describe("setup check dependency status", () => {
  it("skips config-version when config.yaml is missing", async () => {
    const project = await makeTempProject(async () => {});
    try {
      const report = runAudit(createFS(project.root), project.root, {
        agentFilter: null,
        harness: false,
      });
      const check = report.scopes.setup.checks.find(
        (entry) => entry.id === "config-version",
      );

      assert.equal(check?.status, "skipped");
    } finally {
      await project.cleanup();
    }
  });
});
