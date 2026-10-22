const CONFIG = {
  // En producción en las Raspberries apunta a tu app de Railway
  // Reemplaza 'tu-app.up.railway.app' con tu URL real cuando la despliegues
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://tu-app.up.railway.app'
    : window.location.origin,
  
  READ_MS: 700,
  STANDBY_MS: 3 * 60 * 1000,
  SYNC_INTERVAL_MS: 2 * 60 * 1000
};
