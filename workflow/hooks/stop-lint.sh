#!/usr/bin/env bash
# =============================================================================
# stop-lint.sh - Post-turn hook: runs lint/type checks after every agent turn
# =============================================================================
# Event:  Stop (Claude & Codex), AfterAgent (Gemini)
# Match:  No matcher needed (fires after every turn)
# Advisory mode (default): reports errors, exits 0.
# Enforce mode: exits non-zero on errors (set GOAT_LINT_ENFORCE=1).
# Default stays advisory to prevent infinite fix loops.
#
# Install (Claude): copy to .claude/hooks/stop-lint.sh
# Register in .claude/settings.json:
#   "Stop": [{ "hooks": [{
#     "type": "command",
#     "command": "bash \"$(git rev-parse --show-toplevel)/.claude/hooks/stop-lint.sh\""
#   }]}]
# =============================================================================

# --- Infinite Loop Guard ------------------------------------------------------
# If this hook triggers a fix, and the fix triggers another Stop, the guard
# prevents re-entry. Without this, lint errors cause an infinite repair loop.
if [ "${STOP_HOOK_ACTIVE:-}" = "1" ]; then
  exit 0
fi
export STOP_HOOK_ACTIVE=1

# --- Locate repo root ---------------------------------------------------------
ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$ROOT" ]; then
  exit 0
fi
cd "$ROOT" || exit 0

ERRORS=""
ERROR_COUNT=0

# --- Detect changed file types ------------------------------------------------
# Only lint files that actually changed this turn. Avoids running expensive
# checks on the entire codebase every turn.
CHANGED_SH=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep '\.sh$') || CHANGED_SH=""
CHANGED_TS=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep '\.ts$\|\.tsx$') || CHANGED_TS=""
CHANGED_PY=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep '\.py$') || CHANGED_PY=""
CHANGED_PHP=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep '\.php$') || CHANGED_PHP=""

# Early exit when nothing changed
if [ -z "$CHANGED_SH" ] && [ -z "$CHANGED_TS" ] && [ -z "$CHANGED_PY" ] && [ -z "$CHANGED_PHP" ]; then
  exit 0
fi

# --- Shell scripts: bash -n + shellcheck --------------------------------------
if [ -n "$CHANGED_SH" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if [ -f "$f" ]; then
      # Syntax check (always available)
      if ! bash -n "$f" 2>/dev/null; then
        ERRORS="${ERRORS}Syntax error in $f\n"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      fi
      # Shellcheck (if installed)
      if command -v shellcheck >/dev/null 2>&1; then
        if ! SC_OUT=$(shellcheck "$f" 2>&1); then
          ERRORS="${ERRORS}shellcheck issues in $f:\n${SC_OUT}\n"
          ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
      fi
    fi
  done <<< "$CHANGED_SH"
fi

# --- TypeScript: tsc --noEmit -------------------------------------------------
# CUSTOMIZE: replace with your project's type-check command if different
if [ -n "$CHANGED_TS" ] && [ -f "tsconfig.json" ]; then
  if command -v npx >/dev/null 2>&1; then
    if ! TSC_OUT=$(npx tsc --noEmit 2>&1); then
      if [ -n "$TSC_OUT" ]; then
        ERRORS="${ERRORS}TypeScript errors:\n${TSC_OUT}\n"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      fi
    fi
  fi
fi

# --- Python: ruff (fast linter) -----------------------------------------------
# CUSTOMIZE: swap ruff for flake8, pylint, etc. if preferred
# Note: heavy linters (mypy, pylint on 500+ files) add 30-60s per turn.
# Scope to changed files only, or move to CI.
if [ -n "$CHANGED_PY" ]; then
  if command -v ruff >/dev/null 2>&1; then
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      if [ -f "$f" ]; then
        if ! RUFF_OUT=$(ruff check "$f" 2>&1); then
          ERRORS="${ERRORS}ruff issues in $f:\n${RUFF_OUT}\n"
          ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
      fi
    done <<< "$CHANGED_PY"
  fi
fi

# --- PHP: php -l (syntax check) -----------------------------------------------
# CUSTOMIZE: add phpstan/psalm here if desired (scoped to changed files)
if [ -n "$CHANGED_PHP" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if [ -f "$f" ]; then
      if ! PHP_OUT=$(php -l "$f" 2>&1); then
        ERRORS="${ERRORS}PHP syntax error in $f:\n${PHP_OUT}\n"
        ERROR_COUNT=$((ERROR_COUNT + 1))
      fi
    fi
  done <<< "$CHANGED_PHP"
fi

# --- Report errors to stderr (informational by default) ----------------------
if [ -n "$ERRORS" ]; then
  printf '%b' "Stop hook found issues:\n$ERRORS" >&2
fi

# --- Optional enforce mode ----------------------------------------------------
if [ "${GOAT_LINT_ENFORCE:-0}" = "1" ] && [ "$ERROR_COUNT" -gt 0 ]; then
  exit 1
fi

# --- Default advisory exit ----------------------------------------------------
exit 0
