#!/usr/bin/env bash
# GOAT System Installer - Claude CLI
#
# WARNING: Only install on systems you own or have permission to modify.
# This script is for personal development environments only.
#
# Bash script to install Claude CLI via npm
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
CLAUDE_INSTALL_METHOD=${CLAUDE_INSTALL_METHOD:-auto}
CLAUDE_UNIX_INSTALLER_URL=${CLAUDE_UNIX_INSTALLER_URL:-https://claude.ai/install.sh}
CLAUDE_WINDOWS_INSTALLER_URL=${CLAUDE_WINDOWS_INSTALLER_URL:-https://claude.ai/install.ps1}
TMP_WORK_DIR=""

show_help() {
    echo ""
    echo -e "${CYAN}Claude CLI Installer${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --method <auto|native|npm|homebrew|winget>"
    echo "                 Install method (default: auto/native)"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  CLAUDE_INSTALL_METHOD       auto, native, npm, homebrew, or winget"
    echo "  CLAUDE_NPM_PACKAGE          npm package when using --method npm"
    echo "  CLAUDE_UNIX_INSTALLER_URL   Native macOS/Linux/WSL installer URL"
    echo "  CLAUDE_WINDOWS_INSTALLER_URL Native Windows PowerShell installer URL"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|--method)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}Missing value for $1.${NC}"
                show_help
                exit 1
            fi
            CLAUDE_INSTALL_METHOD=$2
            shift 2
            ;;
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

download_file() {
    local url dest
    url=$1
    dest=$2

    if command_exists curl; then
        curl -fsSL "$url" -o "$dest"
    elif command_exists wget; then
        wget -q -O "$dest" "$url"
    else
        echo -e "${RED}Either curl or wget is required for the native installer.${NC}"
        return 1
    fi
}

make_temp_dir() {
    local base
    base=${TMPDIR:-/tmp}
    if ! TMP_WORK_DIR=$(mktemp -d "${base%/}/claude-installer.XXXXXX"); then
        echo -e "${RED}Failed to create a temporary installer directory.${NC}"
        exit 1
    fi
}

cleanup() {
    if [ -n "${TMP_WORK_DIR:-}" ] && [ -d "$TMP_WORK_DIR" ]; then
        rm -f -- "$TMP_WORK_DIR/install.sh" "$TMP_WORK_DIR/install.ps1" 2>/dev/null || true
        rmdir "$TMP_WORK_DIR" 2>/dev/null || true
    fi
}
trap cleanup EXIT

run_claude_native_installer() {
    local installer powershell_bin

    make_temp_dir
    if [[ "$OS" == "Windows" ]]; then
        if command_exists powershell.exe; then
            powershell_bin=powershell.exe
        elif command_exists pwsh.exe; then
            powershell_bin=pwsh.exe
        else
            echo -e "${RED}PowerShell is required for Claude Code native install on Windows.${NC}"
            echo -e "${YELLOW}Official command: irm https://claude.ai/install.ps1 | iex${NC}"
            exit 1
        fi

        installer="$TMP_WORK_DIR/install.ps1"
        echo -e "\n${YELLOW}Downloading official Claude Code Windows installer...${NC}"
        download_file "$CLAUDE_WINDOWS_INSTALLER_URL" "$installer"
        echo -e "${CYAN}Running official Claude Code native installer...${NC}"
        "$powershell_bin" -NoProfile -ExecutionPolicy Bypass -File "$installer"
    else
        installer="$TMP_WORK_DIR/install.sh"
        echo -e "\n${YELLOW}Downloading official Claude Code native installer...${NC}"
        download_file "$CLAUDE_UNIX_INSTALLER_URL" "$installer"
        chmod +x "$installer" 2>/dev/null || true
        echo -e "${CYAN}Running official Claude Code native installer...${NC}"
        bash "$installer"
    fi
}

verify_native_binary() {
    local cmd name cmd_path
    cmd=$1
    name=${2:-$1}

    cmd_path="$(command -v "$cmd" 2>/dev/null)" || {
        echo -e "\n${YELLOW}${name} installed but command not found in PATH.${NC}"
        echo -e "${YELLOW}You may need to:${NC}"
        echo -e "${WHITE}1. Restart your terminal or run: source ~/.bashrc"
        echo -e "2. Or add the npm global bin directory to your PATH"
        echo -e "3. Check npm global directory: npm config get prefix${NC}"
        return 1
    }

    if [[ "${IS_WSL:-false}" == "true" && "$cmd_path" == /mnt/* ]]; then
        echo -e "\n${RED}${name} resolved to a Windows shim: ${cmd_path}${NC}"
        echo -e "${YELLOW}This will not work correctly in WSL. Install/use a native Linux npm prefix instead.${NC}"
        return 1
    fi

    return 0
}

require_node_major() {
    local minimum current
    minimum=$1
    current=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || true)
    if [[ ! "$current" =~ ^[0-9]+$ ]] || [ "$current" -lt "$minimum" ]; then
        echo -e "${RED}Claude CLI requires Node.js ${minimum} or later.${NC}"
        echo -e "${YELLOW}Detected: ${NODE_VERSION:-unknown}. Please upgrade Node.js and rerun this script.${NC}"
        exit 1
    fi
}

finish_install() {
    echo -e "\n${YELLOW}Verifying installation...${NC}"
    if verify_native_binary claude "Claude CLI"; then
        echo -e "${GREEN}Claude CLI installed successfully!${NC}"
        claude --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"
        claude doctor 2>/dev/null || true

        echo -e "\n${CYAN}========================================"
        echo -e "Next Steps:"
        echo -e "========================================${NC}"
        echo -e "${WHITE}1. Start the CLI: claude"
        echo -e "2. Authenticate in the browser flow on first run"
        echo -e "3. Run 'claude doctor' if PATH or update checks look wrong${NC}"
    fi

    echo -e "\n${GREEN}Installation process completed!${NC}"
}

IS_WSL=false

# Detect OS
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

case "$CLAUDE_INSTALL_METHOD" in
    auto|native|npm|homebrew|winget) ;;
    *)
        echo -e "${RED}Unknown install method: ${CLAUDE_INSTALL_METHOD}${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${CYAN}Starting Claude CLI installation process...${NC}"
echo -e "${YELLOW}Install method: ${WHITE}${CLAUDE_INSTALL_METHOD}${NC}"
echo -e "\n${CYAN}Detected OS: ${WHITE}$OS${NC}"

if [[ "$CLAUDE_INSTALL_METHOD" == "auto" ]] || [[ "$CLAUDE_INSTALL_METHOD" == "native" ]]; then
    run_claude_native_installer
    finish_install
    exit 0
fi

if [[ "$CLAUDE_INSTALL_METHOD" == "homebrew" ]]; then
    if [[ "$OS" != "macOS" && "$OS" != "Linux" ]]; then
        echo -e "${RED}Claude Code Homebrew install is only supported on macOS/Linux.${NC}"
        exit 1
    fi
    if ! command_exists brew; then
        echo -e "${RED}Homebrew is not installed.${NC}"
        exit 1
    fi
    brew install --cask claude-code
    finish_install
    exit 0
fi

if [[ "$CLAUDE_INSTALL_METHOD" == "winget" ]]; then
    if [[ "$OS" != "Windows" ]]; then
        echo -e "${RED}WinGet install is only supported on Windows.${NC}"
        exit 1
    fi
    if ! command_exists winget; then
        echo -e "${RED}WinGet is not installed or not available in PATH.${NC}"
        exit 1
    fi
    winget install Anthropic.ClaudeCode
    finish_install
    exit 0
fi

# Check if Node.js is installed (required for npm)
echo -e "\n${YELLOW}Checking for Node.js installation...${NC}"

if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js is already installed (version $NODE_VERSION)${NC}"

    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}npm is already installed (version $NPM_VERSION)${NC}"
    else
        echo -e "${RED}npm is not found. Please reinstall Node.js.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Node.js is required for Claude CLI installation.${NC}"
    echo -e "${YELLOW}Use --method native to install without Node.js, or install Node.js 18+ and rerun --method npm.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
require_node_major 18

echo -e "\n${CYAN}========================================"
echo -e "Installing Claude CLI via npm"
echo -e "========================================${NC}"

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js and npm first.${NC}"
    exit 1
fi

if ! npm install -g "${CLAUDE_NPM_PACKAGE}" --loglevel=error --no-audit --no-fund; then
    echo -e "\n${RED}Error installing Claude CLI${NC}"
    echo -e "\n${YELLOW}Troubleshooting steps:${NC}"
    echo -e "${WHITE}1. Check internet connection"
    echo -e "2. npm config list"
    echo -e "3. Try: npm install -g ${CLAUDE_NPM_PACKAGE}${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Verifying installation...${NC}"
if verify_native_binary claude "Claude CLI"; then
    echo -e "${GREEN}Claude CLI installed successfully!${NC}"
    claude --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"
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

    echo -e "\n${CYAN}========================================"
    echo -e "Next Steps:"
    echo -e "========================================${NC}"
    echo -e "${WHITE}1. Start the CLI: claude"
    echo -e "2. Authenticate in the browser flow on first run"
    echo -e "3. Run claude doctor for install diagnostics${NC}"
fi

echo -e "\n${GREEN}Installation process completed!${NC}"
