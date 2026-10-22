(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const h = React.createElement;

  const Logo = () => h('img', { src: 'img/logo.webp', alt: 'HDP Billar 1985', className: 'logo' });

  const NFC = () => h('svg', { className: 'nfc', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', 'aria-hidden': 'true' },
    h('circle', { cx: 6.2, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }),
    h('path', { d: 'M10 8.8a5.2 5.2 0 0 1 0 6.4' }),
    h('path', { d: 'M13.6 6.2a9.4 9.4 0 0 1 0 11.6' })
  );

  const Placa = () => h('div', { className: 'placa' },
    h(Logo),
    h('div', { className: 'tagline' }, 'THE GOOD PLACE OF BILLIARDS'),
    h('div', { className: 'plabel' }, 'IDENTIFICADOR')
  );

  const Dots = ({ v, color }) => h('div', { className: 'dots' },
    [1, 2, 3, 4, 5].map(i => h('span', { 
      key: i, 
      className: 'dot' + (i <= v ? ' on' : ''),
      style: (i <= v && color) ? { background: color } : {}
    }))
  );

  const Home = () => h('div', { className: 'screen home' },
    h(Placa),
    h('div', { className: 'kicker' }, 'HDP BILLAR · IDENTIFICADOR'),
    h('h1', { className: 'screen-title' }, 'Elige tu sensación'),
    h('p', { className: 'screen-sub' }, 'Cada taco tiene su carácter. Acercá el que tengas al lector para ver sus detalles.'),
    h('div', { className: 'sens-list' }, 
      [
        { id: 'LIGHT', name: 'LIGHT', color: 'var(--green)', tag: 'Ligero · Ágil · Suave' },
        { id: 'BALANCED', name: 'BALANCED', color: 'var(--hdp)', tag: 'Equilibrado · Estable · Versátil' },
        { id: 'POWER', name: 'POWER', color: 'var(--red)', tag: 'Sólido · Firme · Potente' }
      ].map(k =>
        h('div', { key: k.id, className: 'sens', style: { borderLeftColor: k.color } },
          h('b', null, k.name),
          h('small', null, k.tag)
        )
      )
    ),
    h('div', { className: 'scanner' },
      h('div', { className: 'scan-title' }, 'ACERCA EL TACO'),
      h('div', { className: 'scan-sub' }, 'al lector de abajo'),
      h('div', { className: 'arrow-wrap' },
        h('svg', { viewBox: '0 0 40 60', className: 'arrow', 'aria-hidden': 'true' },
          h('line', { x1: 20, y1: 4, x2: 20, y2: 48, stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('polyline', { points: '12,40 20,52 28,40', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' })
        )
      )
    )
  );

  // --- Algoritmo de Sugerencias con la fórmula física ---
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

    // Fórmula para tacos personalizados: (Peso + (6 - Agilidad) - 2) / 8 * 100
    const peso = cue.peso || 3;
    const agilidad = cue.agilidad || 3;
    const pesadez = ((peso + (6 - agilidad) - 2) / 8) * 100;

    if (pesadez > 70) return [light, balanced];
    if (pesadez >= 40) return [light, power];
    return [balanced, power];
  }

  const Detail = ({ cue }) => {
    const suggestions = getSuggestions(cue);
    const cueColor = cue.color || 'var(--hdp)';

    return h('div', { className: 'screen detail' },
      h(Placa),
      h('div', { className: 'kicker' }, 'TACO ' + cue.numero),
      h('div', { className: 'type-pill', style: { borderColor: cueColor, color: cueColor } }, cue.sensacion),
      h('div', { className: 'type-tag' }, cue.tag),
      h('p', { className: 'desc' }, cue.descripcion),
      h('div', { className: 'stats' },
        h('div', { className: 'srow' },
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'PESO'), h(Dots, { v: cue.peso, color: cueColor })),
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'AGILIDAD'), h(Dots, { v: cue.agilidad, color: cueColor }))
        ),
        h('div', { className: 'srow' },
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'GOLPE'), h('div', { className: 'val' }, cue.golpe)),
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'SENSACIÓN'), h('div', { className: 'val' }, cue.sensacion_texto))
        ),
        h('div', { className: 'scell full' }, h('div', { className: 'lab' }, 'IDEAL PARA'), h('div', { className: 'val soft' }, cue.ideal))
      ),
      h('div', { className: 'divider' }),
      h('div', { className: 'other-title' }, '¿Buscas otra sensación?'),
      h('div', { className: 'sens-grid' }, suggestions.map(s =>
        h('div', { key: s.id || s.nombre, className: 'sens', style: { borderLeftColor: s.color } },
          h('b', null, h('span', { className: 'odot', style: { background: s.color } }), s.nombre),
          h('small', null, s.other_text || s.descripcion_default)
        )
      )),
      h('div', { className: 'divider' }),
      h('p', { className: 'hint' }, '¿No sabés cuál elegir? Empezá por ', h('b', null, 'BALANCED'), '.'),
      h('div', { className: 'foot' }, 'HDP BILLAR · EST. 1985')
    );
  };

  const Reading = () => h('div', { className: 'screen reading' },
    h(Placa),
    h('div', { className: 'ringwrap' }, h('span', { className: 'ring' }), h(NFC)),
    h('p', { className: 'reading-txt' }, 'Leyendo taco…')
  );

  function App() {
    const [view, setView] = useState('home');
    const [cue, setCue] = useState(null);
    const [standby, setStandby] = useState(false);
    const idleRef = useRef(null);
    const runId = useRef(0);

    const resetIdle = useCallback(() => {
      setStandby(false);
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => {
        setView('home');
        setCue(null);
      }, CONFIG.STANDBY_MS);
    }, []);

    const scan = useCallback(nfcCode => {
      const id = ++runId.current;
      setView('reading');
      
      const espera = new Promise(r => setTimeout(r, CONFIG.READ_MS));
      Promise.all([DB.getCue(nfcCode), espera])
        .then(([c]) => { 
          if (id === runId.current) { 
            setCue(c); 
            setView('detail'); 
          } 
        })
        .catch(() => { 
          if (id === runId.current) setView('home'); 
        })
        .finally(resetIdle);
    }, [resetIdle]);

    useEffect(() => {
      window.NFC_SCAN = nfcCode => scan(nfcCode);
      return () => { window.NFC_SCAN = null; clearTimeout(idleRef.current); };
    }, [scan]);

    // Listener de teclado con protección contra buffer sucio (auto-limpieza por timeout)
    useEffect(() => {
      let buffer = '';
      let timer = null;

      const onKey = e => {
        clearTimeout(timer);
        
        if (e.key === 'Enter') {
          resetIdle();
          if (buffer.length >= 2) {
            scan(buffer);
          }
          buffer = '';
          return;
        }

        if (e.key.length === 1 && buffer.length < 50) {
          buffer += e.key;
        }

        // Si pasan más de 400ms sin teclas nuevas, limpia el buffer para evitar teclas accidentales
        timer = setTimeout(() => {
          buffer = '';
        }, 400);
      };

      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [resetIdle, scan]);

    return h('div', { className: 'stage' + (standby ? ' standby' : '') },
      h('div', { className: 'frame' },
        view === 'home' ? h(Home) : (view === 'detail' && cue ? h(Detail, { cue }) : h(Reading))
      ),
      h('div', { className: 'sleep' })
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
