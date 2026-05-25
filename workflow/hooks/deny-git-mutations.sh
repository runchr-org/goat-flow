#!/usr/bin/env bash
# deny-git-mutations.sh - PreToolUse hook for agent-side git/GitHub writes.
# Blocks git push, git commit, destructive git flags, and gh write operations.

set -euo pipefail

SELF_TEST_MODE=""
CHECK_COMMAND=""

for arg in "$@"; do
  case "$arg" in
    --self-test) SELF_TEST_MODE="smoke" ;;
    --self-test=*) SELF_TEST_MODE="${arg#--self-test=}" ;;
    --check=*) CHECK_COMMAND="${arg#--check=}" ;;
  esac
done

if [[ -n "$SELF_TEST_MODE" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  exec bash "$script_dir/guardrails-self-test.sh" "--self-test=$SELF_TEST_MODE" --hook deny-git-mutations
fi

read_payload() {
  if [[ -n "$CHECK_COMMAND" ]]; then
    printf '%s' "$CHECK_COMMAND"
    return
  fi
  cat || true
}

json_value() {
  local payload="$1"
  local expr="$2"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r "$expr // empty" 2>/dev/null || true
  fi
}

fallback_command() {
  local payload="$1"
  if [[ "$payload" =~ \"(command|CommandLine|commandLine)\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
    printf '%s' "${BASH_REMATCH[2]}"
  else
    printf '%s' "$payload"
  fi
}

extract_command() {
  local payload="$1"
  local command
  if [[ -n "$CHECK_COMMAND" ]]; then
    printf '%s' "$CHECK_COMMAND"
    return
  fi
  command="$(json_value "$payload" '.tool_input.command // .toolCall.args.CommandLine // .toolCall.args.command // .toolCall.args.commandLine // .toolCall.args.input // .command // .input // (.toolArgs | if type == "string" then fromjson? else . end | .command)')"
  [[ -n "$command" ]] || command="$(fallback_command "$payload")"
  printf '%s' "$command"
}

is_copilot_payload() {
  local payload="$1"
  [[ "$payload" == *'"toolName"'* && "$payload" != *'"tool_name"'* ]]
}

is_antigravity_payload() {
  local payload="$1"
  [[ "$payload" == *'"toolCall"'* ]]
}

deny() {
  local payload="$1"
  local reason="$2"
  if is_copilot_payload "$payload"; then
    printf '{"permissionDecision":"deny","permissionDecisionReason":"%s"}\n' "$reason"
    exit 0
  fi
  if is_antigravity_payload "$payload"; then
    printf '{"decision":"deny","reason":"%s"}\n' "$reason"
    exit 0
  fi
  printf 'BLOCKED: %s\n' "$reason" >&2
  exit 2
}

allow_if_antigravity() {
  local payload="$1"
  if is_antigravity_payload "$payload"; then
    printf '{"decision":"allow"}\n'
  fi
}

contains_git_mutation() {
  local cmd="$1"
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(sudo[[:space:]]+)?git[[:space:]]+push([[:space:]]|$)'; then
    printf 'git push'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(sudo[[:space:]]+)?git[[:space:]]+commit([[:space:]]|$)'; then
    printf 'git commit'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(sudo[[:space:]]+)?git[[:space:]]+(reset[[:space:]]+--hard|clean[[:space:]]+-[^[:space:]]*f|branch[[:space:]]+-D|tag[[:space:]]+-d|checkout[[:space:]]+-f|rebase|filter-branch|remote[[:space:]]+(add|remove|set-url))'; then
    printf 'destructive git mutation'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])gh[[:space:]]+(issue|pr|release|gist|repo|api)[[:space:]][^;&|]*(create|edit|delete|close|reopen|merge|comment|upload|--method[[:space:]]+(POST|PATCH|PUT|DELETE)|-X[[:space:]]+(POST|PATCH|PUT|DELETE))'; then
    printf 'GitHub write operation'
    return 0
  fi
  return 1
}

payload="$(read_payload)"
command_text="$(extract_command "$payload")"
if reason="$(contains_git_mutation "$command_text")"; then
  deny "$payload" "Deny git mutations: $reason"
fi
allow_if_antigravity "$payload"
exit 0
