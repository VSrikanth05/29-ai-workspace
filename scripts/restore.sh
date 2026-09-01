#!/bin/sh
set -eu
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${1:?Usage: restore.sh /path/to/backup.dump}"
backup="$1"
test -f "$backup"
if [ -f "${backup}.sha256" ]; then sha256sum -c "${backup}.sha256"; fi
echo "Restoring $backup. Existing objects may be replaced."
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-acl "$backup"
