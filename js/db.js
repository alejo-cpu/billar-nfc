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

  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) catalogo = JSON.parse(raw);
  } catch (e) {}

  // Sincronización y espejo en SQLite local
  async function sync() {
    const baseUrl = CONFIG.LOCAL_API_URL || window.location.origin;
    const headers = { 'X-Sync-Token': CONFIG.SYNC_TOKEN || '' };

    // 1. Cargar datos locales de arranque
    try {
      const resLocal = await fetch(baseUrl + '/api/sync', { headers });
      if (resLocal.ok) {
        catalogo = await resLocal.json();
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(catalogo));
      }
    } catch (err) {}

    // 2. Consultar a Railway (Nube)
    if (CONFIG.REMOTE_API_URL && CONFIG.REMOTE_API_URL.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const resRemote = await fetch(CONFIG.REMOTE_API_URL + '/api/sync', {
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resRemote.ok) {
          const remoteData = await resRemote.json();
          if (remoteData && remoteData.tacos) {
            catalogo = remoteData;
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(catalogo));

            // Replicar en el archivo SQLite físico de la Pi (con borrado automático)
            fetch(baseUrl + '/api/sync/mirror', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Sync-Token': CONFIG.SYNC_TOKEN || ''
              },
              body: JSON.stringify(remoteData)
            }).catch(() => {});
          }
        }
      } catch (err) {}
    }
  }

  sync();
  setInterval(sync, CONFIG.SYNC_INTERVAL_MS);

  // Consulta de taco
  async function getCue(nfcUidOrNumero) {
    const raw = String(nfcUidOrNumero || '').trim();
    const cleanCode = raw.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    const cleanNum = raw.replace(/[^0-9]/g, '');

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

    try {
      const res = await fetch((CONFIG.LOCAL_API_URL || window.location.origin) + '/api/taco/' + encodeURIComponent(cleanCode || raw));
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

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
