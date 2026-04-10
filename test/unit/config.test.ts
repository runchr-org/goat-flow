/**
 * Regression coverage for config parsing and validation.
 * These tests lock down defaults, error reporting, and normalization of `.goat-flow/config.yaml`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockFS } from "../helpers/mock-fs.js";
import {
  CONFIG_DEFAULTS,
  loadConfig,
  readConfig,
  validateConfig,
} from "../../src/cli/config/index.js";

describe("config reader", () => {
  it("returns defaults when config.yaml is missing", () => {
    const fs = createMockFS({});
    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.exists, false);
    assert.equal(loaded.valid, true);
    assert.deepEqual(loaded.config, CONFIG_DEFAULTS);
    assert.deepEqual(readConfig("/test", fs), CONFIG_DEFAULTS);
  });

  it("merges partial configs with defaults", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": [
        "footguns:",
        "  path: custom/footguns/",
        "skills:",
        "  install:",
        "    - goat-debug",
        "    - goat-review",
      ].join("\n"),
    });

    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.equal(loaded.config.footguns.path, "custom/footguns/");
    assert.deepEqual(loaded.config.skills.install, [
      "goat-debug",
      "goat-review",
    ]);
    assert.equal(loaded.config.tasks.path, CONFIG_DEFAULTS.tasks.path);
  });

  it("preserves explicit null agents override", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": "agents: null\n",
    });

    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.equal(loaded.config.agents, null);
  });

  it("warns on unknown keys", () => {
    const result = validateConfig({
      version: "1.0.0",
      unknownField: true,
    });

    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0]?.path, "unknownField");
  });

  it("errors on invalid types", () => {
    const result = validateConfig({
      footguns: { path: 123 },
      agents: [],
      skills: { install: [] },
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((issue) => issue.path === "footguns.path"));
    assert.ok(result.errors.some((issue) => issue.path === "agents"));
    assert.ok(result.errors.some((issue) => issue.path === "skills.install"));
  });

  it("reports YAML parse errors and falls back to defaults", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": "footguns: [unterminated\n",
    });

    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.exists, true);
    assert.equal(loaded.valid, false);
    assert.ok(loaded.parseError);
    assert.deepEqual(loaded.config, CONFIG_DEFAULTS);
  });
});

describe("config userRole parsing", () => {
  it("defaults userRole to developer when not specified", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": 'version: "1.0.0"\n',
    });
    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.config.userRole, "developer");
  });

  it("parses userRole: developer from config", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": "userRole: developer\n",
    });
    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.equal(loaded.config.userRole, "developer");
  });

  it("parses userRole: investigator from config", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": "userRole: investigator\n",
    });
    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.equal(loaded.config.userRole, "investigator");
  });

  it("rejects invalid userRole value", () => {
    const result = validateConfig({ userRole: "admin" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.path === "userRole"));
  });

  it("rejects non-string userRole", () => {
    const result = validateConfig({ userRole: 42 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.path === "userRole"));
  });

  it("ignores invalid userRole and keeps default", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": "userRole: admin\n",
    });
    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.config.userRole, "developer");
  });

  it("userRole does not warn as unknown key", () => {
    const result = validateConfig({ userRole: "developer" });
    assert.equal(result.valid, true);
    assert.equal(
      result.warnings.filter((w) => w.path === "userRole").length,
      0,
    );
  });
});

describe("config toolchain + ask_first parsing", () => {
  it("parses toolchain command arrays", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": [
        "toolchain:",
        "  test:",
        "    - npm test",
        "  lint:",
        "    - npm run lint",
        "  build:",
        "    - npm run build",
        "  package:",
        "    - npm pack",
        "  format:",
        "    - npm run format",
      ].join("\n"),
    });

    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.deepEqual(loaded.config.toolchain, {
      test: ["npm test"],
      lint: ["npm run lint"],
      build: ["npm run build"],
      package: ["npm pack"],
      format: ["npm run format"],
    });
  });

  it("parses ask_first entries", () => {
    const fs = createMockFS({
      ".goat-flow/config.yaml": [
        "ask_first:",
        "  - path: workflow/setup/**",
        "    reason: Setup templates affect generated output",
        "  - path: .github/workflows/**",
        "    reason: CI changes alter validation behavior",
      ].join("\n"),
    });

    const loaded = loadConfig("/test", fs);
    assert.equal(loaded.valid, true);
    assert.deepEqual(loaded.config.askFirst, [
      {
        path: "workflow/setup/**",
        reason: "Setup templates affect generated output",
      },
      {
        path: ".github/workflows/**",
        reason: "CI changes alter validation behavior",
      },
    ]);
  });

  it("rejects non-array toolchain slots", () => {
    const result = validateConfig({
      toolchain: {
        test: "npm test",
      },
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.path === "toolchain.test"));
  });

  it("rejects malformed ask_first entries", () => {
    const result = validateConfig({
      ask_first: [{ path: "workflow/setup/**", reason: 42 }],
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.path === "ask_first[0].reason"));
  });
});
