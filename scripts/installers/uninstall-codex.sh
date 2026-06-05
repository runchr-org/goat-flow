#!/usr/bin/env bash
# GOAT System Uninstaller - Codex CLI
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

CODEX_NPM_PACKAGE=${CODEX_NPM_PACKAGE:-@openai/codex}

show_help() {
    echo ""
    echo -e "${CYAN}Codex CLI Uninstaller${NC}"
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

remove_file_prompt() {
    local file confirm_remove
    file=$1

    if [ ! -e "$file" ]; then
        echo -e "${YELLOW}Not found: $file${NC}"
        return 0
    fi

    if [ -z "${HOME:-}" ] || [ "$HOME" = "/" ]; then
        echo -e "${RED}HOME is not set safely. Skipping: $file${NC}"
        return 1
    fi

    case "$file" in
        "$HOME"/*) ;;
        *)
            echo -e "${RED}Refusing to remove path outside HOME: $file${NC}"
            return 1
            ;;
    esac

    if [[ ! -t 0 ]]; then
        echo -e "${YELLOW}Non-interactive mode: skipping $file${NC}"
        return 0
    fi

    read -r -p "Remove $file ? (y/n): " confirm_remove
    if [[ "$confirm_remove" == "y" ]]; then
        if rm -f -- "$file"; then
            echo -e "${GREEN}Removed: $file${NC}"
        else
            echo -e "${RED}Failed to remove: $file${NC}"
        fi
    else
        echo -e "${YELLOW}Skipped: $file${NC}"
    fi
}

IS_WSL=false
if [[ "$OSTYPE" == "linux-gnu"* ]] && [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
fi
sanitize_path_for_wsl

echo -e "${CYAN}Starting Codex CLI uninstallation process...${NC}"

echo -e "\n${CYAN}========================================"
echo -e "Checking for Homebrew installation"
echo -e "========================================${NC}"

if command_exists brew; then
    if brew list --cask codex >/dev/null 2>&1; then
        echo -e "${YELLOW}Found Codex installed as a Homebrew cask.${NC}"
        if brew uninstall --cask codex; then
            echo -e "${GREEN}Homebrew cask uninstall completed.${NC}"
        else
            echo -e "${YELLOW}Homebrew cask uninstall reported an issue.${NC}"
        fi
    elif brew list codex >/dev/null 2>&1; then
        echo -e "${YELLOW}Found Codex installed as a Homebrew formula.${NC}"
        if brew uninstall codex; then
            echo -e "${GREEN}Homebrew formula uninstall completed.${NC}"
        else
            echo -e "${YELLOW}Homebrew formula uninstall reported an issue.${NC}"
        fi
    else
        echo -e "${YELLOW}Codex not found in Homebrew.${NC}"
    fi
else
    echo -e "${YELLOW}Homebrew not found. Skipping Homebrew uninstall.${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Uninstalling Codex CLI via npm"
echo -e "========================================${NC}"

if command_exists npm; then
    if npm uninstall -g "${CODEX_NPM_PACKAGE}"; then
        echo -e "${GREEN}Codex CLI uninstalled via npm.${NC}"
    else
        echo -e "${YELLOW}npm uninstall reported an issue. The package may not have been installed globally.${NC}"
        echo -e "${YELLOW}You can check with: npm list -g ${CODEX_NPM_PACKAGE}${NC}"
    fi
else
    echo -e "${YELLOW}npm not found. Skipping npm uninstall.${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Removing standalone Codex install files"
echo -e "========================================${NC}"

if [ -n "${HOME:-}" ]; then
    remove_file_prompt "${HOME}/.local/bin/codex"
    remove_file_prompt "${HOME}/.local/bin/codex.exe"
    remove_dir_prompt "${HOME}/.codex/packages/standalone"
else
    echo -e "${YELLOW}HOME not set. Skipping standalone file cleanup.${NC}"
fi

echo -e "\n${CYAN}========================================"
echo -e "Cleaning up Codex CLI data"
echo -e "========================================${NC}"

POSSIBLE_DIRS=(
    "${HOME:-}/.codex"
    "${HOME:-}/.config/codex"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    remove_dir_prompt "$dir"
done

echo -e "\n${CYAN}========================================"
echo -e "Verifying uninstall"
echo -e "========================================${NC}"

if command_exists codex; then
    CODEX_PATH=$(command -v codex)
    echo -e "${YELLOW}codex command still present at: ${CODEX_PATH}${NC}"
    echo -e "${YELLOW}You may need to remove it from PATH or restart your shell.${NC}"
else
    echo -e "${GREEN}Codex CLI command not found. Uninstall appears complete.${NC}"
fi

echo -e "\n${GREEN}========================================"
echo -e "Uninstallation process completed!"
echo -e "========================================${NC}"
