#!/bin/bash
# Launch Isle of Emberfall over a tiny local web server.
# The sprite sheets live in separate assets/sheets/*.webp files, and browsers
# refuse to feed file:// images to WebGL — so the game must be served over
# http. Double-click this instead of opening index.html directly.
cd "$(dirname "$0")"
PORT=8899
if ! lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 -m http.server $PORT >/dev/null 2>&1 &
  for i in {1..20}; do
    lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1 && break
    sleep 0.1
  done
fi
open "http://localhost:$PORT/index.html"
