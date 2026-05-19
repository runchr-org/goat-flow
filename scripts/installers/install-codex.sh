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

show_help() {
    echo ""
    echo -e "${CYAN}Codex CLI Installer${NC}"
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

echo -e "${CYAN}Starting Codex CLI installation process...${NC}"
echo -e "${YELLOW}This will install Codex CLI from OpenAI${NC}"
echo -e "\n${CYAN}Detected OS: ${WHITE}$OS${NC}"

# macOS - prefer Homebrew
if [[ "$OS" == "macOS" ]]; then
    if command_exists brew; then
        echo -e "\n${YELLOW}Homebrew detected. Installing via Homebrew...${NC}"
        echo -e "${CYAN}========================================"
        echo -e "Installing Codex CLI via Homebrew"
        echo -e "========================================${NC}"

        if brew install --cask codex; then
            echo -e "\n${GREEN}Codex CLI installed successfully via Homebrew!${NC}"
        else
            echo -e "\n${RED}Homebrew installation failed. Trying npm...${NC}"
            OS="fallback_to_npm"
        fi
    else
        echo -e "\n${YELLOW}Homebrew not found. Will use npm installation.${NC}"
        OS="fallback_to_npm"
    fi
fi

# Non-macOS or fallback to npm
if [[ "$OS" != "macOS" ]] || [[ "$OS" == "fallback_to_npm" ]]; then
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
        echo -e "${RED}Please install Node.js first (or enable it in your Forge config).${NC}"
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
    if ! npm install -g @openai/codex --loglevel=error --no-audit --no-fund; then
        # If the command doesn't exist after a failed install, it's a real failure.
        if ! command_exists codex; then
            echo -e "\n${RED}Global installation failed.${NC}"
            echo -e "${YELLOW}This is likely a permission issue. Please try one of the following:${NC}"
            echo -e "${WHITE}1. Run the script again with 'sudo'."
            echo -e "${WHITE}2. Manually run: sudo npm install -g @openai/codex"
            echo -e "${WHITE}3. Configure npm to use a user-owned directory (see npm docs for 'prefix').${NC}"
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
        echo -e "3. Try installing manually: npm install -g @openai/codex${NC}"
        exit 1
    fi
fi

# Verify installation
echo -e "\n${YELLOW}Verifying installation...${NC}"
if verify_native_binary codex "Codex CLI"; then
    echo -e "\n${GREEN}Codex CLI installed successfully!${NC}"
    codex --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"

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
    echo -e "${WHITE}1. Start the CLI: ${GREEN}codex${NC}"
    echo -e "${WHITE}2. On first run, you'll be prompted to authenticate"
    echo -e "${WHITE}3. Sign in with your ChatGPT account (recommended)"
    echo -e "${WHITE}4. Alternative: Authenticate with OpenAI API key"
    echo -e "${WHITE}5. Use 'codex --help' to see available commands${NC}"
    echo -e "\n${CYAN}Platform Support:${NC}"
    echo -e "${WHITE}- macOS and Linux: Fully supported"
    echo -e "- Windows: Experimental (use WSL for best experience)${NC}"
fi

echo -e "\n${GREEN}========================================"
echo -e "Installation process completed!"
echo -e "========================================${NC}"
echo -e "\n${CYAN}For more information and documentation:"
echo -e "${WHITE}- Next step run codex login"
echo -e "- Codex CLI docs: https://developers.openai.com/codex/cli/"
echo -e "- GitHub repository: https://github.com/openai/codex${NC}"
