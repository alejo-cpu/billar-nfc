(function () {
  'use strict';

  // Cache DOM
  const views = {
    home: document.getElementById('view-home'),
    reading: document.getElementById('view-reading'),
    detail: document.getElementById('view-detail')
  };
  const sleepEl = document.getElementById('sleep-screen');

  const elKicker = document.getElementById('cue-kicker');
  const elPill = document.getElementById('cue-pill');
  const elTag = document.getElementById('cue-tag');
  const elDesc = document.getElementById('cue-desc');
  const elPeso = document.getElementById('cue-peso-dots');
  const elAgilidad = document.getElementById('cue-agilidad-dots');
  const elGolpe = document.getElementById('cue-golpe');
  const elSensTxt = document.getElementById('cue-sens-txt');
  const elIdeal = document.getElementById('cue-ideal');
  const elSuggestions = document.getElementById('cue-suggestions');

  let idleTimer = null;
  let scanRunId = 0;

  // Vistas
  function setView(name) {
    views.home.classList.toggle('active', name === 'home');
    views.reading.classList.toggle('active', name === 'reading');
    views.detail.classList.toggle('active', name === 'detail');
  }

  // Dots
  function renderDots(container, count, color) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const isOn = i <= count;
      const bg = isOn ? `style="background:${color}"` : '';
      html += `<span class="dot ${isOn ? 'on' : ''}" ${bg}></span>`;
    }
    container.innerHTML = html;
  }

  // Sugerencias
  function getSuggestions(cue) {
    const cats = DB.getCategorias();
    const light = cats.find(c => c.id === 'LIGHT') || { nombre: 'LIGHT', color: 'var(--green)', other_text: 'Más ligero y ágil.' };
    const balanced = cats.find(c => c.id === 'BALANCED') || { nombre: 'BALANCED', color: 'var(--hdp)', other_text: 'Equilibrado y versátil.' };
    const power = cats.find(c => c.id === 'POWER') || { nombre: 'POWER', color: 'var(--red)', other_text: 'Más sólido y potente.' };

    if (cue.es_estandar) {
      if (cue.categoria_id === 'LIGHT') return [balanced, power];
      if (cue.categoria_id === 'BALANCED') return [light, power];
      return [light, balanced];
    }

    const pesadez = (((cue.peso || 3) + (6 - (cue.agilidad || 3)) - 2) / 8) * 100;
    if (pesadez > 70) return [light, balanced];
    if (pesadez >= 40) return [light, power];
    return [balanced, power];
  }

  // Detalle
  function renderDetail(cue) {
    const color = cue.color || 'var(--hdp)';

    elKicker.textContent = 'TACO ' + cue.numero;
    elPill.textContent = cue.sensacion;
    elPill.style.borderColor = color;
    elPill.style.color = color;
    elTag.textContent = cue.tag;
    elDesc.textContent = cue.descripcion;

    renderDots(elPeso, cue.peso, color);
    renderDots(elAgilidad, cue.agilidad, color);

    elGolpe.textContent = cue.golpe;
    elSensTxt.textContent = cue.sensacion_texto;
    elIdeal.textContent = cue.ideal;

    const sugs = getSuggestions(cue);
    elSuggestions.innerHTML = sugs.map(s => `
      <div class="sens" style="border-left-color: ${s.color};">
        <b><span class="odot" style="background: ${s.color};"></span>${s.nombre}</b>
        <small>${s.other_text || s.descripcion_default || ''}</small>
      </div>
    `).join('');
  }

  // Inactividad
  function resetIdle() {
    sleepEl.classList.remove('active');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      setView('home');
    }, CONFIG.STANDBY_MS || 180000);
  }

  // Escaneo desacoplado
  async function triggerScan(nfcCode) {
    resetIdle();
    const currentId = ++scanRunId;
    setView('reading');

    try {
      const cuePromise = DB.getCue(nfcCode);

      setTimeout(async () => {
        if (currentId !== scanRunId) return;
        const cue = await cuePromise;
        if (currentId !== scanRunId) return;

        renderDetail(cue);
        setView('detail');
      }, CONFIG.READ_MS || 800);

    } catch (e) {
      if (currentId === scanRunId) setView('home');
    }
  }

  window.NFC_SCAN = triggerScan;

  // Eventos teclado
  let keyBuffer = '';
  let keyTimeout = null;

  window.addEventListener('keydown', e => {
    resetIdle();
    clearTimeout(keyTimeout);

    if (e.key === 'Enter') {
      const code = keyBuffer.trim();
      keyBuffer = '';
      if (code.length >= 2) triggerScan(code);
      return;
    }

    if (e.key.length === 1 && keyBuffer.length < 40) {
      keyBuffer += e.key;
    }

    keyTimeout = setTimeout(() => { keyBuffer = ''; }, 500);
  });

  resetIdle();
})();
