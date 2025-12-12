#!/bin/bash

# Apply Prisma migrations to Turso database
# Usage: npm run db:migrate:turso
#
# This script applies ALL migrations in chronological order to your Turso database.
# Requires: turso CLI installed and authenticated
#
# The database name is extracted from DATABASE_URL automatically.

set -e

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Extract database name from DATABASE_URL
# Turso URLs look like: libsql://dbname-orgname.turso.io or libsql://dbname-orgname.aws-region.turso.io
# The database name is everything before the org suffix (last hyphen-separated part before the dot)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set in .env"
  exit 1
fi

# Check if it's a Turso URL
if [[ ! "$DATABASE_URL" =~ ^libsql:// ]] && [[ ! "$DATABASE_URL" =~ ^https:// ]]; then
  echo "❌ Error: DATABASE_URL is not a Turso URL"
  echo "   Current: $DATABASE_URL"
  echo "   Expected: libsql://your-database.turso.io"
  echo ""
  echo "   For local SQLite, use: npm run db:migrate"
  exit 1
fi

TURSO_DATABASE_NAME=$(echo "$DATABASE_URL" | sed -E 's|^(libsql\|https)://||' | cut -d'.' -f1 | rev | cut -d'-' -f2- | rev)

if [ -z "$TURSO_DATABASE_NAME" ]; then
  echo "❌ Error: Could not extract database name from DATABASE_URL"
  echo "   URL: $DATABASE_URL"
  exit 1
fi

# Check if turso CLI is installed
if ! command -v turso &> /dev/null; then
  echo "❌ Error: turso CLI is not installed"
  echo "   Install: curl -sSfL https://get.tur.so/install.sh | bash"
  exit 1
fi

MIGRATIONS_DIR="prisma/migrations"

# Get all migration folders sorted chronologically
MIGRATION_FOLDERS=$(ls -1 "$MIGRATIONS_DIR" | grep -v migration_lock.toml | sort)

if [ -z "$MIGRATION_FOLDERS" ]; then
  echo "❌ Error: No migrations found in $MIGRATIONS_DIR"
  exit 1
fi

echo "🚀 Applying migrations to Turso database: $TURSO_DATABASE_NAME"
echo ""

# Count migrations
TOTAL=$(echo "$MIGRATION_FOLDERS" | wc -l | tr -d ' ')
CURRENT=0

# Apply each migration in order
for MIGRATION_FOLDER in $MIGRATION_FOLDERS; do
  CURRENT=$((CURRENT + 1))
  MIGRATION_FILE="$MIGRATIONS_DIR/$MIGRATION_FOLDER/migration.sql"
  
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo "⚠️  Skipping $MIGRATION_FOLDER (no migration.sql found)"
    continue
  fi
  
  echo "[$CURRENT/$TOTAL] Applying: $MIGRATION_FOLDER"
  
  if turso db shell "$TURSO_DATABASE_NAME" < "$MIGRATION_FILE"; then
    echo "   ✓ Done"
  else
    echo "   ❌ Failed to apply migration: $MIGRATION_FOLDER"
    echo "   Note: If tables already exist, this may be expected."
    exit 1
  fi
done

echo ""
echo "✅ All migrations applied successfully!"
