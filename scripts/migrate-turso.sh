#!/bin/bash

# Apply Prisma migrations to Turso database
# Usage: npm run db:migrate:turso
#
# This script applies ONLY NEW migrations to your Turso database.
# It tracks applied migrations in a _prisma_migrations table.
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

# Create migrations tracking table if it doesn't exist
echo "📋 Checking migration tracking table..."
turso db shell "$TURSO_DATABASE_NAME" <<EOF 2>/dev/null || true
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id TEXT PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
EOF

# Get list of already applied migrations
APPLIED_MIGRATIONS=$(turso db shell "$TURSO_DATABASE_NAME" "SELECT migration_name FROM _prisma_migrations;" 2>/dev/null | tail -n +2 | awk '{print $1}' || echo "")

# Count migrations
TOTAL=$(echo "$MIGRATION_FOLDERS" | wc -l | tr -d ' ')
CURRENT=0
APPLIED=0
SKIPPED=0

# Apply each migration in order
for MIGRATION_FOLDER in $MIGRATION_FOLDERS; do
  CURRENT=$((CURRENT + 1))
  MIGRATION_FILE="$MIGRATIONS_DIR/$MIGRATION_FOLDER/migration.sql"
  
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo "⚠️  [$CURRENT/$TOTAL] Skipping $MIGRATION_FOLDER (no migration.sql found)"
    continue
  fi
  
  # Check if migration was already applied
  if echo "$APPLIED_MIGRATIONS" | grep -q "^${MIGRATION_FOLDER}$"; then
    echo "⏭️  [$CURRENT/$TOTAL] Already applied: $MIGRATION_FOLDER"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  echo "🔄 [$CURRENT/$TOTAL] Applying: $MIGRATION_FOLDER"
  
  if turso db shell "$TURSO_DATABASE_NAME" < "$MIGRATION_FILE"; then
    # Record the migration as applied
    MIGRATION_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)-$RANDOM")
    turso db shell "$TURSO_DATABASE_NAME" "INSERT INTO _prisma_migrations (id, migration_name) VALUES ('$MIGRATION_ID', '$MIGRATION_FOLDER');"
    echo "   ✓ Done"
    APPLIED=$((APPLIED + 1))
  else
    echo "   ❌ Failed to apply migration: $MIGRATION_FOLDER"
    exit 1
  fi
done

echo ""
echo "✅ Migration complete!"
echo "   Applied: $APPLIED new migration(s)"
echo "   Skipped: $SKIPPED already applied"
