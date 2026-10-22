#!/usr/bin/env bash

# Fijar CPU en 1.2 GHz fijos (modo performance)
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor >/dev/null 2>&1 || true

# Matar instancias previas
pkill -f 'server.py' 2>/dev/null || true

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Variables de entorno para cursor invisible
export XCURSOR_SIZE=1
export XCURSOR_THEME=none

# Iniciar servidor FastAPI
if [ -d "$DIR/venv" ]; then
  "$DIR/venv/bin/python3" "$DIR/server/server.py" &
else
  python3 "$DIR/server/server.py" &
fi

sleep 2

# ESTE ES EL TRUCO PARA WAYLAND:
# Espera 3 segundos a que Chromium se monte y recarga Labwc en segundo plano.
# Esto aplica el cursor tamaño 1 de forma automática en cada arranque.
(sleep 3 && killall -HUP labwc 2>/dev/null || true) &

chromium-browser --kiosk \
  --ozone-platform=wayland \
  --touch-events=enabled \
  --password-store=basic \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI,TouchpadAndWheelScrollLatching \
  --disable-pinch \
  --disable-session-crashed-bubble \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --ignore-gpu-blocklist \
  --enable-gpu-compositing \
  --enable-zero-copy \
  --disable-smooth-scrolling \
  --renderer-process-limit=2 \
  http://localhost:8080/
