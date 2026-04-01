---
name: Version bumps require explicit confirmation
created: '2026-03-29'
---

**What happened:** While cleaning up zero-point rubric checks, the agent also bumped `package.json`, `RUBRIC_VERSION`, and skill frontmatter above the current `0.8.0` line. The user had not asked for a release/version bump and corrected it immediately.

**Prevention:** Treat version changes as a separate decision from rubric or content changes. Do not bump package, rubric, or template versions unless the user explicitly requests the new version or the release plan says to do it.
