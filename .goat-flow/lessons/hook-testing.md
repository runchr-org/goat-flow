---
category: hook-testing
last_reviewed: 2026-05-27
---

## Lesson: Restoring coverage by cloning a monolith is not a real split

**Status:** active | **Created:** 2026-05-27

**What happened:** While restoring lost `deny-dangerous.sh` coverage after the guardrail split, I copied the old parser/checker body into all three split hooks: `guard-destructive-shell.sh`, `guard-secret-paths.sh`, and `guard-repository-writes.sh`. Each file sets a different `GOAT_GUARD_SCOPE` and `reason_in_scope` filters which `block` calls actually exit, so runtime behavior is mostly separated. The implementation is still structurally wrong: every file carries unrelated parsers and checks for secrets, repository writes, destructive shell commands, and npm token deletion.

**Root cause:** I optimized for recovering behavior quickly after finding dropped coverage, but I skipped the design step that should have extracted shared parsing into one source or generated the three guards from one policy table. That turned "split hooks" into three scoped copies of a monolith.

**Prevention:** When splitting a safety hook, define the ownership boundary before porting code. If the hooks must stay self-contained, generate or review each file from explicit function sets: common payload parsing is allowed, but secret, repository, and destructive policy helpers must not cross guard boundaries. A line-count spike across every split file is a review blocker until the duplication is explained or removed. Evidence anchors: `workflow/hooks/guard-destructive-shell.sh` (search: `rm_has_recursive`), `workflow/hooks/guard-secret-paths.sh` (search: `is_secret_path_touch`), `workflow/hooks/guard-repository-writes.sh` (search: `is_gh_write_operation`), and `workflow/hooks/guard-destructive-shell.sh` (search: `npm token delete/revoke`).

## Lesson: Keep generated Bash regexes out of inline conditionals

**Status:** active | **Created:** 2026-05-27

**What happened:** While regenerating the self-contained split hooks, inline Bash EREs lost escaping for `>`, `|`, `<<<`, and quote classes. `bash -n` caught parse failures, and the full guardrails self-test caught `bash -c "echo ok; rm -rf /"` returning exit 0 because the inline quote regex captured only `r` instead of the inner command.

**Root cause:** I generated Bash through JavaScript strings and left complex regexes directly inside `[[ ... =~ ... ]]`, where shell parsing and string escaping both matter.

**Prevention:** In hook scripts, put EREs containing shell metacharacters or quote classes into named variables before matching. Run `bash -n` before mirror fanout, then run the central full self-test before treating behavior as restored. Evidence anchors: `workflow/hooks/guard-common.sh` (search: `shell_c_re`), `workflow/hooks/guard-common.sh` (search: `redirect_append_re`), and `workflow/hooks/guardrails-self-test.sh` (search: `bash -c chained rm`).

## Lesson: Dynamic hook helpers need explicit ShellCheck handling

**Status:** active | **Created:** 2026-05-27

**What happened:** After extracting `guard-common.sh`, I expected `# shellcheck source=guard-common.sh` above the runtime-computed `source "$GOAT_GUARD_SCRIPT_DIR/guard-common.sh"` line to satisfy linting. The repo's hook lint command does not run ShellCheck with `-x`, so ShellCheck failed every mirrored policy hook with SC1091 before any behavior checks could matter.

**Root cause:** I treated the source directive as enough without checking it against the exact lint invocation used by preflight and CI.

**Prevention:** For sourced hook helpers resolved through runtime variables, shellcheck the helper as its own input and suppress SC1091 only on the dynamic `source` line in each thin policy hook. Verify the workflow and installed mirrors with the same no-`-x` ShellCheck command used by preflight. Evidence anchors: `workflow/hooks/guard-common.sh` (search: `guard-common.sh - shared payload parsing`) and `workflow/hooks/guard-destructive-shell.sh` (search: `shellcheck disable=SC1091`).

---

## Lesson: Normalize agent hook payload variants before field access

**Status:** active | **Created:** 2026-05-26

**What happened:** While adding Antigravity hook payload support, I changed the guardrail jq extractor to read `.toolArgs.command` directly. Copilot can send `toolArgs` as a JSON string, so jq errored before reaching the `fromjson?` fallback. `bash workflow/hooks/guardrails-self-test.sh --self-test=full` caught three Copilot deny regressions before the change shipped.

**Root cause:** I added a new agent payload shape without first normalizing the existing polymorphic field shape shared by another agent. The fallback was present, but the earlier direct field access made it unreachable for string payloads.

**Prevention:** For hook payload parsing, normalize variant fields first, then read subfields. Keep self-tests for every registered agent payload shape in `workflow/hooks/guardrails-self-test.sh` (search: `expect_copilot_block`, `expect_antigravity_block`) and run the full self-test after every extractor edit. Evidence anchors: `workflow/hooks/guard-common.sh` (search: `def extract_command(value)`) and `workflow/hooks/guardrails-self-test.sh` (search: `expect_antigravity_secret_file_block`).

## Lesson: Hook write-block tests must vary valid CLI grammar

**Status:** active | **Created:** 2026-05-20

**What happened:** The first GitHub CLI write-block fix covered the reported `gh issue comment ... --body-file ...` command, `gh api` writes, direct read-only controls, and one pre-topic `--repo` form. A follow-up review still found valid write shapes returning exit 0: `gh issue --repo owner/repo comment 64620 --body hi` and `printf '%s\n' body | xargs -I{} gh issue comment 64620 --body {}`.

**Root cause:** I tested the incident shape and a few nearby commands, but not the CLI grammar surface. GitHub CLI accepts inherited flags after the topic, and shell pipeline consumers can move the real command behind a wrapper such as `xargs`.

**Prevention:** For hook rules that classify write-capable CLI commands, build the regression set as a grammar matrix before mirror fanout: direct incident form, global flags before topic, inherited flags after topic, short flag forms, shell wrappers, pipeline consumers such as `xargs`, write-method API forms, and read-only allow controls. Evidence anchors: `workflow/hooks/guard-repository-writes.sh` (search: `is_gh_write_operation`), `workflow/hooks/guardrails-self-test.sh` (search: `gh issue comment`).
