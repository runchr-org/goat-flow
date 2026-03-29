#!/usr/bin/env bash
set -euo pipefail

# Publish @blundergoat/goat-flow to npm
# Usage: bash scripts/npm-publish.sh

VERSION=$(node -p "require('./package.json').version")
echo "Publishing @blundergoat/goat-flow@${VERSION}"

# Preflight
echo "--- Preflight ---"
npm run build
npm test
echo ""

# Dry run
echo "--- Dry run ---"
npm publish --dry-run --access public 2>&1 | tail -8
echo ""

read -rp "Publish v${VERSION} to npm? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

npm publish --access public
echo ""
echo "Published: https://www.npmjs.com/package/@blundergoat/goat-flow/v/${VERSION}"
