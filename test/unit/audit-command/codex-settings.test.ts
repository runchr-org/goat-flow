import {
  BUILD_CHECKS,
  CODEX_EXACT_ENV_DENY_ENTRIES,
  CODEX_WORKSPACE_ROOT_ENTRIES,
  PROFILES,
  assert,
  assertExists,
  codexWorkspaceRootsTable,
  describe,
  extractSettingsFacts,
  it,
  join,
  makeCtx,
  stubAgentFacts,
  stubFS,
} from "./helpers.js";

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("continues parsing nested Codex workspace-root permission tables", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                '[permissions.goat-flow.filesystem.":workspace_roots"]',
                ...CODEX_WORKSPACE_ROOT_ENTRIES,
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, true);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("detects Codex TOML permission profiles that deny secret file families", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                "glob_scan_max_depth = 3",
                codexWorkspaceRootsTable(),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, true);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("does not count an inactive Codex permission profile as secret coverage", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "default"',
                "[permissions.goat-flow.filesystem]",
                codexWorkspaceRootsTable(CODEX_WORKSPACE_ROOT_ENTRIES.slice(2)),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, false);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("does not count Codex env coverage without an existing staging variant", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) =>
          path === ".codex/config.toml" || path === ".env.staging",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                codexWorkspaceRootsTable(
                  [
                    ...CODEX_WORKSPACE_ROOT_ENTRIES,
                    ...CODEX_EXACT_ENV_DENY_ENTRIES,
                  ].filter((entry) => !entry.startsWith('".env.staging"')),
                ),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, false);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("does not count incomplete Codex exact/subtree denies as secret coverage", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                codexWorkspaceRootsTable([
                  '".env" = "none"',
                  '".env.local" = "none"',
                  '".env.development" = "none"',
                  '".env.production" = "none"',
                  '".env.test" = "none"',
                  '".envrc" = "none"',
                  '"secrets/**" = "none"',
                  '".ssh/**" = "none"',
                ]),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, false);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("does not count legacy Codex project-root permission tables as current secret coverage", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                '[permissions.goat-flow.filesystem.":project_roots"]',
                ...CODEX_WORKSPACE_ROOT_ENTRIES,
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, false);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("does not require absent Codex exact-file denies for secret coverage", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                codexWorkspaceRootsTable(CODEX_WORKSPACE_ROOT_ENTRIES),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, true);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("fails agent-settings when Codex config still uses codex_hooks", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-settings")!;
    const result = check.run(
      makeCtx({
        agentFilter: "codex",
        agents: [
          codexAgentFacts({
            "features.hooks": true,
            "features.codex_hooks": true,
          }),
        ],
      }),
    );

    assertExists(result);
    assert.match(result.message, /Deprecated Codex feature flag/);
    assert.match(result.howToFix ?? "", /goat-flow install \. --agent codex/);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("fails agent-settings when Codex hooks are installed but hooks are not enabled", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-settings")!;
    const result = check.run(
      makeCtx({
        agentFilter: "codex",
        agents: [codexAgentFacts({ model: "gpt-5" })],
      }),
    );

    assertExists(result);
    assert.match(result.message, /\[features\]\.hooks = true/);
    assert.match(result.howToFix ?? "", /hooks = true/);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("fails agent-settings when Codex permission profile names absent exact paths", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-settings")!;
    const ctx = makeCtx({
      agentFilter: "codex",
      agents: [
        codexAgentFacts({
          default_permissions: "goat-flow",
          "features.hooks": true,
          "permissions.goat-flow.filesystem.:workspace_roots":
            codexWorkspaceRootsTable([
              ...CODEX_WORKSPACE_ROOT_ENTRIES,
              '".env.example" = "read"',
            ]).replace(/^":workspace_roots" = /u, ""),
        }),
      ],
      fs: stubFS({
        exists: (path) => path === ".codex/config.toml",
      }),
    });
    const result = check.run(ctx);

    assertExists(result);
    assert.match(result.message, /exact workspace-root paths/);
    assert.match(result.message, /\.env\.example/);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("parses Codex current and deprecated feature flags from TOML", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? 'model = "gpt-5"\nfeatures.codex_hooks = true\n[features]\nhooks = true\n'
            : null,
      }),
      PROFILES.codex,
    );

    assert.deepEqual(facts.parsed, {
      model: "gpt-5",
      "features.hooks": true,
      "features.codex_hooks": true,
    });
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("passes agent-settings when Codex hooks are installed and features.hooks is true", () => {
    const check = BUILD_CHECKS.find((c) => c.id === "agent-settings")!;
    const result = check.run(
      makeCtx({
        agentFilter: "codex",
        agents: [codexAgentFacts({ "features.hooks": true })],
      }),
    );

    assert.equal(result, null);
  });
});

describe("codex settings feature flags", () => {
  function codexAgentFacts(
    parsed: Record<string, unknown>,
    hooks = stubAgentFacts().hooks,
  ): AgentFacts {
    return stubAgentFacts({
      agent: PROFILES.codex,
      settings: {
        exists: true,
        valid: true,
        parsed,
        hasDenyPatterns: false,
      },
      hooks: {
        ...hooks,
        denyExists: true,
        denyIsRegistered: true,
        denyRegisteredPath: ".codex/hooks/deny-dangerous.sh",
      },
    });
  }

  it("requires Codex exact-file denies for existing root secret files", () => {
    const facts = extractSettingsFacts(
      stubFS({
        exists: (path) => path === ".codex/config.toml" || path === ".env",
        readFile: (path) =>
          path === ".codex/config.toml"
            ? [
                'default_permissions = "goat-flow"',
                "[permissions.goat-flow.filesystem]",
                codexWorkspaceRootsTable(CODEX_WORKSPACE_ROOT_ENTRIES),
              ].join("\n")
            : null,
      }),
      PROFILES.codex,
    );

    assert.equal(facts.readDenyCoversSecrets, false);
  });
});
