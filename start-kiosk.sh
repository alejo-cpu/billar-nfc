#!/usr/bin/env bash

echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor >/dev/null 2>&1 || true

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

mkdir -p /tmp/chromium-cache

# Chromium sin --ozone-platform=wayland para usar XWayland con GLAMOR (60 FPS fluidos en Pi 3B)
chromium-browser --kiosk \
  --touch-events=enabled \
  --password-store=basic \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,IsolateOrigins,site-per-process \
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
  --disable-dev-shm-usage \
  --renderer-process-limit=1 \
  --disable-site-isolation-trials \
  --disk-cache-dir=/tmp/chromium-cache \
  --disk-cache-size=20971520 \
  --enable-gpu-compositing \
  --ignore-gpu-blocklist \
  --disable-smooth-scrolling \
  http://localhost:8080/
