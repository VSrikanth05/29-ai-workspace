#!/bin/sh
set -eu
: "${1:?Usage: restore-storage.sh /path/to/objects-TIMESTAMP.tar.gz}"
: "${STORAGE_PROVIDER:?STORAGE_PROVIDER is required}"
archive="$1"; test -f "$archive"
if [ -f "${archive}.sha256" ]; then sha256sum -c "${archive}.sha256"; fi
temporary="$(mktemp -d)"; trap 'rm -rf "$temporary"' EXIT
tar -xzf "$archive" -C "$temporary"
source_dir="$(find "$temporary" -mindepth 1 -maxdepth 1 -type d | head -n 1)"; test -n "$source_dir"
if [ "$STORAGE_PROVIDER" = "r2" ]; then
  : "${R2_ACCOUNT_ID:?}"; : "${R2_ACCESS_KEY_ID:?}"; : "${R2_SECRET_ACCESS_KEY:?}"; : "${R2_BUCKET_NAME:?}"
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" aws s3 sync "$source_dir" "s3://${R2_BUCKET_NAME}" --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" --no-progress
else
  : "${SUPABASE_STORAGE_RCLONE_REMOTE:?}"
  rclone copy "$source_dir" "${SUPABASE_STORAGE_RCLONE_REMOTE}:" --checksum
fi
echo "Object storage restore completed. Run scripts/verify-health.sh next."
