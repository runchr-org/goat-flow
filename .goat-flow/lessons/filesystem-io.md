---
category: filesystem-io
last_reviewed: 2026-05-17
---

## Lesson: Non-fatal filesystem tests should assert behavior before errno text

**Status:** active | **Created:** 2026-05-17

**What happened:** While adding M08 evidence-envelope tests, the first focused run failed because the non-fatal append-failure test expected `ENOTDIR` or "not a directory". The actual Node error for a file blocking `mkdirSync(..., { recursive: true })` was `EEXIST: file already exists`. The production behavior was correct: `appendEvidenceEnvelope()` returned `{ ok: false }` and emitted a warning without throwing, but the assertion overfit one possible filesystem errno.

**Root cause:** I asserted incidental OS/Node error text instead of the behavioral contract. For non-fatal IO paths, the important proof is that the caller receives a failure result and the operation does not throw; errno strings vary with which path segment blocks directory creation.

**Prevention:** For defensive filesystem tests, assert the stable contract first (`ok === false`, warning emitted, no throw) and keep errno matching broad enough for equivalent failure modes such as `EEXIST`, `ENOTDIR`, or "not a directory". Evidence anchors: `test/unit/evidence-envelope.test.ts` (search: `keeps append failures non-fatal`), `src/cli/evidence/envelope.ts` (search: `appendEvidenceEnvelope`).
