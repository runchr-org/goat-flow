#!/usr/bin/env bash
# deny-secret-access.sh - PreToolUse hook for direct literal secret-path access.

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
  exec bash "$script_dir/guardrails-self-test.sh" "--self-test=$SELF_TEST_MODE" --hook deny-secret-access
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
  local path
  if [[ -n "$CHECK_COMMAND" ]]; then
    printf '%s' "$CHECK_COMMAND"
    return
  fi
  command="$(json_value "$payload" '.tool_input.command // .toolCall.args.CommandLine // .toolCall.args.command // .toolCall.args.commandLine // .toolCall.args.input // .command // .input // (.toolArgs | if type == "string" then fromjson? else . end | .command)')"
  path="$(json_value "$payload" '.tool_input.file_path // .tool_input.path // .toolCall.args.AbsolutePath // .toolCall.args.TargetFile // .toolCall.args.FilePath // .toolCall.args.SearchPath // .toolCall.args.path // .toolCall.args.file_path')"
  if [[ -n "$path" ]]; then
    command="${command} ${path}"
  fi
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

is_env_example_touch() {
  local cmd="$1"
  [[ "$cmd" =~ (^|[[:space:]/.])\.env\.example($|[[:space:];&|]) ]] || return 1
  [[ "$cmd" =~ (>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\bchmod\b|\bchown\b) ]]
}

is_secret_path_touch() {
  local cmd="$1"
  local touches_secret=1
  shopt -s nocasematch
  if is_env_example_touch "$cmd"; then
    shopt -u nocasematch
    return 0
  fi
  if [[ "$cmd" =~ (^|[[:space:]\"\'=])((\./|\.\./|~/)*)\.env([[:space:];&|/]|$) ]] &&
    [[ ! "$cmd" =~ (^|[[:space:]\"\'=])((\./|\.\./|~/)*)\.env\.example([[:space:];&|]|$) ]]; then
    touches_secret=0
  elif [[ "$cmd" =~ (^|[[:space:]\"\'=])((\./|\.\./|~/)*)(\.ssh/|\.aws/|\.docker/|\.gnupg/|\.config/gcloud/|\.kube/config) ]]; then
    touches_secret=0
  elif [[ "$cmd" =~ (^|[[:space:]\"\'=/])(secrets/|credentials($|[[:space:]._/=-])|\.npmrc|\.pypirc) ]]; then
    touches_secret=0
  elif [[ "$cmd" =~ \.(pem|key|pfx|p12)($|[[:space:];&|]) ]]; then
    touches_secret=0
  fi
  shopt -u nocasematch
  return "$touches_secret"
}

payload="$(read_payload)"
command_text="$(extract_command "$payload")"
if is_secret_path_touch "$command_text"; then
  deny "$payload" "Secret-file access blocked"
fi
allow_if_antigravity "$payload"
exit 0
