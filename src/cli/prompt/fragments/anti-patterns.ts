/**
 * Static prompt fragments for anti-pattern fixes.
 * Each entry maps a triggered anti-pattern to reusable setup or remediation guidance.
 */
import type { Fragment } from "../types.js";
import { SKILL_VERSION } from "../../constants.js";

/**
 * Anti-pattern fix fragments
 */
export const antiPatternFragments: Fragment[] = [
  {
    key: "ap-compress-instruction-file",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `**CRITICAL:** \`{{instructionFile}}\` is over 150 lines (hard limit). This is an anti-pattern that costs -3 points.

Immediate actions:
1. Remove verbose examples - keep one BAD/GOOD pair per concept
2. Replace paragraphs with bullet points
3. Move reference material to \`.goat-flow/\` and link from router table
4. Collapse multi-row tables into inline text where possible

Target: under 120 lines. Hard limit: 150.`,
  },
  // ap-fix-skill-names removed - AP2 was harmful dead code that would rename project-specific skills.
  // See .goat-flow/footguns/ "Scanner AP2 penalizes project-specific skills" (2026-04-01, RESOLVED).
  // ap-fix-dod-overlap removed - AP3 removed.
  // ap-add-footgun-evidence removed - AP4 removed (duplicate of rubric check 2.3.4).
  {
    key: "ap-fix-settings-json",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `**CRITICAL:** \`{{settingsFile}}\` is invalid JSON. This is an anti-pattern that costs -5 points.

1. Open the file and find the syntax error
2. Common issues: trailing commas, missing quotes, unescaped backslashes
3. Validate with: \`node -e "JSON.parse(require('fs').readFileSync('{{settingsFile}}', 'utf8'))"\``,
  },
  {
    key: "ap-fix-hook-exit",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `**CRITICAL:** The post-turn hook (stop-lint.sh) swallows validation failures with \`|| true\`. This hides lint/typecheck errors and costs -5 points.

Fix: remove \`|| true\` from the real validation commands. Keep optional discovery guards if needed, but do not suppress the actual \`shellcheck\`, \`eslint\`, \`tsc\`, or formatter invocation.`,
  },
  // ap-compress-local-files removed - AP7 removed.
  {
    key: "ap-fix-generic-ask-first",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `The Ask First section contains generic template text like "auth, routing, deployment, API, DB". This is an anti-pattern that costs -2 points.

Replace with project-specific boundaries using actual file paths:

**Before:** "auth, routing, deployment, API, DB"
**After:** Specific boundaries from this project, e.g.:
- \`src/auth/\` - authentication module (cross-cutting)
- \`config/\` - environment configuration
- \`migrations/\` - database migrations`,
  },
  {
    key: "ap-gitignore-settings-local",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `\`settings.local.json\` should be in \`.gitignore\` to prevent committing personal settings.

Add to \`.gitignore\`:
\`\`\`
settings.local.json
.env
\`\`\``,
  },
  // AP10 (ap-prune-settings-local) removed - settings.local.json is personal preference.
  // ap-fix-empty-scaffolding removed - AP11 removed (was already 0 deduction).
  {
    key: "ap-fix-stale-references",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `Footgun entries contain file:line references to files that no longer exist. Stale references mislead agents.

**Stale refs found:** {{evidence.ap-fix-stale-references}}

For each stale reference:
1. If the file was **renamed**: update the path to the new location
2. If the file was **deleted**: remove the footgun entry or update with current evidence
3. If the footgun is **no longer relevant**: remove the entire entry

Every file:line reference must point to a real file on disk.`,
  },
  // ap-fix-duplicate-learning-loop-surfaces removed - AP22 removed.
  {
    key: "ap-fix-stale-instruction-refs",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `\`{{instructionFile}}\` contains backtick-wrapped code paths that don't exist on disk.

**Stale refs found:** {{evidence.ap-fix-stale-instruction-refs}}

For each stale reference:
1. If the file was **renamed**: update the path (check \`git log --diff-filter=R --summary\`)
2. If the file was **deleted**: remove the reference
3. If the path is a **typo**: fix it

Every code path in the instruction file should resolve to a real file.`,
  },
  {
    key: "ap-fix-duplicate-skills",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `This project has both generic and goat-prefixed versions of the same skill. This causes agent confusion about which to invoke.

For each duplicate pair:
1. Compare the content of both versions
2. Keep the \`goat-*\` version (it follows the standard template)
3. Migrate any unique content from the generic version
4. Delete the generic skill directory`,
  },
  {
    key: "ap-fix-outdated-skills",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `Some skills have outdated or missing version tags. Skills should include \`goat-flow-skill-version\` in their YAML frontmatter to track compatibility.

**Outdated skills:** {{evidence.ap-fix-outdated-skills}}

For each outdated skill:
1. Read the current template from goat-flow (\`workflow/skills/goat-{name}.md\`)
2. Compare against your installed version - look for new sections, renamed phases, or structural changes
3. Update the skill content to match the current template structure
4. Add or update the frontmatter version tag:

\`\`\`yaml
---
name: goat-{name}
goat-flow-skill-version: "${SKILL_VERSION}"
---
\`\`\`

After updating all skills:
5. Verify the router table in CLAUDE.md (and AGENTS.md/GEMINI.md) references all 6 canonical skills and no non-existent paths`,
  },
  // ap-fix-dangling-skill-refs removed - AP17 removed.
  // ap-fix-adapt-comments removed - AP18 removed.
  {
    key: "ap-fix-hook-paths",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `Hook scripts contain hardcoded absolute paths that break when the repo is cloned elsewhere.

Replace all absolute paths with \`$(git rev-parse --show-toplevel)\`:
\`\`\`bash
# BAD:  /home/user/projects/myapp/.claude/hooks/deny-dangerous.sh
# GOOD: $(git rev-parse --show-toplevel)/.claude/hooks/deny-dangerous.sh
\`\`\``,
  },
  {
    key: "ap-remove-stale-skills",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `Non-canonical goat-flow skill directories were found. These are from a previous version and confuse agents - they load the wrong skill file.

Delete these directories and keep only the 6 canonical skills: \`goat\`, \`goat-debug\`, \`goat-plan\`, \`goat-review\`, \`goat-security\`, \`goat-test\`.

Common stale directories to remove:
- \`goat-investigate\` → merged into goat-debug (investigate mode)
- \`goat-audit\` → merged into goat-review (audit mode)
- \`goat-onboard\` → merged into goat-debug (onboard mode)
- \`goat-reflect\` → merged into goat-review (instruction mode)
- \`goat-resume\` → removed (handled by agent context)
- \`goat-simplify\` → merged into goat-review (simplify mode)
- \`goat-refactor\` → merged into goat-plan (refactor mode)
- \`goat-context\` → removed
- \`audit/\`, \`review/\`, \`preflight/\` → replaced by goat-* skills

After deleting, update the router table in your instruction file to reference only the 6 canonical skills.`,
  },
  // ap-fix-stale-router-markers removed - marker system removed.
  {
    key: "ap-fix-broad-deny-patterns",
    phase: "anti-pattern",
    category: "Anti-Pattern Fix",
    kind: "fix",
    instruction: `Overly broad deny patterns block legitimate commands. Replace patterns like \`Bash(*git*)\` with specific ones:

- \`Bash(*git commit*)\` - blocks commits (not all git commands)
- \`Bash(*git push*)\` - blocks pushes (not git status, git diff, etc.)

If you need to allow specific blocked commands, add them to \`.claude/settings.local.json\` allow list instead of weakening the deny patterns.`,
  },
];
