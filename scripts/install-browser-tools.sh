#!/usr/bin/env bash
# =============================================================================
# Browser Tools Installer
# =============================================================================
# Creates a user-local Python venv, installs browser-use, installs Python
# Playwright, and installs Playwright's Chromium browser for local browser
# automation checks.
#
# Usage:
#   scripts/install-browser-tools.sh
#   scripts/install-browser-tools.sh --with-system-deps
#   scripts/install-browser-tools.sh --no-system-deps
#   scripts/install-browser-tools.sh --force
#
# Notes:
#   - Default install path: ~/.local/share/goatflow-browser-tools/venv
#   - CLI wrapper path:    ~/.local/bin/browser-use
#   - Python wrapper path: ~/.local/bin/browser-use-python
#   - On WSL, --with-system-deps is auto-enabled because Chromium needs OS
#     libraries (libnss3, libgbm1, libgtk-3-0, libasound2, ...) that stock
#     WSL2 images don't ship. Pass --no-system-deps to skip.
#   - Refuses to overwrite an existing ~/.local/bin/browser-use that wasn't
#     written by this script (e.g. from `uv tool install browser-use` or
#     `pipx install browser-use`) unless --force is passed.
#   - Removes the legacy install root ~/.local/share/halaxy-browser-tools
#     before reinstalling under ~/.local/share/goatflow-browser-tools.
#   - The script does not write to repo .env files or install Python packages
#     into the project's app environment.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

INSTALL_ROOT="${BROWSER_TOOLS_HOME:-$HOME/.local/share/goatflow-browser-tools}"
LEGACY_INSTALL_ROOT="$HOME/.local/share/halaxy-browser-tools"
VENV_DIR="${BROWSER_TOOLS_VENV:-$INSTALL_ROOT/venv}"
BIN_DIR="${BROWSER_TOOLS_BIN_DIR:-$HOME/.local/bin}"
WRAPPER_PY="$BIN_DIR/browser-use-python"
WRAPPER_BU="$BIN_DIR/browser-use"
WRAPPER_MARKER="goatflow-browser-tools-wrapper"
WITH_SYSTEM_DEPS=false
NO_SYSTEM_DEPS=false
FORCE=false

usage() {
    cat <<'EOF'
Usage: scripts/install-browser-tools.sh [OPTIONS]

Options:
  --with-system-deps  Also install Playwright OS dependencies.
                      May invoke sudo through Playwright on Linux.
                      Auto-enabled on WSL unless --no-system-deps is set.
  --no-system-deps    Skip system dependency install even on WSL.
  --force             Recreate the venv and overwrite existing wrappers in
                      ~/.local/bin (including foreign wrappers from uv/pipx).
  --help, -h          Show this help.

Environment overrides:
  BROWSER_TOOLS_HOME     Install root. Default: ~/.local/share/goatflow-browser-tools
  BROWSER_TOOLS_VENV     Virtualenv path. Default: $BROWSER_TOOLS_HOME/venv
  BROWSER_TOOLS_BIN_DIR  Wrapper dir. Default: ~/.local/bin
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --with-system-deps)
            WITH_SYSTEM_DEPS=true
            shift
            ;;
        --no-system-deps)
            NO_SYSTEM_DEPS=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}" >&2
            usage >&2
            exit 2
            ;;
    esac
done

if [[ "$WITH_SYSTEM_DEPS" == true && "$NO_SYSTEM_DEPS" == true ]]; then
    echo -e "${RED}Cannot pass both --with-system-deps and --no-system-deps.${NC}" >&2
    usage >&2
    exit 2
fi

is_wsl() {
    [[ -f /proc/version ]] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null
}

if is_wsl && [[ "$WITH_SYSTEM_DEPS" == false && "$NO_SYSTEM_DEPS" == false ]]; then
    echo -e "${YELLOW}WSL detected - enabling --with-system-deps automatically.${NC}"
    echo -e "${WHITE}Chromium needs OS libraries (libnss3, libatk, etc.) that WSL does not ship.${NC}"
    echo -e "${WHITE}Pass --no-system-deps to skip this (browser will likely fail to launch).${NC}"
    WITH_SYSTEM_DEPS=true
