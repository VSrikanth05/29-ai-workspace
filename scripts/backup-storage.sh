#!/bin/sh
set -eu
: "${STORAGE_BACKUP_DIR:?STORAGE_BACKUP_DIR is required}"
: "${STORAGE_PROVIDER:?STORAGE_PROVIDER is required}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${STORAGE_BACKUP_DIR}/objects-${timestamp}"
mkdir -p "$target"
if [ "$STORAGE_PROVIDER" = "r2" ]; then
  : "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"; : "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"; : "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"; : "${R2_BUCKET_NAME:?R2_BUCKET_NAME is required}"
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" aws s3 sync "s3://${R2_BUCKET_NAME}" "$target" --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" --no-progress
else
  : "${SUPABASE_STORAGE_RCLONE_REMOTE:?Configure an rclone remote for the private Supabase bucket}"
  rclone sync "${SUPABASE_STORAGE_RCLONE_REMOTE}:" "$target" --checksum
fi
find "$target" -type f -exec sha256sum {} \; > "${target}.sha256"
tar -C "$STORAGE_BACKUP_DIR" -czf "${target}.tar.gz" "$(basename "$target")"
sha256sum "${target}.tar.gz" > "${target}.tar.gz.sha256"
echo "Object storage backup completed: ${target}.tar.gz"
