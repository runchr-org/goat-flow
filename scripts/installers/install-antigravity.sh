#!/usr/bin/env bash
# GOAT System Installer - Antigravity CLI
#
# WARNING: Only install on systems you own or have permission to modify.
# This script is for personal development environments only.
#
# Installs the official Antigravity CLI (`agy`) using Google's current
# bootstrapper from https://antigravity.google/download.
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Colour

ANTIGRAVITY_UNIX_INSTALLER_URL=${ANTIGRAVITY_UNIX_INSTALLER_URL:-https://antigravity.google/cli/install.sh}
ANTIGRAVITY_WINDOWS_INSTALLER_URL=${ANTIGRAVITY_WINDOWS_INSTALLER_URL:-https://antigravity.google/cli/install.ps1}
INSTALL_DIR=${ANTIGRAVITY_INSTALL_DIR:-}
TMP_WORK_DIR=""

show_help() {
    echo ""
    echo -e "${CYAN}Antigravity CLI Installer${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --dir <path>    Install agy to a custom directory"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  ANTIGRAVITY_INSTALL_DIR           Custom install directory"
    echo "  ANTIGRAVITY_UNIX_INSTALLER_URL    Unix bootstrapper URL"
    echo "  ANTIGRAVITY_WINDOWS_INSTALLER_URL Windows PowerShell bootstrapper URL"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}Missing value for $1.${NC}"
                show_help
                exit 1
            fi
            INSTALL_DIR=$2
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
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

download_file() {
    local url dest
    url=$1
    dest=$2

    if command_exists curl; then
        curl -fsSL "$url" -o "$dest"
    elif command_exists wget; then
        wget -q -O "$dest" "$url"
    else
        echo -e "${RED}Either curl or wget is required to download the Antigravity installer.${NC}"
        return 1
    fi
}

make_temp_dir() {
    local base
    base=${TMPDIR:-/tmp}
    if ! TMP_WORK_DIR=$(mktemp -d "${base%/}/antigravity-installer.XXXXXX"); then
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

to_windows_path() {
    local path
    path=$1
    if command_exists cygpath; then
        cygpath -w "$path" 2>/dev/null || printf "%s\n" "$path"
    else
        printf "%s\n" "$path"
    fi
}

to_unix_path() {
    local path
    path=$1
    if command_exists cygpath; then
        cygpath -u "$path" 2>/dev/null || printf "%s\n" "$path"
    else
        printf "%s\n" "$path"
    fi
}

windows_localappdata_unix() {
    if [ -z "${LOCALAPPDATA:-}" ]; then
        return 1
    fi
    to_unix_path "$LOCALAPPDATA"
}

find_expected_agy_dir() {
    local localappdata_unix

    if [ -n "$INSTALL_DIR" ]; then
        if [[ "$OS" == "Windows" ]]; then
            to_unix_path "$INSTALL_DIR"
        else
            printf "%s\n" "$INSTALL_DIR"
        fi
        return 0
    fi

    if [[ "$OS" == "Windows" ]]; then
        localappdata_unix=$(windows_localappdata_unix) || return 1
        printf "%s/agy/bin\n" "$localappdata_unix"
    else
        if [ -z "${HOME:-}" ]; then
            return 1
        fi
        printf "%s/.local/bin\n" "$HOME"
    fi
}

find_expected_agy_path() {
    local agy_dir
    agy_dir=$(find_expected_agy_dir) || return 1

    if [[ "$OS" == "Windows" ]]; then
        printf "%s/agy.exe\n" "$agy_dir"
    else
        printf "%s/agy\n" "$agy_dir"
    fi
}

path_contains_dir() {
    local dir
    dir=$1
    case ":$PATH:" in
        *":$dir:"*) return 0 ;;
        *) return 1 ;;
    esac
}

remove_managed_block_from_file() {
    local file start_marker end_marker temp_file
    file=$1
    start_marker=$2
    end_marker=$3

    if [ ! -f "$file" ]; then
        return 0
    fi

    temp_file="${file}.antigravity.$$"
    if sed "/${start_marker}/,/${end_marker}/d" "$file" > "$temp_file"; then
        mv "$temp_file" "$file"
    else
        rm -f -- "$temp_file"
        return 1
    fi
}

append_git_bash_path_block() {
    local bashrc agy_dir
    bashrc=$1
    agy_dir=$2

    remove_managed_block_from_file "$bashrc" \
        "# GOAT managed: Antigravity CLI PATH" \
        "# GOAT managed end: Antigravity CLI PATH"

    {
        echo ""
        echo "# GOAT managed: Antigravity CLI PATH"
        printf "ANTIGRAVITY_CLI_BIN=%q\n" "$agy_dir"
        echo "case \":\$PATH:\" in"
        echo "    *\":\${ANTIGRAVITY_CLI_BIN}:\"*) ;;"
        echo "    *) export PATH=\"\${ANTIGRAVITY_CLI_BIN}:\$PATH\" ;;"
        echo 'esac'
        echo "# GOAT managed end: Antigravity CLI PATH"
    } >> "$bashrc"
}

select_bash_login_file() {
    local candidate

    if [ -z "${HOME:-}" ]; then
        return 1
    fi

    for candidate in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do
        if [ -f "$candidate" ]; then
            printf "%s\n" "$candidate"
            return 0
        fi
    done

    printf "%s\n" "$HOME/.bash_profile"
}

ensure_bashrc_loaded_from_login_shell() {
    local login_file
    login_file=$1

    if [ -z "$login_file" ]; then
        return 0
    fi

    if [ -f "$login_file" ] && grep -Eq '(^|[[:space:]])(\.|source)[[:space:]]+.*\.bashrc' "$login_file"; then
        return 0
    fi

    {
        echo ""
        echo "# GOAT managed: load bashrc for Antigravity CLI PATH"
        echo 'if [ -f ~/.bashrc ]; then'
        echo '    source ~/.bashrc'
        echo 'fi'
        echo "# GOAT managed end: load bashrc for Antigravity CLI PATH"
    } >> "$login_file"
}

select_git_bash_launcher_dir() {
    local candidate

    if [ -z "${HOME:-}" ]; then
        return 1
    fi

    for candidate in "$HOME/bin" "$HOME/.local/bin"; do
        if path_contains_dir "$candidate"; then
            printf "%s\n" "$candidate"
            return 0
        fi
    done

    return 1
}

create_git_bash_launcher() {
    local agy_path launcher_dir launcher

    if [[ "$OS" != "Windows" ]]; then
        return 0
    fi

    agy_path=$(find_expected_agy_path 2>/dev/null || true)
    if [ -z "$agy_path" ] || [ ! -f "$agy_path" ]; then
        echo -e "${YELLOW}Could not find agy.exe for Git Bash launcher creation.${NC}"
        return 0
    fi

    launcher_dir=$(select_git_bash_launcher_dir 2>/dev/null || true)
    if [ -z "$launcher_dir" ]; then
        echo -e "${YELLOW}No writable Git Bash launcher directory was found in the active PATH.${NC}"
        echo -e "${YELLOW}Run 'source ~/.bashrc' or open a new Git Bash terminal to use agy.${NC}"
        return 0
    fi

    if ! mkdir -p "$launcher_dir"; then
        echo -e "${YELLOW}Could not create Git Bash launcher directory: ${launcher_dir}${NC}"
        return 0
    fi

    launcher="$launcher_dir/agy"
    if [ -e "$launcher" ] && ! grep -q "GOAT managed: Antigravity CLI launcher" "$launcher" 2>/dev/null; then
        echo -e "${YELLOW}Not overwriting existing agy launcher: ${launcher}${NC}"
        return 0
    fi

    {
        echo "#!/usr/bin/env bash"
        echo "# GOAT managed: Antigravity CLI launcher"
        printf "exec %q \"\$@\"\n" "$agy_path"
    } > "$launcher"
    chmod +x "$launcher" 2>/dev/null || true

    echo -e "${GREEN}Added Git Bash launcher: ${launcher}${NC}"
}

ensure_git_bash_path() {
    local agy_dir bashrc login_file

    if [[ "$OS" != "Windows" ]]; then
        return 0
    fi

    if [ -z "${HOME:-}" ]; then
        echo -e "${YELLOW}HOME is not set. Skipping Git Bash PATH profile update.${NC}"
        return 0
    fi

    agy_dir=$(find_expected_agy_dir 2>/dev/null || true)
    if [ -z "$agy_dir" ]; then
        echo -e "${YELLOW}Could not resolve the Antigravity CLI bin directory for Git Bash PATH.${NC}"
        return 0
    fi

    if ! path_contains_dir "$agy_dir"; then
        export PATH="${agy_dir}:$PATH"
    fi

    bashrc="$HOME/.bashrc"
    touch "$bashrc"
    append_git_bash_path_block "$bashrc" "$agy_dir"

    login_file=$(select_bash_login_file 2>/dev/null || true)
    if [ -n "$login_file" ]; then
        touch "$login_file"
        ensure_bashrc_loaded_from_login_shell "$login_file"
    fi

    echo -e "${GREEN}Added Git Bash PATH bridge for: ${agy_dir}${NC}"
    create_git_bash_launcher
    echo -e "${YELLOW}If your current terminal still cannot find agy, run: hash -r${NC}"
}

verify_antigravity_binary() {
    local agy_path

    hash -r 2>/dev/null || true
    if command_exists agy; then
        agy_path=$(command -v agy)
        echo -e "${GREEN}Antigravity CLI command found: ${agy_path}${NC}"
        agy --version 2>/dev/null || echo -e "${YELLOW}Version command not available yet${NC}"
        return 0
    fi

    agy_path=$(find_expected_agy_path 2>/dev/null || true)
    if [ -n "$agy_path" ] && [ -f "$agy_path" ]; then
        echo -e "${GREEN}Antigravity CLI installed at: ${agy_path}${NC}"
        echo -e "${YELLOW}The agy command is not on PATH in this shell yet.${NC}"
        echo -e "${YELLOW}Restart your terminal or add the install directory to PATH.${NC}"
        return 0
    fi

    echo -e "${YELLOW}Antigravity installer completed, but agy was not found in PATH.${NC}"
    echo -e "${YELLOW}Restart your terminal, then run: agy --help${NC}"
    return 1
}

run_unix_installer() {
    local installer
    local installer_args=()
    installer="$TMP_WORK_DIR/install.sh"

    echo -e "\n${YELLOW}Downloading official Unix installer...${NC}"
    if ! download_file "$ANTIGRAVITY_UNIX_INSTALLER_URL" "$installer"; then
        echo -e "${RED}Failed to download ${ANTIGRAVITY_UNIX_INSTALLER_URL}.${NC}"
        exit 1
    fi
    chmod +x "$installer" 2>/dev/null || true

    if [ -n "$INSTALL_DIR" ]; then
        installer_args+=(--dir "$INSTALL_DIR")
    fi

    echo -e "${CYAN}Running official Antigravity CLI installer...${NC}"
    if ! bash "$installer" "${installer_args[@]}"; then
        echo -e "${RED}Antigravity CLI installation failed.${NC}"
        exit 1
    fi
}

run_windows_installer() {
    local installer powershell_bin windows_install_dir
    local installer_args=()
    installer="$TMP_WORK_DIR/install.ps1"

    if command_exists powershell.exe; then
        powershell_bin=powershell.exe
    elif command_exists pwsh.exe; then
        powershell_bin=pwsh.exe
    else
        echo -e "${RED}PowerShell is required to install Antigravity CLI on Windows.${NC}"
        echo -e "${YELLOW}Run the official command manually: irm https://antigravity.google/cli/install.ps1 | iex${NC}"
        exit 1
    fi

    echo -e "\n${YELLOW}Downloading official Windows PowerShell installer...${NC}"
    if ! download_file "$ANTIGRAVITY_WINDOWS_INSTALLER_URL" "$installer"; then
        echo -e "${RED}Failed to download ${ANTIGRAVITY_WINDOWS_INSTALLER_URL}.${NC}"
        exit 1
    fi

    if [ -n "$INSTALL_DIR" ]; then
        windows_install_dir=$(to_windows_path "$INSTALL_DIR")
        installer_args+=(--dir "$windows_install_dir")
    fi

    echo -e "${CYAN}Running official Antigravity CLI installer via PowerShell...${NC}"
    if ! "$powershell_bin" -NoProfile -ExecutionPolicy Bypass -File "$installer" "${installer_args[@]}"; then
        echo -e "${RED}Antigravity CLI installation failed.${NC}"
        exit 1
    fi
}

IS_WSL=false
if [[ "$OSTYPE" == "linux-gnu"* ]] && [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
fi
sanitize_path_for_wsl

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "mingw"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

if [ -z "${HOME:-}" ] && [[ "$OS" != "Windows" ]]; then
    echo -e "${RED}HOME is not set. Cannot choose the default Antigravity install directory.${NC}"
    exit 1
fi

echo -e "${CYAN}Starting Antigravity CLI installation...${NC}"
echo -e "${YELLOW}Official download page: ${WHITE}https://antigravity.google/download${NC}"
echo -e "${CYAN}Detected OS: ${WHITE}${OS}${NC}"
if [ -n "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Custom install directory: ${WHITE}${INSTALL_DIR}${NC}"
fi

case "$OS" in
    macOS|Linux|Windows) ;;
    *)
        echo -e "${RED}Unsupported operating system: ${OSTYPE}${NC}"
        echo -e "${YELLOW}Use the official instructions at https://antigravity.google/download.${NC}"
        exit 1
        ;;
esac

make_temp_dir

if [[ "$OS" == "Windows" ]]; then
    run_windows_installer
    ensure_git_bash_path
else
    run_unix_installer
fi

echo -e "\n${YELLOW}Verifying installation...${NC}"
verify_antigravity_binary || true

echo -e "\n${CYAN}========================================"
echo -e "Next Steps:"
echo -e "========================================${NC}"
echo -e "${WHITE}1. Start the CLI: agy"
echo -e "2. Authenticate with Antigravity or the Antigravity IDE before using the CLI."
echo -e "3. Run 'agy --help' to see available commands.${NC}"

echo -e "\n${GREEN}Installation process completed!${NC}"
