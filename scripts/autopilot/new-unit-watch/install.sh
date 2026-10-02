#!/usr/bin/env bash
# Install (or refresh) the nikke-sim new-unit watch as a daily launchd job. See README.md.
#
#   bash scripts/autopilot/new-unit-watch/install.sh            # install / refresh, arm daily 06:00
#   bash scripts/autopilot/new-unit-watch/install.sh --uninstall
#
# The job runs headless Claude sessions with --dangerously-skip-permissions, so installing it is an
# owner action: run this yourself rather than having an agent run it.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="$HOME/.nikke-newunit-autopilot"
LABEL="com.nikke.newunit-watch"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "${1:-}" = "--uninstall" ]; then rm -f "$PLIST"; echo "uninstalled $LABEL"; exit 0; fi

mkdir -p "$HOME_DIR" "$HOME/Library/Logs/nikke-newunit-watch"
cp "$SRC"/{run.sh,detect-new-units.mjs,prompt-roster.md,prompt-unit.md,token-watchdog.py} "$HOME_DIR/"
chmod +x "$HOME_DIR/run.sh"
[ -f "$HOME_DIR/handled.txt" ] || printf '# slugs already dispatched (one per line; delete a line to retry it)\n' > "$HOME_DIR/handled.txt"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$HOME_DIR/run.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>6</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/nikke-newunit-watch/launchd.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/nikke-newunit-watch/launchd.log</string>
</dict>
</plist>
EOF
plutil -lint "$PLIST" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL — daily 06:00 local; runtime files in $HOME_DIR"
launchctl print "gui/$(id -u)/$LABEL" | grep -E '^\s*state' || true
