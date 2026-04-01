---
name: Dispatcher is a first-class skill, not a helper
created: ''
type: pattern
---

**Status:** RESOLVED in v0.9.3. Dispatcher added to SKILL_NAMES. All counts updated to 6 (5 + dispatcher).

The goat dispatcher was treated as secondary to the "real" skills — excluded from CANONICAL_SKILLS and consistently under-counted. This led to inconsistencies across 15+ files.

**Prevention:** Count the dispatcher in every enumeration of canonical skills.
