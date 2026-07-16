#!/bin/bash
# batch-restore.sh — restore the whole scrub surface from the single batch-prep backup.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BK="scratchpad/blind-backup"
[ -d "$BK" ] || { echo "no backup at $BK"; exit 1; }
( cd "$BK" && find . -type f ) | while read -r rel; do
  cp "$BK/${rel#./}" "${rel#./}"
done
echo "batch-restore: restored from $BK"
