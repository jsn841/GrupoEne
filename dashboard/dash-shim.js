// Minimal stand-in for the `dash` API the dashboard uses inside Claude.
// Loads the JSON files in ./data, runs the derived calculations and redraws on resize.
(function () {
  // Lo que no depende de las fechas se carga tal cual; el resto se calcula con las series diarias (periodo.js)
  const DATASETS = ['promociones', 'viviendas', 'hotel_reservas_futuras', 'hotel_pickup', 'actividad_hoy', 'series', 'marketing', 'provincias', 'ciclo', 'resenas', 'promo_detalle', 'suelos', 'obra'];
  const DEFAULT_PARAMS = { inmo_vista: 'escriturado', promo: 'avda-america', hotel: 'Total', punto: 'Termas de Tiberio', bodega: 'Enate', ref: null, pais: null };

  const store = {};
  const calcs = {};
  const listeners = [];
  let params = { ...DEFAULT_PARAMS };
  const VERSION = '2026-10-24a';
  const errors = {};
  let loaded = false;

  const rebuild = () => {
    if (!window.PER || !store.series) return;
    if (!PER.ready) PER.init(store.series);
    try { Object.assign(store, PER.build()); } catch (e) { console.error('periodo', e); }
  };
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
    setParams(o) { const per = Object.keys(o).some((k) => k.startsWith('per_')); params = { ...params, ...o }; if (per && loaded) { rebuild(); runCalcs(); if (window.PER) PER.renderBar(); } fire(); },
    resetParams() { params = { ...DEFAULT_PARAMS }; rebuild(); runCalcs(); fire(); },
    setLink(name) { const q = location.hash.split('?')[1]; history.replaceState(null, '', '#' + name + (q ? '?' + q : '')); },
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
      rebuild();
      runCalcs();
      if (window.PER) PER.renderBar();
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
