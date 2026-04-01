---
name: mv/rename overwrites destination file without checking if it exists
created: '2026-03-21'
---

**What happened:** User asked to rename `TODO_improvements_v0.3.md` to `TODO_improvements_v0.4.md`. Agent ran `mv v0.3 v0.4` without checking that v0.4 already existed. The mv overwrote v0.4 with v0.3's content. When the user said "undo", the agent moved v0.4 (now containing v0.3's content) back to v0.3, destroying v0.4's original content entirely. The file was untracked by git and unrecoverable.

**Prevention:** Before any `mv`, `cp`, or Write that targets an existing path, MUST run `ls` on the destination first. If the destination exists, stop and ask the user. This applies to all file operations that can overwrite - not just mv. Add to the Never tier: "Overwrite existing files without confirming destination is safe."
