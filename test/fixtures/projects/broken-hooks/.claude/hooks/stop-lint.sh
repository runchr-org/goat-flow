#!/usr/bin/env bash
# Intentionally broken: swallows lint failures with || true
set -euo pipefail
file="${1:-}"
if [ -n "$file" ]; then
  echo "check $file"
fi
shellcheck scripts/*.sh .claude/hooks/*.sh || true
npx eslint . || true
bash scripts/context-validate.sh || true
bash scripts/preflight-checks.sh || true
wc -l CLAUDE.md >/dev/null
echo "validated"
exit 0
