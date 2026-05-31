import {
  PROFILES,
  STUB_AGENT_PROFILE,
  assert,
  completeInstruction,
  computeHarness,
  describe,
  it,
  makeCtx,
  stubAgentFacts,
} from "./helpers.js";

describe("workspace boundary guidance harness", () => {
  const completeInstruction = `
## Truth Order
Use explicit user instructions first.

## Autonomy Tiers
Use the configured autonomy tier.

## Hard Rules
Preserve workspace boundaries.

## Key Resources
Read the learning loop and tool playbooks.

## Essential Commands
Run project commands.

## Execution Loop
READ SCOPE ACT VERIFY

## Artifact Routing
Route artifacts intentionally.

## Definition of Done
Verify changed behavior.

## Router Table
Use local router paths.
`;

  const boundaryInstruction = `${completeInstruction}
## Workspace Boundary
The controlling goat-flow workspace may differ from the selected target project. Commands that inspect framework code run from the controlling workspace; project-specific harness checks run against the selected target.
`;

  function agentWithInstruction(
    agent: AgentProfile,
    content: string,
  ): AgentFacts {
    return stubAgentFacts({
      agent,
      instruction: {
        ...stubAgentFacts().instruction,
        exists: true,
        content,
        lineCount: content.trim().split(/\r?\n/).length,
      },
    });
  }

  /** Run the boundary guidance harness check and expose its context concern. */
  function boundaryCheck(ctx: AuditContext) {
    const { scope, concerns } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "boundary-guidance-present",
    );
    assert.ok(check, "boundary-guidance-present should be registered");
    return { check, concerns };
  }

  it("agent-scoped claude still passes when claude has guidance", () => {
    const { check, concerns } = boundaryCheck(
      makeCtx({
        agentFilter: "claude",
        agents: [agentWithInstruction(STUB_AGENT_PROFILE, boundaryInstruction)],
      }),
    );

    assert.equal(check.status, "pass");
    assert.equal(concerns.context.status, "pass");
  });
});

describe("workspace boundary guidance harness", () => {
  const completeInstruction = `
## Truth Order
Use explicit user instructions first.

## Autonomy Tiers
Use the configured autonomy tier.

## Hard Rules
Preserve workspace boundaries.

## Key Resources
Read the learning loop and tool playbooks.

## Essential Commands
Run project commands.

## Execution Loop
READ SCOPE ACT VERIFY

## Artifact Routing
Route artifacts intentionally.

## Definition of Done
Verify changed behavior.

## Router Table
Use local router paths.
`;

  const boundaryInstruction = `${completeInstruction}
## Workspace Boundary
The controlling goat-flow workspace may differ from the selected target project. Commands that inspect framework code run from the controlling workspace; project-specific harness checks run against the selected target.
`;

  function agentWithInstruction(
    agent: AgentProfile,
    content: string,
  ): AgentFacts {
    return stubAgentFacts({
      agent,
      instruction: {
        ...stubAgentFacts().instruction,
        exists: true,
        content,
        lineCount: content.trim().split(/\r?\n/).length,
      },
    });
  }

  /** Run the boundary guidance harness check and expose its context concern. */
  function boundaryCheck(ctx: AuditContext) {
    const { scope, concerns } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "boundary-guidance-present",
    );
    assert.ok(check, "boundary-guidance-present should be registered");
    return { check, concerns };
  }

  it("agent-scoped codex still fails when codex lacks guidance", () => {
    const { check, concerns } = boundaryCheck(
      makeCtx({
        agentFilter: "codex",
        agents: [agentWithInstruction(PROFILES.codex, completeInstruction)],
      }),
    );

    assert.equal(check.status, "fail");
    assert.equal(concerns.context.status, "fail");
    assert.ok(
      concerns.context.findings.some((finding) =>
        finding.includes(
          "codex: instruction file has no workspace boundary guidance",
        ),
      ),
    );
    assert.ok(
      !concerns.context.findings.some((finding) =>
        finding.startsWith("claude:"),
      ),
    );
  });
});

