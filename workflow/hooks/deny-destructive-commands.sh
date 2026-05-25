#!/usr/bin/env bash
# deny-destructive-commands.sh - PreToolUse hook for destructive shell commands.
# Blocks rm -rf, chmod 777, curl | bash pipe-to-shell, docker push, and
# chained command strings that contain those destructive segments.

set -euo pipefail

SELF_TEST_MODE=""
CHECK_COMMAND=""

for arg in "$@"; do
  case "$arg" in
    --self-test) SELF_TEST_MODE="smoke" ;;
    --self-test=*) SELF_TEST_MODE="${arg#--self-test=}" ;;
    --check=*) CHECK_COMMAND="${arg#--check=}" ;;
    --check)
      shift
      CHECK_COMMAND="${1:-}"
      ;;
  esac
done

if [[ -n "$SELF_TEST_MODE" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  exec bash "$script_dir/guardrails-self-test.sh" "--self-test=$SELF_TEST_MODE" --hook deny-destructive-commands
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

contains_destructive_command() {
  local cmd="$1"
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(sudo[[:space:]]+)?rm[[:space:]]+-[^[:space:]]*r[^[:space:]]*f'; then
    printf 'recursive force deletion'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])sudo[[:space:]]+(apt(-get)?|dnf|yum|pacman|brew)[[:space:]]+(install|remove|upgrade|update)'; then
    printf 'privileged package-manager mutation'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(mkfs|dd[[:space:]].*of=/dev/|diskutil[[:space:]]+erase|wipefs|shred)[[:space:]]'; then
    printf 'disk-destructive command'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq 'chmod[[:space:]]+(-R[[:space:]]+)?777'; then
    printf 'chmod 777'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba)?sh'; then
    printf 'pipe-to-shell execution'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|])(eval|bash[[:space:]]+-c|sh[[:space:]]+-c|zsh[[:space:]]+-c|python[[:space:]]+-c|node[[:space:]]+-e|perl[[:space:]]+-e)[[:space:]]'; then
    printf 'opaque interpreter execution'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(^|[[:space:];&|]):[[:space:]]*>|(^|[[:space:];&|])truncate[[:space:]]+-s[[:space:]]*0'; then
    printf 'file truncation'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(mysql|psql|sqlite3|mongosh|redis-cli)[^;&|]*(DROP[[:space:]]+(TABLE|DATABASE)|TRUNCATE[[:space:]]+TABLE|FLUSHALL)'; then
    printf 'destructive database command'
    return 0
  fi
  if printf '%s' "$cmd" | grep -Eiq '(docker[[:space:]]+push|terraform[[:space:]]+destroy|terraform[[:space:]]+apply[^;&|]*-auto-approve|aws[[:space:]]+s3[[:space:]]+rm|aws[[:space:]]+ec2[[:space:]]+terminate)'; then
    printf 'cloud or infrastructure destructive command'
    return 0
  fi
  return 1
}

payload="$(read_payload)"
command_text="$(extract_command "$payload")"
if reason="$(contains_destructive_command "$command_text")"; then
  deny "$payload" "Deny destructive commands: $reason"
fi
allow_if_antigravity "$payload"
exit 0
