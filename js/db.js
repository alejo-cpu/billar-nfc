const DB = (function () {
  const API = window.location.origin + '/api/taco';

  const FALLBACK = {
    numero: '07',
    sensacion: 'BALANCED',
    peso: 3,
    agilidad: 4,
    golpe: 'Equilibrado',
    sensacion_texto: 'Natural y estable'
  };

  async function getCue(serie, excluir) {
    try {
      const url = serie
        ? API + '/' + encodeURIComponent(serie)
        : API + '/random' + (excluir ? '?except=' + encodeURIComponent(excluir) : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[DB] servidor local no disponible, usando respaldo:', err);
      return FALLBACK;
    }
  }

  return { getCue, principal: () => FALLBACK };
})();
