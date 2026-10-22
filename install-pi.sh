#!/usr/bin/env bash

# Paleta ANSI
G="\033[1;32m"
Y="\033[1;33m"
C="\033[1;36m"
R="\033[1;31m"
W="\033[1;37m"
D="\033[0;90m"
NC="\033[0m"

clear
cat << 'BANNER'
  _    _ _____  _____     ____  _____ _      _               _____  
 | |  | |  __ \|  __ \   |  _ \|_   _| |    | |        /\   |  __ \ 
 | |__| | |  | | |__) |  | |_) | | | | |    | |       /  \  | |__) |
 |  __  | |  | |  ___/   |  _ <  | | | |    | |      / /\ \ |  _  / 
 | |  | | |__| | |       | |_) |_| |_| |____| |____ / ____ \| | \ \ 
 |_|  |_|_____/|_|       |____/|_____|______|______/_/    \_\_|  \_\

                         EST. 1985 · BILLAR NFC
BANNER
echo -e "${D}================================================================${NC}"
echo -e "${Y}▶ INSTALADOR DE QUIOSCO AUTOMATIZADO${NC}"
echo -e "${D}================================================================${NC}\n"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/hdp_install.log"
> "$LOG_FILE"

run_step() {
  local step_num="$1"
  local title="$2"
  local cmd="$3"
  local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  
  eval "$cmd" >> "$LOG_FILE" 2>&1 &
  local pid=$!
  local i=0
  
  while kill -0 $pid 2>/dev/null; do
    i=$(( (i+1) % 10 ))
    echo -ne "\r${C}[${step_num}/6]${NC} ${Y}${spin[$i]}${NC} ${W}${title}...${NC}"
    sleep 0.1
  done
  
  wait $pid
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo -e "\r${C}[${step_num}/6]${NC} ${G}✔${NC} ${W}${title}${NC} ${G}[OK]${NC}"
  else
    echo -e "\r${C}[${step_num}/6]${NC} ${R}✖${NC} ${W}${title}${NC} ${R}[FALLÓ]${NC}"
    echo -e "\n${R}Últimas líneas del registro de error:${NC}"
    tail -n 12 "$LOG_FILE"
    exit 1
  fi
}

run_step 1 "Verificando y forzando cambio de X11 a Wayland" "
  if which labwc >/dev/null 2>&1; then
    sudo raspi-config nonint do_wayland W3 2>/dev/null || true
  elif which wayfire >/dev/null 2>&1; then
    sudo raspi-config nonint do_wayland W2 2>/dev/null || true
  else
    sudo raspi-config nonint do_wayland W3 2>/dev/null || sudo raspi-config nonint do_wayland W2 2>/dev/null || sudo raspi-config nonint do_wayland 1 2>/dev/null || true
  fi
"

run_step 2 "Configurando compositor Labwc para ocultar cursor" "
  sudo rm -rf /usr/share/icons/blank /usr/share/icons/default '$HOME/.icons/default' 2>/dev/null || true
  mkdir -p '$HOME/.config/labwc'
  echo 'XCURSOR_SIZE=1' > '$HOME/.config/labwc/environment'
  cat << 'XML' > '$HOME/.config/labwc/rc.xml'
<?xml version=\"1.0\"?>
<labwc_config>
  <core>
    <cursor>
      <size>1</size>
    </cursor>
  </core>
</labwc_config>
XML
"

run_step 3 "Actualizando repositorios e instalando herramientas" "
  rm -rf '$HOME/.local/share/keyrings' 2>/dev/null || true
  sudo apt update -y && sudo apt install -y chromium-browser wlrctl
"

run_step 4 "Creando entorno Python e instalando dependencias" "
  if [ ! -d '$PROJECT_DIR/venv' ]; then
    python3 -m venv '$PROJECT_DIR/venv'
  fi
  '$PROJECT_DIR/venv/bin/pip' install --upgrade pip
  '$PROJECT_DIR/venv/bin/pip' install -r '$PROJECT_DIR/requirements.txt'
"

run_step 5 "Generando lanzador start-kiosk.sh nativo Labwc" "
cat << 'LAUNCHER' > '$PROJECT_DIR/start-kiosk.sh'
#!/usr/bin/env bash

pkill -f 'server.py' 2>/dev/null || true

cd '$PROJECT_DIR'
'$PROJECT_DIR/venv/bin/python3' '$PROJECT_DIR/server/server.py' &

# Enviar el puntero microscópico a la esquina externa
(
  for delay in 2 4 6; do
    sleep \$delay
    which wlrctl >/dev/null 2>&1 && wlrctl pointer move 9999 9999 2>/dev/null || true
  done
) &

sleep 2

chromium-browser --kiosk \
  --ozone-platform=wayland \
  --touch-events=enabled \
  --blink-settings=primaryPointerType=4 \
  --password-store=basic \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI,TouchpadAndWheelScrollLatching \
  --disable-pinch \
  --disable-session-crashed-bubble \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --renderer-process-limit=2 \
  http://localhost:8080/
LAUNCHER
chmod +x '$PROJECT_DIR/start-kiosk.sh'
"

run_step 6 "Registrando autoarranque del sistema" "
mkdir -p '$HOME/.config/autostart'
cat << 'AUTO' > '$HOME/.config/autostart/kiosk.desktop'
[Desktop Entry]
Type=Application
Name=HDP Kiosk
Exec=$PROJECT_DIR/start-kiosk.sh
X-GNOME-Autostart-enabled=true
AUTO
"

echo -e "\n${D}----------------------------------------------------------------${NC}"
echo -e "${Y}▶ VERIFICANDO INTEGRIDAD DEL SISTEMA${NC}"
echo -e "${D}----------------------------------------------------------------${NC}"

CHECK_COUNT=0
TOTAL_CHECKS=5

check_item() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${G}✔${NC} $name ${D}[OK]${NC}"
    ((CHECK_COUNT++))
  else
    echo -e "  ${R}✖${NC} $name ${D}[FALLÓ]${NC}"
  fi
}

check_item "Navegador Chromium" "which chromium-browser"
check_item "Controlador Wayland (wlrctl)" "which wlrctl"
check_item "Entorno virtual Python" "test -f '$PROJECT_DIR/venv/bin/python3'"
check_item "FastAPI Framework" "'$PROJECT_DIR/venv/bin/python3' -c 'import fastapi'"
check_item "Servidor ASGI Uvicorn" "'$PROJECT_DIR/venv/bin/python3' -c 'import uvicorn'"

echo -e "\n${D}================================================================${NC}"
if [ "$CHECK_COUNT" -eq "$TOTAL_CHECKS" ]; then
  echo -e "${G}✔ [$CHECK_COUNT/$TOTAL_CHECKS] CONFIGURACIÓN LISTA${NC}"
  echo -e "${D}================================================================${NC}"
  echo -e "\n${W}Todo configurado. Para iniciar ejecuta:${NC}"
  echo -e "${C}sudo reboot${NC}\n"
else
  echo -e "${R}⚠ [$CHECK_COUNT/$TOTAL_CHECKS] ALGUNOS COMPONENTES FALLARON${NC}"
  echo -e "${D}================================================================${NC}\n"
fi
