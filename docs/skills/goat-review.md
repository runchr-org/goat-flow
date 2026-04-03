# /goat-review

Structured code review, quality audit, instruction review, and readability improvement.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Standard** | review, PR, diff | RFC 2119 severity review of changes |
| **Audit** | audit, quality sweep | Systematic codebase quality scan with negative verification |
| **Instruction** | instruction staleness | Audit CLAUDE.md/AGENTS.md for drift and missing rules |
| **Simplify** | simplify, clean up, naming | Readability improvement without behavior change |

## Standard Review

```mermaid
flowchart TD
    S0["Step 0\nAuto-detect scope\nFootgun check"] --> P0

    subgraph Standard["Standard Review"]
        P0["Phase 0: Spec Compliance\n(if spec/requirements exist)"]
        P0 --> P1["Phase 1: Scope Confirmation"]
        P1 -->|"CHECKPOINT"| P2["Phase 2: Review\nSeverity scan (MUST → SHOULD → MAY)\nCross-cutting checks\nFootgun match per finding"]
        P2 --> P3["Phase 3: Present Findings"]
    end

    P3 -->|"BLOCKING GATE"| P4["Phase 4: DoD Gate Check"]
    P4 -->|"CHECKPOINT"| Close["Closing"]
```

## Audit Mode

```mermaid
flowchart TD
    S0["Step 0"] --> A1

    subgraph Audit["Audit Mode"]
        A1["A1: Scan\nWeighted category scan\nSeverity-ordered"]
        A1 --> A2["A2: Negative Verification\nAttempt to DISPROVE each finding\nFabrication self-check\n>50% removed = scan too noisy\n>20% fabricated = agent confabulating"]
        A2 --> A3["A3: Report\nPattern rollup (3+ → pattern)\nMUST NOT propose fixes"]
    end

    A3 -->|"BLOCKING GATE"| Close["Close"]
```

**Key constraint:** In audit mode, MUST attempt to disprove each finding. MUST NOT propose fixes — findings only.

## Simplify Mode

```mermaid
flowchart TD
    S0["Step 0\nFootgun check"] --> S1

    subgraph Simplify["Simplify Mode"]
        S1["S1: Read & Assess\nNames, comments, control flow"]
        S1 --> S2["S2: Identify Opportunities\nNaming → Self-doc → Comments → Complexity → Constants → Dead code"]
        S2 --> S3["S3: Self-Check & Present\nRe-read file:line, remove unsupported findings"]
    end

    S3 -->|"BLOCKING GATE"| Decision{Implement?}
    Decision -->|Yes| S4["S4: Implement\nOne file at a time\nGrep old names\nRevert on test failure"]
    Decision -->|No| Close["Close"]
```

**Key constraint:** MUST NOT change behavior. If a rename crosses file boundaries or changes a public API, redirect to /goat-plan refactor mode.

**Source:** `workflow/skills/goat-review.md`
