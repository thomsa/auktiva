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
echo "=== Step 4: Backing up database ==="

# Check if using SQLite (file-based database)
if [ -f ".env" ]; then
  DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2 | tr -d '"')
  if [[ "$DB_URL" == file:* ]]; then
    DB_PATH="${DB_URL#file:}"
    DB_PATH="${DB_PATH#./}"
    if [ -f "$DB_PATH" ]; then
      BACKUP_DIR="backups"
      TIMESTAMP=$(date +%Y%m%d_%H%M%S)
      BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.db"
      mkdir -p "$BACKUP_DIR"
      cp "$DB_PATH" "$BACKUP_FILE"
      echo "Database backed up to: $BACKUP_FILE"
    else
      echo "Database file not found at $DB_PATH, skipping backup"
    fi
  else
    echo "Using remote database (Turso), skipping local backup"
  fi
else
  echo "No .env file found, skipping database backup"
fi

echo ""
echo "=== Step 5: Running database migrations ==="
npx prisma generate
npx prisma db push --accept-data-loss

echo ""
echo "=== Step 6: Building application ==="
npm run build

echo ""
echo "=== Step 7: Restarting application ==="

# Use ecosystem.config.js if available, otherwise fall back to direct restart
if command -v pm2 &> /dev/null; then
  if [ -f "ecosystem.config.js" ]; then
    echo "Using ecosystem.config.js..."
    pm2 startOrRestart ecosystem.config.js
    pm2 save
    echo "PM2 process started/restarted successfully"
  elif pm2 list | grep -q "auktiva"; then
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
