---
name: Setup agents propagate errors from existing instruction files
created: '2026-03-22'
---

**What happened:** Rampart's CLAUDE.md had `redaction.rs` (doesn't exist - redaction is Python only). Blundergoat's CLAUDE.md had a stale web middleware path pointing at `middleware.ts` instead of `proxy.ts`, plus a stale API SQL directory pointing at `migrations/` instead of `schema/`. Sub-agents creating `ai/coding-standards/` read these wrong paths from the existing instruction files and copied them into the new cold-path files, propagating the error.
**Root cause:** The verification gate said "verify paths in ai/coding-standards/" but didn't say "also audit the existing instruction file you're reading from." Agents trust the hot-path file as authoritative without checking.
**Fix:** Added "ALSO AUDIT EXISTING INSTRUCTION FILES" gate to docs-seed.md - verify Ask First paths exist, check router entries resolve, fix stale paths before copying them into cold-path files.
