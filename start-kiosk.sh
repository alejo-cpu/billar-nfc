#!/usr/bin/env bash

pkill -f 'server.py' 2>/dev/null || true

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export XCURSOR_THEME=default
export XCURSOR_SIZE=1

if [ -d "$DIR/venv" ]; then
  "$DIR/venv/bin/python3" "$DIR/server/server.py" &
else
  python3 "$DIR/server/server.py" &
fi

sleep 1.5

mkdir -p /dev/shm/chromium-cache

chromium-browser --kiosk \
  --touch-events=enabled \
  --password-store=basic \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-pinch \
  --disable-session-crashed-bubble \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --disable-background-networking \
  --disable-component-update \
  --disable-sync \
  --disable-extensions \
  --disable-default-apps \
  --disable-breakpad \
  --disable-features=Translate,OptimizationHints,MediaRouter \
  --use-gl=egl \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --renderer-process-limit=1 \
  --disk-cache-dir=/dev/shm/chromium-cache \
  --disk-cache-size=20971520 \
  --disable-smooth-scrolling \
  http://localhost:8080/
