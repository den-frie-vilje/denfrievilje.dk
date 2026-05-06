#!/bin/bash
# Capture a Chrome window cleanly for portfolio screenshots.
#
# Solves three macOS-specific problems that broke earlier capture attempts:
#   1. The "Stop Claude" pill follows the foreground app — so we activate Finder
#      first, leaving the pill on Claude's display.
#   2. Chrome MCP's "Claude is observing this browser" banner reappears for
#      ~3-4s after every MCP action — so we sleep before capturing.
#   3. `screencapture -l <CGWindowID>` captures a specific window even when
#      it's backgrounded, giving a clean retina shot with no overlays.
#
# Usage:
#   capture-chrome-window.sh <out.png>                # 4s default wait
#   capture-chrome-window.sh <out.png> <wait-secs>    # explicit wait
#   capture-chrome-window.sh --refresh-wid            # refresh cached CGWindowID
#
# State:
#   /tmp/agis-demo/wid.txt    — cached CGWindowID of the AGIS tab
#   /tmp/agis-demo/screenshots/  — output dir
#
# Requirements: Screen Recording permission for the host app.

set -euo pipefail

STATE_DIR=/tmp/agis-demo
WID_FILE="$STATE_DIR/wid.txt"
OUT_DIR="$STATE_DIR/screenshots"
mkdir -p "$OUT_DIR"

refresh_wid() {
  # Find Chrome window currently on a localhost URL
  local wid
  wid=$(swift - <<'SWIFT' 2>/dev/null
import Cocoa
import CoreGraphics
guard let info = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else { exit(1) }
for w in info {
  let owner = (w[kCGWindowOwnerName as String] as? String) ?? ""
  let title = (w[kCGWindowName as String] as? String) ?? ""
  if owner.contains("Chrome") && title.contains("localhost") {
    let wid = (w[kCGWindowNumber as String] as? Int) ?? 0
    print(wid)
    exit(0)
  }
}
exit(2)
SWIFT
)
  if [ -z "$wid" ]; then
    echo "ERR: no Chrome window with localhost title found" >&2
    return 1
  fi
  echo "$wid" > "$WID_FILE"
  echo "WID=$wid"
}

if [ "${1:-}" = "--refresh-wid" ]; then
  refresh_wid
  exit $?
fi

NAME="${1:?usage: capture-chrome-window.sh <out.png> [wait-seconds]}"
WAIT="${2:-4}"

if [ ! -f "$WID_FILE" ]; then
  refresh_wid >/dev/null
fi
WID=$(cat "$WID_FILE")

OUT="$OUT_DIR/$NAME"

# Take focus AWAY from Chrome so the Stop Claude pill stays on Claude's display.
osascript -e 'tell application "Finder" to activate' >/dev/null 2>&1 || true

# Let any "observing" banner fade.
sleep "$WAIT"

# Capture Chrome window by CGWindowID, no shadow.
screencapture -x -o -l "$WID" -t png "$OUT"

if [ ! -f "$OUT" ]; then
  echo "FAIL $NAME (no file produced)" >&2
  exit 1
fi

read W H < <(sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print w,h}')
echo "OK $NAME ${W}x${H}"
