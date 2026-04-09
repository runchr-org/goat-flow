# Step 10 — Polish

Compression and prioritisation pass on the instruction file. Do NOT add new content — this is about making what exists tighter.

## RFC 2119 pass

Review the instruction file and apply MUST/SHOULD/MAY to every rule:

**MUST** (non-negotiable — the system breaks without these):
- Execution loop steps (READ, CLASSIFY, SCOPE, ACT, VERIFY, LOG)
- Autonomy tier boundaries (Always / Ask First / Never)
- Definition of Done gates
- State declaration before acting
- Stop-the-line escalation at Level 2

**SHOULD** (important — skip only with good reason):
- Log hygiene (update lessons, footguns after tasks)
- Footgun propagation to local instruction files
- Anti-BDUF guard

**MAY** (optional — use when helpful):
- Structural debt trigger
- Sub-agent 5-call budget

**MUST NOT** (hard prohibitions):
- Fabricate codebase facts without reading files
- Act outside declared state without announcing the switch
- Skip verification on cross-boundary changes

## Compress prose

In the same pass:
- Convert paragraphs to bullet points
- Remove explanatory text where the rule is self-evident
- Replace multi-sentence descriptions with one-liners
- Keep examples (BAD/GOOD patterns) — they're high-signal
- Remove content that duplicates other docs

## .gitignore

Add agent-local settings to .gitignore if not already there (e.g., `.claude/settings.local.json`).

## Formatter ignore

If the project uses a code formatter (prettier, biome, etc.), add `.goat-flow/skill-conventions.md` and `.goat-flow/**/*.md` to the formatter's ignore file (`.prettierignore`, `biome.json` ignores, etc.). Verify YAML examples in skill-conventions.md still use `---` delimiters after formatting.

---

**Verification gate:**
- [ ] Count MUST/SHOULD/MAY in instruction file — need 10+
- [ ] Instruction file is under 120 lines (report actual count)
- [ ] No rules were removed — only reworded
- [ ] .gitignore updated

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 10-polish
- **What was done:** (line count before/after, MUST/SHOULD/MAY count)
- **Self-critique:** (honest assessment)

NEXT: proceed to `11-final-verification.md`
