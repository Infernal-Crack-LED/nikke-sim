#!/usr/bin/env bash
# gen-maiden-avatar.sh — regenerate the web Maiden bot avatar (img/maiden.gif)
# from the in-repo source banner. Self-contained: no reference to any external
# directory. Requires ffmpeg.
#
# The source (assets/maiden-avatar-source.gif) is the 1080x402 bot banner. We
# crop a face-centered 340x340 square (centered on ~(600,200)), scale to 160x160,
# and keep it animated — CSS renders it as a circular Discord-style avatar.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="assets/maiden-avatar-source.gif"
OUT="img/maiden.gif"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg required" >&2; exit 1; }
[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

ffmpeg -y -i "$SRC" -filter_complex \
  "[0:v]crop=340:340:430:30,scale=160:160:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  "$OUT"

echo "wrote $OUT"
