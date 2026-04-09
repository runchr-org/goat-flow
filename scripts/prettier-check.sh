#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

info() { echo "INFO: $1"; }
fail() { echo "ERROR: $1" >&2; exit 1; }

info "Checking formatting..."
npm run format:check
