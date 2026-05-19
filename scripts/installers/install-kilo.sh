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
KILO_BASE_URL=${KILO_BASE_URL:-http://127.0.0.1:1234}

show_help() {
    echo ""
    echo -e "${CYAN}Kilo CLI Installer${NC}"
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

if [ -z "${HOME:-}" ]; then
    echo -e "${RED}HOME is not set. Cannot choose a Kilo config directory.${NC}"
    exit 1
fi

KILO_CONFIG_DIR="${HOME}/.kilocode/cli"
KILO_CONFIG_FILE="${KILO_CONFIG_DIR}/config.json"
KILO_TOKEN=${KILO_TOKEN:-local-dev-token}
KILO_PROFILE_ID=${KILO_PROFILE_ID:-default}
KILO_MODEL=${KILO_MODEL:-lmstudio}
KILO_OPENAI_API_KEY=${KILO_OPENAI_API_KEY:-local-dev-api-key}

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
echo -e "${YELLOW}LM Studio endpoint: ${WHITE}${KILO_BASE_URL}${NC}"
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
    # In non-interactive mode, auto-install; otherwise prompt
    if [[ -t 0 ]]; then
        read -r -p "Would you like to install Node.js? (y/n): " install_node
        if [[ "$install_node" != "y" ]]; then
            echo -e "${RED}Node.js is required. Exiting.${NC}"
            exit 1
        fi
    else
        echo -e "${CYAN}Non-interactive mode: auto-installing Node.js...${NC}"
    fi

    if [[ "$OS" == "Windows" ]]; then
        echo -e "${CYAN}Installing Node.js via winget...${NC}"
        winget install -e --id OpenJS.NodeJS.LTS
    elif [[ "$OS" == "Linux" ]]; then
        echo -e "${CYAN}Installing Node.js for Linux...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macOS" ]]; then
        echo -e "${CYAN}Installing Node.js for macOS...${NC}"
        if command_exists brew; then
            brew install node
        else
            echo -e "${YELLOW}Homebrew not found. Please install it first or use the Node.js installer.${NC}"
            exit 1
        fi
    fi

    export PATH=$PATH:/usr/local/bin
    hash -r
    if ! command_exists node; then
        echo -e "${RED}Node.js installation failed. Exiting.${NC}"
        exit 1
    fi
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

echo -e "\n${YELLOW}Configuring Kilo CLI for LM Studio...${NC}"
mkdir -p "${KILO_CONFIG_DIR}"
if ! node - "${KILO_CONFIG_FILE}" "${KILO_BASE_URL}" "${KILO_TOKEN}" "${KILO_OPENAI_API_KEY}" "${KILO_PROFILE_ID}" "${KILO_MODEL}" <<'NODE'
const fs = require("fs");

const [configFile, baseUrl, token, apiKey, profileId, model] = process.argv.slice(2);
const config = {
  provider: "lm-studio",
  providers: [
    {
      id: "lm-studio",
      provider: "openai",
      type: "openai-compatible",
      baseUrl,
      kilocodeToken: token,
      openAiApiKey: apiKey,
      profiles: [
        {
          id: profileId,
          model,
        },
      ],
    },
  ],
};

fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
NODE
then
    echo -e "${RED}Failed to write Kilo CLI configuration.${NC}"
    exit 1
fi
chmod 700 "${KILO_CONFIG_DIR}" 2>/dev/null || true
chmod 600 "${KILO_CONFIG_FILE}" 2>/dev/null || true
echo -e "${GREEN}Saved configuration to ${KILO_CONFIG_FILE}${NC}"

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
echo -e "${WHITE}2. LM Studio endpoint is set to ${KILO_BASE_URL}${NC}"
echo -e "${WHITE}3. Update config via KILO_BASE_URL env var or by editing ${KILO_CONFIG_FILE}${NC}"
echo -e "${WHITE}4. Run 'kilo --help' to see available commands${NC}"

echo -e "\n${GREEN}Installation process completed!${NC}"
