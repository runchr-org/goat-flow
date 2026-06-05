#!/usr/bin/env bash
# GOAT System Uninstaller - GitHub Copilot CLI
# Run this script in Git Bash, WSL, or any Unix-like terminal

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COPILOT_NPM_PACKAGE=${COPILOT_NPM_PACKAGE:-@github/copilot}
COPILOT_HOME_DIR=${COPILOT_HOME:-${HOME:-}/.copilot}
COPILOT_CACHE_DIR=${COPILOT_CACHE_HOME:-${XDG_CACHE_HOME:-${HOME:-}/.cache}/copilot}

show_help() {
    echo ""
    echo -e "${CYAN}GitHub Copilot CLI Uninstaller${NC}"
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

echo -e "${CYAN}Starting GitHub Copilot CLI uninstallation process...${NC}"

echo -e "\n${CYAN}========================================"
echo -e "Checking for Homebrew / WinGet installation"
echo -e "========================================${NC}"

if command_exists brew && brew list copilot-cli >/dev/null 2>&1; then
    if brew uninstall copilot-cli; then
        echo -e "${GREEN}Homebrew uninstall completed.${NC}"
    else
        echo -e "${YELLOW}Homebrew uninstall reported an issue.${NC}"
    fi
else
    echo -e "${YELLOW}Copilot CLI not found in Homebrew.${NC}"
fi

if command_exists winget; then
    if winget uninstall GitHub.Copilot; then
        echo -e "${GREEN}WinGet uninstall completed.${NC}"
    else
        echo -e "${YELLOW}WinGet uninstall reported an issue or Copilot CLI was not installed through WinGet.${NC}"
    fi
else
    echo -e "${YELLOW}WinGet not found. Skipping WinGet uninstall.${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Uninstalling GitHub Copilot CLI via npm"
echo -e "========================================${NC}"

if command_exists npm && npm uninstall -g "${COPILOT_NPM_PACKAGE}"; then
    echo -e "${GREEN}GitHub Copilot CLI uninstalled via npm.${NC}"
elif command_exists npm; then
    echo -e "${YELLOW}npm uninstall reported an issue. The package may not have been installed globally.${NC}"
    echo -e "${YELLOW}You can check with: npm list -g ${COPILOT_NPM_PACKAGE}${NC}"
else
    echo -e "${YELLOW}npm not found. Skipping npm uninstall.${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Cleaning up GitHub Copilot CLI data"
echo -e "========================================${NC}"

POSSIBLE_DIRS=(
    "$COPILOT_HOME_DIR"
    "$COPILOT_CACHE_DIR"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    remove_dir_prompt "$dir"
done

echo -e "\n${CYAN}========================================"
echo -e "Verifying uninstall"
echo -e "========================================${NC}"

if command_exists copilot; then
    COPILOT_PATH=$(command -v copilot)
    echo -e "${YELLOW}copilot command still present at: ${COPILOT_PATH}${NC}"
    echo -e "${YELLOW}You may need to remove it from your PATH or restart your shell.${NC}"
else
    echo -e "${GREEN}GitHub Copilot CLI command not found. Uninstall appears complete.${NC}"
fi

echo -e "\n${GREEN}========================================"
echo -e "Uninstallation process completed!"
echo -e "========================================${NC}"
