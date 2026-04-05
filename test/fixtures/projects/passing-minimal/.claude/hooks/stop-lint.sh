#!/usr/bin/env bash
set -euo pipefail
file="${1:-}"
if [ -n "$file" ]; then
  echo "check $file"
fi
shellcheck scripts/*.sh .claude/hooks/*.sh >/dev/null
npx eslint . >/dev/null 2>&1
bash scripts/context-validate.sh >/dev/null 2>&1
bash scripts/preflight-checks.sh >/dev/null 2>&1
wc -l CLAUDE.md >/dev/null
echo "validated"
exit 0
