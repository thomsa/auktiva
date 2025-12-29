#!/bin/bash

# =============================================================================
# Auktiva Installation Script
# =============================================================================
# Usage: curl -fsSL https://raw.githubusercontent.com/thomsa/auktiva/main/scripts/install.sh | bash
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

print_logo() {
  echo -e "${CYAN}${BOLD}"
  echo "    ___         __   __  _            "
  echo "   /   | __  __/ /__/ /_(_)   ______ _"
  echo "  / /| |/ / / / //_/ __/ / | / / __ \`/"
  echo " / ___ / /_/ / ,< / /_/ /| |/ / /_/ / "
  echo "/_/  |_\\__,_/_/|_|\\__/_/ |___/\\__,_/  "
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Get Node.js major version
get_node_version() {
  if command_exists node; then
    node -v | sed 's/v//' | cut -d. -f1
  else
    echo "0"
  fi
}

main() {
  clear
  print_logo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Auktiva Installer${NC}"
  echo -e "${DIM}  A comprehensive auction platform${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # ==========================================================================
  # Check Node.js
  # ==========================================================================
  print_info "Checking prerequisites..."
  echo ""

  if ! command_exists node; then
    print_error "Node.js is not installed!"
    echo ""
    echo "  Please install Node.js 20 or later:"
    echo ""
    echo -e "  ${DIM}# Using nvm (recommended):${NC}"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install 20"
    echo ""
    echo -e "  ${DIM}# Or visit: https://nodejs.org${NC}"
    echo ""
    exit 1
  fi

  NODE_VERSION=$(get_node_version)
  if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version $NODE_VERSION is too old!"
    echo ""
    echo "  Auktiva requires Node.js 20.0.0 or higher."
    echo "  Current version: $(node -v)"
    echo ""
    echo "  Please upgrade Node.js:"
    echo ""
    echo -e "  ${DIM}# Using nvm:${NC}"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo ""
    echo -e "  ${DIM}# Or download from: https://nodejs.org${NC}"
    echo ""
    echo "  After upgrading, run this installer again."
    echo ""
    exit 1
  fi
  print_success "Node.js $(node -v)"

  if ! command_exists npm; then
    print_error "npm is not installed!"
    exit 1
  fi
  print_success "npm v$(npm -v)"

  if ! command_exists git; then
    print_error "git is not installed!"
    echo ""
    echo "  Please install git first."
    exit 1
  fi
  print_success "git installed"

  echo ""

  # ==========================================================================
  # Clone Repository
  # ==========================================================================
  INSTALL_DIR="${AUKTIVA_INSTALL_DIR:-$(pwd)/auktiva}"

  if [ -d "$INSTALL_DIR" ]; then
    print_info "Directory $INSTALL_DIR already exists"
    read -p "  Remove and reinstall? [y/N] " remove_confirm
    if [[ "$remove_confirm" =~ ^[Yy] ]]; then
      rm -rf "$INSTALL_DIR"
    else
      cd "$INSTALL_DIR"
      if [ -d ".git" ]; then
        print_info "Pulling latest changes..."
        git pull origin main 2>/dev/null || true
      fi
    fi
  fi

  if [ ! -d "$INSTALL_DIR" ]; then
    print_info "Downloading Auktiva..."
    git clone --depth 1 --quiet https://github.com/thomsa/auktiva.git "$INSTALL_DIR"
    print_success "Downloaded to $INSTALL_DIR"
  fi

  cd "$INSTALL_DIR"

  # ==========================================================================
  # Install Dependencies
  # ==========================================================================
  echo ""
  print_info "Installing dependencies (this may take a minute)..."
  npm ci --silent 2>/dev/null || npm install --silent
  print_success "Dependencies installed"

  # ==========================================================================
  # Run Setup Wizard
  # ==========================================================================
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  print_info "Launching setup wizard..."
  echo ""

  # Run the interactive setup with TTY
  # When piped from curl, we need to run setup with stdin from terminal
  npx tsx cli/setup.ts </dev/tty
}

main "$@"
