# Prompt: Generate Code Map

> **When to use:** When setting up context files for a new or existing project. Creates a scannable reference for AI agents and developers to quickly understand the repo layout.
>
> **Output:** `ai-docs/code-map.md` - reference this from your instruction file.

```
Create ai-docs/code-map.md: a quick-reference tree map of the repository layout.

Use this format:

project-name/
├── file.yaml        = brief description
├── dir/
│   ├── subdir/      = brief description
│   └── file.go      = brief description
└── other/           = brief description

Rules:
- Explore the real directory structure before writing
- Map the hot paths first: entrypoints, src/, tests/, scripts/, docs/,
  config, deployment assets
- One short "= description" for every included entry
- Call out generated, vendored, build-output, or never-edit paths explicitly
- Do not recurse into dependency caches like node_modules/, vendor/,
  dist/, build/, coverage/, or .git/; summarize them instead
- Go 2 to 4 levels deep where that improves understanding, then summarize
- Include key files by name when they matter for routing, startup, config,
  persistence, or deployment
- Note stack choices, ports, major tools, or agent/runtime files inline
- Keep it current-state only; do not list planned directories that do not exist

Verification:
- every path mentioned must exist
- if a file is marked generated or never-edit, that should be supported by
  the repo structure or comments
- the map should let a new agent find the main entrypoints in under 30 seconds
```
