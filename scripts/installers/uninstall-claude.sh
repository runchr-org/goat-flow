#!/usr/bin/env bash
# GOAT System Uninstaller - Claude CLI
# Run this script in Git Bash, WSL, or any Unix-like terminal

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

CLAUDE_NPM_PACKAGE=${CLAUDE_NPM_PACKAGE:-@anthropic-ai/claude-code}

show_help() {
    echo ""
    echo -e "${CYAN}Claude CLI Uninstaller${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help; exit 0 ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; show_help; exit 1 ;;
    esac
done

# Function to check if a command exists
command_exists() {
    local cmd_path
    cmd_path="$(command -v "$1" 2>/dev/null)" || return 1
    if [[ "${IS_WSL:-false}" == "true" && "$cmd_path" == /mnt/* ]]; then
        return 1
    fi
    return 0
}

sanitize_path_for_wsl() {
    if [[ "${IS_WSL:-false}" != "true" ]]; then
        return 0
    fi

    local new_path="" entry
    local path_entries=()
    IFS=':' read -r -a path_entries <<<"$PATH"
    for entry in "${path_entries[@]}"; do
        if [[ "$entry" != /mnt/* ]]; then
            new_path="${new_path:+${new_path}:}${entry}"
        fi
    done
    export PATH="$new_path"
}

remove_dir_prompt() {
    local dir confirm_remove
    dir=$1

    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}Not found: $dir${NC}"
        return 0
    fi

    if [ -z "${HOME:-}" ] || [ "$HOME" = "/" ]; then
        echo -e "${RED}HOME is not set safely. Skipping: $dir${NC}"
        return 1
    fi

    case "$dir" in
        "$HOME"/*) ;;
        *)
            echo -e "${RED}Refusing to remove path outside HOME: $dir${NC}"
            return 1
            ;;
    esac

    if [[ ! -t 0 ]]; then
        echo -e "${YELLOW}Non-interactive mode: skipping $dir${NC}"
        return 0
    fi

    read -r -p "Remove $dir ? (y/n): " confirm_remove
    if [[ "$confirm_remove" == "y" ]]; then
        if rm -rf -- "$dir"; then
            echo -e "${GREEN}Removed: $dir${NC}"
        else
            echo -e "${RED}Failed to remove: $dir${NC}"
        fi
    else
        echo -e "${YELLOW}Skipped: $dir${NC}"
    fi
}

IS_WSL=false
if [[ "$OSTYPE" == "linux-gnu"* ]] && [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
fi
sanitize_path_for_wsl

echo -e "${CYAN}Starting Claude CLI uninstallation process...${NC}"

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}npm is required to uninstall the Claude CLI package.${NC}"
    echo -e "${YELLOW}Please install Node.js/npm or remove the global package manually.${NC}"
    exit 1
fi

echo -e "\n${CYAN}========================================"
echo -e "Uninstalling Claude CLI via npm"
echo -e "========================================${NC}"

if npm uninstall -g "${CLAUDE_NPM_PACKAGE}"; then
    echo -e "\n${GREEN}Claude CLI uninstalled via npm.${NC}"
else
    echo -e "\n${YELLOW}npm uninstall reported an issue. The package may not have been installed globally.${NC}"
    echo -e "${YELLOW}You can check with: npm list -g ${CLAUDE_NPM_PACKAGE}${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Cleaning up Claude CLI data"
echo -e "========================================${NC}"

POSSIBLE_DIRS=(
    "${HOME:-}/.claude"
    "${HOME:-}/.config/claude"
    "${HOME:-}/.config/anthropic"
    "${HOME:-}/.cache/claude"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    remove_dir_prompt "$dir"
done

echo -e "\n${CYAN}========================================"
echo -e "Verifying uninstall"
echo -e "========================================${NC}"

if command_exists claude; then
    CLAUDE_PATH=$(command -v claude)
    echo -e "${YELLOW}claude command still present at: ${CLAUDE_PATH}${NC}"
    echo -e "${YELLOW}You may need to remove it from your PATH or restart your shell.${NC}"
else
    echo -e "${GREEN}Claude CLI command not found. Uninstall appears complete.${NC}"
fi

echo -e "\n${GREEN}========================================"
echo -e "Uninstallation process completed!"
echo -e "========================================${NC}"
