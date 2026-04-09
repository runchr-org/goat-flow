#!/usr/bin/env bash
# =============================================================================
# deny-dangerous.sh - PreToolUse hook: blocks dangerous commands before execution
# =============================================================================
# Event:  PreToolUse (Claude), BeforeTool (Gemini)
# Match:  Bash tool calls
# Exit 0: allow the command
# Exit 2: block the command (stderr message shown to the agent as the reason)
#
# Install (Claude): copy to .claude/hooks/deny-dangerous.sh
# Register in .claude/settings.json:
#   "PreToolUse": [{ "matcher": "Bash", "hooks": [{
#     "type": "command",
#     "command": "bash \"$(git rev-parse --show-toplevel)/.claude/hooks/deny-dangerous.sh\""
#   }]}]
#
# Limitations:
# - Best-effort pattern matching on literal shell commands
# - Does NOT catch: variable indirection ($cmd), shell aliases, encoded
#   commands, subshell execution, or `source .env`
# - Defense in depth: combine with settings.json deny patterns + CLAUDE.md rules
# =============================================================================
set -uo pipefail

# --- JSON Input Parsing ------------------------------------------------------
# The agent runtime pipes JSON on stdin with tool_name and tool_input fields.
INPUT=$(cat)

if command -v jq >/dev/null 2>&1; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "$INPUT")
else
  # Fallback: extract with sed (less reliable but works without jq)
  # Handle escaped quotes (\") inside the JSON string value
  COMMAND=$(echo "$INPUT" | sed -n 's/.*"command"\s*:\s*"\(.*\)".*/\1/p' | head -1 | sed 's/\\"/"/g')
  [[ -z "$COMMAND" ]] && COMMAND="$INPUT"
fi

# --- Helper -------------------------------------------------------------------
block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

# --- Pattern Checks ----------------------------------------------------------
# Each function checks one dangerous pattern. Add project-specific blocks below.
check_segment() {
  local cmd="$1"

  # 1. rm -rf without safe scoping
  #    Block: rm -rf / , rm -rf ~, rm -rf without a real path
  #    Allow: rm -rf ./node_modules, rm -rf dist/, rm -rf /tmp/build-*
  if [[ "$cmd" =~ rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f|rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r ]]; then
    if ! [[ "$cmd" =~ rm[[:space:]]+-(rf|fr)[[:space:]]+(\./[a-zA-Z]|[a-zA-Z]|/tmp/[a-zA-Z0-9._-]) ]]; then
      block "rm -rf without safe scoping. Specify an explicit target path."
    fi
  fi

  # 2. rm with long-form recursive+force flags
  if [[ "$cmd" =~ rm[[:space:]]+.*--recursive ]] && [[ "$cmd" =~ rm[[:space:]]+.*--force ]]; then
    block "rm --recursive --force. Use explicit target paths."
  fi

  # 3. Direct push to main/master (case-insensitive)
  local cmd_lower="${cmd,,}"
  if [[ "$cmd_lower" =~ git[[:space:]]+push[[:space:]]+.*(main|master|production) ]]; then
    block "Direct push to main/master/production. Push to a feature branch and open a PR."
  fi

  # 4. Force push (--force or -f shorthand)
  #    Note: --force-with-lease is also caught here intentionally.
  #    If you want to allow --force-with-lease, add an exception.
  if [[ "$cmd" =~ git[[:space:]]+push[[:space:]]+.*--force ]]; then
    block "git push --force. Use --force-with-lease if you must force-push."
  fi
  if [[ "$cmd" =~ git[[:space:]]+push[[:space:]]+(.*[[:space:]])?-f([[:space:]]|$) ]]; then
    block "git push -f (force push shorthand). Use --force-with-lease instead."
  fi

  # 5. chmod 777 (world-writable)
  if [[ "$cmd" =~ chmod[[:space:]]+777 ]]; then
    block "chmod 777 sets world-writable permissions. Use a more restrictive mode."
  fi

  # 6. Pipe-to-shell (curl|bash, wget|sh, curl|python, etc.)
  if [[ "$cmd" =~ (curl|wget)[^|]*\|[[:space:]]*(ba)?sh ]]; then
    block "Pipe-to-shell (curl|bash). Download first, inspect, then run."
  fi
  if [[ "$cmd" =~ (curl|wget)[^|]*\|[[:space:]]*(python|python3|node|perl|ruby) ]]; then
    block "Pipe-to-interpreter. Download first, inspect, then run."
  fi

  # 7. .env file modifications
  if [[ "$cmd" =~ (\>|\>\>|tee|sed[[:space:]]+-i|nano|vim?|code)[[:space:]]+.*\.env($|[[:space:]]|\.) ]]; then
    block ".env file modification. Edit .env files manually, not through the agent."
  fi

  # 8. --no-verify bypass (skips git hooks)
  if [[ "$cmd" =~ git[[:space:]]+.*--no-verify ]]; then
    block "git --no-verify skips safety hooks. Remove the flag and fix the underlying issue."
  fi

  # 9. Lockfile direct modifications (must go through package manager)
  if [[ "$cmd" =~ (\>|\>\>|tee|sed[[:space:]]+-i)[[:space:]]+.*(package-lock\.json|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|yarn\.lock) ]]; then
    block "Direct lockfile modification. Use the package manager (npm install, composer update, etc.)."
  fi

  # --- CUSTOMIZE: Add project-specific blocks below --------------------------
  # Example: block direct edits to generated files
  # if [[ "$cmd" =~ (sed|tee|>)[[:space:]]+.*generated\.ts ]]; then
  #   block "generated.ts is auto-generated. Edit the source template instead."
  # fi
}

# --- Command Chaining Split ---------------------------------------------------
# Split on &&, ||, and ; so chained commands are each checked independently.
# Without this, "safe-cmd && rm -rf /" bypasses detection.
IFS=$'\n' read -r -d '' -a segments < <(echo "$COMMAND" | sed 's/&&/\n/g; s/||/\n/g; s/;/\n/g' && printf '\0') || true

for segment in "${segments[@]}"; do
  segment=$(echo "$segment" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$segment" ]] && continue
  check_segment "$segment"
done

# --- Default: allow -----------------------------------------------------------
exit 0
