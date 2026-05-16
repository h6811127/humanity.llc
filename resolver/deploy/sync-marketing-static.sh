#!/usr/bin/env bash
# Copy v5 marketing assets into the Nginx web root (apex deployment).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${1:-/var/www/humanity}"
mkdir -p "$DEST"
rsync -a --delete "$ROOT/v5/assets/" "$DEST/"
echo "Synced $ROOT/v5/assets/ → $DEST"
