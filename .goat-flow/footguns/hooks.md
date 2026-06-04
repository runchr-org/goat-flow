---
category: hooks
last_reviewed: 2026-06-04
---

**Last independent review:** 2026-05-26 - Active entries re-verified against current split guardrail anchors and central self-test. Workflow, Claude, GitHub, Codex, and Antigravity self-tests return `PASS: deny-dangerous self-test`; Antigravity uses `.agents/hooks.json` + `.agents/hooks/` scripts for PreToolUse. The `cat .env` probe is blocked by `patterns-paths.sh`; coverage relies on self-test cases plus live harness blocking.

## Footgun: Hook toggles can scaffold uninstalled agent surfaces

**Status:** active | **Created:** 2026-05-27 | **Evidence:** ACTUAL_MEASURED

**Regression symptom:** A hook toggle against a clean target created agent config and hook files for agents the target never opted into, making setup and audit state look agent-aware when the project asked only to change one toggle.

**Why it happened:** A registrar loop over supported agents treated support metadata as installation evidence. The hook config writer also treated a missing JSON config as `{}`, so an unguarded disable/enable could create `.claude/settings.json`, `.codex/hooks.json`, `.agents/hooks.json`, `.github/hooks/hooks.json`, and hook script dirs from scratch.

**Evidence:**
- Pre-fix runtime probes against `<clean-temp-dir>`: `node --import tsx src/cli/cli.ts hooks disable deny-dangerous <clean-temp-dir>` created `.agents/hooks.json`, `.claude/settings.json`, `.codex/hooks.json`, `.github/hooks/hooks.json`, and `.goat-flow/config.yaml`; the `hooks enable deny-dangerous` form created hook scripts under `.agents/hooks/`, `.claude/hooks/`, `.codex/hooks/`, and `.github/hooks/`.
- Guard anchors: `src/cli/server/hook-registrar.ts` (search: `shouldReconcileAgent`) gates writes on detected installed surfaces or existing hook residue; `test/unit/hook-registrar.test.ts` (search: `does not scaffold uninstalled agent surfaces`) locks the clean-target regression.

**Prevention:**
1. Treat hook support and agent installation as different facts. Support comes from the manifest; installation from target-project surfaces.
2. Don't count shared markers such as `AGENTS.md` or `.agents/skills/` as a per-agent hook opt-in when multiple profiles share them.
3. On disable, remove existing hook residue, but don't create a missing hook config file just to remove an entry from it.

## Footgun: Splitting a monolithic guardrail can drop parser coverage while preserving the headline checks

**Status:** active | **Created:** 2026-05-26 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A hook split looks cleaner because `patterns-shell.sh`, `patterns-paths.sh`, and `patterns-writes.sh` each block the happy-path examples (`rm -rf /`, `cat .env`, `git push`). But the pre-M10 monolith carried much broader parser coverage - wrapper normalization, quoted read-only search literals, `git -C`/`git -c` push forms, global `gh --repo` grammar, split-quoted `.env`, `.envrc`, safe-scoped recursive deletion, structured Copilot/Antigravity payloads - so a small split passes smoke tests while re-opening old bypasses and false positives.

