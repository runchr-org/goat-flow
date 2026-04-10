# Successful Patterns

Capture approaches that worked well so future sessions can reuse them deliberately.

## Pattern: Verify structural renames with a repo-wide grep
**Context:** Renaming setup files, moving shared references, or changing canonical doc paths.
**Approach:** Update the replacement file first, grep the old path across active docs/code, fix every live reference, then rerun validation (`context-validate`, preflight, scan) before closing the task.

