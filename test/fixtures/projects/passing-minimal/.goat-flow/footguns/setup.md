---
category: setup
---

## Footgun: Empty config.yaml
**Status:** active
**Created:** 2026-04-01
**Evidence type:** ACTUAL_MEASURED
**Symptoms:** Scanner falls back to defaults when config is missing.
**Why it happens:** Setup creates the file but does not populate it.
**Evidence:**
- `src/index.ts:1` - hook reads config at startup.
**Prevention:** Always populate config.yaml after creation.
