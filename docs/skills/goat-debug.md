# /goat-debug

Diagnosis-first debugging, codebase investigation, and project onboarding.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Diagnose** | bug, error, crash, symptom | Hypothesis-driven debugging with confidence-gated fixes |
| **Investigate** | explore, understand, how does | Deep codebase reading with progressive depth and evidence tags |
| **Onboard** | new to this, onboard | Stack detection + guided codebase orientation |

## Diagnose Mode

```mermaid
flowchart TD
    S0["Step 0\nGather context\nFootgun check"] --> D1

    subgraph Diagnose["Diagnose Mode"]
        D1["D1: Investigate\nHypotheses (2+ categories)\nTrace code paths"] --> D2
        D2["D2: Diagnosis\nConfidence: LOW/MED/HIGH"]
    end

    D2 -->|"BLOCKING GATE"| Decision{Human decision}
    Decision -->|"Fix it"| D3["D3: Fix Plan"]
    Decision -->|"Go deeper"| D1
    Decision -->|"Just report"| Close
    D3 --> D4["D4: Post-Fix Verification\nTwo-corrections rule"]
    D4 -->|"CHECKPOINT"| Close["Closing\nLearning loop"]
```

**Key constraint:** No fixes until human reviews diagnosis. If confidence is LOW, the agent cannot propose a fix — must investigate further.

## Investigate Mode

```mermaid
flowchart TD
    S0["Step 0\nGather context"] --> I1

    subgraph Investigate["Investigate Mode"]
        I1["I1: Scope & Plan\nDeclare in/out of scope\nRead estimate"]
        I1 -->|"BLOCKING GATE"| I2["I2: Read (Progressive Depth)\nEntry points → Critical path → Supporting"]
        I2 -->|"3x estimate?"| Check{"Re-scope?"}
        Check -->|Yes| I1
        Check -->|No| I3["I3: Report\n'What I Didn't Read' (required)"]
    end

    I3 -->|"BLOCKING GATE"| Close["Go deeper / Switch to diagnose / Close"]
```

## Onboard Mode

Runs Investigate mode (I1-I3) with two additional phases:

- **O1 (before I1):** Stack detection — languages, frameworks, build/test/lint commands
- **O2 (after I3):** Glossary and instruction drafting — build `ai-docs/glossary.md` from codebase

**Source:** `workflow/skills/goat-debug.md`
