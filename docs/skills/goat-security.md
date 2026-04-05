# /goat-security

Threat-model-driven security assessment with framework-aware verification.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Threat model** | security, vulnerability, OWASP | Full threat surface scan with exploitability ranking |
| **Dependency audit** | dependencies, CVEs, supply chain | Focused dependency vulnerability scan |
| **Compliance** | HIPAA, GDPR, compliance | Regulation-specific controls assessment |

## Threat Model Mode

```mermaid
flowchart TD
    S0["Step 0\nFramework auto-detect\nFootgun check"] --> P1

    subgraph ThreatModel["Threat Model Mode"]
        P1["Phase 1: Threat Surface Scan\n10-category checklist\nSkip irrelevant categories\n(e.g., skip CORS for CLI tools)"]
        P1 --> P2["Phase 2: Framework-Aware Verification\nFor each finding, check:\n(a) installed? (b) configured? (c) applied?"]
    end

    P2 -->|"BLOCKING GATE"| P3["Phase 3: Exploitability Ranking\nCritical → High → Medium → Low\nAttack scenario for each"]
    P3 --> P4["Phase 4: Self-Check\nRe-read cited code\nRemove unverified findings"]
    P4 -->|"BLOCKING GATE"| Close["Present final report"]
```

**Key constraint:** MUST check framework built-in mitigations before flagging. A finding mitigated by the framework's defaults is a false positive, not a finding.

## Compliance Mode

```mermaid
flowchart TD
    S0["Step 0"] --> C1

    subgraph Compliance["Compliance Mode"]
        C1["C1: Regulation Detection\nHIPAA? GDPR? SOC2?\nIdentify from project context"]
        C1 --> C2["C2: Compliance Scan\nRegulation-specific requirements\nUsing coding standards as source"]
        C2 --> C3["C3: Gap Report\nFindings with regulation citations"]
    end

    C3 -->|"BLOCKING GATE"| Close["Present compliance report"]
```

## Framework Verification Table

| Framework | Check these mitigations first |
|-----------|------------------------------|
| Laravel | CSRF middleware, mass assignment protection, Eloquent parameterization |
| Django | CSRF middleware, ORM parameterization, `SECRET_KEY` rotation |
| Express | Helmet headers, rate limiting, CORS configuration |
| Spring | Spring Security filters, CSRF protection, parameter binding |
| Go | `html/template` auto-escaping, `crypto/rand`, HTTP client timeouts |

**Source:** `workflow/skills/goat-security.md`
