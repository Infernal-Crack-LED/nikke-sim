#!/usr/bin/env bash
# Pull a Google Drive file BY ID into a destination, using the read-only `gdrive`
# rclone remote — NOT the Drive MCP download_file_content (whose base64 return
# blows the model's context on large videos).
#
# Usage:  scripts/submissions/pull.sh <fileId> <destPath>
#   <destPath> is the full local path to write (parent dirs are created).
#
# One-time prerequisite (owner, interactive — opens a browser for Google OAuth):
#   rclone config create gdrive drive scope=drive.readonly
# Override the remote name with GDRIVE_REMOTE=<name> if you used a different one.
set -euo pipefail

FILE_ID="${1:?usage: pull.sh <fileId> <destPath>}"
DEST_PATH="${2:?usage: pull.sh <fileId> <destPath>}"
REMOTE="${GDRIVE_REMOTE:-gdrive}"

if ! rclone listremotes 2>/dev/null | grep -qx "${REMOTE}:"; then
  cat >&2 <<EOF
ERROR: rclone remote '${REMOTE}:' is not configured.
One-time setup (opens a browser for Google OAuth; read-only scope):
  rclone config create ${REMOTE} drive scope=drive.readonly
Then re-run. (Set GDRIVE_REMOTE to use a differently-named remote.)
EOF
  exit 3
fi

DEST_DIR="$(dirname "$DEST_PATH")"
DEST_NAME="$(basename "$DEST_PATH")"
mkdir -p "$DEST_DIR"

# `backend copyid` fetches by file ID regardless of the file's folder location.
# A trailing-slash dest keeps the source name; we want an explicit name, so pass
# the dir and then rename (copyid writes <dir>/<originalName>).
TMP_DIR="$(mktemp -d "${DEST_DIR}/.pull.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
rclone backend copyid "${REMOTE}:" "$FILE_ID" "${TMP_DIR}/" >&2
SRC="$(find "$TMP_DIR" -type f -maxdepth 1 | head -1)"
if [ -z "$SRC" ]; then
  echo "ERROR: nothing downloaded for id=$FILE_ID" >&2
  exit 4
fi
mv -f "$SRC" "$DEST_PATH"
echo "$DEST_PATH"
