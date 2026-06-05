#!/usr/bin/env bash
# GOAT System Installer - Kilo CLI
# Installs the Kilo CLI and configures it for LM Studio (http://127.0.0.1:1234).
# WARNING: Only install on systems you own or have permission to modify.
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Allow overrides via environment variables
KILO_NPM_PACKAGE=${KILO_NPM_PACKAGE:-@kilocode/cli}

show_help() {
    echo ""
    echo -e "${CYAN}Kilo CLI Installer${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  KILO_NPM_PACKAGE    npm package to install (default: @kilocode/cli)"
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

verify_native_binary() {
    local cmd name cmd_path
    cmd=$1
    name=${2:-$1}

    cmd_path="$(command -v "$cmd" 2>/dev/null)" || {
        echo -e "\n${YELLOW}${name} installed but command not found in PATH.${NC}"
        echo -e "${YELLOW}You may need to restart your shell or add npm's global bin to PATH.${NC}"
        return 1
    }

    if [[ "${IS_WSL:-false}" == "true" && "$cmd_path" == /mnt/* ]]; then
        echo -e "\n${RED}${name} resolved to a Windows shim: ${cmd_path}${NC}"
        echo -e "${YELLOW}This will not work correctly in WSL. Install/use a native Linux npm prefix instead.${NC}"
        return 1
    fi

    return 0
}

IS_WSL=false

# Detect OS (used for Node.js guidance)
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    if [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
        IS_WSL=true
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "mingw"* ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

sanitize_path_for_wsl

echo -e "${CYAN}Starting Kilo CLI installation...${NC}"
echo -e "${YELLOW}npm package: ${WHITE}${KILO_NPM_PACKAGE}${NC}"
echo -e "\n${CYAN}Detected OS: ${WHITE}$OS${NC}"

echo -e "\n${YELLOW}Checking for Node.js installation...${NC}"
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js is already installed (version ${NODE_VERSION})${NC}"
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}npm is already installed (version ${NPM_VERSION})${NC}"
    else
        echo -e "${RED}npm not found. Please reinstall Node.js.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Node.js is required for Kilo CLI installation.${NC}"
    echo -e "${YELLOW}Please install Node.js/npm first, then rerun this script.${NC}"
    exit 1
fi

echo -e "\n${CYAN}========================================"
echo -e "Installing Kilo CLI via npm"
echo -e "========================================${NC}"

if ! command_exists npm; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi

if ! npm install -g "${KILO_NPM_PACKAGE}" --loglevel=error --no-audit --no-fund; then
    echo -e "\n${RED}Error installing ${KILO_NPM_PACKAGE}.${NC}"
    echo -e "${YELLOW}Check the package name or set KILO_NPM_PACKAGE to the correct npm package and rerun.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Verifying installation...${NC}"
if verify_native_binary kilo "Kilo CLI"; then
    echo -e "${GREEN}Kilo CLI installed successfully!${NC}"
    kilo --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"
    npm_prefix_warning_sh() {
        local prefix paths uniq_paths path_count
        prefix=$(npm config get prefix 2>/dev/null || true)
        IFS=':' read -r -a paths <<<"$PATH"
        uniq_paths=$(printf "%s\n" "${paths[@]}" | awk 'tolower($0) ~ /npm/ && !seen[$0]++')
        path_count=$(printf "%s\n" "$uniq_paths" | awk 'NF { count++ } END { print count + 0 }')
        if [ "$path_count" -gt 1 ]; then
            echo -e "${YELLOW}\nWarning: multiple npm-related paths detected in PATH. This can cause version drift between shells.${NC}"
            printf "%s\n" "$uniq_paths" | awk 'NF { print " - " $0 }'
            [ -n "$prefix" ] && echo -e "npm prefix: $prefix"
            echo -e "Prefer a single global prefix (Windows: %APPDATA%/npm; Unix: ~/.npm or /usr/local) and remove extra npm/global bin paths."
        fi
    }
    npm_prefix_warning_sh
fi

echo -e "\n${CYAN}========================================"
echo -e "Next Steps:"
echo -e "========================================${NC}"
echo -e "${WHITE}1. Start the CLI: kilo${NC}"
echo -e "${WHITE}2. Use /connect inside the TUI to add provider credentials"
echo -e "${WHITE}3. Use 'kilo auth' for provider and credential management"
echo -e "${WHITE}4. Global config lives under ~/.config/kilo/ (opencode.json or opencode.jsonc)${NC}"

echo -e "\n${GREEN}Installation process completed!${NC}"
