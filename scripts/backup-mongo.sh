#!/usr/bin/env sh
set -eu
: "${MONGODB_URI:?MONGODB_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/xiii-mongodb-$STAMP.archive.gz"
echo "[backup] writing $OUT"
mongodump --uri="$MONGODB_URI" --archive="$OUT" --gzip
find "$BACKUP_DIR" -type f -name 'xiii-mongodb-*.archive.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[backup] complete"
