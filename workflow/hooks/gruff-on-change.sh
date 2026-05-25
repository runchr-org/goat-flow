#!/usr/bin/env bash
# gruff-on-change.sh - PostToolUse hook: run gruff on just-edited files.

set -euo pipefail

FOOTER="For triage: consult .goat-flow/skill-playbooks/gruff-code-quality.md"
SUPPORTED_TOOLS=" Edit Write MultiEdit "
SKIP_DIR_PATTERN='(^|/)(node_modules|vendor|\.goat-flow|dist|build|coverage|\.git)(/|$)'

read_stdin() {
  local input
  input="$(cat || true)"
  printf '%s' "$input"
}

json_field() {
  local input="$1"
  local expr="$2"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r "$expr // empty" 2>/dev/null || true
    return
  fi
  return 1
}

fallback_tool_name() {
  local input="$1"
  if [[ "$input" =~ \"tool_name\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  elif [[ "$input" =~ \"toolName\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

fallback_file_path() {
  local input="$1"
  if [[ "$input" =~ \"file_path\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  elif [[ "$input" =~ \"path\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

variant_for_path() {
  local file_path="$1"
  case "${file_path##*.}" in
    ts|tsx|js|jsx) printf 'gruff-ts' ;;
    php) printf 'gruff-php' ;;
    go) printf 'gruff-go' ;;
    rs) printf 'gruff-rs' ;;
    py) printf 'gruff-py' ;;
    *) return 1 ;;
  esac
}

discover_binary() {
  local root="$1"
  local binary="$2"
  local candidate
  for candidate in \
    "$root/vendor/bin/$binary" \
    "$root/node_modules/.bin/$binary" \
    "${HOME:-}/.local/bin/$binary"
  do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  command -v "$binary" 2>/dev/null || true
}

run_gruff() {
  local binary_path="$1"
  local file_path="$2"
  if command -v timeout >/dev/null 2>&1; then
    timeout 30 "$binary_path" analyse "$file_path" 2>&1
    return $?
  fi
  "$binary_path" analyse "$file_path" 2>&1
}

main() {
  local payload tool_name file_path root binary binary_path config_file output status
  payload="$(read_stdin)"
  tool_name="$(json_field "$payload" '.tool_name // .toolName')"
  [[ -n "$tool_name" ]] || tool_name="$(fallback_tool_name "$payload")"
  [[ "$SUPPORTED_TOOLS" == *" $tool_name "* ]] || exit 0

  file_path="$(json_field "$payload" '.tool_input.file_path // .tool_input.path // .toolArgs.file_path // .toolArgs.path')"
  [[ -n "$file_path" ]] || file_path="$(fallback_file_path "$payload")"
  [[ -n "$file_path" ]] || exit 0
  [[ "$file_path" =~ $SKIP_DIR_PATTERN ]] && exit 0

  root="$(repo_root)"
  binary="$(variant_for_path "$file_path" || true)"
  [[ -n "$binary" ]] || exit 0
  config_file="$root/.${binary}.yaml"
  [[ -f "$config_file" ]] || exit 0

  binary_path="$(discover_binary "$root" "$binary")"
  [[ -n "$binary_path" ]] || exit 0

  set +e
  output="$(run_gruff "$binary_path" "$file_path")"
  status=$?
  set -e

  if [[ "$status" -eq 124 ]]; then
    printf 'gruff-on-change: %s crashed or timed out\n' "$binary" >&2
    exit 0
  fi
  if [[ -n "$output" ]]; then
    printf '%s\n%s\n' "$output" "$FOOTER"
  fi
  exit 0
}

main "$@"
