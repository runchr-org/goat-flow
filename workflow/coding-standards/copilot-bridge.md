# Prompt: Create Copilot Bridge Files

> **Purpose:** Generate `.github/instructions/` bridge files for GitHub Copilot from the project's canonical instruction docs.
>
> **Use when:** The repo already has instruction files for another agent or tool, and the team wants GitHub Copilot to load the same guidance.
>
> **Output:** `.github/instructions/*.instructions.md` plus any required standalone GitHub instruction files.

Bridge files exist because Copilot does not reliably follow transitive references. The bridge must inline the source content instead of pointing at it.

---

## The Prompt

```
Create or update GitHub Copilot bridge files for this repository.

First, inspect the repo and identify the canonical instruction source
directory. Common patterns include:
- ai/coding-standards/
- instructions/
- docs/instructions/

Treat that source directory as the single source of truth. Do not invent
new instruction content unless the source files are missing.

For each source instruction file that Copilot users need, create a bridge
file in .github/instructions/ with this shape:

---
applyTo: "<file globs>"
---

[Full source file content pasted inline here]

RULES:
1. Copy the source file body inline. Do not replace it with "see X".
2. Preserve headings and wording exactly unless you are fixing a real
   formatting issue in the source file itself.
3. Choose applyTo globs from the repo's real layout, not canned defaults.
4. Keep each bridge focused. If one source file applies everywhere, use
   "**". If it only applies to tests, auth, infra, or a frontend tree,
   scope it accordingly.
5. If the repo has a standalone GitHub-specific instruction file format
   outside .github/instructions/, keep that exception explicit instead of
   forcing everything into one pattern.

PROCESS:
1. Read the canonical instruction files.
2. Map each source file to a destination bridge file.
3. For each mapping, write the Copilot bridge with frontmatter plus the
   full inlined body.
4. If a destination bridge already exists, update it instead of creating
   duplicate variants.

OUTPUT REQUIREMENTS:
- Include a short table listing:
  - source file
  - bridge file
  - chosen applyTo glob
  - why that glob matches the repo layout

SYNC CHECK:
After writing the bridges, verify that the bridge body matches the source
content exactly apart from the YAML frontmatter. Use a frontmatter-stripped
diff for every bridge you touched.

Example helper:

strip_frontmatter() { awk '/^---$/{n++; next} n>=2{print}' "$1"; }
diff <(strip_frontmatter .github/instructions/conventions.instructions.md) ai/coding-standards/conventions.md

FAIL CONDITIONS:
- A bridge references another file instead of inlining it
- applyTo globs clearly do not match the repo layout
- Two different bridge files claim the same source without a reason
- A bridge body drifts from the source content
```

---
