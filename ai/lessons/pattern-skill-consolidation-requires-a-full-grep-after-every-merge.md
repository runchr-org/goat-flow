---
name: Skill consolidation requires a full grep after every merge
created: '2026-03-30'
type: pattern
---

**What happened:** Consolidated 9 skills to 6 (v0.9.3). Updated .claude/skills, scanner constants, test fixtures, docs, evals. Missed: .agents/skills still had old skill content, .github/skills still had old dirs, 16+ files still said "9 skills", setup fragments still referenced old skill names, CI still validated old skill list. External reviewers found all of these. Required 3 rounds of fixes.

**Root cause:** Treated skill merge as "delete old dirs + update a few constants." Didn't grep for ALL references to old skill names across the full repo. The same lesson as "Removing a concept requires full-repo grep" but at a larger scale.

**Prevention:** After any skill rename/merge/delete: (1) grep entire repo for every old name, (2) check all 3 agent dirs (.claude/, .agents/, .github/), (3) check scanner constants + types + anti-patterns + fragments + template-refs, (4) check test fixtures, (5) run the full test suite + scanner. Don't trust "it builds and tests pass" — read the changed files.
