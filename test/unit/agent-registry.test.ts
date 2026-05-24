import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAgentProfile,
  getAgentProfileMap,
  getAgentProfiles,
  getKnownAgentIds,
} from "../../src/cli/agents/registry.js";

describe("agent registry", () => {
  it("exposes the manifest-backed support set", () => {
    assert.deepEqual(getKnownAgentIds(), [
      "claude",
      "codex",
      "antigravity",
      "copilot",
    ]);
    assert.deepEqual(
      getAgentProfiles().map((agent) => agent.id),
      ["claude", "codex", "antigravity", "copilot"],
    );
  });

  it("keeps Codex hook config separate from settings and maps Stop for post-turn hooks", () => {
    const codex = getAgentProfile("codex");
    assert.equal(codex.settingsFile, ".codex/config.toml");
    assert.equal(codex.hookConfigFile, ".codex/hooks.json");
    assert.equal(codex.denyHookFile, ".codex/hooks/deny-dangerous.sh");
    assert.equal(codex.hookEvents.postTurn, "Stop");
  });

  it("exposes Copilot's hook-config-only profile cleanly", () => {
    const copilot = getAgentProfile("copilot");
    assert.equal(copilot.settingsFile, null);
    assert.equal(copilot.hookConfigFile, ".github/hooks/hooks.json");
    assert.equal(copilot.denyHookFile, ".github/hooks/deny-dangerous.sh");
    assert.equal(copilot.skillsDir, ".github/skills");
  });

  it("translates manifest deny mechanisms into runtime profiles", () => {
    const claude = getAgentProfile("claude");
    assert.deepEqual(claude.denyMechanism, {
      type: "both",
      settingsPath: ".claude/settings.json",
      scriptPath: ".claude/hooks/deny-dangerous.sh",
    });

    const codex = getAgentProfile("codex");
    assert.deepEqual(codex.denyMechanism, {
      type: "both",
      settingsPath: ".codex/config.toml",
      scriptPath: ".codex/hooks/deny-dangerous.sh",
    });
  });

  it("builds a normalized profile map without empty skill roots", () => {
    const profiles = getAgentProfileMap();
    assert.deepEqual(Object.keys(profiles), [
      "claude",
      "codex",
      "antigravity",
      "copilot",
    ]);
    for (const profile of Object.values(profiles)) {
      assert.notEqual(profile.skillsDir, "");
      assert.ok(!profile.skillsDir.endsWith("/"));
    }
    assert.equal(profiles.claude.hooksDir, ".claude/hooks");
    assert.equal(profiles.copilot.skillsDir, ".github/skills");
  });
});
