#!/usr/bin/env sh
set -eu
: "${MONGODB_URI:?MONGODB_URI is required}"
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then echo "Usage: CONFIRM_RESTORE=YES MONGODB_URI=... $0 backup.archive.gz"; exit 2; fi
if [ "${CONFIRM_RESTORE:-NO}" != "YES" ]; then echo "Refusing restore. Set CONFIRM_RESTORE=YES after verifying target database."; exit 3; fi
echo "[restore] restoring $FILE"
mongorestore --uri="$MONGODB_URI" --archive="$FILE" --gzip --drop
echo "[restore] complete"
