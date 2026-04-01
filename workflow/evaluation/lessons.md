# Prompt: Create ai/lessons/

Paste this into your coding agent to create the lessons file for the
learning loop. Lessons capture behavioural mistakes made by the agent so
the same failure mode does not repeat.

---

## The Prompt

```
Create or update ai/lessons/ for this project.

This file is for behavioural mistakes by the agent, not ordinary product
bugs. Add entries only after a real mistake or correction happened.

If ai/lessons/ does not exist, create it with this structure:

# Lessons

Behavioural mistakes made by the agent during this project. Each entry
describes what went wrong and how to avoid repeating it.

## Entries

### Short lesson title
**What happened:** Brief description of the real mistake. Include file:line
evidence when that is the clearest way to explain it.

**Prevention:** The behavioural rule or verification step that should stop
this from happening again.

**created_at:** YYYY-MM-DD

## Patterns
### Pattern: recurring theme
_Entries: "Short lesson title", "Another lesson title"_

Short synthesis of the repeated failure mode and the guardrail it implies.

If ai/lessons/ already exists:
- Keep existing entries intact
- Append new entries in the same format
- Update Patterns only when there are repeated themes worth extracting

RULES:
- Do NOT invent entries
- Do NOT log ordinary code defects unless the agent behaviour caused them
- Prefer one concrete lesson per entry over a vague umbrella statement
- Keep the Prevention action-oriented and enforceable
- Use the current repo format, not a temporary AI-generated placeholder

VERIFICATION:
- Verify ai/lessons/ exists
- Verify it has Entries and Patterns sections
- Verify every new entry has What happened, Prevention, and created_at
- Verify no fabricated entries were added
```
