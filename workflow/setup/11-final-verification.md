# Step 11 — Final Verification

Run the scanner, fix all failures, verify the project still builds.

## Scanner

Run `goat-flow scan . --agent {agent}` and fix all failures until 100%.

If `goat-flow` CLI is not available, verify manually:
- Instruction file has execution loop, autonomy tiers, DoD, router table
- All 6 skills installed with matching version tags
- `.goat-flow/` has config.yaml, footguns/, lessons/, coding-standards/, architecture.md, glossary.md, decisions/
- Router table references all resolve to real files
- All commands in Essential Commands actually run

## Project health

Verify the project's build/test/lint still passes. Setup must not break existing tooling.

## .goat-flow/config.yaml

Verify or create `.goat-flow/config.yaml` with:
- `version:` matching the current goat-flow release
- `agent:` the agent being set up
- Correct paths for all `.goat-flow/` directories

## Human checklist

- [ ] Instruction file has 6-step loop, autonomy tiers, DoD, router table
- [ ] ACT has state declaration AND mode-transition rule
- [ ] LOG has mechanical trigger + human correction trigger
- [ ] All 6 goat-flow skills installed with version tags
- [ ] Agent-specific hooks/config wired (see agent config file)
- [ ] Router table references all resolve to real files
- [ ] `.goat-flow/` has footguns/, lessons/, coding-standards/
- [ ] `.goat-flow/config.yaml` exists with correct version and paths
- [ ] `goat-flow scan . --agent {agent}` passes at 100%
- [ ] Project build/test/lint still passes

---

**Verification gate:**
- [ ] Scanner passes at 100% (or manual verification complete)
- [ ] Project build/test/lint passes
- [ ] `.goat-flow/config.yaml` exists and is correct

**Session log — setup retrospective:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 11-final-verification
- **What was done:** (scanner result, issues fixed)
- **Self-critique:** (honest assessment)
- **Retrospective:** How well does this setup serve THIS project specifically? What's generic template fill vs. real project-specific content? One concrete suggestion for the human.
