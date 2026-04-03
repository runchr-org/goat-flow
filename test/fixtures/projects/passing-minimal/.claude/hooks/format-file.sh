#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // empty')
case "$file_path" in
  .claude/*|.agents/*|.gemini/*)
    exit 0
    ;;
  *.sh)
    shfmt -w "$file_path"
    ;;
  *)
    prettier --write "$file_path"
    ;;
esac
exit 0
