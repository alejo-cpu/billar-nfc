# Billar NFC — Identificación de tacos

Pantalla vertical 9:16 para Raspberry Pi Zero 2W. Lee la etiqueta NFC del taco,
consulta su información en una BBDD SQLite local y la muestra.

## Estructura
    billar-nfc/
    ├── index.html
    ├── css/styles.css
    ├── vendor/            
    ├── js/
    │   ├── config.js      ← tiempos 
    │   ├── db.js          ← cliente HTTP hacia el servidor local
    │   └── app.js         ← interfaz
    ├── server/
    │   └── server.py     
    ├── db/
    │   ├── schema.sql     ← tabla + datos de ejemplo
    │   └── tacos.db      
    └── README.md

## Probar rápido
    cd Projects/billar-nfc/
    python3 server/server.py


## INICIAR KIOSK

  ## iniciar servidor  
    cd Projects/billar-nfc/  
    python3 server/server.py
    
  ## Modo Kiosk 
      chromium-browser --kiosk --noerrdialogs --disable-translate \
    --force-device-scale-factor=1.4 \
    http://localhost:8080

La primera vez imprime `[DB] creada en .../db/tacos.db` (crea la base sola).
Abrí en el navegador: **http://localhost:8080** (NO usar Live Server de VS Code
para esto, porque no ejecuta la API).

El botón **"↻ Simular lectura"** trae un taco al azar de la base.

## Cargar / editar tacos
Los tacos viven en SQLite (`db/tacos.db`). Los podés administrar con:
    sqlite3 db/tacos.db

Algunos comandos útiles:
    .tables
    SELECT serie, marca, modelo FROM tacos;
    INSERT INTO tacos (serie, marca, modelo, estado) VALUES ('NUEVA-SERIE', 'MARCA', 'MODELO', 'EXCELENTE');
    .quit

Si querés reiniciar todo: borrá `db/tacos.db` y volvé a correr el servidor,
que vuelve a crear la base con los datos de `db/schema.sql`.

## Lector NFC real
La página expone `window.NFC_SCAN('SERIE')`. Dos formas de conectarlo:

- **Lector USB tipo teclado** (la mayoría de los lectores NFC baratos):
  el lector escribe la serie + Enter, y la app lo captura sola. No hay que
  configurar nada. Para probarlo tipear `PRV-12.9-00427` + Enter en el teclado.

- **Lector GPIO** (PN532, RC522, etc.): un script en Python lee la tarjeta
  y hace `requests.get('http://localhost:8080/api/taco/...')` o usa `xdotool`
  para inyectar la serie como teclado. El punto de entrada siempre termina en
  `NFC_SCAN(serie)`.

## Kiosk en Pi Zero 2W

1. Instalar dependencias:
       sudo apt install chromium-browser unclutter

2. Copiar la carpeta `billar-nfc/` a la Pi.

3. Probar que todo arranca bien:
       cd /home/pi/billar-nfc
       python3 server/server.py
       Abrir `http://localhost:8080` en Chromium y verificá que se vea.

4. Autostart (arranca con la Pi sin necesidad de login). Creá el archivo:
       nano ~/.config/lxsession/LXDE-pi/autostart

   Con este contenido:

       @xset s off
       @xset -dpms
       @xset s noblank
       @unclutter -idle 0
       @/usr/bin/python3 /home/pi/billar-nfc/server/server.py
       @sleep 2
       @chromium-browser --kiosk --noerrdialogs --disable-pinch \
           --disable-restore-session-state --disable-infobars \
           http://localhost:8080


## Comportamiento
- **Lectura**: anillo ~0.8 s → tarjeta con filas que aparecen escalonadas.
- **Botón "↻ Simular lectura"**: trae otro taco al azar de SQLite.
- **Animaciones ambiente**: corren ~2 min y quedan quietas.
- **Standby**: 5 min sin actividad → funde a negro; cualquier toque, tecla
  o lectura la despierta.
- **Offline**: si por alguna razón el servidor no responde, la pantalla usa
  un dato de respaldo.