fi

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

find_python() {
    local candidate
    for candidate in python3.13 python3.12 python3.11 python3; do
        if ! command_exists "$candidate"; then
            continue
        fi
        if "$candidate" -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
            PYTHON_CMD="$candidate"
            PYTHON_VERSION="$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)"
            return 0
        fi
    done
    return 1
}

# Refuse to overwrite a wrapper that wasn't written by this script unless
# --force is explicit. Existing wrappers from this script are detected by the
# marker, the current install root, or the legacy halaxy install root.
guard_existing_wrapper() {
    local path="$1"
    local content
    local target

    if [[ ! -e "$path" && ! -L "$path" ]]; then
        return 0
    fi
    if [[ -d "$path" && ! -L "$path" ]]; then
        echo -e "${RED}Refusing to overwrite directory: $path${NC}" >&2
        exit 3
    fi
    if grep -q "$WRAPPER_MARKER" "$path" 2>/dev/null; then
        return 0
    fi

    content="$(cat "$path" 2>/dev/null || true)"
    if [[ "$content" == *"$INSTALL_ROOT/"* ]] || [[ "$content" == *"$LEGACY_INSTALL_ROOT/"* ]]; then
        echo -e "${YELLOW}Upgrading wrapper from previous install: $path${NC}"
        return 0
    fi
    if [[ "$FORCE" == true ]]; then
        echo -e "${YELLOW}Overwriting foreign wrapper $path (--force)${NC}"
        return 0
    fi

    target="$(readlink -f "$path" 2>/dev/null || echo "$path")"
    echo -e "${RED}Refusing to overwrite existing wrapper: $path${NC}" >&2
    echo -e "${WHITE}It points to: ${target}${NC}" >&2
    echo -e "${WHITE}Looks like another installer (e.g. ${GREEN}uv tool install browser-use${WHITE}) created it.${NC}" >&2
    echo -e "${WHITE}If you want this script to manage it instead, rerun with ${GREEN}--force${WHITE}.${NC}" >&2
    exit 3
}

echo -e "${CYAN}Installing browser tools for local browser automation${NC}"

PYTHON_CMD=""
PYTHON_VERSION=""
if ! find_python; then
    echo -e "${RED}Python 3.11+ is required for browser-use.${NC}" >&2
    echo -e "${WHITE}Install Python 3.11+ first, then rerun this script.${NC}" >&2
    exit 1
fi

echo -e "${GREEN}Python ${PYTHON_VERSION} found (${PYTHON_CMD})${NC}"

# Fail fast if a foreign wrapper is in the way, before doing the expensive install.
guard_existing_wrapper "$WRAPPER_PY"
guard_existing_wrapper "$WRAPPER_BU"

# Remove legacy install root if present and the new root has not been created.
if [[ -d "$LEGACY_INSTALL_ROOT" && "$INSTALL_ROOT" != "$LEGACY_INSTALL_ROOT" && ! -e "$INSTALL_ROOT" ]]; then
    echo -e "${YELLOW}Removing legacy install at ${LEGACY_INSTALL_ROOT} (will reinstall under ${INSTALL_ROOT})${NC}"
    rm -rf "$LEGACY_INSTALL_ROOT"
fi

if [[ "$FORCE" == true && -d "$VENV_DIR" ]]; then
    echo -e "${YELLOW}Removing existing venv: ${VENV_DIR}${NC}"
    rm -rf "$VENV_DIR"
fi

mkdir -p "$INSTALL_ROOT" "$BIN_DIR"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
    echo -e "${CYAN}Creating venv: ${WHITE}${VENV_DIR}${NC}"
    "$PYTHON_CMD" -m venv "$VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"

echo -e "${CYAN}Upgrading packaging tools${NC}"
"$VENV_PYTHON" -m pip install --upgrade --quiet pip setuptools wheel

echo -e "${CYAN}Installing browser-use and Python Playwright${NC}"
"$VENV_PYTHON" -m pip install --upgrade --quiet browser-use playwright

echo -e "${CYAN}Installing Playwright Chromium browser${NC}"
if [[ "$WITH_SYSTEM_DEPS" == true ]]; then
    "$VENV_PYTHON" -m playwright install --with-deps chromium
