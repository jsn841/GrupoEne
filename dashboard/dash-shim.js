// Minimal stand-in for the `dash` API the dashboard uses inside Claude.
// Loads the JSON files in ./data, runs the derived calculations and redraws on resize.
(function () {
  const DATASETS = [
    'promociones', 'viviendas', 'reservas_mes', 'reservas_mes_total',
    'hotel_mes', 'hotel_puntos_mes', 'hotel_resumen', 'hotel_puntos_resumen', 'hotel_reservas_futuras', 'hotel_pickup', 'hotel_productos',
    'vino_referencias', 'vino_provincia_referencia', 'vino_export_referencia', 'vino_provincias', 'vino_paises',
    'vino_canales_mes', 'vino_canales_resumen', 'vino_resumen', 'vino_anual', 'vino_mes',
    'grupo_mes', 'grupo_resumen', 'actividad_hoy',
  ];
  const DEFAULT_PARAMS = { inmo_vista: 'escriturado', promo: 'avda-america', hotel: 'Total', punto: 'Termas de Tiberio', bodega: 'Enate', ref: null, pais: null };

  const store = {};
  const calcs = {};
  const listeners = [];
  let params = { ...DEFAULT_PARAMS };
  const VERSION = '2026-10-19c';
  const errors = {};
  let loaded = false;

  const runCalcs = () => {
    Object.entries(calcs).forEach(([id, c]) => {
      const bad = c.inputs.filter((i) => !(i in store));
      if (bad.length) { errors[id] = 'falta ' + bad.join(', '); return; }
      try {
        store[id] = c.fn(...c.inputs.map((i) => store[i]));
      } catch (e) {
        console.error('calc ' + id, e);
      }
    });
  };
  const fire = () => listeners.forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });

  window.dash = {
    colors: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'],
    data(id) {
      if (errors[id]) return { status: 'error', data: [], message: errors[id] };
      if (!loaded) return { status: 'loading', data: [] };
      if (!(id in store)) return { status: 'missing', data: [] };
      const d = store[id];
      return { status: 'ok', data: d, columns: Array.isArray(d) && d[0] ? Object.keys(d[0]) : [], meta: [] };
    },
    onData(fn) { listeners.push(fn); fn(); },
    calc(id, def) { calcs[id] = def; if (loaded) { runCalcs(); fire(); } },
    loader() {},
    params() { return { ...params }; },
    setParams(o) { params = { ...params, ...o }; fire(); },
    resetParams() { params = { ...DEFAULT_PARAMS }; fire(); },
    setLink(name) { history.replaceState(null, '', '#' + name); },
    refresh() {},
  };

  const showErrors = () => {
    const ids = Object.keys(errors);
    if (!ids.length) return;
    const root = document.getElementById('dash-root');
    let box = document.getElementById('nz-load-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'nz-load-error';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'margin:0 auto 12px;max-width:1320px;padding:10px 14px;border:1px solid var(--color-bad);border-radius:8px;color:var(--color-bad);font:13px var(--font-anthropic-sans)';
      root.prepend(box);
    }
    box.textContent = 'No se han podido cargar ' + ids.length + ' fuentes de datos (' + ids.join(', ') + '). Recarga la página; si sigue igual, ábrela de nuevo dentro de un par de minutos.';
  };
  // Load every source on its own: one failing file no longer blanks the whole page.
  Promise.allSettled(DATASETS.map((id) => fetch('data/' + id + '.json?v=' + VERSION, { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((rows) => { store[id] = rows; })
    .catch((e) => { errors[id] = String(e.message || e); console.error(id, e); })))
    .then(() => {
      loaded = true;
      runCalcs();
      fire();
      showErrors();
    });

  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - w) < 8) return;
    w = window.innerWidth;
    clearTimeout(window.__nzResize);
    window.__nzResize = setTimeout(fire, 150);
  });
})();
