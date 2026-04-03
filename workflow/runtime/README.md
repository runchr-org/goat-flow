# Runtime Prompts

Setup-time prompts for configuring agent runtime behavior. These are prompts to paste into your coding agent — not runtime specifications.

## Files and ordering

| File | When to use | Phase |
|------|-------------|-------|
| guidelines-split.md | Before Phase 1a — separate domain knowledge from agent instructions | Pre-setup |
| enforcement.md | Phase 1c — hooks, deny list, CI, ignore files | Setup |
| rfc2119.md | Phase 2 — apply MUST/SHOULD/MAY compression to instruction files | Hygiene |
| architecture.md | Anytime — generate system architecture doc | Utility |
| code-map.md | Anytime — generate repository file tree | Utility |
