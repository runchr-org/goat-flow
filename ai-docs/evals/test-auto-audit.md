---
name: test-auto-audit
description: "goat-test auto-selects Audit mode for existing module with no recent changes"
origin: synthetic-seed
agents: all
skill: goat-test
difficulty: medium
---

### Scenario

```text
Generate tests for src/cli/config/reader.ts
(No recent changes — testing existing code for coverage gaps)
```

### Expected Behavior

- [ ] Agent detects no pending changes to the target module
- [ ] Agent auto-selects Audit mode (coverage gap analysis)
- [ ] Agent skips Phase 0 Change Manifest (no diff to build from)
- [ ] Agent analyzes the module's public API surface
- [ ] Agent maps existing test files for the module
- [ ] Agent identifies untested code paths
- [ ] Agent does NOT say "no changes to test" and stop
