#!/bin/sh
set -eu
: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
backup_once() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  target="${BACKUP_DIR}/aida-${timestamp}.dump"
  mkdir -p "$BACKUP_DIR"
  pg_dump --dbname="$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file="$target"
  sha256sum "$target" > "${target}.sha256"
  find "$BACKUP_DIR" -type f -name 'aida-*.dump*' -mtime "+${RETENTION_DAYS}" -delete
  echo "Backup completed: $target"
}
if [ "${1:-}" = "--loop" ]; then
  while true; do backup_once; sleep "$INTERVAL"; done
else
  backup_once
fi
