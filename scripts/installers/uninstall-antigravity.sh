#!/usr/bin/env bash
# GOAT System Uninstaller - Antigravity CLI
# Removes the Antigravity CLI (`agy`) installed by Google's bootstrapper.
# Run this script in Git Bash, WSL, or any Unix-like terminal.

set -euo pipefail

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Colour

INSTALL_DIR=${ANTIGRAVITY_INSTALL_DIR:-}

show_help() {
    echo ""
    echo -e "${CYAN}Antigravity CLI Uninstaller${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --dir <path>    Directory where agy was installed"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment overrides:"
    echo "  ANTIGRAVITY_INSTALL_DIR    Directory where agy was installed"
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

windows_appdata_unix() {
    if [ -z "${APPDATA:-}" ]; then
        return 1
    fi
    to_unix_path "$APPDATA"
}

resolve_install_dir() {
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

resolve_agy_binary() {
    local install_dir
    install_dir=$(resolve_install_dir) || return 1

    if [[ "$OS" == "Windows" ]]; then
        printf "%s/agy.exe\n" "$install_dir"
    else
        printf "%s/agy\n" "$install_dir"
    fi
}

find_agy_command() {
    local agy_binary

    if command_exists agy; then
        command -v agy
        return 0
    fi

    agy_binary=$(resolve_agy_binary 2>/dev/null || true)
    if [ -n "$agy_binary" ] && [ -f "$agy_binary" ]; then
        printf "%s\n" "$agy_binary"
        return 0
    fi

    return 1
}

is_safe_removal_dir() {
    local dir localappdata_unix appdata_unix
    dir=$1

    case "$dir" in
        ""|"/") return 1 ;;
    esac

    if [ -n "${HOME:-}" ]; then
        case "$dir" in
            "$HOME"/*) return 0 ;;
        esac
    fi

    if [[ "$OS" == "Windows" ]]; then
        localappdata_unix=$(windows_localappdata_unix 2>/dev/null || true)
        if [ -n "$localappdata_unix" ]; then
            case "$dir" in
                "$localappdata_unix"/*) return 0 ;;
            esac
        fi

        appdata_unix=$(windows_appdata_unix 2>/dev/null || true)
        if [ -n "$appdata_unix" ]; then
            case "$dir" in
                "$appdata_unix"/*) return 0 ;;
            esac
        fi
    fi

    return 1
}

remove_dir_prompt() {
    local dir confirm_remove
    dir=$1

    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}Not found: $dir${NC}"
        return 0
    fi

    if ! is_safe_removal_dir "$dir"; then
        echo -e "${RED}Refusing to remove path outside the expected user data roots: $dir${NC}"
        return 1
    fi

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

remove_git_bash_path_bridge() {
    local login_file

    if [ -z "${HOME:-}" ]; then
        return 0
    fi

    remove_managed_block_from_file "$HOME/.bashrc" \
        "# GOAT managed: Antigravity CLI PATH" \
        "# GOAT managed end: Antigravity CLI PATH"

    for login_file in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do
        remove_managed_block_from_file "$login_file" \
            "# GOAT managed: load bashrc for Antigravity CLI PATH" \
            "# GOAT managed end: load bashrc for Antigravity CLI PATH"
    done

    echo -e "${GREEN}Removed GOAT-managed Git Bash PATH bridge if present.${NC}"
}

remove_git_bash_launcher() {
    local launcher_dir launcher

    if [[ "$OS" != "Windows" ]] || [ -z "${HOME:-}" ]; then
        return 0
    fi

    for launcher_dir in "$HOME/bin" "$HOME/.local/bin"; do
        launcher="$launcher_dir/agy"
        if [ -f "$launcher" ] && grep -q "GOAT managed: Antigravity CLI launcher" "$launcher" 2>/dev/null; then
            if rm -f -- "$launcher"; then
                echo -e "${GREEN}Removed Git Bash launcher: ${launcher}${NC}"
            else
                echo -e "${RED}Failed to remove Git Bash launcher: ${launcher}${NC}"
            fi
        fi
    done
}

run_native_uninstall() {
    local agy_cmd
    agy_cmd=$(find_agy_command 2>/dev/null || true)

    if [ -z "$agy_cmd" ]; then
        echo -e "${YELLOW}agy command not found. Skipping native uninstall handoff.${NC}"
        return 0
    fi

    echo -e "\n${YELLOW}Running 'agy uninstall' if supported...${NC}"
    if "$agy_cmd" uninstall; then
        echo -e "${GREEN}Native uninstall handoff completed.${NC}"
    else
        echo -e "${YELLOW}agy uninstall was not available or reported an issue. Continuing with file cleanup.${NC}"
    fi
}

remove_agy_binary() {
    local agy_binary install_dir parent_dir
    agy_binary=$(resolve_agy_binary 2>/dev/null || true)
    install_dir=$(resolve_install_dir 2>/dev/null || true)

    if [ -z "$agy_binary" ]; then
        echo -e "${YELLOW}Could not resolve the agy binary path.${NC}"
        return 0
    fi

    if [ -f "$agy_binary" ]; then
        if rm -f -- "$agy_binary"; then
            echo -e "${GREEN}Removed $agy_binary${NC}"
        else
            echo -e "${RED}Failed to remove $agy_binary${NC}"
        fi
    else
        echo -e "${YELLOW}Binary not found: $agy_binary${NC}"
    fi

    if [ -n "$install_dir" ] && [ -d "$install_dir" ]; then
        rmdir "$install_dir" 2>/dev/null || true
    fi

    if [[ "$OS" == "Windows" ]] && [ -z "$INSTALL_DIR" ] && [ -n "$install_dir" ]; then
        parent_dir=$(dirname "$install_dir")
        rmdir "$parent_dir" 2>/dev/null || true
    fi
}

prompt_user_data_cleanup() {
    local data_dirs=()
    local localappdata_unix appdata_unix
    local dir

    if [ -n "${HOME:-}" ]; then
        data_dirs+=(
            "$HOME/.gemini/antigravity-cli"
            "$HOME/.cache/antigravity"
            "$HOME/.config/antigravity"
            "$HOME/.local/share/antigravity"
            "$HOME/.antigravity"
        )
    fi

    if [[ "$OS" == "Windows" ]]; then
        localappdata_unix=$(windows_localappdata_unix 2>/dev/null || true)
        if [ -n "$localappdata_unix" ]; then
            data_dirs+=(
                "$localappdata_unix/antigravity"
                "$localappdata_unix/agy"
            )
        fi

        appdata_unix=$(windows_appdata_unix 2>/dev/null || true)
        if [ -n "$appdata_unix" ]; then
            data_dirs+=("$appdata_unix/antigravity")
        fi
    fi

    for dir in "${data_dirs[@]}"; do
        remove_dir_prompt "$dir"
    done
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

case "$OS" in
    macOS|Linux|Windows) ;;
    *)
        echo -e "${RED}Unsupported operating system: ${OSTYPE}${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}Starting Antigravity CLI uninstallation...${NC}"
echo -e "${CYAN}Detected OS: ${WHITE}${OS}${NC}"
if [ -n "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Custom install directory: ${WHITE}${INSTALL_DIR}${NC}"
fi

run_native_uninstall

echo -e "\n${CYAN}========================================"
echo -e "Removing Antigravity CLI binary"
echo -e "========================================${NC}"
remove_agy_binary
remove_git_bash_path_bridge
remove_git_bash_launcher

echo -e "\n${CYAN}========================================"
echo -e "Optional Antigravity user data cleanup"
echo -e "========================================${NC}"
prompt_user_data_cleanup

echo -e "\n${CYAN}========================================"
echo -e "Verifying uninstall"
echo -e "========================================${NC}"
hash -r 2>/dev/null || true
if command_exists agy; then
    AGY_PATH=$(command -v agy)
    echo -e "${YELLOW}agy command still present at: ${AGY_PATH}${NC}"
    echo -e "${YELLOW}You may need to remove it from PATH or restart your shell.${NC}"
elif [ -n "$(resolve_agy_binary 2>/dev/null || true)" ] && [ -f "$(resolve_agy_binary 2>/dev/null || true)" ]; then
    echo -e "${YELLOW}agy binary still exists at: $(resolve_agy_binary)${NC}"
else
    echo -e "${GREEN}Antigravity CLI command not found. Uninstall appears complete.${NC}"
fi

echo -e "\n${GREEN}Uninstallation process completed!${NC}"
