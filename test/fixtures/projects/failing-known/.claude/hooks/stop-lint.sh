#!/usr/bin/env bash
set -euo pipefail
npx eslint . >/dev/null 2>&1 || true
bash scripts/context-validate.sh >/dev/null 2>&1
exit 0
