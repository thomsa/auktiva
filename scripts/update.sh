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
echo "=== Step 1: Fetching latest changes ==="
git fetch origin

echo ""
echo "=== Step 2: Pulling updates ==="
git pull origin main

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
# Uncomment and modify based on your deployment:

# For PM2:
# pm2 restart auktiva

# For systemd:
# sudo systemctl restart auktiva

# For Docker:
# docker-compose restart app

# For development (just exits, Next.js dev server will restart):
echo "Build complete. Please restart your application manually if needed."

echo ""
echo "=== Update completed at $(date) ==="
echo "New version: $(node -p "require('./package.json').version")"
