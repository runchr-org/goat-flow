#!/usr/bin/env bash

# prettier.sh
#
# Purpose:
#   Runs prettier in write or check mode.
#
# Usage:
#   bash scripts/prettier.sh [--write|--check]
#
# Exit:
#   0 on successful requested mode, 1 if mode is invalid or prettier command fails.
#
# Requirements:
#   - node, npm
#   - npm scripts `format` and/or `format:check` if used.

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

info() { echo "INFO: $1"; }
fail() { echo "ERROR: $1" >&2; exit 1; }

MODE="${1:---write}"

case "$MODE" in
    --write)  info "Formatting files..."; npm run format ;;
    --check)  info "Checking formatting..."; npm run format:check ;;
    *)        fail "Usage: $0 [--write|--check]" ;;
esac
