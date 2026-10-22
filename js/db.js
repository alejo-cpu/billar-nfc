const DB = (function () {
  const LOCAL_CACHE_KEY = 'HDP_CATALOGO_CACHE';

  const FALLBACK = {
    numero: '??',
    sensacion: 'NO IDENTIFICADO',
    cat_nombre: 'DESCONOCIDO',
    color: '#90949d',
    peso: 3,
    agilidad: 3,
    golpe: 'No registrado',
    sensacion_texto: 'Consultar en mostrador',
    tag: 'Taco no registrado',
    descripcion: 'Este taco aún no ha sido dado de alta en la base de datos.',
    ideal: 'Acércalo al personal para configurarlo.'
  };

  let catalogo = {
    categorias: [],
    tacos: []
  };

  // Cargar de memoria local al iniciar para respuesta inmediata sin lag
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) catalogo = JSON.parse(raw);
  } catch (e) {}

  async function sync() {
    const baseUrl = CONFIG.LOCAL_API_URL || window.location.origin;

    // 1. PRIORIDAD: Sincronizar con el SQLite local de la propia Pi
    try {
      const resLocal = await fetch(baseUrl + '/api/sync');
      if (resLocal.ok) {
        catalogo = await resLocal.json();
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(catalogo));
        console.log('[DB Local] Sincronización exitosa con SQLite. Tacos cargados:', catalogo.tacos.length);
      }
    } catch (err) {
      console.warn('[DB Local] Servidor local no respondió, usando datos en caché.');
    }

    // 2. SEGUNDO PLANO: Sincronizar con Railway (si está configurado y activo)
    if (CONFIG.REMOTE_API_URL && CONFIG.REMOTE_API_URL.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout max
        const resRemote = await fetch(CONFIG.REMOTE_API_URL + '/api/sync', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resRemote.ok) {
          const remoteData = await resRemote.json();
          if (remoteData && remoteData.tacos && remoteData.tacos.length > 0) {
            catalogo = remoteData;
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(catalogo));
            console.log('[DB Nube] Sincronización exitosa con Railway.');
          }
        }
      } catch (err) {
        console.log('[DB Nube] Railway no disponible. Operando 100% offline con la base local.');
      }
    }
  }

  // Sincronización inicial y bucle periódico
  sync();
  setInterval(sync, CONFIG.SYNC_INTERVAL_MS);

  async function getCue(nfcUidOrNumero) {
    const raw = String(nfcUidOrNumero || '').trim();
    // Limpieza de UID: convierte a minúsculas y elimina separadores como ':', '-' o espacios
    const cleanCode = raw.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    const cleanNum = raw.replace(/[^0-9]/g, '');

    // 1. Buscar en la copia local en memoria (ultra rápido: 1-2 ms)
    const local = catalogo.tacos.find(t => {
      const tUid = String(t.nfc_uid || '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
      const tNum = String(t.numero || '').replace(/[^0-9]/g, '');
      return (cleanCode && tUid === cleanCode) || 
             (cleanNum && tNum === cleanNum) || 
             (String(t.numero).toLowerCase() === raw.toLowerCase());
    });

    if (local) {
      return formatTaco(local);
    }

    // 2. Si no estaba en memoria (ej. se añadió hace segundos), consultar al servidor local
    try {
      const res = await fetch((CONFIG.LOCAL_API_URL || window.location.origin) + '/api/taco/' + encodeURIComponent(cleanCode || raw));
      if (res.ok) {
        const remote = await res.json();
        return remote;
      }
    } catch (e) {}

    // 3. Si no existe en el sistema
    return {
      ...FALLBACK,
      numero: cleanNum || (cleanCode ? cleanCode.slice(-4) : '??')
    };
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
      ideal: t.ideal_custom || t.ideal_default,
      es_estandar: t.es_estandar,
      categoria_id: t.categoria_id
    };
  }

  function getCategorias() {
    return catalogo.categorias;
  }

  return { getCue, getCategorias, sync, principal: () => FALLBACK };
})();