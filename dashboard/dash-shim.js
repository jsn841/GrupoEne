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
  let loaded = false;
  let failed = null;

  const runCalcs = () => {
    Object.entries(calcs).forEach(([id, c]) => {
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
      if (failed) return { status: 'error', data: [], message: failed };
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

  Promise.all(DATASETS.map((id) => fetch('data/' + id + '.json').then((r) => {
    if (!r.ok) throw new Error(id + ': HTTP ' + r.status);
    return r.json();
  }).then((rows) => { store[id] = rows; })))
    .then(() => { loaded = true; runCalcs(); fire(); })
    .catch((e) => { failed = String(e); console.error(e); fire(); });

  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - w) < 8) return;
    w = window.innerWidth;
    clearTimeout(window.__nzResize);
    window.__nzResize = setTimeout(fire, 150);
  });
})();
