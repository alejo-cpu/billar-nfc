(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const h = React.createElement;

  const SENS = {
    LIGHT: {
      color: 'var(--green)',
      tag: 'Ligero · Ágil · Suave',
      desc: 'Un taco ligero y ágil, con una sensación de golpe más suave. Fácil de mover y rápido en el toque.',
      ideal: 'Jugadores que buscan rapidez, control fino y un golpe suave.',
      other: 'Más ligero y ágil, con una sensación de golpe más suave. Buscá los tacos con la pegatina verde.'
    },
    BALANCED: {
      color: 'var(--hdp)',
      tag: 'Equilibrado · Estable · Versátil',
      desc: 'Un taco con una sensación equilibrada entre ligereza y solidez. Fácil de controlar y cómodo para diferentes estilos de juego.',
      ideal: 'Jugadores que buscan un taco cómodo y versátil, sin irse a ninguno de los extremos.',
      other: 'Equilibrado y versátil, cómodo para cualquier estilo. Buscá los tacos con la pegatina amarilla.'
    },
    POWER: {
      color: 'var(--red)',
      tag: 'Sólido · Firme · Potente',
      desc: 'Un taco sólido y firme, con mayor sensación de peso y contundencia en el golpe.',
      ideal: 'Jugadores que buscan potencia, firmeza y contundencia.',
      other: 'Más sólido y firme, con mayor sensación de peso y contundencia en el golpe. Buscá los tacos con la pegatina roja.'
    }
  };

  const Logo = () => h('img', { src: 'img/logo.webp', alt: 'HDP Billar 1985', className: 'logo' });

  const NFC = () => h('svg', { className: 'nfc', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round', 'aria-hidden': 'true' },
    h('circle', { cx: 6.2, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }),
    h('path', { d: 'M10 8.8a5.2 5.2 0 0 1 0 6.4' }),
    h('path', { d: 'M13.6 6.2a9.4 9.4 0 0 1 0 11.6' })
  );

  const Placa = () => h('div', { className: 'placa' },
    h(Logo),
    h('div', { className: 'tagline' }, 'THE GOOD PLACE OF BILLIARDS'),
    h('div', { className: 'plabel' }, 'IDENTIFICADOR')
  );

  const Dots = ({ v }) => h('div', { className: 'dots' },
    [1, 2, 3, 4, 5].map(i => h('span', { key: i, className: 'dot' + (i <= v ? ' on' : '') }))
  );

  const Home = () => h('div', { className: 'screen home' },
    h(Placa),
    h('div', { className: 'kicker' }, 'HDP BILLAR · IDENTIFICADOR'),
    h('h1', { className: 'screen-title' }, 'Elige tu sensación'),
    h('p', { className: 'screen-sub' }, 'Cada taco tiene su carácter. Acercá el que tengas al lector para ver sus detalles.'),
    h('div', { className: 'sens-list' }, ['LIGHT', 'BALANCED', 'POWER'].map(k =>
      h('div', { key: k, className: 'sens ' + k.toLowerCase() },
        h('b', null, k),
        h('small', null, SENS[k].tag)
      ))),
    h('div', { className: 'scanner' },
      h('div', { className: 'scan-title' }, 'ACERCA EL TACO'),
      h('div', { className: 'scan-sub' }, 'al lector de abajo'),
      h('div', { className: 'arrow-wrap' },
        h('svg', { viewBox: '0 0 40 60', className: 'arrow', 'aria-hidden': 'true' },
          h('line', { x1: 20, y1: 4, x2: 20, y2: 48, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
          h('polyline', { points: '12,40 20,52 28,40', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
        )
      )
    )
  );

  const Detail = ({ cue }) => {
    const s = SENS[cue.sensacion];
    const others = Object.keys(SENS).filter(k => k !== cue.sensacion);
    return h('div', { className: 'screen detail' },
      h(Placa),
      h('div', { className: 'kicker' }, 'TACO ' + cue.numero),
      h('div', { className: 'type-pill', style: { borderColor: s.color, color: s.color } }, cue.sensacion),
      h('div', { className: 'type-tag' }, s.tag),
      h('p', { className: 'desc' }, s.desc),
      h('div', { className: 'stats' },
        h('div', { className: 'srow' },
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'PESO'), h(Dots, { v: cue.peso })),
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'AGILIDAD'), h(Dots, { v: cue.agilidad }))
        ),
        h('div', { className: 'srow' },
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'GOLPE'), h('div', { className: 'val' }, cue.golpe)),
          h('div', { className: 'scell' }, h('div', { className: 'lab' }, 'SENSACIÓN'), h('div', { className: 'val' }, cue.sensacion_texto))
        ),
        h('div', { className: 'scell full' }, h('div', { className: 'lab' }, 'IDEAL PARA'), h('div', { className: 'val soft' }, s.ideal))
      ),
      h('div', { className: 'divider' }),
      h('div', { className: 'other-title' }, '¿Buscas otra sensación?'),
      h('div', { className: 'sens-grid' }, others.map(k =>
        h('div', { key: k, className: 'sens ' + k.toLowerCase() },
          h('b', null, h('span', { className: 'odot', style: { background: SENS[k].color } }), k),
          h('small', null, SENS[k].other)
        ))),
      h('div', { className: 'divider' }),
      h('p', { className: 'hint' }, '¿No sabés cuál elegir? Empezá por ', h('b', null, 'BALANCED'), '.'),
      h('div', { className: 'foot' }, 'HDP BILLAR · EST. 1985')
    );
  };

  const Reading = () => h('div', { className: 'screen reading' },
    h(Placa),
    h('div', { className: 'ringwrap' }, h('span', { className: 'ring' }), h(NFC)),
    h('p', { className: 'reading-txt' }, 'Leyendo etiqueta…')
  );

  function App() {
    const [view, setView] = useState('home');
    const [cue, setCue] = useState(null);
    const [standby, setStandby] = useState(false);
    const [run, setRun] = useState(0);
    const idleRef = useRef(null);
    const runId = useRef(0);
    const cueRef = useRef(null);
    cueRef.current = cue;

    const resetIdle = useCallback(() => {
      setStandby(false);
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => {
        setView('home');
        setCue(null);

        // --- APAGADO AUTOMÁTICO ---
        // Para volver a activar el apagado automatico, DESCOMENTAR LA ALINEA DE ABAJO:
        // setStandby(true);
      }, CONFIG.STANDBY_MS);
    }, []);

    const scan = useCallback(nfcCode => {
      const id = ++runId.current;
      setRun(r => r + 1);
      setView('reading');
      
      const serie = CONFIG.NFC_MAP[nfcCode] || nfcCode;
      
      const espera = new Promise(r => setTimeout(r, CONFIG.READ_MS));
      Promise.all([DB.getCue(serie, cueRef.current && cueRef.current.numero), espera])
        .then(([c]) => { if (id === runId.current) { setCue(c); setView('detail'); } })
        .catch(() => { if (id === runId.current) { setView('home'); } })
        .finally(resetIdle);
    }, [resetIdle]);

    useEffect(() => {
      window.NFC_SCAN = nfcCode => scan(nfcCode);
      return () => { window.NFC_SCAN = null; clearTimeout(idleRef.current); };
    }, [scan]);

    useEffect(() => {
      const buf = { v: '' };
      const onKey = e => {
        if (e.key === 'Enter') { 
          resetIdle();
          
          if (buf.v.length >= 2) {
            if (CONFIG.NFC_MAP[buf.v]) {
              scan(buf.v);
            } else {
              console.warn('[NFC] Código no registrado:', buf.v);
            }
          }
          buf.v = ''; 
        }
        else if (e.key.length === 1 && buf.v.length < 48) buf.v += e.key;
      };
      
      window.addEventListener('keydown', onKey);
      
      return () => { 
        window.removeEventListener('keydown', onKey); 
      };
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
