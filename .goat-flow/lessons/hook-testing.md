---
category: hook-testing
last_reviewed: 2026-05-26
---

## Lesson: Normalize agent hook payload variants before field access

**Status:** active | **Created:** 2026-05-26

**What happened:** While adding Antigravity hook payload support, I changed the guardrail jq extractor to read `.toolArgs.command` directly. Copilot can send `toolArgs` as a JSON string, so jq errored before reaching the `fromjson?` fallback. `bash workflow/hooks/guardrails-self-test.sh --self-test=full` caught three Copilot deny regressions before the change shipped.

**Root cause:** I added a new agent payload shape without first normalizing the existing polymorphic field shape shared by another agent. The fallback was present, but the earlier direct field access made it unreachable for string payloads.

**Prevention:** For hook payload parsing, normalize variant fields first, then read subfields. Keep self-tests for every registered agent payload shape in `workflow/hooks/guardrails-self-test.sh` (search: `expect_copilot_block`, `expect_antigravity_block`) and run the full self-test after every extractor edit. Evidence anchors: `workflow/hooks/deny-git-mutations.sh` (search: `if type == "string" then fromjson?`) and `workflow/hooks/guardrails-self-test.sh` (search: `expect_antigravity_secret_file_block`).

## Lesson: Hook write-block tests must vary valid CLI grammar

**Status:** active | **Created:** 2026-05-20

**What happened:** The first GitHub CLI write-block fix covered the reported `gh issue comment ... --body-file ...` command, `gh api` writes, direct read-only controls, and one pre-topic `--repo` form. A follow-up review still found valid write shapes returning exit 0: `gh issue --repo owner/repo comment 64620 --body hi` and `printf '%s\n' body | xargs -I{} gh issue comment 64620 --body {}`.

**Root cause:** I tested the incident shape and a few nearby commands, but not the CLI grammar surface. GitHub CLI accepts inherited flags after the topic, and shell pipeline consumers can move the real command behind a wrapper such as `xargs`.

**Prevention:** For hook rules that classify write-capable CLI commands, build the regression set as a grammar matrix before mirror fanout: direct incident form, global flags before topic, inherited flags after topic, short flag forms, shell wrappers, pipeline consumers such as `xargs`, write-method API forms, and read-only allow controls. Evidence anchors: `workflow/hooks/deny-git-mutations.sh` (search: `contains_git_mutation`), `workflow/hooks/guardrails-self-test.sh` (search: `gh issue comment`).
