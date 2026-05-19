#!/usr/bin/env bash
# GOAT System Uninstaller - Kilo CLI
# Removes the Kilo CLI and its LM Studio configuration.
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

KILO_NPM_PACKAGE=${KILO_NPM_PACKAGE:-@kilocode/cli}
KILO_CONFIG_DIR="${HOME:-}/.kilocode/cli"

show_help() {
    echo ""
    echo -e "${CYAN}Kilo CLI Uninstaller${NC}"
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
        echo -e "${YELLOW}Config directory not found: $dir${NC}"
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

    read -r -p "Remove $dir and its contents? (y/n): " confirm_remove
    if [[ "$confirm_remove" == "y" ]]; then
        if rm -rf -- "$dir"; then
            echo -e "${GREEN}Removed $dir${NC}"
        else
            echo -e "${RED}Failed to remove $dir${NC}"
        fi
    else
        echo -e "${YELLOW}Skipped removing $dir${NC}"
    fi
}

IS_WSL=false
if [[ "$OSTYPE" == "linux-gnu"* ]] && [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
fi
sanitize_path_for_wsl

echo -e "${CYAN}Starting Kilo CLI uninstallation...${NC}"
echo -e "${YELLOW}npm package: ${WHITE}${KILO_NPM_PACKAGE}${NC}"

if ! command_exists npm; then
    echo -e "${RED}npm is required to uninstall the Kilo CLI package.${NC}"
    echo -e "${YELLOW}Install Node.js/npm or remove the package manually.${NC}"
    exit 1
fi

echo -e "\n${CYAN}========================================"
echo -e "Uninstalling Kilo CLI via npm"
echo -e "========================================${NC}"
if npm uninstall -g "${KILO_NPM_PACKAGE}"; then
    echo -e "${GREEN}npm uninstall completed.${NC}"
else
    echo -e "${YELLOW}npm uninstall reported an issue. Check with: npm list -g ${KILO_NPM_PACKAGE}${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Cleaning Kilo CLI configuration"
echo -e "========================================${NC}"
remove_dir_prompt "${KILO_CONFIG_DIR}"

echo -e "\n${CYAN}========================================"
echo -e "Verifying uninstall"
echo -e "========================================${NC}"
if command_exists kilo; then
    KILO_PATH=$(command -v kilo)
    echo -e "${YELLOW}kilo command still present at: ${KILO_PATH}${NC}"
    echo -e "${YELLOW}You may need to remove it from PATH or restart your shell.${NC}"
else
    echo -e "${GREEN}Kilo CLI command not found. Uninstall appears complete.${NC}"
fi

echo -e "\n${GREEN}Uninstallation process completed!${NC}"
