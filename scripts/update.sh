#!/bin/bash
# Auktiva Update Script
# This script is called by the admin update API to pull and deploy updates
# Customize this script based on your deployment environment

set -e

echo "=== Auktiva Update Script ==="
echo "Starting update at $(date)"

# Get the project root (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "=== Step 1: Fetching latest release ==="
git fetch --tags origin

LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/thomsa/auktiva/releases/latest" 2>/dev/null | \
  grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
  echo "Error: Could not fetch latest release tag"
  exit 1
fi

echo "Latest release: $LATEST_TAG"

CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")

if [ "$CURRENT_TAG" = "$LATEST_TAG" ]; then
  echo ""
  echo "Already on latest version ($LATEST_TAG). Nothing to do."
  exit 0
fi

echo "Current version: ${CURRENT_TAG:-unknown}"
echo ""
echo "=== Step 2: Checking out $LATEST_TAG ==="
git checkout "$LATEST_TAG"

echo ""
echo "=== Step 3: Installing dependencies ==="
npm install --production=false

echo ""
echo "=== Step 4: Running database migrations ==="
npx prisma generate
npx prisma db push --accept-data-loss

echo ""
echo "=== Step 5: Building application ==="
npm run build

echo ""
echo "=== Step 6: Restarting application ==="

# Check if PM2 is available and auktiva process exists
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "auktiva"; then
    echo "Restarting PM2 process 'auktiva'..."
    pm2 restart auktiva
    echo "PM2 process restarted successfully"
  else
    echo "PM2 is installed but 'auktiva' process not found"
    echo "Build complete. Please start the application manually."
  fi
else
  echo "PM2 not found. Build complete."
  echo "Please restart your application manually if needed."
fi

echo ""
echo "=== Update completed at $(date) ==="
echo "New version: $(node -p "require('./package.json').version")"
