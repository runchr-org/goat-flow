# /goat-test

Three-phase test plan generation using the doer-verifier principle.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Standard** | test, coverage | Full 3-phase test plan for recent changes |
| **Quick** | small change, hotfix | Abbreviated plan for 1-2 file changes |
| **Audit** | test audit, coverage gaps | Audit existing test coverage without new changes |

## Flow

```mermaid
flowchart TD
    S0["Step 0\nGather context\nAuto-detect mode"] --> P0

    subgraph TestPlan["Test Plan Generation"]
        P0["Phase 0: Change Manifest\nList every changed file\nVerification ratio by complexity"]
        P0 --> P1["Phase 1: Automated Tests\nExact commands for coding agent\nPattern-match existing tests"]
        P1 --> P2["Phase 2: AI Verification\nSelf-contained prompts for\nSEPARATE fresh agent session"]
        P2 --> P3["Phase 3: Human Testing\nChecklist for developer\nUI, UX, integration points"]
    end

    P3 --> NISNT["What ISN'T Tested\n(explicit gap list)"]
    NISNT -->|"BLOCKING GATE"| Decision{Human decision}
    Decision -->|"Run Phase 1"| Run["Agent runs automated tests"]
    Decision -->|"Adjust plan"| P0
    Decision -->|"Skip testing"| Close["Close"]
```

## The Doer-Verifier Principle

```mermaid
flowchart LR
    subgraph "Doer (coding agent)"
        Write["Write code"] --> P1Run["Run Phase 1\nautomated tests"]
    end

    subgraph "Verifier (separate agent)"
        P2Run["Run Phase 2\nAI verification prompts"]
    end

    subgraph "Human"
        P3Run["Run Phase 3\nManual testing checklist"]
    end

    P1Run -.->|"MUST be different agent"| P2Run
    P2Run -.->|"MUST be human"| P3Run
```

**Key constraint:** The coding agent MUST NOT verify its own work. Phase 2 prompts must be completely self-contained — the verifier agent starts fresh with no context from the coding session.

**Source:** `workflow/skills/goat-test.md`
