#!/bin/bash
# Launch Taiao over a tiny local web server.
# The sprite sheets live in separate assets/sheets/*.webp files, and browsers
# refuse to feed file:// images to WebGL -- so the game must be served over
# http. Double-click this instead of opening index.html directly.
#
# This launcher is deliberately noisy and self-healing: it finds python3 even
# when Finder starts it with a bare PATH, health-checks the port (so a wedged
# old server gets replaced instead of silently serving a dead page), falls back
# to the built-in web server if serve.py can't start, and -- unlike before --
# PRINTS what went wrong and keeps the window open, instead of hiding every
# error in /dev/null.

cd "$(dirname "$0")" || { echo "Taiao: couldn't enter the game folder."; read -r -p "Press Return to close. " _; exit 1; }
PORT=8899
URL="http://localhost:$PORT/index.html"
LOG="${TMPDIR:-/tmp}/taiao-server.log"

# ---- find python3 (a double-clicked .command may not have Homebrew on PATH) ----
PY="$(command -v python3 2>/dev/null || true)"
if [ -z "$PY" ]; then
  for p in /usr/local/bin/python3 /opt/homebrew/bin/python3 /usr/bin/python3; do
    [ -x "$p" ] && { PY="$p"; break; }
  done
fi
if [ -z "$PY" ]; then
  echo "Taiao: python3 wasn't found. Install Python 3, then double-click again."
  echo "(Or start any local web server in this folder and open $URL)"
  read -r -p "Press Return to close. " _; exit 1
fi

# ---- does the port already serve the game? ----
responds() { [ "$(curl -s -o /dev/null -m 2 -w '%{http_code}' "$URL" 2>/dev/null)" = "200" ]; }

start_server() {
  echo "Taiao: starting the local server on port $PORT..."
  nohup "$PY" tools/serve.py "$PORT" >"$LOG" 2>&1 &
  for _ in $(seq 1 40); do responds && return 0; sleep 0.15; done
  echo "Taiao: serve.py didn't come up -- trying the built-in server instead..."
  nohup "$PY" -m http.server "$PORT" >"$LOG" 2>&1 &
  for _ in $(seq 1 40); do responds && return 0; sleep 0.15; done
  return 1
}

if responds; then
  echo "Taiao: a server is already running on port $PORT."
else
  # nothing answered -- clear anything wedged on the port, then (re)start fresh
  PIDS="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null)"
  [ -n "$PIDS" ] && { echo "Taiao: clearing an unresponsive server on port $PORT..."; kill $PIDS 2>/dev/null; sleep 0.5; }
  if ! start_server; then
    echo
    echo "Taiao: couldn't start the web server. Last output:"
    echo "------------------------------------------------------------"
    [ -f "$LOG" ] && tail -n 20 "$LOG"
    echo "------------------------------------------------------------"
    read -r -p "Press Return to close. " _; exit 1
  fi
fi

echo "Taiao is running. Opening $URL"
echo "(If the page is blank or looks broken, press Shift-Reload once -- that clears an old cached version.)"
open "$URL"