describe("workspace boundary guidance harness", () => {
  const completeInstruction = `
## Truth Order
Use explicit user instructions first.

## Autonomy Tiers
Use the configured autonomy tier.

## Hard Rules
Preserve workspace boundaries.

## Key Resources
Read the learning loop and tool playbooks.

## Essential Commands
Run project commands.

## Execution Loop
READ SCOPE ACT VERIFY

## Artifact Routing
Route artifacts intentionally.

## Definition of Done
Verify changed behavior.

## Router Table
Use local router paths.
`;

  const boundaryInstruction = `${completeInstruction}
## Workspace Boundary
The controlling goat-flow workspace may differ from the selected target project. Commands that inspect framework code run from the controlling workspace; project-specific harness checks run against the selected target.
`;

  function agentWithInstruction(
    agent: AgentProfile,
    content: string,
  ): AgentFacts {
    return stubAgentFacts({
      agent,
      instruction: {
        ...stubAgentFacts().instruction,
        exists: true,
        content,
        lineCount: content.trim().split(/\r?\n/).length,
      },
    });
  }

  /** Run the boundary guidance harness check and expose its context concern. */
  function boundaryCheck(ctx: AuditContext) {
    const { scope, concerns } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "boundary-guidance-present",
    );
    assert.ok(check, "boundary-guidance-present should be registered");
    return { check, concerns };
  }

  it("aggregate fails when any audited agent lacks boundary guidance", () => {
    const { check, concerns } = boundaryCheck(
      makeCtx({
        agents: [
          agentWithInstruction(STUB_AGENT_PROFILE, boundaryInstruction),
          agentWithInstruction(PROFILES.codex, completeInstruction),
          agentWithInstruction(PROFILES.copilot, completeInstruction),
        ],
      }),
    );

    assert.equal(check.status, "fail");
    assert.equal(concerns.context.status, "fail");
    assert.ok(
      concerns.context.score < 100,
      `context score should drop below 100: ${concerns.context.score}`,
    );
    assert.ok(
      concerns.context.findings.some((finding) =>
        finding.includes(
          "codex: instruction file has no workspace boundary guidance",
        ),
      ),
    );
    assert.ok(
      concerns.context.findings.some((finding) =>
        finding.includes(
          "copilot: instruction file has no workspace boundary guidance",
        ),
      ),
    );
    assert.ok(
      concerns.context.recommendations.some(
        (recommendation) =>
          recommendation.includes("codex (AGENTS.md)") &&
          recommendation.includes("copilot (.github/copilot-instructions.md)"),
      ),
    );
  });
});

describe("workspace boundary guidance harness", () => {
  const completeInstruction = `
## Truth Order
Use explicit user instructions first.

## Autonomy Tiers
Use the configured autonomy tier.

## Hard Rules
Preserve workspace boundaries.

## Key Resources
Read the learning loop and tool playbooks.

## Essential Commands
Run project commands.

## Execution Loop
READ SCOPE ACT VERIFY

## Artifact Routing
Route artifacts intentionally.

## Definition of Done
Verify changed behavior.

## Router Table
Use local router paths.
`;

  const boundaryInstruction = `${completeInstruction}
## Workspace Boundary
The controlling goat-flow workspace may differ from the selected target project. Commands that inspect framework code run from the controlling workspace; project-specific harness checks run against the selected target.
`;

  function agentWithInstruction(
    agent: AgentProfile,
    content: string,
  ): AgentFacts {
    return stubAgentFacts({
      agent,
      instruction: {
        ...stubAgentFacts().instruction,
        exists: true,
        content,
        lineCount: content.trim().split(/\r?\n/).length,
      },
    });
  }

  /** Run the boundary guidance harness check and expose its context concern. */
  function boundaryCheck(ctx: AuditContext) {
    const { scope, concerns } = computeHarness(ctx);
    const check = scope.checks.find(
      (entry) => entry.id === "boundary-guidance-present",
    );
    assert.ok(check, "boundary-guidance-present should be registered");
    return { check, concerns };
  }

  it("aggregate passes boundary guidance when every audited agent has guidance", () => {
    const { check, concerns } = boundaryCheck(
      makeCtx({
        agents: [
          agentWithInstruction(STUB_AGENT_PROFILE, boundaryInstruction),
          agentWithInstruction(PROFILES.codex, boundaryInstruction),
          agentWithInstruction(PROFILES.copilot, boundaryInstruction),
        ],
      }),
    );

    assert.equal(check.status, "pass");
    assert.equal(concerns.context.status, "pass");
  });
});
