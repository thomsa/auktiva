#!/bin/bash
# Auktiva Update Script
#
# The Deployment Admin updater (POST /api/system/update) runs this script to
# install the latest release. It:
#
#   1. finds the latest release tag,
#   2. checks that the database's migration history matches its schema, and
#      stops before changing anything if it does not (see
#      scripts/check-migration-history.ts),
#   3. checks out the tag and installs its dependencies,
#   4. backs up a SQLite database file,
#   5. applies the new migrations: `prisma migrate deploy` for SQLite,
#      `npm run db:migrate:turso` for Turso,
#   6. builds and restarts the application.
#
# DATABASE_URL comes from the environment, else from .env, else it is
# file:./dev.db, the same default the app and prisma.config.ts use.
# Backups go to backups/ (set AUKTIVA_BACKUP_DIR to change that).
#
# Customize the restart step (restart_application) for your environment.
# `source scripts/update.sh` defines the functions without running them.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
UPGRADE_DOCS_URL="https://docs.auktiva.org/developers/upgrading"

# Prints the database URL: DATABASE_URL from the environment, else the last
# DATABASE_URL line of .env, else the default.
resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s\n' "$DATABASE_URL"
    return
  fi
  local line=""
  if [ -f .env ]; then
    line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' .env | tail -n 1 || true)
  fi
  if [ -z "$line" ]; then
    printf 'file:./dev.db\n'
    return
  fi
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line#\"}"
  line="${line%\"}"
  line="${line#\'}"
  line="${line%\'}"
  printf '%s\n' "$line"
}

is_sqlite_url() {
  [[ "$1" == file:* ]]
}

is_turso_url() {
  [[ "$1" == libsql://* || "$1" == https://* ]]
}

# Prints the database file of a file: URL, relative to the project root
# unless absolute.
sqlite_db_path() {
  local path="${1#file:}"
  printf '%s\n' "${path%%\?*}"
}

# Read-only. Returns non-zero, with instructions on stderr, when the
# migrations cannot update the database as it is.
check_migration_history() {
  npx tsx scripts/check-migration-history.ts
}

# Copies a SQLite database file (and its WAL file, if any) to the backup
# directory and prints the backup path. Nothing to do for Turso.
backup_database() {
  local url="$1"
  if is_turso_url "$url"; then
    echo "Turso database: this script cannot back it up. Use Turso's backups" >&2
    echo "or point-in-time restore if you need to undo this update." >&2
    return 0
  fi
  local db_path
  db_path="$(sqlite_db_path "$url")"
  if [ ! -f "$db_path" ]; then
    echo "No database file at $db_path yet, nothing to back up." >&2
    return 0
  fi
  local backup_dir="${AUKTIVA_BACKUP_DIR:-backups}"
  local backup_file
  backup_file="${backup_dir}/backup_$(date +%Y%m%d_%H%M%S).db"
  # Explicit returns: this runs in a command substitution, where set -e
  # does not stop the function.
  mkdir -p "$backup_dir" || return 1
  cp "$db_path" "$backup_file" || return 1
  if [ -f "${db_path}-wal" ]; then
    cp "${db_path}-wal" "${backup_file}-wal" || return 1
  fi
  echo "Database backed up to: $backup_file" >&2
  printf '%s\n' "$backup_file"
}

# Applies the migrations that the database does not have yet.
migrate_database() {
  local url="$1"
  if is_sqlite_url "$url"; then
    npx prisma migrate deploy
  elif is_turso_url "$url"; then
    npm run db:migrate:turso
  else
    echo "Error: DATABASE_URL must start with file:, libsql:// or https://" >&2
    return 1
  fi
}

install_dependencies() {
  # --include=dev: the build needs devDependencies, and the updater runs
  # with NODE_ENV=production, which would leave them out.
  if ! npm ci --include=dev; then
    echo "npm ci failed, falling back to npm install"
    npm install --include=dev
  fi
}

restart_application() {
  # Use ecosystem.config.js if available, otherwise fall back to direct restart
  if command -v pm2 &> /dev/null; then
    if [ -f "ecosystem.config.js" ]; then
      echo "Using ecosystem.config.js..."
      # Delete existing process to ensure clean state (avoids stale config issues)
      pm2 delete auktiva 2>/dev/null || true
      # Start fresh from ecosystem.config.js
      pm2 start ecosystem.config.js
      pm2 save
      echo "PM2 process started successfully"
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
}

BACKUP_FILE=""
PREVIOUS_REF=""
CHECKED_OUT=""

report_failure() {
  local status=$?
  if [ "$status" -eq 0 ]; then
    return
  fi
  echo ""
  echo "=== Update failed (exit $status) ==="
  if [ -n "$CHECKED_OUT" ]; then
    echo "The code is checked out at $LATEST_TAG, but the running application"
    echo "was not rebuilt. Running this script again does nothing, because it"
    echo "is already on that tag. Finish the remaining steps by hand, or check"
    echo "out $PREVIOUS_REF to go back."
  fi
  if [ -n "$BACKUP_FILE" ]; then
    echo "Database backup from before the migrations: $BACKUP_FILE"
  fi
  echo "See ${UPGRADE_DOCS_URL}#troubleshooting"
}

main() {
  cd "$PROJECT_ROOT"
  trap report_failure EXIT

  echo "=== Auktiva Update Script ==="
  echo "Starting update at $(date)"

  echo ""
  echo "=== Step 1: Fetching latest release ==="
  git fetch --tags origin

  LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/thomsa/auktiva/releases/latest" 2>/dev/null | \
    grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)

  if [ -z "$LATEST_TAG" ]; then
    echo "Error: Could not fetch latest release tag"
    exit 1
  fi

  # Validate tag format to prevent command injection (must be semver like v1.2.3 or 1.2.3)
  if [[ ! "$LATEST_TAG" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo "Error: Invalid tag format '$LATEST_TAG'. Expected semver format (e.g., v1.2.3)"
    exit 1
  fi

  echo "Latest release: $LATEST_TAG"

  local current_tag
  current_tag=$(git describe --tags --exact-match 2>/dev/null || echo "")

  if [ "$current_tag" = "$LATEST_TAG" ]; then
    echo ""
    echo "Already on latest version ($LATEST_TAG). Nothing to do."
    exit 0
  fi

  echo "Current version: ${current_tag:-unknown}"

  local db_url
  db_url="$(resolve_database_url)"
  export DATABASE_URL="$db_url"

  echo ""
  echo "=== Step 2: Checking the database migration history ==="
  if ! check_migration_history; then
    echo ""
    echo "Update stopped before anything was changed."
    exit 1
  fi

  echo ""
  echo "=== Step 3: Checking out $LATEST_TAG ==="
  PREVIOUS_REF=$(git rev-parse HEAD)
  git checkout "$LATEST_TAG"
  CHECKED_OUT=1

  echo ""
  echo "=== Step 4: Installing dependencies ==="
  install_dependencies

  echo ""
  echo "=== Step 5: Backing up database ==="
  BACKUP_FILE="$(backup_database "$db_url")"

  echo ""
  echo "=== Step 6: Running database migrations ==="
  npx prisma generate
  migrate_database "$db_url"

  echo ""
  echo "=== Step 7: Building application ==="
  npm run build

  echo ""
  echo "=== Step 8: Restarting application ==="
  restart_application

  echo ""
  echo "=== Update completed at $(date) ==="
  echo "New version: $(node -p "require('./package.json').version")"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
