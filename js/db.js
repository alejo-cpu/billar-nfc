const DB = (function () {
  const LOCAL_CACHE_KEY = 'HDP_CATALOGO_CACHE';

  const FALLBACK = {
    numero: '07',
    sensacion: 'BALANCED',
    cat_nombre: 'BALANCED',
    color: '#f0c928',
    peso: 3,
    agilidad: 4,
    golpe: 'Equilibrado',
    sensacion_texto: 'Natural y estable',
    tag: 'Equilibrado · Estable · Versátil',
    descripcion: 'Un taco con una sensación equilibrada entre ligereza y solidez.',
    ideal: 'Jugadores que buscan versatilidad.'
  };

  let catalogo = {
    categorias: [],
    tacos: []
  };

  // Cargar de memoria local al iniciar para respuesta inmediata sin internet
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) catalogo = JSON.parse(raw);
  } catch (e) {}

  async function sync() {
    try {
      const res = await fetch(CONFIG.API_URL + '/api/sync');
      if (res.ok) {
        catalogo = await res.json();
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(catalogo));
        console.log('[DB] Sincronización exitosa. Tacos en memoria:', catalogo.tacos.length);
      }
    } catch (err) {
      console.warn('[DB] No se pudo sincronizar con el servidor, usando copia local');
    }
  }

  // Sincronización al iniciar y en bucle
  sync();
  setInterval(sync, CONFIG.SYNC_INTERVAL_MS);

  async function getCue(nfcUidOrNumero) {
    const code = (nfcUidOrNumero || '').toLowerCase().trim();
    
    // 1. Buscar en la copia local (instantáneo: 2 milisegundos)
    const local = catalogo.tacos.find(t => 
      t.nfc_uid.toLowerCase() === code || t.numero.toLowerCase() === code
    );

    if (local) {
      return formatTaco(local);
    }

    // 2. Si no estaba en local, consultar en tiempo real a la API (por si es nuevo)
    try {
      const res = await fetch(CONFIG.API_URL + '/api/taco/' + encodeURIComponent(code));
      if (res.ok) {
        const remote = await res.json();
        return remote;
      }
    } catch (e) {}

    return FALLBACK;
  }

  function formatTaco(t) {
    return {
      numero: t.numero,
      sensacion: t.cat_nombre,
      color: t.cat_color,
      peso: t.peso,
      agilidad: t.agilidad,
      golpe: t.golpe,
      sensacion_texto: t.sensacion_texto,
      tag: t.cat_tagline,
      descripcion: t.descripcion_custom || t.descripcion_default,
      ideal: t.ideal_default,
      es_estandar: t.es_estandar,
      categoria_id: t.categoria_id
    };
  }

  function getCategorias() {
    return catalogo.categorias;
  }

  return { getCue, getCategorias, sync, principal: () => FALLBACK };
})();
