#!/usr/bin/env bash
set -e

echo "=== Instalando Quiosco HDP Billar en Raspberry Pi ==="

# 1. Instalar dependencias necesarias (Chromium y ocultador de cursor)
sudo apt update
sudo apt install -y chromium-browser unclutter

# 2. Obtener ruta absoluta del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 3. Crear script de inicio para el Kiosk
cat << LAUNCHER > "$PROJECT_DIR/start-kiosk.sh"
#!/usr/bin/env bash
# Desactivar protector de pantalla y suspensión
xset s off
xset -dpms
xset s noblank

# Ocultar puntero del mouse
unclutter -idle 0.5 -root &

# Iniciar servidor web estático local ultraligero nativo
cd "$PROJECT_DIR"
python3 -m http.server 8080 &

# Esperar a que levante el servidor local
sleep 2

# Lanzar Chromium en modo Kiosk optimizado para Pi Zero 2W
chromium-browser --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI \
  --disable-pinch \
  --disable-session-crashed-bubble \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  http://localhost:8080/
LAUNCHER

chmod +x "$PROJECT_DIR/start-kiosk.sh"

# 4. Configurar autoarranque en el entorno de escritorio de Raspberry Pi OS
AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
mkdir -p "$AUTOSTART_DIR"

AUTOSTART_FILE="$AUTOSTART_DIR/autostart"
if [ ! -f "$AUTOSTART_FILE" ]; then
    touch "$AUTOSTART_FILE"
fi

# Evitar duplicar la línea si se ejecuta varias veces
sed -i '\|start-kiosk.sh|d' "$AUTOSTART_FILE"
echo "@$PROJECT_DIR/start-kiosk.sh" >> "$AUTOSTART_FILE"

echo "=== Instalación completada con éxito ==="
echo "Al reiniciar la Raspberry Pi, el quiosco arrancará automáticamente a pantalla completa."