**Evidence:**
- Git history before the split had a monolithic workflow guard with 1,997 lines and a paired self-test with 629 lines; the first split replaced them with three small guards totaling 393 lines plus a 195-line self-test.
- Runtime probes before the restoration wrongly allowed `git -C /tmp push origin main`, `git -c core.sshCommand=foo push origin main`, `/usr/bin/git push origin main`, `gh --repo owner/repo issue comment ...`, `gh workflow run deploy.yml`, `rm -r src`, `cat .envrc`, `cat '.'env`, and `python3 -c 'print(open(".env").read())'`; and wrongly blocked `rm -rf ./node_modules`, `rg "&& rm -rf /" src/`, `bash -c "echo hello"`, and `python -c 'print(1)'`.
- Anchors: `workflow/hooks/hook-lib/patterns-writes.sh` (search: `is_gh_write_operation`), `workflow/hooks/hook-lib/patterns-shell.sh` (search: `rm_has_recursive`), `workflow/hooks/hook-lib/patterns-paths.sh` (search: `is_secret_path_touch`), and `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `git -C push`, `quoted destructive search literal`).

**Prevention:**
1. Treat guardrail splits as parser migrations, not renames. Port the old parser normalization and false-positive corpus before deleting the monolith.
2. Compare line count and self-test case count before approving a split; a large drop is a review smell until removed coverage maps to new tests.
3. Run representative old-case probes across all split hooks: wrapper-prefixed git pushes, global/inherited `gh` flags, read-only search literals with dangerous text, safe-scoped recursive deletion, split-quoted secret paths, and structured payloads for each registered agent.
4. Keep the central self-test broad enough to fail on both bypasses and false positives; smoke checks alone prove only headline examples.

## Footgun: Hook command strings can fail before guard code starts

**Status:** active | **Created:** 2026-05-27 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Direct hook self-tests pass, but an agent session reports a PreToolUse failure with exit 126 or 127 before any `BLOCKED:` or deny JSON appears. The script exists and works when launched manually, so the failure looks like a runtime mystery rather than a stale/unsupported command string.

**Why it happens:** Agent configs name launch paths, not the abstract hook file. A stale path, lost executable bit, unsupported shell substitution, or cwd assumption can fail before `deny-dangerous.sh` and the thin hook code start. Direct `bash workflow/hooks/<guard>.sh` smoke tests skip that surface.

**Evidence:**
- Preflight/audit parse configured command strings from `.claude/settings.json`, `.codex/hooks.json`, `.agents/hooks.json`, and `.github/hooks/hooks.json`, require an exact guard script path, then run that guard with safe deny payloads. Anchors: `scripts/preflight-checks.sh` (search: `configured_hook_smoke_output`), `src/cli/audit/check-agent-deny-mechanism.ts` (search: `configuredGuardCommands`).
- 2026-06-01 release-review recurrence: `src/cli/audit/check-agent-deny-mechanism.ts` (search: `runConfiguredHookCommandSmoke`) parses the configured command but launches `bash` against `configured.scriptPath`, so a broken `$root` resolver, stale wrapper, syntax error, or executable-bit failure passes audit while the configured agent command fails before guard startup.
- `test/unit/audit-command/agent-deny-hooks.test.ts` (search: `exact configured hook command points at a stale path`) locks the stale-path case; same file (search: `hides the script path in shell text`) locks the unsafe hidden-script-path case. Runtime contract anchors: `workflow/hooks/README.md` (search: `Failure Modes / Runtime Contracts`) and `src/cli/server/agent-hook-writer.ts` (search: `Policy hook unavailable: git repository root unavailable`).
- 2026-06-04 PR #47 review recurrence: the generated launcher added a `$CLAUDE_PROJECT_DIR` fallback for the script path but still ran `bash "$root/..."` from the old cwd, so `workflow/hooks/deny-dangerous.sh` (search: `git rev-parse --git-common-dir`) recomputed policy root from the wrong directory and failed closed outside a repo. The change had to stay mirrored across `src/cli/server/agent-hook-writer.ts` (search: `ensureRoot`), `workflow/hooks/agent-config/claude.json` (search: `CLAUDE_PROJECT_DIR`), and `.claude/settings.json` (search: `CLAUDE_PROJECT_DIR`).

**Prevention:**
1. Treat configured guard-script replay as part of hook verification, not an optional integration smoke.
2. Fail hard on exit 126/127 even when direct script self-tests pass.
3. Document command-shape differences: Claude and Antigravity resolve the git root and fail closed when unavailable; Codex and Copilot use direct project-local paths and need project-root cwd.
4. Runtime smoke must execute the configured command string, or a parser-backed equivalent validating every wrapper component. Don't replace a configured command with `bash <scriptPath>` when it contains resolver logic or direct executable invocation.
5. When a launcher falls back to a root variable, either `cd "$root"` before running the hook or pass root through a contract the hook consumes; resolving only the script path fails when the hook recomputes repo state from cwd.

## Footgun: Hook sync can copy required policy files into ignored paths

**Status:** active | **Created:** 2026-06-01 | **Evidence:** OBSERVED

**Symptoms:** `goat-flow hooks enable deny-dangerous` or `goat-flow hooks sync` repairs local hook files and the agent config, and local runtime checks pass in that tree. After committing and cloning, the dispatcher starts without `.goat-flow/hook-lib/` because the copied policy modules were still ignored by a stale `.goat-flow/.gitignore`.

**Why it happens:** `src/cli/server/hook-registrar.ts` (search: `copyHookScripts`) writes `.goat-flow/hook-lib/` for `deny-dangerous` but skips the installer's `ensure_gitignore_entry` step. Pre-1.9 `.goat-flow/.gitignore` templates use a leading `*`, so new `.goat-flow/hook-lib/*` paths stay untracked unless `!hook-lib/` and `!hook-lib/**` are added.

**Evidence:**
- `src/cli/server/hook-registrar.ts` (search: `copyHookScripts`) writes each `DENY_DANGEROUS_HOOK_LIB_FILES` entry into `.goat-flow/hook-lib/` during `applyHookState` and `syncHookStates`; `workflow/install-goat-flow.sh` (search: `ensure_gitignore_entry ".goat-flow/.gitignore" "!hook-lib/"`) handles the same files at install by appending both `!hook-lib/` and `!hook-lib/**`.
- `.goat-flow/footguns/docs-and-crossrefs.md` (search: `Filesystem-backed validation can miss untracked or ignored replacement files`) records the broader trap: filesystem checks can pass with `.goat-flow/*` files that remain ignored.

**Prevention:**
1. Any CLI/dashboard path writing required committed files under `.goat-flow/` must update `.goat-flow/.gitignore` in the same operation, not rely on `install`.
2. Add a regression fixture with a pre-1.9 `.goat-flow/.gitignore` starting with `*`; after `hooks enable` / `sync`, verify `! git check-ignore -q .goat-flow/hook-lib/patterns-shell.sh`.
3. Before release, test the clone path: commit hook config plus hook-lib, clone fresh, then run `.goat-flow/hook-lib/deny-dangerous-self-test.sh --self-test=smoke`.

## Footgun: Hook launchers using --show-toplevel resolve to the worktree, not the main repo

**Status:** active | **Created:** 2026-05-28 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A Claude or Antigravity session inside a `git worktree add` checkout fails every Bash with a PreToolUse error like `bash: /path/to/repo/.claude/worktrees/<branch>/.claude/hooks/<guard>.sh: No such file or directory`. Direct self-tests in the main repo pass; guards run fine outside the worktree. The same shape appears after a hook rename if a stale launcher references the old script name.

**Why it happens:** Inside a worktree, `git rev-parse --show-toplevel` returns the worktree's working directory, not the main repo's. The earlier Claude/Antigravity launcher resolved the script path against `--show-toplevel`, looking for `<worktree>/.claude/hooks/<guard>.sh` — which exists only if `.claude/hooks/` is git-tracked. Many projects gitignore `.claude/` entirely, so `git worktree add` checks out no hook scripts and every guard fails before its code starts. Goat-flow's repo tracks `.claude/hooks/`, masking this in development.

**Evidence:**
- Pre-fix runtime probe: a fresh worktree at `<project>/.claude/worktrees/feat+x/` with `.claude/` gitignored started every Bash with `bash: <worktree>/.claude/hooks/patterns-shell.sh: No such file or directory`. The repro inside goat-flow succeeded only because `git ls-files | grep '^\.claude/hooks/'` lists all guard scripts; a fresh worktree inherited them via the branch checkout.
- Anchors: `workflow/hooks/agent-config/claude.json`, `workflow/hooks/agent-config/antigravity-hooks.json`, and `workflow/install-goat-flow.sh` (each search: `git rev-parse --git-common-dir`); the normalizer at `src/cli/facts/agent/hook-registration.ts` (search: `Hook launchers prefix the script path`) now strips both `$(...)` and `$var/` prefixes when extracting the script path for audit.

**Prevention:**
1. Hook launchers MUST resolve to the main repo root, not the current tree. Use `git rev-parse --git-common-dir` and take its parent when absolute (worktree) or fall back to `--show-toplevel` when relative (main checkout).
2. When renaming or splitting a guard, regenerate every launcher string the installer writes, not just the hook script; a stale launcher reproduces this even when the main repo has the new scripts.
3. Add worktree coverage to any future configured-command smoke probe: run the literal launcher from a fresh worktree, not just the main checkout, before claiming it works.

## Footgun: Hook launchers fail closed when the shell cwd is outside any git repo, wedging every Bash

**Status:** active | **Created:** 2026-06-04 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A Claude/Antigravity session that `cd`'d outside the repo (usually `/tmp` for scratch) has EVERY later Bash blocked by `BLOCKED: Policy hook unavailable: git repository root unavailable.` (older installs: `Guard cannot start: ...`). The block fires before the command, so even `cd /path/to/repo && ...` is rejected - the session can't escape `/tmp` via Bash (Read/Edit/Write still work).

**Why it happens:** The launcher runs `git rev-parse` in the agent's persistent cwd and fails closed when outside any repo. Claude Code keeps one cwd across Bash calls, so one `cd /tmp` gates every later command - the `cd` back included - on a `git rev-parse` that cannot succeed from `/tmp`. The `--git-common-dir` worktree hardening also fails there (`fatal: not a git repository`, exit 128), deadlocking identically. Fixing only the script-path lookup is insufficient: `deny-dangerous.sh` re-resolves `.goat-flow/hook-lib` via `git rev-parse` from cwd, failing closed too unless the launcher `cd`s into root.

**Evidence:**
- 2026-06-04 live incident: a session in `~/projects/gruff-workspace/gruff-rs` cd'd to `/tmp`, after which every Bash returned `Guard cannot start: git repository root unavailable.`; `cd <repo> && pwd` was blocked too. Both launcher generations fail from `/tmp`: `git rev-parse --show-toplevel` and `--git-common-dir` each exit 128 with empty output → fail-closed branch.
- End-to-end probe (real guard, from `/tmp`): WITH `$CLAUDE_PROJECT_DIR` + `cd "$root"` → benign allowed (exit 0), `rm -rf /` blocked (exit 2); WITHOUT the env var → fail-closed (exit 2); script-path lookup alone (no `cd`) still failed closed. Anchors: `src/cli/server/agent-hook-writer.ts` (search: `CLAUDE_PROJECT_DIR`), and the generated launchers in `workflow/hooks/agent-config/claude.json`, `workflow/hooks/agent-config/antigravity-hooks.json`, and `workflow/install-goat-flow.sh` (search: `CLAUDE_PROJECT_DIR:-`).

**Prevention:**
1. A launcher MUST locate its guard from a cwd-independent anchor: after git resolution, fall back to `$CLAUDE_PROJECT_DIR`, then fail closed only when neither finds `deny-dangerous.sh`. AND `cd "$root"` before running the guard (cd failure also fails closed), because the guard re-resolves its root from cwd - script-path lookup alone leaves it failing closed from `/tmp`.
2. Keep git resolution FIRST so worktree/submodule checkouts resolve to the main repo; the env fallback only rescues the cwd-outside-repo case. Only Claude exports `$CLAUDE_PROJECT_DIR`; other agents stay fail-closed from `/tmp` until their root env var is wired in.
3. Recovery: the user types `!cd <repo>` to reset the persisted cwd. Keep scratch work in `.goat-flow/scratchpad/`, not `/tmp` (see `.goat-flow/lessons/agent-behavior.md`, search: `wedged its own shell`).

## Footgun: Extension-based secret checks can confuse filenames with query syntax

**Status:** active | **Created:** 2026-05-27 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A secret-path hook correctly blocks `cat path/to/id_rsa.key`, but also blocks harmless jq/yq expressions such as `jq -r .key file.json` and `yq .metadata.key file.yaml`, plus text after an unquoted shell comment, e.g. `git status # .env`.

**Why it happens:** A broad `.(pem|key|pfx)` extension regex sees dotted query fields and filenames as the same shape. Scanning the raw shell segment before comment stripping also treats inert comment text as an argument.

**Evidence:**
- M12 pre-fix probes blocked `git status # .env` and `jq -r .key file.json`; post-fix probes return status 0 while `cat path/to/id_rsa.key` still returns status 2.
- `workflow/hooks/deny-dangerous.sh` (search: `strip_unquoted_shell_comments`) strips inert comments before policy matching; `workflow/hooks/hook-lib/patterns-paths.sh` (search: `key_material_path_touch`) requires a meaningful filename/path stem for `.pem`, `.key`, and `.pfx`; `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `jq bare key query`) locks both allow and block cases.

**Prevention:**
1. Secret-path tests must include inert dotted query expressions as allow controls alongside real key-file paths.
2. Run comment false-positive probes for every policy hook after changing shared shell-segment prep.
3. Prefer file-shape helpers over broad extension regexes when a token can also be valid data syntax.

## Footgun: File-read deny does not bind Bash shell reads of secret files

**Status:** active | **Created:** 2026-04-19 | **Evidence:** ACTUAL_MEASURED
**hallucination-risk:** high - `Read(**/.env*)` (settings.json or a Codex TOML profile) looks like a blanket secret-read deny but binds only file-read paths; a Bash payload (`cat .env`, `source .env`, `base64 ~/.aws/credentials`) is not bound by it and silently succeeds unless the Bash hook blocks it.

**Symptoms:** Before the Bash-side sentinel was added, `goat-flow audit --harness` reported `deny-covers-secrets: pass` while a live Bash probe returned exit 0. Expected is now exit 2 with `BLOCKED: Secret-file access ...`, verified by the runtime probe below.

**Why it happens:** Settings/config file-read deny entries are tool-scoped. Claude/Gemini `Read(...)` patterns bind the Read tool; Codex TOML permission profiles bind filesystem access. An agent using the Bash tool to run `cat .env` is not protected by file-read intent alone. Two coverage layers are required: file-read deny for the file tool path AND Bash-hook regex for shell.

**Evidence:**
- `.claude/settings.json` (search: `"Read(**/.env*)"`) - tool-scoped deny patterns, not applied to Bash. `.goat-flow/hook-lib/patterns-paths.sh` (search: `is_secret_path_touch`) - Bash-side sentinel added 2026-04-19, blocking `cat .env`, `source .env`, `cat ~/.ssh/id_rsa`, `cat ~/.aws/credentials`, and `.pem/.key/.pfx` across hook-capable agents.
- `src/cli/audit/harness/check-constraints.ts` (search: `bashDenyCoversSecrets`) - harness now requires BOTH `readDenyCoversSecrets` (settings/Codex permission file-read coverage) AND `bashDenyCoversSecrets` (Bash hook pattern) before classifying an agent as covered.
- `src/cli/facts/agent/hooks.ts` (search: `detectBashDenyCoversSecrets`) - fact derivation scans the deny hook file for the active secret sentinel plus family markers for `.env*`, `.env.example` parity, normalized `./` / `../` / `~/` roots, `.ssh/`, `.aws/`, `secrets/`, credentials, and `.pem/.key/.pfx`. Runtime probe: `bash .goat-flow/hook-lib/patterns-paths.sh --check="cat .env"` now returns exit 2 with `BLOCKED: Secret-file access blocked`.

**Prevention:**
1. For any new secret-path family added to the harness, extend BOTH `checkReadDenyCoversSecrets` in `src/cli/facts/agent/settings.ts` AND `detectBashDenyCoversSecrets` in `src/cli/facts/agent/hooks.ts`. A settings-only addition creates a false-pass; a hook-regex refactor without detector coverage, a false-fail.
2. Every hook `--self-test` must include `run_case "cat <secret>" "cat <secret>" 2` assertions; a structural PASS without live probes reopens the gap.
3. When reviewing a new agent's deny setup, run a runtime probe explicitly (e.g. `bash <hook> 'cat .env'`). Static inspection cannot distinguish tool-scoped from shell-scoped deny.

---

## Footgun: GitHub CLI comments bypassed shared-system write guardrails

**Status:** active | **Created:** 2026-05-20 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A model can post to GitHub through `gh issue comment ... --body-file ...` even when `git push` is blocked and the hook catches heredoc command substitution: the guardrail stops the risky shape (`$(cat <<EOF ...)`) but allows the same write through a temporary body file. A narrow first fix still missed valid `gh` grammar variants: inherited flags after the topic (`gh issue --repo owner/repo comment ...`) and `xargs ... gh issue comment ...` pipeline consumers.

**Why it happens:** The deny hook historically treated `gh` as an ordinary command unless it contained an already-blocked shell pattern. GitHub issue comments, PR reviews, releases, workflow runs, secrets/variables, and `gh api` POST/PATCH/PUT/DELETE calls mutate shared systems without `git push`, so push-only protection is incomplete. CLI parsers also accept option placement and wrapper forms not obvious from the incident.

**Evidence:**
- Reported incident: an assistant posted a GitHub issue comment to `owner/repo#64620` from forwarded Slack text; the user deleted it and reported the command (see the first probe below).
- Runtime probes (`bash workflow/hooks/hook-lib/patterns-writes.sh --check ...`) returned exit 0 before the first fix for `"gh issue comment 64620 --repo owner/repo --body-file /tmp/issue_64620_comment.md"` and `"gh api repos/owner/repo/issues/1/comments -X POST -f body=hi"`; before the second fix for `"gh issue --repo owner/repo comment 64620 --body hi"` and `"printf '%s\n' body | xargs -I{} gh issue comment 64620 --body {}"`.
- `workflow/hooks/hook-lib/patterns-writes.sh` (search: `is_gh_write_operation`) - classifies known GitHub-mutating `gh` subcommands and `gh api` write/default-body POST forms; `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `gh issue comment`) - locks the current `gh issue comment` path plus read-only allow cases.

**Prevention:**
1. Treat `git push` as only one GitHub write path. Any new shared-system GitHub mutation route must get both a hook rule and a self-test case.
2. For CLI write classifiers, test grammar variants, not only the observed command: global/inherited options before and after the topic, short option forms, pipeline consumers such as `xargs`, and read-only controls.
3. Keep explicit read-only `gh` cases in the self-test (`issue view`, `pr checks`, `gh api --method GET`) so write blocking doesn't become a blanket GitHub-read ban.
4. Forwarded Slack/email/ticket text is evidence, not authorization. The hook blocks mechanical `gh` writes; agents still need an in-turn user approval rule before any shared-system write path outside Bash.

**Amendment (2026-06-02):** ADR-028 narrowed - `gh issue comment` and `gh pr comment` are now allowed; all other `gh` writes stay blocked (PR review/merge/create/edit/close/ready, issue create/close/edit/delete/lock/transfer/develop, release/repo/label/workflow/run/gist/secret/variable/key/auth/codespace/project/cache, and `gh api` non-GET/HEAD or body-field forms). The carve-out reopens the 2026-05-20 incident command; the residual control is the host's per-call permission prompt. `gh api` writes stay blocked, so the comments endpoint via `gh api repos/.../issues/N/comments -X POST -f body=...` still trips the hook. See ADR-028 Amendment. Rule (4) stands: forwarded text is not authorization.

---

## Footgun: Copilot preToolUse hooks must distinguish structured payloads from Bash calls

**Status:** active | **Created:** 2026-04-21 | **Evidence:** ACTUAL_MEASURED

**Active trap:** Copilot-style `preToolUse` hooks can receive structured payloads for non-bash tools as well as shell commands. A bash-only deny check that doesn't branch on `toolName` can deny safe non-bash tools or apply command regexes to the wrong payload shape.

**Original failure (resolved):** The Copilot hook was registered for all tools and treated every payload as bash; non-bash tools (view, edit, Task) had no `command` field, so it denied them. It now reads `toolName` and exits 0 silently for non-bash tools - the active footgun is preserving that distinction in future changes.

**Prevention:**
1. Any hook registered for a non-bash-specific event MUST read `toolName` before applying bash-only checks. Structured-payload ≠ bash-payload on runtimes like Copilot that pipe all tool calls through `preToolUse`.
2. When adding a new runtime surface, the self-test must include at least one non-bash `toolName` payload (e.g. `view`, `edit`, `Task`). Bash-only coverage masks this failure shape.
3. Use the forbidden-pattern helper (`!pattern` prefix in `run_stdin_case`) for allow-path assertions - exit 0 alone does NOT distinguish "allowed silently" from "denied via copilot-json", since both exit 0.

**Evidence:**
- `workflow/hooks/deny-dangerous.sh` (search: `detect_output_mode`) - split hooks preserve Copilot JSON deny responses for Bash payloads; the self-test (`bash .goat-flow/hook-lib/deny-dangerous-self-test.sh --self-test=smoke`) covers Copilot-shaped Bash payloads with deny JSON assertions.

---

## Footgun: Installed settings.json deny patterns can silently drift from workflow templates

**Status:** active | **Created:** 2026-04-26 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** An agent can perform an action (e.g. `git push origin feature-branch`) that the workflow template blocks, because the installed settings.json drifted to a weaker deny pattern than the template it was installed from (or the hook only blocks a narrower set). Now covered by preflight's Agent Config Parity check, so the active trap is skipping that check or changing deny semantics without updating the parity rules.

**Why it happens:** `workflow/hooks/agent-config/claude.json` is the install template for `.claude/settings.json`. The template had `Bash(*git push*)` (block all push) but the installed copy drifted to `Bash(*git push*--force*)` (block force only). At incident time, preflight covered skill files and shared references but not settings.json deny patterns; the `Agent Config Parity` section now verifies installed settings with `covers()`.

**Evidence:**
- `workflow/hooks/agent-config/claude.json` (search: `git push`) - template had the correct blanket pattern; `.claude/settings.json` (search: `git push`) - installed copy had drifted to force-only, fixed 2026-04-26 per ADR-025.
- `scripts/preflight-checks.sh` (search: `Agent Config Parity`) - parity check validates installed agent settings against workflow templates.

**Prevention:**
1. After changing any deny pattern in a settings template (`workflow/hooks/agent-config/*.json`), run `bash scripts/preflight-checks.sh` and confirm `Agent Config Parity` still passes.
2. When reviewing hook or settings changes, compare the installed file against its workflow template, not just the other agent mirrors.
3. If a new agent config surface is added, extend the Agent Config Parity map and `covers()` validation in the same change.

---

## Footgun: Codex permission profiles must match the local CLI grammar

**Status:** active | **Created:** 2026-05-19 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Codex warns or fails before shell startup when the profile names a workspace-root token, access value, or base-profile shape the runtime can't load. On 0.136.0, the old profile that set `"." = "write"` and `"secrets/**" = "none"` under `:workspace_roots` failed before startup with the `bwrap: execvp ... codex: No such file or directory` error (full string in evidence). On 0.131.0, `:project_roots` was ignored and absent exact entries (`.env.example`, `.docker/config.json`, `.kube/config`) could break startup. The TOML can still look like it denies `.env`, `.ssh/**`, `.aws/**`, and credential roots, so static review misses that Codex discarded the rules or built a namespace that can't see its own managed binary.

**Why it happens:** Codex permission grammar is version-sensitive. On 0.136.0, rebuilding the workspace profile from raw `:workspace_roots` entries instead of extending `:workspace` with `deny` omits Codex-managed runtime paths from the bwrap namespace, hiding Codex's own binary. On 0.131.0 the workspace token was `:workspace_roots` (not `:project_roots`) and exact workspace-root entries had to name files present in the checkout. A profile can be syntactically plausible yet unlaunchable for the installed version.

**Evidence:**
- `.codex/config.toml` (search: `extends = ":workspace"`) - installed config now extends Codex's built-in workspace profile and uses `deny` entries; `workflow/hooks/agent-config/codex.toml` (search: `extends = ":workspace"`) is the install template mirroring that loadable shape.
- `workflow/install-goat-flow.sh` (search: `active goat-flow profile does not extend`) - installer migration/validation refreshes old profiles that would break shell startup.
- `src/cli/facts/agent/settings.ts` (search: `isCodexDenyMode`) - audit fact extraction recognizes both legacy `none` and current `deny` entries; `src/cli/audit/check-agent-setup.ts` (search: `checkCodexWorkspaceRootExactPaths`) - audit fails when Codex config lists absent exact workspace-root paths.
- Runtime capture 2026-06-04: `codex sandbox --permissions-profile goat-flow -C /home/devgoat/projects/goat-flow pwd` failed with `bwrap: execvp .../vendor/x86_64-unknown-linux-musl/bin/codex: No such file or directory`; same command succeeded when the profile was supplied as `permissions.goat-flow={extends=":workspace", filesystem={... "blocked/**"="deny"}}`.
- 2026-05-19 startup failure showed repeated `':project_roots' is not recognized by this version of Codex and will be ignored` warnings; a binary probe that day found `:workspace_roots` (and no `:project_roots`) in Codex 0.131.0's embedded schema.

**Prevention:**
1. For Codex 0.136+, make goat-flow profiles extend `:workspace` and use `deny` access entries; don't rebuild workspace write access with `"." = "write"` and `none`.
2. Don't convert Codex workspace permissions back to `:project_roots`; that token is runtime-invalid on Codex 0.131.0.
3. Verify Codex config changes with `codex sandbox --permissions-profile goat-flow -C <project> pwd` as well as `codex doctor`; install health alone misses project-profile namespace failures.
4. Keep `.codex/config.toml`, `workflow/hooks/agent-config/codex.toml`, and `src/cli/facts/agent/settings.ts` in the same patch whenever Codex permission grammar changes.
5. Treat Codex permission-profile secret coverage as a loadable set, not a future-file deny list. Prefer recursive `deny` globs that leave `.env.example` readable over absent exact root-file entries.

---

## Footgun: Codex config preservation can leave old permission profiles behind

**Status:** active | **Created:** 2026-05-21 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A normal `goat-flow install . --agent codex` upgrade refreshes skills and hook scripts but preserves an existing `.codex/config.toml`. If that file predates the permission-profile template, setup and agent checks pass while `audit --harness` still reports incomplete direct literal secret-path blocking for Codex - the setup prompt shows "0 audit checks failed" unless run in harness mode.

**Why it happens:** The installer skips existing settings to avoid clobbering local config. For Codex, `.codex/config.toml` is both a settings file and the provider-native filesystem deny surface (hook registration lives separately in `.codex/hooks.json`). Preserving it is safe for local customizations but doesn't migrate `default_permissions = "goat-flow"` or `[permissions.goat-flow.filesystem]`.

**Evidence:**
- `workflow/install-goat-flow.sh` (search: `Settings file was preserved`) - existing settings are skipped unless `--force`; `workflow/hooks/agent-config/codex.toml` (search: `default_permissions = "goat-flow"`) - the 1.7.0 template carries the required permission-profile surface.
- `src/cli/audit/harness/check-constraints.ts` (search: `direct literal secret-path blocking incomplete`) - harness detects the missing combined file-read and Bash-hook coverage.
- 2026-05-21 downstream upgrade: after normal Codex install, `audit --agent codex --harness` failed Constraints until exact existing root env files were added to `.codex/config.toml` alongside the template profile.

**Prevention:**
1. After Codex upgrades, run `goat-flow audit . --agent codex --harness`, not just the default setup audit.
2. If Codex settings were preserved, compare `.codex/config.toml` with `workflow/hooks/agent-config/codex.toml` and add the permission profile plus exact denies only for sensitive root files present in the checkout.
3. Improve the installer/setup prompt to distinguish "hook registration" (`.codex/hooks.json`) from "filesystem deny profile" (`.codex/config.toml`) when settings are preserved.

---

## Footgun: Git push deny checks must normalize shell wrappers and control bodies

**Status:** active | **Created:** 2026-04-27 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A deny hook can appear to block `git push` while allowing valid shell forms that execute a push through environment wrappers, quoted assignments, `if`/`then` bodies, function bodies, or login-command wrappers such as `bash -lc 'git push ...'`.

**Why it happens:** A token check that only normalizes the start of a simple command misses shell grammar around the command word: `env -i git push ...` (env option after `env`), `FOO='a b' git push ...` (whitespace in an assignment value), `if true; then git push ...; fi` (segment starts with `then`), `f(){ git push ...; }; f` (segment starts with a function declaration).

**Evidence:**
- `workflow/hooks/hook-lib/patterns-writes.sh` (search: `is_git_push`) - current split hook blocks git push and destructive git mutations; `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `sudo git push`) - self-test coverage for wrapper-prefixed git push.
- Before the fix, `bash workflow/hooks/hook-lib/patterns-writes.sh --check <cmd>` returned exit 0 for: `'env -i git push origin main'`, `"FOO='a b' git push origin main"`, `'if true; then git push origin main; fi'`, `'f(){ git push origin main; }; f'`; and before the `-lc` fix: `"bash -lc 'git push origin main'"`, `"sh -lc 'git push origin main'"`.

**Prevention:**
1. Any future `git push` deny edit must include runtime probes for env options, quoted assignments, shell control keywords, function bodies, and `sh`/`bash -c` plus `-lc` wrappers, not only direct push and pipe/semicolon chains.
2. Keep the workflow hook, `scripts/` copy, and all installed agent hook copies byte-identical after policy changes.
3. Prefer normalizing to the shell command word before calling `is_git_push`; don't add one-off regexes for the latest bypass only.

---

## Footgun: Nested hook checks must reuse the command segment splitter

**Status:** active | **Created:** 2026-04-27 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** A hook can block top-level `true; rm -rf /` while allowing the same command nested inside `bash -c "true; rm -rf /"` or `echo "$(true; rm -rf /)"`.

**Why it happens:** Top-level input is split on `&&`, `||`, semicolons, and newlines before each segment is checked. Recursive paths for command substitution, process substitution, and `bash -c` can call the raw segment checker directly; if the nested string starts with a read-only verb (`echo`), the whitelist returns before the destructive segment is inspected.

**Evidence:**
- `workflow/hooks/hook-lib/patterns-shell.sh` (search: `rm_has_recursive`) - split destructive guardrail owns recursive deletion, shell execution, and destructive-command policy; `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `rm -rf`) - central self-test locks representative destructive-command blocking.
- Runtime proof before the fix: `bash workflow/hooks/deny-dangerous.sh --self-test=full` returned `FAIL [bash -c semicolon dangerous]: expected 2, got 0`, `FAIL [bash -c and-chain dangerous]: expected 2, got 0`, `FAIL [bash -c semicolon git push]: expected 2, got 0`.

**Prevention:**
1. Recursive hook paths MUST call `check_command_segments`, not `check_segment`, unless the caller already split shell control operators.
2. Every nested execution feature (`bash -c`, `$()`, `<()`) needs at least one chained-danger self-test, not only a single-danger body.
3. When a hook edit touches read-only whitelisting or recursive parsing, run the self-test before syncing copies so failures point at the canonical template.

---

## Footgun: Heredoc masking can hide executable shell lines

**Status:** active | **Created:** 2026-05-25 | **Evidence:** ACTUAL_MEASURED

**Symptoms:** Masking quoted heredoc bodies fixes false positives on inert report JSON/prose, but is unsafe if the masker doesn't exactly mirror Bash delimiter semantics: one that misses `<<-` tab-indented terminators keeps treating later shell lines as heredoc data, while a too-broad masker lets inert JSON/prose trip the chain-count cap.

**Why it happens:** The guardrail shell parser is a policy parser, not Bash: it preserves the heredoc opener, ignores safe quoted bodies for chain-counting, keeps shell-fed heredocs (`bash <<'EOF'`) inspectable, and resumes scanning right after the real delimiter - so false-positive and bypass fixes share one coupled boundary.

**Evidence:**
- Runtime probe before the 2026-05-25 fix returned exit 0 for a `cat <<-'EOF' ... EOF` followed by `rm -rf /`, because the tab-indented delimiter was not recognized and the later `rm` line was masked as body data.
- `workflow/hooks/hook-lib/patterns-shell.sh` (search: `rm_has_recursive`) - split destructive guardrail owns shell execution and destructive-command checks after the M10 hook split; `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `rm -rf`) - central self-test locks representative destructive-command blocking.

**Prevention:**
1. Any heredoc masking edit must test both sides of the boundary: safe quoted report data is allowed, shell-fed heredoc bodies stay inspectable, and commands after `<<-` tab-indented delimiters are scanned.
2. Self-test helpers must exercise the same policy path as runtime, including the 50-segment cap; testing only `check_command_segments` misses chain-cap false-positives.
3. Keep workflow, `scripts/`, and installed agent hook mirrors byte-identical after heredoc edits.

---

## Resolved Entries

> Historical record. These entries are no longer active traps.

- **git diff --stat is unreliable for scope detection** (resolved 2026-04-03) - Skill templates rewritten in M17; auto-detect now uses staged changes first, then unstaged and full diff.
- **Advisory hooks create unfixable quality warning after setup** (resolved 2026-04-14) - Hook scripts now ship in enforce mode by default (`GOAT_LINT_ENFORCE` defaults to 1).
- **Codex hooks registered in config.toml instead of hooks.json** (resolved 2026-04-15) - Moved hook definitions to `.codex/hooks.json` per official Codex docs; TOML hook sections were silently ignored.
- **Codex hook migrations drift across live files, templates, installer, and docs** (resolved 2026-04-15) - Restored the missing Codex guardrail hook registration and aligned all four Codex hook surfaces.
- **Deny hook blocks read-only commands containing dangerous string literals** (resolved 2026-04-17) - the split guardrails keep representative read-only allow paths in `workflow/hooks/hook-lib/deny-dangerous-self-test.sh` (search: `expect_allow`); template hooks and installed per-agent hook directories are checked by preflight config parity.
