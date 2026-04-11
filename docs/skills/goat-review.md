# /goat-review

Structured code review and quality audit with negative verification.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Quick Review** | review, PR, diff | Severity-ordered scan of changes with negative verification |
| **Audit** | audit, quality sweep | Systematic codebase area scan — findings only, no fixes |

## Quick Review

```mermaid
flowchart TD
    S0["Step 0\nAuto-detect scope\nFootgun check"] --> R1

    subgraph Review["Quick Review"]
        R1["Severity-Ordered Scan\nSecurity > Correctness > Integration > Performance > Style"]
        R1 --> R2["Negative Verification\nAttempt to DISPROVE each finding\nRemove false positives"]
        R2 --> R3["Present Findings\nMUST / SHOULD / MAY Fix"]
    end

    R3 -->|"BLOCKING GATE"| DoD["DoD Gate Check"]
    DoD -->|"CHECKPOINT"| Close["Closing"]
```

**Key constraint:** MUST NOT flag pre-existing issues as part of this change. MUST attempt to disprove each finding before presenting it.

## Audit Mode

For codebase areas (not a diff). Scan using severity ordering, run negative verification, group 3+ related findings as systemic patterns.

**Key constraint:** MUST NOT propose fixes in audit mode — findings only.

**Source:** `workflow/skills/goat-review.md`
