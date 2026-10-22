const CONFIG = {
  // La API local siempre es el origen actual (http://localhost:8080 en la Pi)
  LOCAL_API_URL: window.location.origin,

  // Servidor central en la nube (Railway opcional)
  REMOTE_API_URL: "",

  READ_MS: 1200, // 1.2 segundos: tiempo perfecto para que la rueda gire limpia y fluida
  STANDBY_MS: 3 * 60 * 1000,
  SYNC_INTERVAL_MS: 2 * 60 * 1000
};
