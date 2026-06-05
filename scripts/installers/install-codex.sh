#!/usr/bin/env bash
# GOAT System Installer - Codex CLI
#
# WARNING: Only install on systems you own or have permission to modify.
# This script is for personal development environments only.
#
# Bash script to install Codex CLI via npm or Homebrew
# Run this script in Git Bash, WSL, or any Unix-like terminal

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

CODEX_NPM_PACKAGE=${CODEX_NPM_PACKAGE:-@openai/codex}
CODEX_INSTALL_METHOD=${CODEX_INSTALL_METHOD:-auto}
CODEX_UNIX_INSTALLER_URL=${CODEX_UNIX_INSTALLER_URL:-https://chatgpt.com/codex/install.sh}
CODEX_WINDOWS_INSTALLER_URL=${CODEX_WINDOWS_INSTALLER_URL:-https://chatgpt.com/codex/install.ps1}
TMP_WORK_DIR=""

show_help() {
    echo ""
    echo -e "${CYAN}Codex CLI Installer${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --method <auto|standalone|npm|homebrew>"
    echo "                 Install method (default: auto/standalone)"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  CODEX_INSTALL_METHOD         auto, standalone, npm, or homebrew"
    echo "  CODEX_NPM_PACKAGE            npm package when using --method npm"
    echo "  CODEX_UNIX_INSTALLER_URL     Standalone macOS/Linux/WSL installer URL"
    echo "  CODEX_WINDOWS_INSTALLER_URL  Standalone Windows PowerShell installer URL"
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
            CODEX_INSTALL_METHOD=$2
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
        echo -e "${RED}Either curl or wget is required for the standalone installer.${NC}"
        return 1
    fi
}

make_temp_dir() {
    local base
    base=${TMPDIR:-/tmp}
    if ! TMP_WORK_DIR=$(mktemp -d "${base%/}/codex-installer.XXXXXX"); then
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

run_codex_standalone_installer() {
    local installer powershell_bin

    make_temp_dir
    if [[ "$OS" == "Windows" ]]; then
        if command_exists powershell.exe; then
            powershell_bin=powershell.exe
        elif command_exists pwsh.exe; then
            powershell_bin=pwsh.exe
        else
            echo -e "${RED}PowerShell is required for Codex standalone install on Windows.${NC}"
            echo -e "${YELLOW}Official command: powershell -ExecutionPolicy ByPass -c \"irm https://chatgpt.com/codex/install.ps1 | iex\"${NC}"
            exit 1
        fi

        installer="$TMP_WORK_DIR/install.ps1"
        echo -e "\n${YELLOW}Downloading official Codex Windows installer...${NC}"
        download_file "$CODEX_WINDOWS_INSTALLER_URL" "$installer"
        echo -e "${CYAN}Running official Codex standalone installer...${NC}"
        "$powershell_bin" -NoProfile -ExecutionPolicy Bypass -File "$installer"
    else
        installer="$TMP_WORK_DIR/install.sh"
        echo -e "\n${YELLOW}Downloading official Codex standalone installer...${NC}"
        download_file "$CODEX_UNIX_INSTALLER_URL" "$installer"
        chmod +x "$installer" 2>/dev/null || true
        echo -e "${CYAN}Running official Codex standalone installer...${NC}"
        if [[ ! -t 0 ]]; then
            CODEX_NON_INTERACTIVE=${CODEX_NON_INTERACTIVE:-1} sh "$installer"
        else
            sh "$installer"
        fi
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
        echo -e "${RED}Codex CLI requires Node.js ${minimum} or later when installed via npm.${NC}"
        echo -e "${YELLOW}Detected: ${NODE_VERSION:-unknown}. Please upgrade Node.js and rerun this script.${NC}"
        exit 1
    fi
}

finish_install() {
    echo -e "\n${YELLOW}Verifying installation...${NC}"
    if verify_native_binary codex "Codex CLI"; then
        echo -e "\n${GREEN}Codex CLI installed successfully!${NC}"
        codex --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"

        echo -e "\n${CYAN}========================================"
        echo -e "Next Steps:"
        echo -e "========================================${NC}"
        echo -e "${WHITE}1. Start the CLI: ${GREEN}codex${NC}"
        echo -e "${WHITE}2. On first run, authenticate with ChatGPT or an OpenAI API key"
        echo -e "${WHITE}3. Use 'codex --help' to see available commands${NC}"
    fi

    echo -e "\n${GREEN}========================================"
    echo -e "Installation process completed!"
    echo -e "========================================${NC}"
    echo -e "\n${CYAN}For more information and documentation:"
    echo -e "${WHITE}- Codex CLI docs: https://developers.openai.com/codex/cli/"
    echo -e "- GitHub repository: https://github.com/openai/codex${NC}"
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

case "$CODEX_INSTALL_METHOD" in
    auto|standalone|npm|homebrew) ;;
    *)
        echo -e "${RED}Unknown install method: ${CODEX_INSTALL_METHOD}${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${CYAN}Starting Codex CLI installation process...${NC}"
echo -e "${YELLOW}Install method: ${WHITE}${CODEX_INSTALL_METHOD}${NC}"
echo -e "\n${CYAN}Detected OS: ${WHITE}$OS${NC}"

if [[ "$CODEX_INSTALL_METHOD" == "auto" ]] || [[ "$CODEX_INSTALL_METHOD" == "standalone" ]]; then
    run_codex_standalone_installer
    finish_install
    exit 0
fi

if [[ "$CODEX_INSTALL_METHOD" == "homebrew" ]]; then
    if [[ "$OS" != "macOS" ]]; then
        echo -e "${RED}Codex Homebrew cask install is only supported on macOS.${NC}"
        exit 1
    fi
    if ! command_exists brew; then
        echo -e "${RED}Homebrew is not installed.${NC}"
        exit 1
    fi
    brew install --cask codex
    finish_install
    exit 0
fi

# npm install path
if [[ "$CODEX_INSTALL_METHOD" == "npm" ]]; then
    # Check if Node.js is installed (required for npm)
    echo -e "\n${YELLOW}Checking for Node.js installation...${NC}"

    if command_exists node; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}Node.js is already installed (version $NODE_VERSION)${NC}"

        # Check npm version
        if command_exists npm; then
            NPM_VERSION=$(npm --version)
            echo -e "${GREEN}npm is already installed (version $NPM_VERSION)${NC}"
        else
            echo -e "${RED}npm is not found. Please reinstall Node.js.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Node.js is required for Codex CLI installation.${NC}"
        echo -e "${YELLOW}Use --method standalone to install without Node.js, or install Node.js and rerun --method npm.${NC}"
        exit 1
    fi

    require_node_major 16

    echo -e "\n${CYAN}========================================"
    echo -e "Installing Codex CLI via npm"
    echo -e "========================================${NC}"

    # Install Codex CLI using npm



    echo -e "\n${YELLOW}Installing Codex CLI via npm...${NC}"
    echo -e "${WHITE}This will install the latest version of the Codex CLI${NC}"

    if ! command_exists npm; then
        echo -e "${RED}Error: npm is not installed.${NC}"
        echo -e "${YELLOW}Please install Node.js and npm first.${NC}"
        exit 1
    fi

    # Try installing globally
    if ! npm install -g "${CODEX_NPM_PACKAGE}" --loglevel=error --no-audit --no-fund; then
        # If the command doesn't exist after a failed install, it's a real failure.
        if ! command_exists codex; then
            echo -e "\n${RED}Global installation failed.${NC}"
            echo -e "${YELLOW}This is likely a permission issue. Please try one of the following:${NC}"
            echo -e "${WHITE}1. Use --method standalone."
            echo -e "${WHITE}2. Configure npm to use a user-owned directory (see npm docs for 'prefix')."
            echo -e "${WHITE}3. Manually run: npm install -g ${CODEX_NPM_PACKAGE}${NC}"
            exit 1
        else
            echo -e "\n${YELLOW}npm install reported an error, but 'codex' seems to be installed.${NC}"
            echo -e "${YELLOW}This can happen with permission errors on global package updates. Continuing...${NC}"
        fi
    fi

    # Check installation status
    if ! command_exists codex; then
        echo -e "\n${RED}Error installing Codex CLI${NC}"
        echo -e "\n${YELLOW}Troubleshooting steps:${NC}"
        echo -e "${WHITE}1. Make sure you have an internet connection"
        echo -e "2. Check npm configuration: npm config list"
        echo -e "3. Try installing manually: npm install -g ${CODEX_NPM_PACKAGE}${NC}"
        exit 1
    fi
fi

finish_install
