#!/usr/bin/env bash
# prettier-check.sh
#
# Purpose:
#   Verifies repository formatting via the project's configured Prettier check.
#
# Usage:
#   bash scripts/prettier-check.sh
#
# Exit:
#   0 if format check passes, non-zero on formatting violations or command failures.
#
# Requirements:
#   - node, npm
#   - npm script `format:check` defined in package.json

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

info() { echo "INFO: $1"; }
fail() { echo "ERROR: $1" >&2; exit 1; }

info "Checking formatting..."
npm run format:check
