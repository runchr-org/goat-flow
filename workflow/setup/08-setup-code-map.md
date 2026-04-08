# Step 08 — Setup Code Map

Create `.goat-flow/code-map.md`: a quick-reference tree map of the repository layout.

## Format

```
project-name/
├── file.yaml        = brief description
├── dir/
│   ├── subdir/      = brief description
│   └── file.go      = brief description
└── other/           = brief description
```

## Rules

- Explore the real directory structure before writing
- Map the hot paths first: entrypoints, src/, tests/, scripts/, docs/, config, deployment assets
- One short `= description` for every included entry
- Call out generated, vendored, build-output, or never-edit paths explicitly
- Do not recurse into dependency caches (node_modules/, vendor/, dist/, build/, .git/); summarize instead
- Go 2-4 levels deep where that improves understanding, then summarize
- Include key files by name when they matter for routing, startup, config, persistence, or deployment
- Note stack choices, ports, major tools inline
- Current-state only — do not list planned directories

---

**Verification gate:**
- [ ] `.goat-flow/code-map.md` exists
- [ ] Every path mentioned actually exists
- [ ] A new agent could find the main entrypoints in under 30 seconds

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 08-setup-code-map
- **What was done:** (file created, depth covered)
- **Self-critique:** (honest assessment)

NEXT: proceed to `09-customise-to-project.md`
