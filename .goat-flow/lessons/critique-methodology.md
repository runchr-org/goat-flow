---
category: critique-methodology
last_reviewed: 2026-04-21
---

## Lesson: Every unverified self-declaration in goat-critique is a candidate for executable verification

**Status:** active | **Created:** 2026-04-21

**What happened:** Three independent goat-critique runs on the goat-critique SKILL.md itself (self-dogfood) converged on a structural pattern: every gate in the skill trusts the sub-agent's own claim about whether it did the thing. Dimension tags are self-declared (no orchestrator verification). Isolation is self-policed (CONTEXT LEAK self-report). Lens completeness is self-reported ("all three perspectives must appear" — but who checks?). Coverage-gate math operates on self-declared inputs and emits auto-HIGH outputs, combining unverified input with inflated output.
**Root cause:** Prose-rule limitations. The skill enforces behavioral contracts via instructions ("MUST use," "MUST isolate"), not via mechanical verification. This is a known ceiling for prompt-based agent orchestration.
**Fix (v1.2.0):** Added orchestrator-side verification for the two highest-blast-radius instances: (1) coverage-gate dimension tags now spot-checked by orchestrator re-reading one finding per agent; (2) Agent C isolation now verified by orchestrator grepping C output for forbidden namespace references. Remaining self-declarations (lens completeness, finding quota, severity calibration) are lower blast radius and deferred to v1.3.0 where prose rules can move to executable checks.
**v1.3.0 scope:** Prioritize remaining self-declaration gates by blast radius. Candidates: SAS lens completeness check (does each finding actually contain SKEPTIC/ANALYST/STRATEGIST sub-fields?), finding-count enforcement (did the agent return 3-7?), severity-evidence consistency (does HIGH severity have HIGH-strength evidence?).
