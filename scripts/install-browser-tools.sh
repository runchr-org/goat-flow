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
#   scripts/install-browser-tools.sh --force
#
# Notes:
#   - Default install path: ~/.local/share/goatflow-browser-tools/venv
#   - Wrapper path:        ~/.local/bin/browser-use-python
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
VENV_DIR="${BROWSER_TOOLS_VENV:-$INSTALL_ROOT/venv}"
BIN_DIR="${BROWSER_TOOLS_BIN_DIR:-$HOME/.local/bin}"
WRAPPER="$BIN_DIR/browser-use-python"
WITH_SYSTEM_DEPS=false
FORCE=false

usage() {
    cat <<'EOF'
Usage: scripts/install-browser-tools.sh [OPTIONS]

Options:
  --with-system-deps  Also install Playwright OS dependencies.
                      May invoke sudo through Playwright on Linux.
  --force             Recreate the browser-tools virtualenv.
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

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

find_python() {
    local candidate version
    for candidate in python3.13 python3.12 python3.11 python3; do
        if ! command_exists "$candidate"; then
            continue
        fi
        version="$("$candidate" - <<'PY' 2>/dev/null || true
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
)"
        if [[ -n "$version" ]] && [[ "$(printf '%s\n' "3.11" "$version" | sort -V | head -1)" == "3.11" ]]; then
            PYTHON_CMD="$candidate"
            PYTHON_VERSION="$version"
            return 0
        fi
    done
    return 1
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

cat > "$WRAPPER" <<EOF
#!/usr/bin/env bash
exec "$VENV_PYTHON" "\$@"
EOF
chmod +x "$WRAPPER"

echo -e "${CYAN}Verifying install${NC}"
"$VENV_PYTHON" - <<'PY'
import importlib.util
import sys

missing = [name for name in ("browser_use", "playwright") if importlib.util.find_spec(name) is None]
if missing:
    print("Missing modules: " + ", ".join(missing), file=sys.stderr)
    raise SystemExit(1)

print("browser-use and Playwright import ok")
PY

echo ""
echo -e "${GREEN}Browser tools installed successfully.${NC}"
echo -e "${WHITE}Python wrapper:${NC} ${GREEN}${WRAPPER}${NC}"
echo -e "${WHITE}Run a quick import check:${NC}"
echo -e "  ${GREEN}${WRAPPER} -c 'import browser_use, playwright; print(\"ok\")'${NC}"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}${BIN_DIR} is not currently in PATH.${NC}"
    echo -e "${WHITE}Add this to your shell profile if you want the wrapper available everywhere:${NC}"
    echo -e "  ${GREEN}export PATH=\"${BIN_DIR}:\$PATH\"${NC}"
fi
