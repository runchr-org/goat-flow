# /goat-test

Testing gap analyser. Compares code changes against testing coverage to find undertested risks and misaligned test effort.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Standard** | test, verify, gaps | Risk-based gap analysis for recent changes |
| **Audit** | test audit, coverage | Audit existing test coverage for a codebase area |
| **Regression Guard** | after bug fix | Define invariants and assess coverage for a specific fix |

## Flow

```mermaid
flowchart TD
    S0["Step 0\nGather scope\nConfirm mode"] --> P1

    subgraph GapAnalysis["Gap Analysis"]
        P1["Phase 1: Change Risk Map\nRead actual diff, not just file names\nClassify: CRITICAL / HIGH / MEDIUM / LOW\nTrace blast radius for CRITICAL/HIGH"]
        P1 -->|"CHECKPOINT"| P2["Phase 2: Gap Analysis\nCompare risk vs coverage\nUndertested risks + Misaligned effort"]
        P2 -->|"BLOCKING GATE"| P3["Phase 3: Targeted Testing Plan\nMust test / Should test / Safe to skip\nTime estimates for manual items"]
    end

    P3 -->|"CHECKPOINT"| Close["Closing"]
```

**Key constraint:** goat-test is a gap ANALYSER — it finds mismatches between code changes and testing coverage. It does not write test code. It hands off testing tasks to the coding agent.

**Source:** `workflow/skills/goat-test.md`
