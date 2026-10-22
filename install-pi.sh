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

run_step 1 "Restaurando motor gráfico Wayland" "sudo raspi-config nonint do_wayland W2 2>/dev/null || sudo raspi-config nonint do_wayland W3 2>/dev/null || true"

run_step 2 "Instalando tema de cursor invisible" "
  sudo mkdir -p /usr/share/icons/blank/cursors
  echo -ne '\x00\x00\x00\x00' | sudo tee /usr/share/icons/blank/cursors/left_ptr >/dev/null
  sudo cp /usr/share/icons/blank/cursors/left_ptr /usr/share/icons/blank/cursors/default
  sudo cp /usr/share/icons/blank/cursors/left_ptr /usr/share/icons/blank/cursors/pointer
  
  sudo mkdir -p /usr/share/icons/default
  echo -e '[Icon Theme]\nInherits=blank' | sudo tee /usr/share/icons/default/index.theme >/dev/null
  mkdir -p '$HOME/.icons/default'
  echo -e '[Icon Theme]\nInherits=blank' > '$HOME/.icons/default/index.theme'
"

run_step 3 "Actualizando repositorios e instalando Chromium" "
  rm -rf '$HOME/.local/share/keyrings' 2>/dev/null || true
  sudo apt update -y && sudo apt install -y chromium-browser
"

run_step 4 "Creando entorno Python e instalando dependencias" "
  if [ ! -d '$PROJECT_DIR/venv' ]; then
    python3 -m venv '$PROJECT_DIR/venv'
  fi
  '$PROJECT_DIR/venv/bin/pip' install --upgrade pip
  '$PROJECT_DIR/venv/bin/pip' install -r '$PROJECT_DIR/requirements.txt'
"

run_step 5 "Generando lanzador start-kiosk.sh" "
cat << 'LAUNCHER' > '$PROJECT_DIR/start-kiosk.sh'
#!/usr/bin/env bash

pkill -f 'server.py' 2>/dev/null || true

cd '$PROJECT_DIR'
'$PROJECT_DIR/venv/bin/python3' '$PROJECT_DIR/server/server.py' &

sleep 2

chromium-browser --kiosk \
  --ozone-platform=wayland \
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
check_item "Tema de cursor transparente" "test -f /usr/share/icons/default/index.theme"
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
