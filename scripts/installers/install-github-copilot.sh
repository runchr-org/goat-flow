#!/usr/bin/env bash
# GOAT System Installer - GitHub Copilot CLI
#
# WARNING: Only install on systems you own or have permission to modify.
# This script is for personal development environments only.
#
# Installs the standalone GitHub Copilot CLI (copilot) using GitHub's
# documented package-manager, install-script, or npm paths.
# Auth happens on first run via /login - no pre-auth required.
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

COPILOT_NPM_PACKAGE=${COPILOT_NPM_PACKAGE:-@github/copilot}
COPILOT_INSTALL_METHOD=${COPILOT_INSTALL_METHOD:-auto}
COPILOT_INSTALLER_URL=${COPILOT_INSTALLER_URL:-https://gh.io/copilot-install}
TMP_WORK_DIR=""

show_help() {
    echo ""
    echo -e "${CYAN}GitHub Copilot CLI Installer${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --method <auto|npm|homebrew|winget|script>"
    echo "                 Install method (default: auto)"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  COPILOT_INSTALL_METHOD  auto, npm, homebrew, winget, or script"
    echo "  COPILOT_NPM_PACKAGE     npm package when using --method npm"
    echo "  COPILOT_INSTALLER_URL   macOS/Linux install script URL"
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
            COPILOT_INSTALL_METHOD=$2
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
        echo -e "${RED}Either curl or wget is required for the install script method.${NC}"
        return 1
    fi
}

make_temp_dir() {
    local base
    base=${TMPDIR:-/tmp}
    if ! TMP_WORK_DIR=$(mktemp -d "${base%/}/copilot-installer.XXXXXX"); then
        echo -e "${RED}Failed to create a temporary installer directory.${NC}"
        exit 1
    fi
}

cleanup() {
    if [ -n "${TMP_WORK_DIR:-}" ] && [ -d "$TMP_WORK_DIR" ]; then
        rm -f -- "$TMP_WORK_DIR/install.sh" 2>/dev/null || true
        rmdir "$TMP_WORK_DIR" 2>/dev/null || true
    fi
}
trap cleanup EXIT

run_copilot_script_installer() {
    local installer

    if [[ "$OS" == "Windows" ]]; then
        echo -e "${RED}The GitHub Copilot install script is only documented for macOS/Linux.${NC}"
        exit 1
    fi

    make_temp_dir
    installer="$TMP_WORK_DIR/install.sh"
    echo -e "\n${YELLOW}Downloading official GitHub Copilot CLI install script...${NC}"
    download_file "$COPILOT_INSTALLER_URL" "$installer"
    chmod +x "$installer" 2>/dev/null || true
    echo -e "${CYAN}Running official GitHub Copilot CLI install script...${NC}"
    bash "$installer"
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
        echo -e "${RED}GitHub Copilot CLI requires Node.js ${minimum} or later when installed via npm.${NC}"
        echo -e "${YELLOW}Detected: ${NODE_VERSION:-unknown}. Please upgrade Node.js and rerun this script.${NC}"
        exit 1
    fi
}

finish_install() {
    echo -e "\n${YELLOW}Verifying installation...${NC}"
    if verify_native_binary copilot "GitHub Copilot CLI"; then
        echo -e "${GREEN}GitHub Copilot CLI installed successfully!${NC}"
        copilot --version 2>/dev/null || copilot version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"

        echo -e "\n${CYAN}========================================"
        echo -e "Next Steps:"
        echo -e "========================================${NC}"
        echo -e "${WHITE}1. Start the CLI: ${GREEN}copilot${NC}"
        echo -e "${WHITE}2. Run ${GREEN}copilot login${WHITE} or use /login on first run"
        echo -e "${WHITE}3. Use ${GREEN}copilot --help${WHITE} for commands${NC}"
    fi

    echo -e "\n${GREEN}Installation process completed!${NC}"
}

install_copilot_npm() {
    local ignore_scripts npm_env_prefix=()

    if ! command_exists npm; then
        echo -e "${RED}Error: npm is not installed.${NC}"
        echo -e "${YELLOW}Please install Node.js 22+ and npm first, or use --method script/homebrew/winget.${NC}"
        exit 1
    fi

    ignore_scripts=$(npm config get ignore-scripts 2>/dev/null || true)
    if [[ "$ignore_scripts" == "true" ]]; then
        echo -e "${YELLOW}npm ignore-scripts=true detected; overriding for Copilot CLI postinstall.${NC}"
        npm_env_prefix=(env npm_config_ignore_scripts=false)
    fi

    if ! "${npm_env_prefix[@]}" npm install -g "${COPILOT_NPM_PACKAGE}" --loglevel=error --no-audit --no-fund; then
        echo -e "\n${RED}Error installing GitHub Copilot CLI${NC}"
        echo -e "\n${YELLOW}Troubleshooting steps:${NC}"
        echo -e "${WHITE}1. Check internet connection"
        echo -e "2. npm config list"
        echo -e "3. Try: npm_config_ignore_scripts=false npm install -g ${COPILOT_NPM_PACKAGE}${NC}"
        exit 1
    fi
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

case "$COPILOT_INSTALL_METHOD" in
    auto|npm|homebrew|winget|script) ;;
    *)
        echo -e "${RED}Unknown install method: ${COPILOT_INSTALL_METHOD}${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${CYAN}Starting GitHub Copilot CLI installation process...${NC}"
