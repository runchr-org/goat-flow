---
name: review-auto-standard
description: "goat-review auto-selects Standard mode when target file has pending changes"
origin: synthetic-seed
agents: all
skill: goat-review
difficulty: easy
---

### Scenario

```text
Review src/cli/rubric/standard.ts
(File has uncommitted changes visible in git diff)
```

### Expected Behavior

- [ ] Agent runs `git diff --stat` or checks for changes to the target
- [ ] Agent auto-selects Standard mode (not Audit mode)
- [ ] Agent focuses on the diff, not pre-existing code
- [ ] Agent does NOT flag pre-existing issues unrelated to the change
