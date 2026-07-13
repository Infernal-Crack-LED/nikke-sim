#!/bin/bash
# Fetch a Prydwen NIKKE character page via the Wayback Machine and emit stripped text.
# Usage: scripts/prydwen-fetch.sh <prydwen-slug> [outdir]
set -e
SLUG="$1"
OUT="${2:-/tmp}/pryd-$SLUG.txt"
SNAP=$(curl -s "http://archive.org/wayback/available?url=prydwen.gg/nikke/characters/$SLUG" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['archived_snapshots'].get('closest',{}).get('url',''))")
if [ -z "$SNAP" ]; then
  TS=$(curl -s "http://web.archive.org/cdx/search/cdx?url=prydwen.gg/nikke/characters/$SLUG&output=json&filter=statuscode:200&limit=-1" \
    | python3 -c "import json,sys
rows = json.load(sys.stdin)
print(rows[-1][1] if len(rows) > 1 else '')")
  [ -n "$TS" ] && SNAP="http://web.archive.org/web/$TS/https://www.prydwen.gg/nikke/characters/$SLUG/"
fi
if [ -z "$SNAP" ]; then echo "NO_SNAPSHOT"; exit 0; fi
curl -sL "$SNAP" -A "Mozilla/5.0" --compressed --max-time 90 | python3 -c "
import re, html, sys
raw = sys.stdin.read()
txt = re.sub(r'<script[^>]*>.*?</script>', ' ', raw, flags=re.S)
txt = re.sub(r'<style[^>]*>.*?</style>', ' ', txt, flags=re.S)
txt = re.sub(r'<[^>]+>', '\n', txt)
txt = html.unescape(txt)
txt = re.sub(r'\n\s*\n+', '\n', txt)
open('$OUT', 'w').write(txt)
print('$OUT', len(txt), 'chars', '| snap: $SNAP')
"