echo -e "${YELLOW}Install method: ${WHITE}${COPILOT_INSTALL_METHOD}${NC}"
echo -e "\n${CYAN}Detected OS: ${WHITE}$OS${NC}"

if [[ "$COPILOT_INSTALL_METHOD" == "auto" ]]; then
    if [[ "$OS" == "Windows" ]] && command_exists winget; then
        winget install GitHub.Copilot
        finish_install
        exit 0
    fi

    if [[ "$OS" == "macOS" || "$OS" == "Linux" ]] && command_exists brew; then
        brew install copilot-cli
        finish_install
        exit 0
    fi

    if [[ "$OS" == "macOS" || "$OS" == "Linux" ]] && { command_exists curl || command_exists wget; }; then
        run_copilot_script_installer
        finish_install
        exit 0
    fi

    COPILOT_INSTALL_METHOD=npm
fi

if [[ "$COPILOT_INSTALL_METHOD" == "homebrew" ]]; then
    if [[ "$OS" != "macOS" && "$OS" != "Linux" ]]; then
        echo -e "${RED}Homebrew install is only supported on macOS/Linux.${NC}"
        exit 1
    fi
    if ! command_exists brew; then
        echo -e "${RED}Homebrew is not installed.${NC}"
        exit 1
    fi
    brew install copilot-cli
    finish_install
    exit 0
fi

if [[ "$COPILOT_INSTALL_METHOD" == "winget" ]]; then
    if [[ "$OS" != "Windows" ]]; then
        echo -e "${RED}WinGet install is only supported on Windows.${NC}"
        exit 1
    fi
    if ! command_exists winget; then
        echo -e "${RED}WinGet is not installed or not available in PATH.${NC}"
        exit 1
    fi
    winget install GitHub.Copilot
    finish_install
    exit 0
fi

if [[ "$COPILOT_INSTALL_METHOD" == "script" ]]; then
    run_copilot_script_installer
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
    echo -e "${RED}Node.js is required for GitHub Copilot CLI installation.${NC}"
    echo -e "${YELLOW}Use --method script/homebrew/winget where supported, or install Node.js 22+ and rerun --method npm.${NC}"
    exit 1
fi

require_node_major 22

echo -e "\n${CYAN}========================================"
echo -e "Installing GitHub Copilot CLI via npm"
echo -e "========================================${NC}"

install_copilot_npm

echo -e "\n${YELLOW}Verifying installation...${NC}"
if verify_native_binary copilot "GitHub Copilot CLI"; then
    echo -e "${GREEN}GitHub Copilot CLI installed successfully!${NC}"
    copilot --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"

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
    echo -e "${WHITE}1. Start the CLI: ${GREEN}copilot${NC}"
    echo -e "${WHITE}2. On first run, use ${GREEN}/login${WHITE} to authenticate with GitHub${NC}"
    echo -e "${WHITE}3. Use ${GREEN}/model${WHITE} to select an AI model${NC}"
    echo -e "${WHITE}4. Run copilot --help for commands${NC}"
fi

echo -e "\n${GREEN}Installation process completed!${NC}"
