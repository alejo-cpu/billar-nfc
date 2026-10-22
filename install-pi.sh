#!/usr/bin/env bash

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
    echo -ne "\r${C}[${step_num}/8]${NC} ${Y}${spin[$i]}${NC} ${W}${title}...${NC}"
    sleep 0.1
  done
  
  wait $pid
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo -e "\r${C}[${step_num}/8]${NC} ${G}✔${NC} ${W}${title}${NC} ${G}[OK]${NC}"
  else
    echo -e "\r${C}[${step_num}/8]${NC} ${R}✖${NC} ${W}${title}${NC} ${R}[FALLÓ]${NC}"
    echo -e "\n${R}Últimas líneas del registro:${NC}"
    tail -n 12 "$LOG_FILE"
    exit 1
  fi
}

run_step 1 "Configurando GPU a 256 MB" "
  sudo raspi-config nonint do_memory_split 256 2>/dev/null || true
  for cfg in /boot/config.txt /boot/firmware/config.txt; do
    if [ -f \"\$cfg\" ]; then
      sudo sed -i '/^gpu_mem=/d' \"\$cfg\"
      echo 'gpu_mem=256' | sudo tee -a \"\$cfg\" >/dev/null
    fi
  done
"

run_step 2 "Fijando CPU al máximo rendimiento (Performance)" "
  cat << 'UNIT' | sudo tee /etc/systemd/system/rpi-performance.service >/dev/null
[Unit]
Description=Set CPU governor to performance
After=sysinit.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable rpi-performance.service
  sudo systemctl start rpi-performance.service
"

run_step 3 "Desactivando Swap y servicios innecesarios" "
  sudo dphys-swapfile swapoff 2>/dev/null || true
  sudo systemctl disable dphys-swapfile 2>/dev/null || true
  sudo systemctl disable --now cups cups-browsed bluetooth apt-daily.timer apt-daily-upgrade.timer man-db.timer 2>/dev/null || true
"

run_step 4 "Instalando cursor binario invisible" "
  python3 - << 'PYEOF'
import struct, os
data = (
    b'Xcur' +
    struct.pack('<III', 16, 0x10000, 1) +
    struct.pack('<III', 0xfffd0002, 1, 28) +
    struct.pack('<IIIIIIIII', 36, 0xfffd0002, 1, 1, 1, 1, 0, 0, 0) +
    struct.pack('<I', 0)
)
cursor_names = [
    'default', 'left_ptr', 'arrow', 'top_left_arrow', 'pointer',
    'cross', 'crosshair', 'hand1', 'hand2', 'text', 'xterm', 'wait',
    'watch', 'move', 'dnd-none', 'dnd-move', 'dnd-copy'
]
paths = [
    os.path.expanduser('~/.icons/default/cursors'),
    os.path.expanduser('~/.icons/PiX/cursors'),
    os.path.expanduser('~/.icons/Adwaita/cursors')
]
for p in paths:
    os.makedirs(p, exist_ok=True)
    for name in cursor_names:
        with open(os.path.join(p, name), 'wb') as f:
            f.write(data)
PYEOF

  mkdir -p '$HOME/.config/labwc'
  cat << 'XML' > '$HOME/.config/labwc/rc.xml'
<?xml version=\"1.0\"?>
<labwc_config>
  <theme>
    <cursorSize>1</cursorSize>
  </theme>
</labwc_config>
XML
  printf 'XCURSOR_THEME=default\nXCURSOR_SIZE=1\n' > '$HOME/.config/labwc/environment'

  sudo mkdir -p /etc/xdg/labwc
  sudo cp '$HOME/.config/labwc/rc.xml' /etc/xdg/labwc/rc.xml 2>/dev/null || true
  sudo cp '$HOME/.config/labwc/environment' /etc/xdg/labwc/environment 2>/dev/null || true
"

run_step 5 "Instalando Chromium y dependencias" "
  sudo apt update -y && sudo apt install -y chromium-browser
"

run_step 6 "Configurando entorno Python" "
  if [ ! -d '$PROJECT_DIR/venv' ]; then
    python3 -m venv '$PROJECT_DIR/venv'
  fi
  '$PROJECT_DIR/venv/bin/pip' install --upgrade pip
  '$PROJECT_DIR/venv/bin/pip' install -r '$PROJECT_DIR/requirements.txt'
"

run_step 7 "Asegurando permisos en start-kiosk.sh" "
  chmod +x '$PROJECT_DIR/start-kiosk.sh'
"

run_step 8 "Registrando autoarranque del quiosco" "
  mkdir -p '$HOME/.config/autostart'
  cat << AUTO > '$HOME/.config/autostart/kiosk.desktop'
[Desktop Entry]
Type=Application
Name=HDP Kiosk
Exec=$PROJECT_DIR/start-kiosk.sh
X-GNOME-Autostart-enabled=true
AUTO
"

echo -e "\n${G}✔ CONFIGURACIÓN DEL SISTEMA COMPLETADA${NC}"
echo -e "${W}Reiniciá para que el hardware y servicios apliquen los cambios:${NC}"
echo -e "${C}sudo reboot${NC}\n"