else
    "$VENV_PYTHON" -m playwright install chromium
fi

# Prefer the published entry point. The browser_use package is not executable
# with `python -m browser_use` in current releases.
if [[ ! -x "$VENV_DIR/bin/browser-use" ]]; then
    echo -e "${RED}Expected browser-use entry point was not installed: $VENV_DIR/bin/browser-use${NC}" >&2
    exit 1
fi

rm -f "$WRAPPER_PY"
cat > "$WRAPPER_PY" <<EOF
#!/usr/bin/env bash
# $WRAPPER_MARKER
exec "$VENV_PYTHON" "\$@"
EOF
chmod +x "$WRAPPER_PY"

rm -f "$WRAPPER_BU"
cat > "$WRAPPER_BU" <<EOF
#!/usr/bin/env bash
# $WRAPPER_MARKER
exec "$VENV_DIR/bin/browser-use" "\$@"
EOF
chmod +x "$WRAPPER_BU"

echo -e "${CYAN}Verifying Python modules${NC}"
"$VENV_PYTHON" - <<'PY'
import importlib.util
import sys

missing = [name for name in ("browser_use", "playwright") if importlib.util.find_spec(name) is None]
if missing:
    print("Missing modules: " + ", ".join(missing), file=sys.stderr)
    raise SystemExit(1)

print("browser-use and Playwright import ok")
PY

echo -e "${CYAN}Verifying Chromium launches${NC}"
BROWSER_OK=true
LAUNCH_OUTPUT=""
if LAUNCH_OUTPUT=$("$VENV_PYTHON" - 2>&1 <<'PY'
from playwright.sync_api import sync_playwright
import sys

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("data:text/html,<h1>ok</h1>")
        title = page.content()
        browser.close()
        if "ok" in title:
            print("Chromium launched and rendered a page successfully")
        else:
            print("Chromium launched but page content was unexpected", file=sys.stderr)
            sys.exit(1)
except Exception as e:
    print(f"Chromium failed to launch: {e}", file=sys.stderr)
    sys.exit(1)
PY
); then
    echo -e "${GREEN}${LAUNCH_OUTPUT}${NC}"
else
    BROWSER_OK=false
    echo -e "${RED}Chromium failed to launch.${NC}" >&2
    echo "$LAUNCH_OUTPUT" >&2
    echo "" >&2
    if is_wsl; then
        echo -e "${YELLOW}On WSL, Chromium needs system libraries that are not installed by default.${NC}" >&2
        echo -e "${WHITE}Try reinstalling with system dependencies:${NC}" >&2
        echo -e "  ${GREEN}$0 --force --with-system-deps${NC}" >&2
    else
        echo -e "${YELLOW}Chromium may be missing OS-level dependencies.${NC}" >&2
        echo -e "${WHITE}Try reinstalling with system dependencies:${NC}" >&2
        echo -e "  ${GREEN}$0 --force --with-system-deps${NC}" >&2
        echo -e "${WHITE}Or install them manually:${NC}" >&2
        echo -e "  ${GREEN}${VENV_PYTHON} -m playwright install-deps chromium${NC}" >&2
    fi
fi

echo ""
if [[ "$BROWSER_OK" == true ]]; then
    echo -e "${GREEN}Browser tools installed and verified successfully.${NC}"
else
    echo -e "${YELLOW}Browser tools installed but Chromium cannot launch yet (see above).${NC}"
fi
echo -e "${WHITE}CLI wrapper:${NC}    ${GREEN}${WRAPPER_BU}${NC}"
echo -e "${WHITE}Python wrapper:${NC} ${GREEN}${WRAPPER_PY}${NC}"
echo -e "${WHITE}Run diagnostics:${NC}"
echo -e "  ${GREEN}browser-use doctor${NC}"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}${BIN_DIR} is not currently in PATH.${NC}"
    echo -e "${WHITE}Add this to your shell profile if you want the wrapper available everywhere:${NC}"
    echo -e "  ${GREEN}export PATH=\"${BIN_DIR}:\$PATH\"${NC}"
fi

if [[ "$BROWSER_OK" != true ]]; then
    exit 1
fi
