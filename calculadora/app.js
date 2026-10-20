/* Calculadora de promociones: biblioteca local, formulario, resultados y exportación. */
(function () {
  'use strict';
  const { fmtNum, fmtEur, fmtPct, fmtDate, fmtMonth, fmtMonthLong, fmtField, fmtMill, NOTAS, fieldState } = EXPORT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === false || v === null || v === undefined) continue; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const FIELDS = Object.fromEntries(SCHEMA.fields.map((f) => [f.id, f]));
  const SALES = FIELDS.plan_ventas.rows; // [key,label,row,unitsField]
  const LIBKEY = 'calcpromo.biblioteca.v1';
  const VERSION = '2026-10-20';

  // ---------------- biblioteca ----------------
  let lib = null;
  function loadLib() {
    try { lib = JSON.parse(store.get(LIBKEY) || 'null'); } catch (e) { lib = null; }
    if (!lib || !Array.isArray(lib.promociones)) lib = { v: 1, activa: null, promociones: [] };
    if (!lib.promociones.length) { const p = newPromo(EJEMPLO.nombre, EJEMPLO.ejemplo()); lib.activa = p.id; }
    if (!lib.promociones.some((p) => p.id === lib.activa)) lib.activa = lib.promociones[0].id;
  }
  let saveOk = true;
  function saveLib() { const ok = store.set(LIBKEY, JSON.stringify(lib)); if (!ok && saveOk) toast('No se ha podido guardar en este navegador (modo privado o sin espacio). Los cambios se perderán al cerrar.'); saveOk = ok; }
  function newPromo(nombre, data) { const now = new Date().toISOString(); const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre, creada: now, modificada: now, data: data || {}, revisados: [] }; lib.promociones.push(p); return p; }
  const promo = () => lib.promociones.find((p) => p.id === lib.activa);
  function touch() { promo().modificada = new Date().toISOString(); saveLib(); }

  // ---------------- utilidades de números ----------------
  function parseNum(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim().replace(/[\s€%m²/]/g, '');
    if (s === '') return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function toInput(f, v) {
    if (v === null || v === undefined || v === '') return '';
    if (f.type === 'pct') { const p = Number(v) * 100; return fmtNum(p, decimals(p)); }
    if (f.type === 'int') return fmtNum(Number(v));
    return fmtNum(Number(v), decimals(Number(v)));
  }
  function decimals(x) { for (let d = 0; d < 6; d++) if (Math.abs(x * Math.pow(10, d) - Math.round(x * Math.pow(10, d))) < 1e-7) return d; return 6; }
  const UNIT = { eur: '€', pct: '%', m2: 'm²', eur_m2: '€/m²', int: '' };

  function addMonths(iso, k) { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + k, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); }

  // ---------------- estado de la vista ----------------
  const ui = { tab: store.get('calcpromo.tab') || 'resumen', flujo: 'mensual', soloPend: false, open: new Set(['suelo']), res: null, check: null, values: null, busy: false };

  // ---------------- formulario ----------------
  const form = $('#form');
  function values() { return CALC.withDefaults(promo().data); }
  function renderForm() {
    const p = promo(), v = values();
    form.innerHTML = '';
    const st = h('div', { class: 'card status', id: 'statusCard' });
    form.append(st);
    for (const g of SCHEMA.groups) {
      const det = h('details', { class: 'card group', id: 'g-' + g.id, open: ui.open.has(g.id) });
      det.addEventListener('toggle', () => { det.open ? ui.open.add(g.id) : ui.open.delete(g.id); });
      const sum = h('summary', {}, h('span', { class: 't' }, g.title), h('span', { class: 'gchips' }), h('svg', { class: 'chev', viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, html: '<path d="M9 6l6 6-6 6"/>' }));
      const body = h('div', { class: 'gbody' });
      const markAll = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { const ids = SCHEMA.fields.filter((f) => f.group === g.id && f.revisar && CALC.visible(f, values())).map((f) => f.id); p.revisados = [...new Set([...(p.revisados || []), ...ids])]; touch(); refreshStates(); toast('Grupo marcado como revisado'); } }, 'Marcar todo como revisado');
      body.append(h('div', { class: 'gnote' }, h('span', {}, g.note), SCHEMA.fields.some((f) => f.group === g.id && f.revisar) ? markAll : null));
      for (const f of SCHEMA.fields.filter((x) => x.group === g.id)) body.append(renderField(f, v));
      det.append(sum, body);
      form.append(det);
    }
    refreshStates();
  }

  function renderField(f, v) {
    const wrap = h('div', { class: 'field', 'data-id': f.id, id: 'f-' + f.id });
    if (f.type === 'salesplan') { wrap.append(h('div', { id: 'planEditor' })); renderPlan(wrap.firstChild); return wrap; }
    if (f.type === 'curve') { wrap.append(h('label', {}, f.label), h('div', { id: 'curveEditor' })); renderCurve($('#curveEditor', wrap) || wrap.lastChild); wrap.append(helpEl(f)); return wrap; }
    const id = 'in-' + f.id;
    wrap.append(h('label', { for: id }, f.label));
    let ctrl;
    if (f.calc) {
      ctrl = h('div', { class: 'inp' }, h('input', { id, readonly: true, tabindex: -1, value: '' }));
    } else if (f.type === 'select' && f.options.length === 2) {
      const seg = h('div', { class: 'seg', role: 'group', 'aria-label': f.label });
      for (const [val, lab] of f.options) seg.append(h('button', { type: 'button', 'data-val': val, 'aria-pressed': String(String(v[f.id]) === String(val)), onclick: () => setValue(f, val) }, lab));
      ctrl = seg;
    } else if (f.type === 'select') {
      const sel = h('select', { id, onchange: (e) => setValue(f, typeof f.options[0][0] === 'number' ? Number(e.target.value) : e.target.value) });
      for (const [val, lab] of f.options) sel.append(h('option', { value: val, selected: String(v[f.id]) === String(val) }, lab));
      ctrl = h('div', { class: 'inp' }, sel);
    } else if (f.type === 'date') {
      ctrl = h('div', { class: 'inp' }, h('input', { id, type: 'date', value: v[f.id] || '', onchange: (e) => setValue(f, e.target.value || null) }));
    } else {
      const raw = promo().data[f.id];
      const inp = h('input', { id, inputmode: 'decimal', autocomplete: 'off', value: toInput(f, raw !== undefined && raw !== null ? raw : f.sync ? null : v[f.id]) });
      if (f.sync) inp.placeholder = 'Igual que ' + FIELDS[f.sync].label.toLowerCase() + (v[f.sync] ? ' (' + fmtNum(v[f.sync]) + ')' : '');
      inp.addEventListener('change', () => {
        const n = parseNum(inp.value);
        if (Number.isNaN(n)) { toast('Ese valor no es un número'); inp.value = toInput(f, promo().data[f.id] ?? (f.sync ? null : f.def)); return; }
        let val = n === null ? null : f.type === 'pct' ? n / 100 : f.type === 'int' ? Math.round(n) : n;
        if (val !== null && val < 0 && f.type !== 'eur') val = -val;
        setValue(f, val);
        inp.value = toInput(f, val === null ? (f.sync ? null : f.def) : val);
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
      ctrl = h('div', { class: 'inp' + (UNIT[f.type] ? ' has-unit' : '') }, inp, UNIT[f.type] ? h('span', { class: 'unit' }, UNIT[f.type]) : null);
    }
    wrap.append(h('div', { class: 'ctrl' }, ctrl, h('div', { class: 'flags' })));
    wrap.append(helpEl(f));
    if (f.preset) wrap.append(h('div', { class: 'presetnote', id: 'ccaaNote' }, ccaaNoteText()));
    return wrap;
  }

  function helpEl(f) {
    const src = f.hoja === 'modelo' ? 'Supuesto del modelo' : f.hoja ? 'Excel: hoja ' + f.hoja : '';
    return h('span', { class: 'help' }, f.help || '', src ? h('span', { class: 'src' }, src) : null);
  }
  function ccaaNoteText() {
    const c = SCHEMA.CCAA.find((x) => x[0] === promo().data.ccaa);
    if (!c) return '';
    const v = values();
    return `Rellenado con ${c[1]}: AJD del ${fmtPct(c[2], 2)} en ${Number(v.vendedor_suelo) === 1 ? 'la obra nueva (la compra a un particular paga ITP: escríbelo a mano)' : 'la compra del suelo y la obra nueva'}; AJD de los préstamos a 0 %, porque lo paga el banco.${c[3] ? ' ' + c[3] : ''} Revisa los valores.`;
  }
  function applyCcaa() {
    const p = promo(), c = SCHEMA.CCAA.find((x) => x[0] === p.data.ccaa);
    if (!c) { const n = $('#ccaaNote'); if (n) n.textContent = ''; return; }
    const set = { pct_ajd_obra_nueva: c[2], pct_ajd_prestamo_suelo: 0, pct_ajd_prestamo_promotor: 0 };
    if (Number(values().vendedor_suelo) !== 1) set.pct_ajd_compra = c[2];
    Object.assign(p.data, set);
    p.revisados = (p.revisados || []).filter((id) => !(id in set));
    touch(); renderForm(); toast('Impuestos de ' + c[1] + ' rellenados');
  }
  function setValue(f, val) {
    const p = promo();
    if (val === null || val === '') delete p.data[f.id]; else p.data[f.id] = val;
    if (f.revisar && !(p.revisados || []).includes(f.id)) p.revisados = [...(p.revisados || []), f.id];
    touch();
    if (f.type === 'select' && f.options.length === 2) $$('#f-' + f.id + ' .seg button').forEach((b) => b.setAttribute('aria-pressed', String(String(b.dataset.val) === String(val))));
    // lo que depende de este dato
    if (['meses_inicio', 'meses_obra', 'meses_llaves', 'fecha_compra', 'forma_pago_suelo'].includes(f.id) || SALES.some((r) => r[3] === f.id)) renderPlan($('#planEditor'));
    if (['meses_obra', 'reparto_obra'].includes(f.id)) renderCurve($('#curveEditor'));
    if (f.id === 'n_viviendas') { for (const s of SCHEMA.fields.filter((x) => x.sync === 'n_viviendas')) { const i = $('#in-' + s.id); if (i) i.placeholder = 'Igual que ' + FIELDS.n_viviendas.label.toLowerCase() + (val ? ' (' + fmtNum(val) + ')' : ''); } }
    if (f.preset) { applyCcaa(); schedule(); return; }
    if (f.id === 'vendedor_suelo') { if (Number(val) === 1) toast('Escribe el ITP de tu comunidad en «Impuesto de la compra del suelo»'); else if (p.data.ccaa) { applyCcaa(); schedule(); return; } const n = $('#ccaaNote'); if (n) n.textContent = ccaaNoteText(); }
    refreshStates();
    schedule();
  }

  function refreshStates() {
    const p = promo(), v = values();
    let falta = 0, rev = 0;
    for (const g of SCHEMA.groups) {
      let gf = 0, gr = 0;
      for (const f of SCHEMA.fields.filter((x) => x.group === g.id)) {
        const el = $('#f-' + f.id); if (!el) continue;
        const vis = CALC.visible(f, v);
        let st = vis ? fieldState(f, p, v) : 'ok';
        if (f.type === 'salesplan' || f.type === 'curve' || f.calc) st = 'ok';
        el.classList.toggle('hidden', !vis || (ui.soloPend && st === 'ok' && f.type !== 'salesplan'));
        el.classList.toggle('st-revisar', st === 'revisar'); el.classList.toggle('st-falta', st === 'falta');
        const flags = $('.flags', el);
        if (flags) {
          flags.innerHTML = '';
          if (st === 'falta') flags.append(h('span', { class: 'chip bad' }, 'Falta'));
          if (st === 'revisar') flags.append(h('button', { class: 'chip warn', type: 'button', title: 'Valor habitual ya rellenado. Compruébalo y pulsa para marcarlo como revisado.', onclick: () => { p.revisados = [...new Set([...(p.revisados || []), f.id])]; touch(); refreshStates(); } }, 'Revisar este dato'));
          else if (f.revisar && vis && st === 'ok') flags.append(h('span', { class: 'chip ok', title: 'Revisado' }, '✓'));
        }
        if (f.calc && f.id === 'pct_permuta_viviendas') { const i = $('#in-' + f.id); const pm = ui.res && ui.res.permuta; if (i) i.value = pm ? fmtPct(pm.pct, 2) + ' · ' + fmtNum(pm.viviendas) + ' viviendas' : ''; }
        if (vis && st === 'falta') gf++; if (vis && st === 'revisar') gr++;
      }
      if (g.id === 'ventas') { const w = (ui.check || CALC.check(p.data)).warn.filter((x) => x[0] === 'plan_ventas').length; if (w) gr += 0; }
      const chips = $('#g-' + g.id + ' .gchips');
      if (chips) { chips.innerHTML = ''; if (gf) chips.append(h('span', { class: 'chip bad' }, gf + (gf === 1 ? ' falta' : ' faltan'))); if (gr) chips.append(h('span', { class: 'chip warn' }, gr + ' por revisar')); if (!gf && !gr) chips.append(h('span', { class: 'chip ok' }, '✓')); }
      falta += gf; rev += gr;
    }
    const st = $('#statusCard');
    if (st) {
      st.innerHTML = '';
      const row = h('div', { class: 'status-row' });
      row.append(falta ? h('span', { class: 'chip bad' }, `Faltan ${falta} ${falta === 1 ? 'dato' : 'datos'}`) : h('span', { class: 'chip ok' }, 'Están todos los datos necesarios'));
      if (rev) row.append(h('span', { class: 'chip warn' }, `${rev} por revisar`));
      const sw = h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: ui.soloPend, onchange: (e) => { ui.soloPend = e.target.checked; if (ui.soloPend) SCHEMA.groups.forEach((g) => { const d = $('#g-' + g.id); const c = $('.gchips .chip.bad, .gchips .chip.warn', d); if (c) d.open = true; }); refreshStates(); } }), h('span', { class: 'track' }), 'Ver solo lo pendiente');
      st.append(row, h('div', { class: 'status-row', style: 'justify-content:space-between' }, h('span', { style: 'font-size:12.5px;color:var(--ink-3)' }, 'Los datos en amarillo vienen rellenos con valores habituales.'), sw));
    }
  }

  // ---------- calendario de ventas ----------
  function renderPlan(el) {
    if (!el) return;
    const p = promo(), v = values();
    const llaves = Number(v.meses_inicio) + Number(v.meses_obra) + Number(v.meses_llaves);
    const rows = SALES.filter(([key, , , u]) => Number(v[u]) > 0 || ((v.plan_ventas || {})[key] || []).some((x) => x > 0));
    const plan = p.data.plan_ventas || {};
    el.innerHTML = '';
    el.append(h('label', {}, 'Unidades vendidas cada mes'), helpEl(FIELDS.plan_ventas));
    if (!rows.length) { el.append(h('p', { class: 'help' }, 'Primero escribe cuántas viviendas, plazas y locales hay (grupo «Producto y precios de venta»).')); return; }
    const perm = v.forma_pago_suelo === 'a' && ui.res && ui.res.permuta ? ui.res.permuta : null;
    const units = (key, u) => Math.max(0, (Number(v[u]) || 0) - (perm ? perm[key] || 0 : 0));
    const pre = { mes: 3, pct: 25, desde: 4, hasta: Math.max(4, llaves - 3) };
    const gi = (k, val, w) => h('input', { 'data-k': k, value: val, inputmode: 'numeric', style: w ? 'width:' + w + 'px' : null });
    const gen = h('div', { class: 'gen' }, 'Preventa en el mes', gi('mes', pre.mes), 'con el', gi('pct', pre.pct), '% de las unidades. El resto, a partes iguales del mes', gi('desde', pre.desde), 'al', gi('hasta', pre.hasta),
      h('button', { class: 'btn small primary', type: 'button', onclick: () => {
        const g = (k) => parseNum($('[data-k="' + k + '"]', gen).value) || 0;
        const o = { preventaMes: Math.round(g('mes')), preventaPct: Math.min(100, g('pct')) / 100, desde: Math.max(1, Math.round(g('desde'))), hasta: Math.min(84, Math.round(g('hasta'))) };
        if (o.hasta < o.desde) { toast('El último mes tiene que ser posterior al primero'); return; }
        const np = {}; for (const [key, , , u] of rows) np[key] = CALC.spread(units(key, u), o);
        p.data.plan_ventas = np; touch(); renderPlan(el); refreshStates(); schedule(); toast('Calendario repartido');
      } }, 'Repartir'));
    el.append(gen);
    let last = llaves; for (const [key] of rows) (plan[key] || []).forEach((x, i) => { if (x > 0) last = Math.max(last, i + 1); });
    const tbl = h('table', { class: 'grid' });
    tbl.append(h('thead', {}, h('tr', {}, h('th', {}, 'Mes'), rows.map(([, l]) => h('th', {}, l.replace('Primeras plazas de garaje', 'Garaje 1ª').replace('Segundas plazas de garaje', 'Garaje 2ª').replace('Viviendas en aportación', 'Aportación'))))));
    const tb = h('tbody');
    for (let i = 0; i < Math.min(84, last); i++) {
      const tr = h('tr', { class: i + 1 === llaves ? 'mark' : null, title: i + 1 === llaves ? 'Entrega de llaves' : null }, h('td', {}, (i + 1) + (v.fecha_compra ? ' · ' + fmtMonth(addMonths(v.fecha_compra, i)) : '') + (i + 1 === llaves ? ' · llaves' : '')));
      for (const [key] of rows) {
        const inp = h('input', { value: (plan[key] || [])[i] || '', inputmode: 'numeric', 'aria-label': key + ' mes ' + (i + 1) });
        inp.addEventListener('change', () => { const n = parseNum(inp.value); const pv = p.data.plan_ventas = p.data.plan_ventas || {}; const arr = pv[key] = (pv[key] || []).slice(); while (arr.length < 84) arr.push(0); arr[i] = n && n > 0 ? Math.round(n) : 0; inp.value = arr[i] || ''; touch(); updatePlanFoot(); schedule(); });
        tr.append(h('td', {}, inp));
      }
      tb.append(tr);
    }
    tbl.append(tb);
    const ft = h('tfoot', {}, h('tr', { id: 'planFoot' }));
    tbl.append(ft);
    el.append(h('div', { class: 'gridwrap' }, tbl));
    el.append(h('span', { class: 'help' }, 'La fila azul es el mes de entrega de llaves. Lo vendido tiene que coincidir con el total de unidades' + (perm ? ', descontadas las que se entregan en la permuta.' : '.')));
    el._foot = updatePlanFoot;
    function updatePlanFoot() {
      const tr = $('#planFoot', el); tr.innerHTML = ''; tr.append(h('td', {}, 'Vendidas'));
      const pv = p.data.plan_ventas || {};
      for (const [key, , , u] of rows) { const s = (pv[key] || []).reduce((a, b) => a + (Number(b) || 0), 0); const t = units(key, u); tr.append(h('td', { style: 'color:' + (s === t ? 'var(--ok)' : 'var(--bad)'), title: s === t ? 'Cuadra' : 'No coincide con el total' }, fmtNum(s) + ' / ' + fmtNum(t))); }
    }
    updatePlanFoot();
  }

  function updatePlanFootGlobal() { const el = $('#planEditor'); if (el && promo().data.forma_pago_suelo === 'a' && !el.contains(document.activeElement)) renderPlan(el); }
  // ---------- curva de obra ----------
  function renderCurve(el) {
    if (!el) return;
    const p = promo(), v = values(), n = Number(v.meses_obra);
    el.innerHTML = '';
    if (Number(v.reparto_obra) !== 1) return;
    const cur = (p.data.curva_obra || []).slice(); while (cur.length < 84) cur.push(0);
    const set = (arr) => { p.data.curva_obra = arr; touch(); renderCurve(el); refreshStates(); schedule(); };
    el.append(h('div', { class: 'gen' }, 'Rellenar:', h('button', { class: 'btn small', type: 'button', onclick: () => set(CALC.curveS(n)) }, 'Curva en S'), h('button', { class: 'btn small', type: 'button', onclick: () => set(CALC.curveFlat(n)) }, 'A partes iguales')));
    const grid = h('div', { class: 'curve' });
    for (let i = 0; i < n; i++) {
      const inp = h('input', { value: cur[i] ? fmtNum(cur[i] * 100, decimals(cur[i] * 100) > 2 ? 2 : decimals(cur[i] * 100)) : '', inputmode: 'decimal' });
      inp.addEventListener('change', () => { const x = parseNum(inp.value); const arr = (p.data.curva_obra || []).slice(); while (arr.length < 84) arr.push(0); arr[i] = x && x > 0 ? x / 100 : 0; p.data.curva_obra = arr; touch(); sumL(); schedule(); });
      grid.append(h('div', {}, h('label', {}, 'Mes ' + (i + 1)), inp));
    }
    el.append(grid);
    const sl = h('div', { class: 'sumline' }); el.append(sl);
    function sumL() { const s = (p.data.curva_obra || []).slice(0, n).reduce((a, b) => a + (Number(b) || 0), 0); sl.innerHTML = ''; sl.append('Suma: ', h('b', { style: 'color:' + (Math.abs(s - 1) < 1e-6 ? 'var(--ok)' : 'var(--bad)') }, fmtPct(s, 2)), Math.abs(s - 1) < 1e-6 ? '' : ' · tiene que sumar el 100 %'); }
    sumL();
  }

  // ---------------- cálculo ----------------
  let worker = null, reqId = 0, timer = null, mainWb = null;
  function startWorker() { try { worker = new Worker('worker.js?' + VERSION); worker.onmessage = onResult; worker.onerror = () => { worker = null; schedule(0); }; } catch (e) { worker = null; } }
  function schedule(ms = 350) { clearTimeout(timer); timer = setTimeout(calc, ms); setBusy(true); }
  function calc() {
    const p = promo();
    ui.check = CALC.check(p.data, ui.res && ui.res.permuta); ui.values = values();
    if (ui.check.missing.length) { ui.res = null; setBusy(false); renderResults(); return; }
    const id = ++reqId;
    const data = JSON.parse(JSON.stringify(p.data));
    if (worker) worker.postMessage({ id, data });
    else calcMain(id, data);
  }
  async function calcMain(id, data) {
    try {
      if (!mainWb) mainWb = new FX.Workbook(await (await fetch('template.json?' + VERSION)).json());
      CALC.apply(mainWb, data); mainWb.recalc();
      onResult({ data: { id, ok: true, res: RESULTS.read(mainWb) } });
    } catch (e) { onResult({ data: { id, ok: false, error: String(e.message || e) } }); }
  }
  function onResult(e) {
    const { id, ok, res, error } = e.data;
    if (id !== reqId) return;
    setBusy(false);
    if (!ok) { ui.res = null; ui.error = error; } else { ui.res = res; ui.error = null; ui.check = CALC.check(promo().data, res.permuta); updatePlanFootGlobal(); const pp = promo(); pp.resumen = summaryOf(res); saveLib(); }
    renderResults(); refreshStates();
  }
  function setBusy(b) { ui.busy = b; const s = $('#calcState'); if (s) { s.classList.toggle('busy', b); $('span', s).textContent = b ? 'Calculando…' : 'Calculado'; } }

  // ---------------- resultados ----------------
  const results = $('#results');
  const TABS = [['resumen', 'Resumen'], ['costes', 'Costes'], ['ingresos', 'Ingresos y ventas'], ['flujo', 'Flujo de caja'], ['notas', 'Avisos y notas']];
  function renderResults() {
    const p = promo();
    const sx = window.scrollY;
    results.innerHTML = '';
    results.append(h('div', { class: 'rhead' }, h('h1', {}, p.nombre), h('div', { class: 'calcstate' + (ui.busy ? ' busy' : ''), id: 'calcState' }, h('i', { class: 'dot' }), h('span', {}, ui.busy ? 'Calculando…' : 'Calculado'))));
    const tabs = h('div', { class: 'rtabs', role: 'tablist' });
    for (const [id, l] of TABS) { const nw = id === 'notas' && ui.check ? ui.check.warn.length : 0; tabs.append(h('button', { role: 'tab', 'aria-selected': String(ui.tab === id), onclick: () => { ui.tab = id; store.set('calcpromo.tab', id); renderResults(); } }, l, nw ? h('span', { class: 'chip warn', style: 'margin-left:6px' }, nw) : null)); }
    results.append(tabs);
    const body = h('div');
    results.append(body);
    if (ui.check && ui.check.missing.length) body.append(missingCard());
    else if (ui.error) body.append(h('div', { class: 'alert bad' }, h('b', {}, 'No se ha podido calcular'), ui.error));
    else if (!ui.res) body.append(h('div', { class: 'empty' }, 'Calculando…'));
    else if (ui.tab === 'resumen') renderResumen(body);
    else if (ui.tab === 'costes') renderCostes(body);
    else if (ui.tab === 'ingresos') renderIngresos(body);
    else if (ui.tab === 'flujo') renderFlujo(body);
    if (ui.tab === 'notas') renderNotas(body);
    $('#xlsxBtn').disabled = $('#pdfBtn').disabled = !ui.res;
    window.scrollTo(0, sx);
  }
  function goField(id) {
    const f = FIELDS[id]; if (!f) return;
    document.body.dataset.view = 'datos'; syncView();
    const d = $('#g-' + f.group); if (d) d.open = true;
    const el = $('#f-' + id); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    const i = $('input,select', el); if (i) setTimeout(() => i.focus({ preventScroll: true }), 300);
  }
  function missingCard() {
    const m = ui.check.missing;
    const ul = h('ul');
    for (const f of m) ul.append(h('li', {}, h('a', { onclick: () => goField(f.id) }, f.label), ' · ', SCHEMA.groups.find((g) => g.id === f.group).title));
    return h('div', { class: 'alert bad' }, h('b', {}, `Faltan ${m.length} ${m.length === 1 ? 'dato' : 'datos'} para poder calcular`), 'Son datos propios de cada promoción y no tienen un valor habitual:', ul);
  }
  function warnBox(limit) {
    const w = ui.check.warn; if (!w.length) return null;
    const ul = h('ul'); for (const [id, t] of w.slice(0, limit || 99)) ul.append(h('li', {}, h('a', { onclick: () => goField(id) }, t)));
    return h('div', { class: 'alert warn' }, h('b', {}, w.length === 1 ? 'Hay un aviso sobre los datos' : `Hay ${w.length} avisos sobre los datos`), ul);
  }
  const cls = (v) => (v < -0.5 ? 'neg' : '');
  function kpi(l, v, s, o = {}) {
    const info = KPI_HELP[l];
    const box = h('div', { class: 'card kpi' + (o.hero ? ' hero' : '') });
    const tip = info ? h('div', { class: 'kinfo', hidden: true }, info) : null;
    box.append(h('div', { class: 'l' }, l, info ? h('button', { class: 'ibtn', type: 'button', 'aria-label': '¿Qué es ' + l.toLowerCase() + '?', 'aria-expanded': 'false', onclick: (e) => { tip.hidden = !tip.hidden; e.currentTarget.setAttribute('aria-expanded', String(!tip.hidden)); } }, 'i') : null), h('div', { class: 'v ' + (o.neg ? 'neg' : '') }, v), s ? h('div', { class: 's' }, s) : null, tip);
    return box;
  }
  const KPI_HELP = {
    'Resultado (antes de impuestos)': 'Ingresos menos todos los costes, antes del impuesto de sociedades. El margen es el resultado dividido entre los ingresos: con un 15 %, de cada 100 € vendidos quedan 15 € de beneficio.',
    'Ingresos por ventas': 'Lo que se cobra por vender todo (viviendas, plazas, trasteros y locales), sin IVA.',
    'Costes totales': 'Suma de los ocho capítulos de coste (suelo, impuestos, notaría y seguros, proyectos, obra, gastos financieros, comercialización y gestión), sin IVA.',
    'TIR del proyecto': 'Rentabilidad anual de la promoción sin contar los préstamos, como si todo se pagara con dinero propio. Sirve para comparar promociones entre sí. La VAN es cuánto vale hoy el beneficio, descontado a la tasa del grupo «Cálculo de la rentabilidad».',
    'TIR con financiación': 'Rentabilidad anual del dinero propio que se pone, contando los préstamos y sus intereses. Suele ser mayor que la del proyecto porque el banco pone gran parte del dinero.',
    'Saldo de caja más bajo': 'El peor momento de la caja, contando préstamos e IVA: lo máximo que llega a faltar. Es el dinero propio que hace falta tener disponible.',
    'Resultado sobre capital propio': 'Resultado dividido entre el capital propio previsto: lo que hay que poner al principio (suelo con sus gastos y primeros pagos, menos el préstamo del suelo), redondeado a cientos de miles.',
  };
  const CAP_HELP = {
    'Suelo': 'Precio del solar y gastos de la compra.',
    'Impuestos y tasas': 'Tasas e impuestos municipales y autonómicos: licencia, ICIO, plusvalía, primera ocupación, AJD e IAE.',
    'Notaría, registro y seguros': 'Escrituras, inscripciones, tasaciones y seguros de la promoción.',
    'Proyectos y estudios': 'Honorarios de arquitecto y aparejador, estudios, controles técnicos y acometidas.',
    'Obra': 'Lo que se paga a la constructora, con sus partidas sueltas e imprevistos.',
    'Gastos financieros': 'Intereses y comisiones de los préstamos, avales y cobro de mensualidades.',
    'Comercialización': 'Comisión de venta.',
    'Gastos de gestión y contingencia': 'Gastos de estructura de la empresa y fondo para imprevistos.',
  };
  function renderResumen(el) {
    const r = ui.res, k = r.kpis, p = promo(), v = ui.values;
    const wb = warnBox(); if (wb) el.append(wb);
    const pend = SCHEMA.fields.filter((f) => CALC.visible(f, v) && fieldState(f, p, v) === 'revisar').length;
    if (pend) el.append(h('div', { class: 'alert warn' }, h('b', {}, `${pend} datos llevan un valor habitual sin revisar`), 'Los resultados ya los tienen en cuenta. Están en amarillo en el formulario; ', h('a', { onclick: () => { ui.soloPend = true; document.body.dataset.view = 'datos'; syncView(); SCHEMA.groups.forEach((g) => { const d = $('#g-' + g.id); if ($('.gchips .chip.warn', d)) d.open = true; }); refreshStates(); form.scrollIntoView({ behavior: 'smooth' }); } }, 'ver solo los pendientes'), '.'));
    el.append(h('div', { class: 'kpis' },
      kpi('Resultado (antes de impuestos)', fmtEur(k.resultado), 'Margen sobre ventas: ' + fmtPct(k.margen, 2), { hero: true, neg: k.resultado < 0 }),
      kpi('Ingresos por ventas', fmtEur(k.ingresos), fmtNum(v.n_viviendas) + ' viviendas'),
      kpi('Costes totales', fmtEur(k.costes), 'Obra: ' + fmtPct(k.costes ? r.capitulos[4].importe / k.costes : 0, 1) + ' del total'),
      kpi('TIR del proyecto', k.tirOperativa === null ? '—' : fmtPct(k.tirOperativa, 2), 'Sin financiación · VAN al ' + fmtPct(Number(v.tasa_van), 1) + ': ' + fmtMill(k.vanOperativo), { neg: k.tirOperativa < 0 }),
      kpi('TIR con financiación', k.tirFinanciera === null ? '—' : fmtPct(k.tirFinanciera, 2), 'VAN al ' + fmtPct(Number(v.tasa_van), 1) + ': ' + fmtMill(k.vanFinanciero), { neg: k.tirFinanciera < 0 }),
      kpi('Saldo de caja más bajo', fmtEur(k.peorSaldo), 'Mes ' + k.mesPeorSaldo + ' · ' + fmtMonthLong(k.fechaPeorSaldo), { neg: k.peorSaldo < 0 }),
      kpi('Resultado sobre capital propio', k.rentCapital === null ? '—' : fmtPct(k.rentCapital, 1), 'Capital previsto: ' + fmtEur(k.capital), { neg: k.rentCapital < 0 }),
    ));
    const tl = h('div', { class: 'timeline' });
    [['Compra del suelo', k.fechas.compra, 'Mes 1'], ['Inicio de obra', k.fechas.inicioObra, 'Mes ' + (1 + Number(v.meses_inicio))], ['Fin de obra', k.fechas.finObra, 'Mes ' + k.mesCfo + ' · ' + v.meses_obra + ' meses de obra'], ['Entrega de llaves', k.fechas.llaves, 'Mes ' + k.mesLlaves]].forEach(([l, d, s]) => tl.append(h('div', { class: 'tl' }, h('i'), h('b', {}, l), h('span', {}, fmtDate(d)), h('br'), h('em', {}, s))));
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Calendario'), h('p', { class: 'sub' }, 'Fechas calculadas a partir de la compra del suelo y los plazos.'), tl));
    const n = r.ultimoMes;
    const labels = r.meses.slice(0, n).map((m) => m.fecha);
    const saldo = r.mensual.find((f) => f.label === 'Saldo acumulado').valores.slice(0, n);
    const c1 = h('div', { class: 'chart' });
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Saldo de caja acumulado'), h('p', { class: 'sub' }, `Incluye préstamos e IVA. El punto más bajo, ${fmtEur(k.peorSaldo)}, es lo que hay que cubrir con fondos propios.`), c1));
    lineChart(c1, labels, [{ name: 'Saldo acumulado', values: saldo, color: 'var(--s1)' }]);
    const cob = r.mensual.find((f) => f.label === 'Total cobros').valores.slice(0, n), pag = r.mensual.find((f) => f.label === 'Total pagos').valores.slice(0, n);
    const c2 = h('div', { class: 'chart' });
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Cobros y pagos de cada mes'), h('p', { class: 'sub' }, 'Con IVA. Los cobros incluyen las disposiciones de los préstamos.'), c2, h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--s1)' }), 'Cobros'), h('span', {}, h('i', { style: 'background:var(--s2)' }), 'Pagos'))));
    barChart(c2, labels, [{ name: 'Cobros', values: cob, color: 'var(--s1)' }, { name: 'Pagos', values: pag, color: 'var(--s2)' }]);
    const bars = h('div', { class: 'bars' }); const mx = Math.max(...r.capitulos.map((c) => c.importe), 1);
    for (const c of r.capitulos) bars.append(h('div', { class: 'row' }, h('span', {}, c.label), h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${Math.max(0, (c.importe / mx) * 100)}%` })), h('span', { class: 'a' }, fmtEur(c.importe)), h('span', { class: 'p' }, fmtPct(c.pct, 1))));
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Costes por capítulo'), h('p', { class: 'sub' }, 'Total: ' + fmtEur(k.costes) + ' · el detalle está en la pestaña «Costes».'), bars));
  }
  function renderCostes(el) {
    const r = ui.res;
    for (const d of r.detalle) {
      const t = h('table', { class: 't' }, h('thead', {}, h('tr', {}, h('th', {}, 'Partida'), h('th', {}, '% o base'), h('th', {}, 'Importe'))));
      const tb = h('tbody');
      for (const l of d.lineas) tb.append(h('tr', {}, h('td', {}, l.label), h('td', {}, EXPORT.baseTxt(l.base).replace('€/m2', '€/m²')), h('td', { class: cls(l.importe) }, fmtEur(l.importe))));
      tb.append(h('tr', { class: 'tot' }, h('td', {}, 'Total'), h('td', {}, fmtPct(r.kpis.costes ? d.total / r.kpis.costes : 0, 2) + ' del total'), h('td', {}, fmtEur(d.total))));
      t.append(tb);
      el.append(h('div', { class: 'card panel' }, h('h2', {}, d.capitulo), h('p', { class: 'sub' }, CAP_HELP[d.capitulo] || ''), t));
    }
    el.append(h('div', { class: 'card panel' }, h('table', { class: 't' }, h('tbody', {}, h('tr', { class: 'tot' }, h('td', {}, 'Total costes'), h('td', {}, fmtEur(r.kpis.costes))), h('tr', {}, h('td', {}, 'Presupuesto de ejecución material (PEM)'), h('td', {}, fmtEur(r.kpis.pem))), h('tr', {}, h('td', {}, 'Precio del suelo por m² edificable'), h('td', {}, fmtEur(r.kpis.precioSueloM2)))))));
  }
  function renderIngresos(el) {
    const r = ui.res, v = ui.values;
    const t = h('table', { class: 't' }, h('thead', {}, h('tr', {}, h('th', {}, 'Producto'), h('th', {}, 'Unidades'), h('th', {}, 'Importe'), h('th', {}, '% de los ingresos'))));
    const tb = h('tbody'); for (const i of r.ingresos) tb.append(h('tr', {}, h('td', {}, i.label), h('td', {}, fmtNum(i.unidades)), h('td', {}, fmtEur(i.importe)), h('td', {}, fmtPct(r.kpis.ingresos ? i.importe / r.kpis.ingresos : 0, 1))));
    tb.append(h('tr', { class: 'tot' }, h('td', {}, 'Total ingresos'), h('td', {}), h('td', {}, fmtEur(r.kpis.ingresos)), h('td', {}, '100 %')));
    t.append(tb);
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Ingresos por producto'), h('p', { class: 'sub' }, 'Precios sin IVA.'), t));
    const fin = h('table', { class: 't' }, h('tbody', {}, h('tr', {}, h('td', {}, 'Préstamo promotor'), h('td', {}, fmtEur(r.kpis.prestamoPromotor))), h('tr', {}, h('td', {}, 'Préstamo del suelo'), h('td', {}, fmtEur(r.kpis.prestamoSuelo))), h('tr', {}, h('td', {}, 'Capital propio previsto'), h('td', {}, fmtEur(r.kpis.capital)))));
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Financiación'), fin));
    const sales = r.mensual.find((f) => f.label === 'Cobros de las ventas').valores.slice(0, r.ultimoMes);
    const c = h('div', { class: 'chart' });
    el.append(h('div', { class: 'card panel' }, h('h2', {}, 'Cobros de las ventas cada mes'), h('p', { class: 'sub' }, 'Sin IVA: entregas al firmar, mensualidades y cobro en la entrega de llaves.'), c));
    barChart(c, r.meses.slice(0, r.ultimoMes).map((m) => m.fecha), [{ name: 'Cobros de las ventas', values: sales, color: 'var(--s1)' }]);
  }
  function renderFlujo(el) {
    const r = ui.res;
    const seg = h('div', { class: 'seg', style: 'margin-bottom:12px' });
    for (const [id, l] of [['mensual', 'Mes a mes'], ['anual', 'Por años']]) seg.append(h('button', { 'aria-pressed': String(ui.flujo === id), onclick: () => { ui.flujo = id; renderResults(); } }, l));
    el.append(seg, h('p', { class: 'sub' }, 'Pagos: lo que sale (sin IVA y luego con IVA). Cobros: lo que entra, incluidos los préstamos y el IVA que pagan los compradores. Caja: la diferencia de cada mes y el saldo acumulado. Los números negativos, en rojo.'));
    const t = h('table', { class: 'cf' });
    if (ui.flujo === 'mensual') {
      const n = r.ultimoMes;
      t.append(h('thead', {}, h('tr', {}, h('th', {}, 'Importes en euros'), r.meses.slice(0, n).map((m) => h('th', {}, 'Mes ' + m.n, h('br'), h('span', { style: 'font-weight:400;color:var(--ink-3)' }, fmtMonth(m.fecha)))))));
      const tb = h('tbody');
      for (const f of r.mensual) { if (f.seccion) { tb.append(h('tr', { class: 'sec' }, h('td', {}, f.label), h('td', { colspan: n }))); continue; } tb.append(h('tr', { class: f.kind === 'total' ? 'tot' : '' }, h('td', {}, f.label), f.valores.slice(0, n).map((x) => h('td', { class: Math.abs(x) < 0.5 ? 'z' : cls(x) }, Math.abs(x) < 0.5 ? '–' : fmtNum(x))))); }
      t.append(tb);
      el.append(h('div', { class: 'scrollx' }, t), h('p', { class: 'sub', style: 'margin-top:8px' }, `Meses 1 a ${n}. Después no hay movimientos.`));
    } else {
      t.append(h('thead', {}, h('tr', {}, h('th', {}, 'Importes en euros'), r.años.map((a) => h('th', {}, 'Año ' + a.n, h('br'), h('span', { style: 'font-weight:400;color:var(--ink-3)' }, 'desde ' + fmtDate(a.desde)))), h('th', {}, 'Total'))));
      const tb = h('tbody');
      for (const f of r.anual) { if (f.seccion) { tb.append(h('tr', { class: 'sec' }, h('td', {}, f.label), h('td', { colspan: 8 }))); continue; } const tot = f.valores.reduce((a, b) => a + b, f.previo || 0); tb.append(h('tr', { class: f.kind === 'total' ? 'tot' : '' }, h('td', {}, f.label), f.valores.map((x) => h('td', { class: Math.abs(x) < 0.5 ? 'z' : cls(x) }, Math.abs(x) < 0.5 ? '–' : fmtNum(x))), h('td', { class: cls(tot) }, /acumulado/.test(f.label) ? '' : fmtNum(tot)))); }
      t.append(tb);
      el.append(h('div', { class: 'scrollx' }, t));
      el.append(h('div', { class: 'card panel', style: 'margin-top:16px' }, h('table', { class: 't' }, h('tbody', {}, h('tr', {}, h('td', {}, 'TIR del proyecto (sin financiación)'), h('td', {}, fmtPct(r.kpis.tirOperativa, 2))), h('tr', {}, h('td', {}, 'VAN del proyecto al ' + fmtPct(Number(ui.values.tasa_van), 1)), h('td', {}, fmtEur(r.kpis.vanOperativo))), h('tr', {}, h('td', {}, 'TIR con financiación'), h('td', {}, fmtPct(r.kpis.tirFinanciera, 2))), h('tr', {}, h('td', {}, 'VAN con financiación al ' + fmtPct(Number(ui.values.tasa_van), 1)), h('td', {}, fmtEur(r.kpis.vanFinanciero))))), h('p', { class: 'sub', style: 'margin:10px 0 0' }, 'Cada año es un bloque de 12 meses desde la compra del suelo.')));
    }
  }
  function renderNotas(el) {
    const p = promo(), v = ui.values || values();
    const n = h('div', { class: 'notes' });
    if (ui.check) { const w = warnBox(); if (w) n.append(w); }
    const pend = SCHEMA.fields.filter((f) => CALC.visible(f, v) && fieldState(f, p, v) === 'revisar');
    const card1 = h('div', { class: 'card panel' }, h('h2', {}, pend.length ? `Datos por revisar (${pend.length})` : 'Datos por revisar'));
    if (!pend.length) card1.append(h('p', { class: 'sub' }, 'Todos los valores habituales están revisados.'));
    else { const ul = h('ul'); for (const g of SCHEMA.groups) { const fs = pend.filter((f) => f.group === g.id); if (fs.length) ul.append(h('li', {}, h('b', {}, g.title + ': '), fs.map((f, i) => [i ? ', ' : '', h('a', { onclick: () => goField(f.id), style: 'cursor:pointer;text-decoration:underline' }, f.label)]))); } card1.append(h('p', { class: 'sub' }, 'Vienen rellenos con valores habituales del modelo. Compruébalos para esta promoción.'), ul); }
    n.append(card1);
    const dl = h('dl'); for (const [t, x] of NOTAS.correcciones) dl.append(h('dt', {}, t), h('dd', {}, x));
    n.append(h('div', { class: 'card panel' }, h('h2', {}, 'Cambios respecto al Excel original'), h('p', { class: 'sub' }, 'La calculadora repite las fórmulas del Excel. Estos fallos se han corregido:'), dl));
    const ul2 = h('ul'); for (const x of NOTAS.limites) ul2.append(h('li', {}, x));
    n.append(h('div', { class: 'card panel' }, h('h2', {}, 'Cómo calcula'), ul2));
    const ul3 = h('ul'); for (const x of NOTAS.fijos) ul3.append(h('li', {}, x));
    n.append(h('div', { class: 'card panel' }, h('h2', {}, 'Supuestos fijos del modelo'), h('p', { class: 'sub' }, 'Reglas del Excel que no se pueden cambiar desde la calculadora.'), ul3));
    n.append(h('div', { class: 'card panel' }, h('h2', {}, 'Dónde se guardan los datos'), h('p', {}, 'En esta versión de prueba las promociones se guardan solo en este navegador, en este dispositivo. No se envían a ningún sitio. Si borras los datos del navegador o usas otro dispositivo, no estarán. Para guardar una copia, descarga el Excel o el PDF.')));
    el.append(n);
  }

  // ---------------- gráficos ----------------
  function chartBox(el, H = 260) { const W = Math.max(320, el.clientWidth || el.parentElement.clientWidth || 600); return { W, H, m: { l: 64, r: 12, t: 12, b: 28 } }; }
  function ticks(lo, hi, n = 5) { const st = EXPORT.niceStep((hi - lo) / n || 1); const out = []; for (let t = Math.ceil(lo / st) * st; t <= hi + 1e-9; t += st) out.push(Math.abs(t) < 1e-9 ? 0 : t); return out; }
  function svgEl(W, H) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('role', 'img'); return s; }
  const SV = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  function axes(svg, b, lo, hi, labels, X) {
    const { W, H, m } = b; const Y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    for (const t of ticks(lo, hi)) { svg.append(SV('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? 'zero' : 'gridl' })); const tx = SV('text', { x: m.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'axis' }); tx.textContent = fmtMill(t); svg.append(tx); }
    const every = Math.max(1, Math.ceil(labels.length / Math.floor((W - m.l) / 70)));
    labels.forEach((l, i) => { if (i % every) return; const tx = SV('text', { x: X(i), y: H - 8, 'text-anchor': 'middle', class: 'axis' }); tx.textContent = fmtMonth(l); svg.append(tx); });
    return Y;
  }
  function tipAt(el, x, y, html) { let t = $('.tip', el); if (!t) { t = h('div', { class: 'tip' }); el.append(t); } t.innerHTML = html; t.style.display = 'block'; const w = t.offsetWidth; t.style.left = Math.min(el.clientWidth - w - 4, Math.max(4, x + 12)) + 'px'; t.style.top = Math.max(0, y - 40) + 'px'; }
  function lineChart(el, labels, series) {
    const b = chartBox(el); const { W, H, m } = b; const n = labels.length;
    const all = series.flatMap((s) => s.values).concat(0); let lo = Math.min(...all), hi = Math.max(...all); if (hi === lo) hi = lo + 1; const pd = (hi - lo) * 0.06; lo -= pd; hi += pd;
    const X = (i) => m.l + (n === 1 ? 0.5 : i / (n - 1)) * (W - m.l - m.r);
    const svg = svgEl(W, H); const Y = axes(svg, b, lo, hi, labels, X);
    for (const s of series) svg.append(SV('path', { d: s.values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(''), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    const cross = SV('line', { y1: m.t, y2: H - m.b, stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
    const dot = SV('circle', { r: 4.5, fill: series[0].color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(cross, dot);
    const hit = SV('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }); svg.append(hit);
    const move = (ev) => { const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W; const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1)))); cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible'); dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(series[0].values[i])); dot.setAttribute('visibility', 'visible'); tipAt(el, (X(i) / W) * r.width, (Y(series[0].values[i]) / H) * r.height, `<b>Mes ${i + 1} · ${esc(fmtMonthLong(labels[i]))}</b>${series.map((s) => esc(s.name) + ': ' + esc(fmtEur(s.values[i]))).join('<br>')}`); };
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); const t = $('.tip', el); if (t) t.style.display = 'none'; });
    el.innerHTML = ''; el.append(svg);
  }
  function barChart(el, labels, series) {
    const b = chartBox(el, 230); const { W, H, m } = b; const n = labels.length;
    let hi = Math.max(1, ...series.flatMap((s) => s.values)); let lo = Math.min(0, ...series.flatMap((s) => s.values)); hi *= 1.05;
    const bw = (W - m.l - m.r) / n; const X = (i) => m.l + (i + 0.5) * bw;
    const svg = svgEl(W, H); const Y = axes(svg, b, lo, hi, labels, X);
    const k = series.length, gap = 2, inner = Math.max(1, (bw * 0.8 - gap * (k - 1)) / k);
    const hl = SV('rect', { y: m.t, height: H - m.t - m.b, width: bw, fill: 'var(--ink-3)', opacity: 0.08, visibility: 'hidden' }); svg.append(hl);
    series.forEach((s, j) => s.values.forEach((v, i) => { if (Math.abs(v) < 0.5) return; const x = m.l + i * bw + bw * 0.1 + j * (inner + gap); const y0 = Y(0), y1 = Y(v); const hgt = Math.max(1, Math.abs(y1 - y0)); const r = Math.min(3, inner / 2, hgt / 2); svg.append(SV('path', { d: v >= 0 ? `M${x} ${y0}V${y1 + r}q0 -${r} ${r} -${r}h${inner - 2 * r}q${r} 0 ${r} ${r}V${y0}Z` : `M${x} ${y0}V${y1 - r}q0 ${r} ${r} ${r}h${inner - 2 * r}q${r} 0 ${r} -${r}V${y0}Z`, fill: s.color })); }));
    const hit = SV('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }); svg.append(hit);
    const move = (ev) => { const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W; const i = Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / bw))); hl.setAttribute('x', m.l + i * bw); hl.setAttribute('visibility', 'visible'); tipAt(el, ((m.l + (i + 1) * bw) / W) * r.width, ev.clientY - r.top, `<b>Mes ${i + 1} · ${esc(fmtMonthLong(labels[i]))}</b>${series.map((s) => esc(s.name) + ': ' + esc(fmtEur(s.values[i]))).join('<br>')}`); };
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { hl.setAttribute('visibility', 'hidden'); const t = $('.tip', el); if (t) t.style.display = 'none'; });
    el.innerHTML = ''; el.append(svg);
  }

  // ---------------- exportar ----------------
  const slug = (s) => (s || 'promocion').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'promocion';
  function download(bytes, name, type) { const blob = new Blob([bytes], { type }); const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  const payload = () => ({ promo: promo(), values: ui.values, res: ui.res, check: ui.check });
  $('#xlsxBtn').addEventListener('click', () => { if (!ui.res) return; try { download(EXPORT.toXlsx(payload()), slug(promo().nombre) + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); toast('Excel descargado'); } catch (e) { toast('No se ha podido crear el Excel: ' + e.message); } });
  let pdfLib = null;
  function loadPdfLib() { if (window.PDFLib) return Promise.resolve(); if (pdfLib) return pdfLib; pdfLib = new Promise((ok, ko) => { const s = h('script', { src: 'vendor/pdf-lib.min.js' }); s.onload = ok; s.onerror = () => { pdfLib = null; ko(new Error('no se ha podido cargar el generador de PDF')); }; document.head.append(s); }); return pdfLib; }
  $('#pdfBtn').addEventListener('click', async () => { if (!ui.res) return; const b = $('#pdfBtn'); b.disabled = true; try { await loadPdfLib(); download(await EXPORT.toPdf(payload()), slug(promo().nombre) + '.pdf', 'application/pdf'); toast('PDF descargado'); } catch (e) { toast('No se ha podido crear el PDF: ' + e.message); } b.disabled = false; });

  // ---------------- cabecera: biblioteca ----------------
  const sel = $('#promoSel');
  function renderSel() { sel.innerHTML = ''; for (const p of [...lib.promociones].sort((a, b) => b.modificada.localeCompare(a.modificada))) sel.append(h('option', { value: p.id, selected: p.id === lib.activa }, p.nombre)); }
  sel.addEventListener('change', () => { lib.activa = sel.value; saveLib(); openPromo(); });
  const menu = $('#promoMenu');
  $('#promoMenuBtn').addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); $('#promoMenuBtn').setAttribute('aria-expanded', String(menu.classList.contains('open'))); });
  document.addEventListener('click', () => menu.classList.remove('open'));
  $$('.menu-list button', menu).forEach((b) => b.addEventListener('click', async () => {
    menu.classList.remove('open');
    const act = b.dataset.act, p = promo();
    if (act === 'nueva') { openWizard(); return; }
    if (act === 'ejemplo') { const n = await ask('Nueva a partir del ejemplo', 'Nombre de la promoción', 'Ejemplo ' + (lib.promociones.length + 1)); if (!n) return; lib.activa = newPromo(n, EJEMPLO.ejemplo()).id; }
    if (act === 'duplicar') { const n = await ask('Duplicar promoción', 'Nombre de la copia', p.nombre + ' (copia)'); if (!n) return; const c = newPromo(n, JSON.parse(JSON.stringify(p.data))); c.revisados = [...(p.revisados || [])]; lib.activa = c.id; }
    if (act === 'renombrar') { const n = await ask('Cambiar el nombre', 'Nombre de la promoción', p.nombre); if (!n) return; p.nombre = n; }
    if (act === 'borrar') { const ok = await confirmDlg('Borrar promoción', `Se borrará «${p.nombre}» de este navegador. No se puede deshacer.`); if (!ok) return; lib.promociones = lib.promociones.filter((x) => x.id !== p.id); if (!lib.promociones.length) newPromo(EJEMPLO.nombre, EJEMPLO.ejemplo()); lib.activa = lib.promociones[0].id; }
    touchLib(); openPromo();
  }));
  function touchLib() { const p = promo(); if (p) p.modificada = new Date().toISOString(); saveLib(); }
  const dlg = $('#dlg');
  function ask(title, label, def) { return new Promise((res) => { $('#dlgT').textContent = title; const b = $('#dlgB'); b.innerHTML = ''; const i = h('input', { value: def, 'aria-label': label, maxlength: 80 }); b.append(i); $('#dlgOk').textContent = 'Aceptar'; dlg.onclose = () => res(dlg.returnValue === 'ok' && i.value.trim() ? i.value.trim() : null); dlg.returnValue = ''; dlg.showModal(); i.select(); }); }
  function confirmDlg(title, msg) { return new Promise((res) => { $('#dlgT').textContent = title; const b = $('#dlgB'); b.innerHTML = ''; b.append(h('p', {}, msg)); $('#dlgOk').textContent = 'Borrar'; dlg.onclose = () => res(dlg.returnValue === 'ok'); dlg.returnValue = ''; dlg.showModal(); }); }
  function openPromo() { renderSel(); ui.res = null; renderForm(); renderResults(); schedule(0); }

  // ---------------- vista móvil, tema, avisos ----------------
  function syncView() { $$('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === document.body.dataset.view))); if (document.body.dataset.view === 'resultados') renderResults(); }
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { document.body.dataset.view = b.dataset.v; syncView(); window.scrollTo(0, 0); }));
  const themeSw = $('#themeSw');
  const isDark = () => (document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  themeSw.checked = isDark();
  themeSw.addEventListener('change', () => { const t = themeSw.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); store.set('calcpromo.tema', t); });
  let tt; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); }
  const setHdr = () => document.documentElement.style.setProperty('--hdr', $('#hdr').offsetHeight + 'px');
  let rz; window.addEventListener('resize', () => { setHdr(); clearTimeout(rz); rz = setTimeout(() => { if (ui.res && ['resumen', 'ingresos'].includes(ui.tab)) renderResults(); }, 200); });
  window.addEventListener('storage', (e) => { if (e.key === LIBKEY) { loadLib(); if (ui.mode === 'lib') renderLibrary(); else openPromo(); } });
  // Dentro del panel: el modo día/noche lo decide el panel
  if (document.documentElement.classList.contains('embed')) window.addEventListener('storage', (e) => { if (e.key === 'nz-theme' && (e.newValue === 'light' || e.newValue === 'dark')) { document.documentElement.setAttribute('data-theme', e.newValue); themeSw.checked = e.newValue === 'dark'; if (ui.res) renderResults(); } });

  // ================= biblioteca visual y asistente de nueva promoción =================
  const libEl = $('#library');
  ui.mode = 'lib'; ui.libView = store.get('calcpromo.libvista') || 'tarjetas'; ui.libSort = 'modificada'; ui.libQ = '';
  const AVATAR = ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#e87ba4', '#008300', '#eda100', '#e34948'];
  const avatarColor = (id) => { let x = 0; for (const c of id) x = (x * 31 + c.charCodeAt(0)) >>> 0; return AVATAR[x % AVATAR.length]; };
  const initials = (s) => (s || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'ahora mismo'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    if (s < 86400 * 30) { const d = Math.round(s / 86400); return d === 1 ? 'ayer' : 'hace ' + d + ' días'; }
    return fmtDate(iso.slice(0, 10));
  }
  function pendientes(p) { const v = CALC.withDefaults(p.data); let r = 0; for (const f of SCHEMA.fields) if (CALC.visible(f, v) && fieldState(f, p, v) === 'revisar') r++; return r; }
  function summaryOf(res) {
    const k = res.kpis, saldo = res.mensual.find((f) => f.label === 'Saldo acumulado').valores.slice(0, res.ultimoMes);
    return { at: new Date().toISOString(), ingresos: k.ingresos, costes: k.costes, resultado: k.resultado, margen: k.margen, tirO: k.tirOperativa, tirF: k.tirFinanciera, peor: k.peorSaldo, llaves: k.fechas.llaves, compra: k.fechas.compra, saldo: saldo.map((x) => Math.round(x / 1000)) };
  }
  // cálculo en segundo plano de los resúmenes de la biblioteca (y de la vista previa del asistente)
  let bg = null; const bgQueue = []; let bgBusy = false;
  function bgWorker() { if (bg) return bg; try { bg = new Worker('worker.js?' + VERSION); bg.onmessage = bgDone; } catch (e) { bg = null; } return bg; }
  function bgRun(id, data) { bgQueue.push({ id, data }); bgPump(); }
  function bgPump() { if (bgBusy || !bgQueue.length || !bgWorker()) return; bgBusy = true; const j = bgQueue.shift(); bg.postMessage({ id: j.id, data: JSON.parse(JSON.stringify(j.data)) }); }
  function bgDone(e) {
    bgBusy = false;
    const { id, ok, res } = e.data;
    if (String(id).startsWith('s:')) { const p = lib.promociones.find((x) => x.id === id.slice(2)); if (p && ok) { p.resumen = summaryOf(res); saveLib(); if (ui.mode === 'lib') renderLibrary(); } }
    if (String(id).startsWith('w:') && ok && +id.slice(2) === wiz.req) wizPreview(res);
    bgPump();
  }
  function refreshSummaries() {
    for (const p of lib.promociones) {
      if (CALC.check(p.data).missing.length) continue;
      if (!p.resumen || p.resumen.at < p.modificada) if (!bgQueue.some((j) => j.id === 's:' + p.id)) bgRun('s:' + p.id, p.data);
    }
  }

  function setMode(m) {
    ui.mode = m; document.body.dataset.mode = m;
    libEl.hidden = m !== 'lib';
    $('#libBtn').setAttribute('aria-pressed', String(m === 'lib'));
    if (m === 'lib') { renderLibrary(); refreshSummaries(); }
    setHdr(); window.scrollTo(0, 0);
  }
  function openEditor(id) { lib.activa = id; saveLib(); setMode('edit'); openPromo(); }

  function sparkline(vals, w = 220, hgt = 46) {
    const svg = svgEl(w, hgt); svg.setAttribute('class', 'spark'); svg.setAttribute('aria-hidden', 'true');
    if (!vals || vals.length < 2) return svg;
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals) || 1, Y = (v) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (hgt - 6), X = (i) => (i / (vals.length - 1)) * w;
    svg.append(SV('line', { x1: 0, x2: w, y1: Y(0), y2: Y(0), class: 'spark-zero' }));
    const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    svg.append(SV('path', { d: d + `L${w} ${Y(0)}L0 ${Y(0)}Z`, class: 'spark-area' }), SV('path', { d, class: 'spark-line' }));
    return svg;
  }
  function promoCard(p) {
    const ck = CALC.check(p.data), s = p.resumen, falta = ck.missing.length, rev = pendientes(p);
    const fresh = s && s.at >= p.modificada;
    const card = h('article', { class: 'pcard', tabindex: 0, 'aria-label': p.nombre, onclick: (e) => { if (!e.target.closest('.pmenu')) openEditor(p.id); }, onkeydown: (e) => { if (e.key === 'Enter' && e.target === card) openEditor(p.id); } });
    const menuBtn = h('button', { class: 'btn small ghost pmenu-btn', type: 'button', 'aria-label': 'Opciones de ' + p.nombre, onclick: (e) => { e.stopPropagation(); $$('.pmenu.open').forEach((m) => m !== pm && m.classList.remove('open')); pm.classList.toggle('open'); } }, '⋯');
    const pm = h('div', { class: 'pmenu menu' }, menuBtn, h('div', { class: 'menu-list' },
      h('button', { type: 'button', onclick: () => openEditor(p.id) }, 'Abrir'),
      h('button', { type: 'button', onclick: () => libAction('duplicar', p) }, 'Duplicar'),
      h('button', { type: 'button', onclick: () => libAction('renombrar', p) }, 'Cambiar el nombre'),
      h('button', { type: 'button', class: 'danger', onclick: () => libAction('borrar', p) }, 'Borrar')));
    card.append(h('header', {}, h('span', { class: 'avatar', style: 'background:' + avatarColor(p.id) }, initials(p.nombre)), h('div', { class: 'pname' }, h('b', {}, p.nombre), h('span', {}, 'Modificada ' + ago(p.modificada))), pm));
    if (falta) {
      const total = SCHEMA.fields.filter((f) => f.def === null && !f.calc && !f.sync && f.type !== 'salesplan' && f.type !== 'curve').length;
      card.append(h('div', { class: 'pbody empty-state' }, h('div', { class: 'pbig muted' }, 'Sin calcular'), h('div', { class: 'progress', title: 'Datos propios rellenos' }, h('i', { style: `width:${Math.round(((total - falta) / total) * 100)}%` })), h('span', { class: 'chip bad' }, `Faltan ${falta} ${falta === 1 ? 'dato' : 'datos'}`)));
    } else if (!s) {
      card.append(h('div', { class: 'pbody' }, h('div', { class: 'pbig muted' }, 'Calculando…')));
    } else {
      card.append(h('div', { class: 'pbody' + (fresh ? '' : ' stale') },
        h('div', { class: 'plabel' }, 'Resultado'),
        h('div', { class: 'pbig ' + (s.resultado < 0 ? 'neg' : '') }, fmtMill(s.resultado), h('span', { class: 'chip ' + (s.margen >= 0.15 ? 'ok' : s.margen >= 0 ? 'warn' : 'bad') }, fmtPct(s.margen, 1))),
        sparkline(s.saldo),
        h('div', { class: 'pstats' },
          h('div', {}, h('span', {}, 'Ingresos'), h('b', {}, fmtMill(s.ingresos))),
          h('div', {}, h('span', {}, 'TIR proyecto'), h('b', {}, s.tirO === null ? '—' : fmtPct(s.tirO, 1))),
          h('div', {}, h('span', {}, 'Viviendas'), h('b', {}, fmtNum(CALC.withDefaults(p.data).n_viviendas))))));
    }
    card.append(h('footer', {}, s && !falta ? h('span', {}, 'Llaves: ' + fmtMonthLong(s.llaves)) : h('span', {}, 'Creada ' + ago(p.creada)), rev ? h('span', { class: 'chip warn' }, rev + ' por revisar') : h('span', { class: 'chip ok' }, 'Revisada')));
    return card;
  }
  function libSorted() {
    const q = ui.libQ.trim().toLowerCase();
    const list = lib.promociones.filter((p) => !q || p.nombre.toLowerCase().includes(q));
    const key = { modificada: (p) => p.modificada, nombre: (p) => p.nombre.toLowerCase(), resultado: (p) => (p.resumen ? p.resumen.resultado : -Infinity), margen: (p) => (p.resumen ? p.resumen.margen : -Infinity), tir: (p) => (p.resumen && p.resumen.tirO !== null ? p.resumen.tirO : -Infinity) }[ui.libSort];
    return list.sort((a, b) => { const x = key(a), y = key(b); if (ui.libSort === 'nombre') return x.localeCompare(y); return x < y ? 1 : x > y ? -1 : 0; });
  }
  function renderLibrary() {
    const keepFocus = document.activeElement && document.activeElement.id === 'libQ';
    libEl.innerHTML = '';
    const n = lib.promociones.length;
    const seg = h('div', { class: 'seg' }, [['tarjetas', 'Tarjetas'], ['comparar', 'Comparar']].map(([id, l]) => h('button', { type: 'button', 'aria-pressed': String(ui.libView === id), onclick: () => { ui.libView = id; store.set('calcpromo.libvista', id); renderLibrary(); } }, l)));
    const sortSel = h('select', { class: 'libsort', 'aria-label': 'Ordenar', onchange: (e) => { ui.libSort = e.target.value; renderLibrary(); } }, [['modificada', 'Últimas modificadas'], ['nombre', 'Nombre'], ['resultado', 'Mayor resultado'], ['margen', 'Mayor margen'], ['tir', 'Mayor TIR']].map(([v, l]) => h('option', { value: v, selected: ui.libSort === v }, l)));
    const q = h('input', { id: 'libQ', type: 'search', placeholder: 'Buscar por nombre', value: ui.libQ, 'aria-label': 'Buscar promoción', oninput: (e) => { ui.libQ = e.target.value; renderLibrary(); } });
    libEl.append(h('div', { class: 'libhead' },
      h('div', {}, h('h1', {}, 'Mis promociones'), h('p', {}, n === 1 ? '1 promoción guardada en este navegador' : `${n} promociones guardadas en este navegador`)),
      h('button', { class: 'btn primary big', type: 'button', onclick: () => openWizard() }, h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>' }), 'Nueva promoción')));
    libEl.append(h('div', { class: 'libtools' }, q, sortSel, seg));
    const list = libSorted();
    if (ui.libView === 'tarjetas') {
      const grid = h('div', { class: 'pgrid' });
      grid.append(h('button', { class: 'pcard pnew', type: 'button', onclick: () => openWizard() }, h('span', { class: 'plus', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' }), h('b', {}, 'Nueva promoción'), h('span', {}, 'En blanco, desde el ejemplo o copiando una de las tuyas')));
      for (const p of list) grid.append(promoCard(p));
      libEl.append(grid);
      if (!list.length && ui.libQ) libEl.append(h('p', { class: 'empty' }, 'Ninguna promoción se llama así.'));
    } else libEl.append(compareTable(list));
    if (keepFocus) { const i = $('#libQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  function compareTable(list) {
    const cols = [['Promoción', null], ['Viviendas', (p) => fmtNum(CALC.withDefaults(p.data).n_viviendas)], ['Ingresos', (p, s) => fmtEur(s.ingresos)], ['Costes', (p, s) => fmtEur(s.costes)], ['Resultado', (p, s) => fmtEur(s.resultado), (s) => s.resultado < 0], ['Margen', null], ['TIR proyecto', (p, s) => fmtPct(s.tirO, 1)], ['TIR con financiación', (p, s) => fmtPct(s.tirF, 1)], ['Saldo más bajo', (p, s) => fmtEur(s.peor), (s) => s.peor < 0], ['Llaves', (p, s) => fmtMonth(s.llaves)], ['Por revisar', (p) => fmtNum(pendientes(p))]];
    const maxM = Math.max(0.0001, ...list.map((p) => (p.resumen ? Math.abs(p.resumen.margen) : 0)));
    const t = h('table', { class: 'cmp' }, h('thead', {}, h('tr', {}, cols.map(([l]) => h('th', {}, l)))));
    const tb = h('tbody');
    for (const p of list) {
      const s = p.resumen, falta = CALC.check(p.data).missing.length;
      const tr = h('tr', { tabindex: 0, onclick: () => openEditor(p.id), onkeydown: (e) => { if (e.key === 'Enter') openEditor(p.id); } });
      tr.append(h('td', {}, h('span', { class: 'avatar sm', style: 'background:' + avatarColor(p.id) }, initials(p.nombre)), h('b', {}, p.nombre)));
      if (falta || !s) { tr.append(h('td', {}, fmtNum(CALC.withDefaults(p.data).n_viviendas) || '—'), h('td', { colspan: cols.length - 2, class: 'muted' }, falta ? `Faltan ${falta} datos para calcular` : 'Calculando…')); tb.append(tr); continue; }
      for (const [l, fn, negf] of cols.slice(1)) {
        if (l === 'Margen') { tr.append(h('td', {}, h('div', { class: 'mbar' }, h('i', { style: `width:${Math.max(2, Math.round((Math.abs(s.margen) / maxM) * 70))}px;background:${s.margen < 0 ? 'var(--neg)' : 'var(--s1)'}` }), h('span', {}, fmtPct(s.margen, 1))))); continue; }
        tr.append(h('td', { class: negf && negf(s) ? 'neg' : '' }, fn(p, s)));
      }
      tb.append(tr);
    }
    t.append(tb);
    return h('div', { class: 'scrollx cmpwrap' }, t, h('p', { class: 'sub', style: 'padding:8px 12px;margin:0' }, 'Pulsa una fila para abrir la promoción. Las cifras se actualizan al cambiar los datos.'));
  }
  async function libAction(act, p) {
    $$('.pmenu.open').forEach((m) => m.classList.remove('open'));
    if (act === 'duplicar') { const n = await ask('Duplicar promoción', 'Nombre de la copia', p.nombre + ' (copia)'); if (!n) return; const c = newPromo(n, JSON.parse(JSON.stringify(p.data))); c.revisados = [...(p.revisados || [])]; c.resumen = p.resumen; c.resumen = p.resumen ? { ...p.resumen, at: c.modificada } : undefined; }
    if (act === 'renombrar') { const n = await ask('Cambiar el nombre', 'Nombre de la promoción', p.nombre); if (!n) return; p.nombre = n; }
    if (act === 'borrar') { const ok = await confirmDlg('Borrar promoción', `Se borrará «${p.nombre}» de este navegador. No se puede deshacer.`); if (!ok) return; lib.promociones = lib.promociones.filter((x) => x.id !== p.id); if (!lib.promociones.length) newPromo(EJEMPLO.nombre, EJEMPLO.ejemplo()); if (lib.activa === p.id) lib.activa = lib.promociones[0].id; }
    saveLib(); renderSel(); renderLibrary(); refreshSummaries(); toast(act === 'borrar' ? 'Promoción borrada' : act === 'duplicar' ? 'Copia creada' : 'Nombre cambiado');
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.pmenu')) $$('.pmenu.open').forEach((m) => m.classList.remove('open')); });

  // ---------- asistente ----------
  const wizDlg = $('#wiz');
  const wiz = { step: 1, base: 'blank', copyId: null, nombre: '', data: {}, gen: { mes: 3, pct: 25, desde: 4, hasta: 0 }, req: 0, prev: null };
  const WIZ_FIELDS = ['ccaa', 'fecha_compra', 'precio_suelo', 'edif_residencial', 'sup_viviendas', 'n_viviendas', 'precio_m2_viv', 'coste_m2_viv', 'meses_inicio', 'meses_obra'];
  const WIZ_HELP = { ccaa: 'Para los impuestos autonómicos.', fecha_compra: 'Es el mes 1.', precio_suelo: 'Sin IVA ni gastos.', edif_residencial: 'm² de vivienda que permite la normativa.', sup_viviendas: 'm² construidos de todas las viviendas.', n_viviendas: 'Una plaza de garaje y un trastero por vivienda; se cambia después.', precio_m2_viv: 'Precio medio de venta, sin IVA.', coste_m2_viv: 'Precio de la constructora, sin IVA.', meses_inicio: 'Proyecto y licencia.', meses_obra: 'Hasta el certificado final de obra.' };
  function openWizard() {
    Object.assign(wiz, { step: 1, base: 'blank', copyId: null, nombre: 'Promoción ' + (lib.promociones.length + 1), data: {}, gen: { mes: 3, pct: 25, desde: 4, hasta: 0 }, prev: null });
    renderWizard(); wizDlg.showModal();
  }
  function wizBaseData() {
    if (wiz.base === 'example') return EJEMPLO.ejemplo();
    if (wiz.base === 'copy') { const p = lib.promociones.find((x) => x.id === wiz.copyId); return p ? JSON.parse(JSON.stringify(p.data)) : {}; }
    return {};
  }
  function wizLlaves() { const v = CALC.withDefaults(wiz.data); return Number(v.meses_inicio) + Number(v.meses_obra) + Number(v.meses_llaves); }
  function wizPlan() {
    const v = CALC.withDefaults(wiz.data), g = wiz.gen, hasta = g.hasta || Math.max(g.desde, wizLlaves() - 3);
    const o = { preventaMes: g.mes, preventaPct: g.pct / 100, desde: g.desde, hasta };
    const plan = {}; for (const [key, , , u] of SALES) if (Number(v[u]) > 0) plan[key] = CALC.spread(v[u], o);
    return plan;
  }
  function wizFinalData() {
    const d = JSON.parse(JSON.stringify(wiz.data));
    if (wiz.base !== 'copy' || wiz.replan) d.plan_ventas = wizPlan();
    const c = SCHEMA.CCAA.find((x) => x[0] === d.ccaa);
    if (c && (wiz.base !== 'copy' || wiz.ccaaChanged)) { d.pct_ajd_obra_nueva = c[2]; d.pct_ajd_prestamo_suelo = 0; d.pct_ajd_prestamo_promotor = 0; if (Number(CALC.withDefaults(d).vendedor_suelo) !== 1) d.pct_ajd_compra = c[2]; }
    return d;
  }
  function wizSchedulePreview() {
    clearTimeout(wiz.t);
    const miss = CALC.check(wiz.data).missing;
    const box = $('#wizPrev'); if (!box) return;
    if (miss.length) { box.innerHTML = ''; box.append(h('span', { class: 'muted' }, `Rellena ${miss.length === 1 ? 'el dato que falta' : 'los ' + miss.length + ' datos que faltan'} para ver una primera estimación.`)); return; }
    box.classList.add('busy');
    wiz.t = setTimeout(() => { wiz.req++; bgRun('w:' + wiz.req, wizFinalData()); }, 300);
  }
  function wizPreview(res) {
    wiz.prev = res; const box = $('#wizPrev'); if (!box) return; box.classList.remove('busy');
    const k = res.kpis; box.innerHTML = '';
    box.append(h('div', { class: 'wprev-t' }, 'Primera estimación'), h('div', { class: 'wprev-grid' },
      h('div', {}, h('span', {}, 'Ingresos'), h('b', {}, fmtMill(k.ingresos))), h('div', {}, h('span', {}, 'Costes'), h('b', {}, fmtMill(k.costes))),
      h('div', {}, h('span', {}, 'Resultado'), h('b', { class: k.resultado < 0 ? 'neg' : '' }, fmtMill(k.resultado))), h('div', {}, h('span', {}, 'Margen'), h('b', { class: k.margen < 0 ? 'neg' : '' }, fmtPct(k.margen, 1)))),
      h('span', { class: 'muted' }, 'Con los valores habituales en el resto de datos. Luego podrás revisarlos uno a uno.'));
  }
  function wizField(id) {
    const f = FIELDS[id], v = CALC.withDefaults(wiz.data);
    const wrap = h('label', { class: 'wfield' }, h('span', { class: 'wl' }, f.label));
    let ctrl;
    if (f.type === 'select') {
      ctrl = h('select', { onchange: (e) => { const x = typeof f.options[0][0] === 'number' ? Number(e.target.value) : e.target.value; if (x === '' ) delete wiz.data[id]; else wiz.data[id] = x; if (id === 'ccaa') wiz.ccaaChanged = true; if (id === 'meses_inicio' || id === 'meses_obra') wiz.replan = true; wizSchedulePreview(); } }, f.options.map(([val, lab]) => h('option', { value: val, selected: String(v[id] ?? '') === String(val) }, lab)));
    } else if (f.type === 'date') {
      ctrl = h('input', { type: 'date', value: v[id] || '', onchange: (e) => { if (e.target.value) wiz.data[id] = e.target.value; else delete wiz.data[id]; wizSchedulePreview(); } });
    } else {
      ctrl = h('input', { inputmode: 'decimal', value: toInput(f, wiz.data[id] ?? null), placeholder: f.def === null ? 'Obligatorio' : '', onchange: (e) => { const n = parseNum(e.target.value); if (Number.isNaN(n)) { e.target.value = ''; delete wiz.data[id]; } else if (n === null) delete wiz.data[id]; else wiz.data[id] = f.type === 'int' ? Math.round(Math.abs(n)) : Math.abs(n); if (id === 'n_viviendas') wiz.replan = true; e.target.value = toInput(f, wiz.data[id] ?? null); wizSchedulePreview(); } });
    }
    wrap.append(h('span', { class: 'wctrl' + (UNIT[f.type] ? ' has-unit' : '') }, ctrl, UNIT[f.type] ? h('i', {}, UNIT[f.type]) : null), h('span', { class: 'wh' }, WIZ_HELP[id] || ''));
    return wrap;
  }
  function planBars(plan) {
    const v = CALC.withDefaults(wiz.data), viv = plan.viviendas || [], L = wizLlaves(), n = Math.max(L + 1, viv.reduce((m, x, i) => (x > 0 ? i + 1 : m), 0));
    const W = 560, H = 120, bw = W / n, mx = Math.max(1, ...viv.slice(0, n));
    const svg = svgEl(W, H + 34); svg.setAttribute('class', 'wbars');
    const ini = Number(v.meses_inicio) + 1, fin = Number(v.meses_inicio) + Number(v.meses_obra);
    svg.append(SV('rect', { x: (ini - 1) * bw, y: 0, width: (fin - ini + 1) * bw, height: H, class: 'wobra' }));
    for (let i = 0; i < n; i++) { const x = viv[i] || 0; if (x > 0) { const hh = Math.max(2, (x / mx) * (H - 14)); const r = SV('rect', { x: i * bw + bw * 0.15, y: H - hh, width: bw * 0.7, height: hh, rx: Math.min(3, bw * 0.3), class: 'wbar' }); const tt = SV('title', {}); tt.textContent = `Mes ${i + 1}${v.fecha_compra ? ' (' + fmtMonthLong(addMonths(v.fecha_compra, i)) + ')' : ''}: ${fmtNum(x)} ${x === 1 ? 'vivienda' : 'viviendas'}`; r.append(tt); svg.append(r); } }
    svg.append(SV('line', { x1: (L - 0.5) * bw, x2: (L - 0.5) * bw, y1: 0, y2: H, class: 'wllaves' }));
    const lab = (x, t, anchor) => { const e = SV('text', { x, y: H + 16, 'text-anchor': anchor || 'middle', class: 'axis' }); e.textContent = t; svg.append(e); };
    lab(0, 'Mes 1', 'start'); lab(((ini - 1) + (fin - ini + 1) / 2) * bw, 'Obra'); lab(Math.min(W - 2, (L - 0.5) * bw), 'Llaves (mes ' + L + ')', 'end');
    return svg;
  }
  function renderWizard() {
    const b = $('#wizBody'); b.innerHTML = '';
    $$('#wizSteps li').forEach((li, i) => { li.classList.toggle('on', i + 1 === wiz.step); li.classList.toggle('done', i + 1 < wiz.step); });
    $('#wizBack').hidden = wiz.step === 1; $('#wizNext').textContent = wiz.step === 3 ? 'Crear promoción' : 'Siguiente';
    if (wiz.step === 1) {
      const name = h('input', { id: 'wizName', value: wiz.nombre, maxlength: 80, oninput: (e) => { wiz.nombre = e.target.value; } });
      b.append(h('label', { class: 'wfield wide' }, h('span', { class: 'wl' }, 'Nombre de la promoción'), name, h('span', { class: 'wh' }, 'Por ejemplo, la calle o el nombre comercial.')));
      b.append(h('div', { class: 'wl', style: 'margin:14px 0 8px' }, '¿Cómo quieres empezar?'));
      const opts = h('div', { class: 'wopts' });
      const copies = [...lib.promociones].sort((x, y) => y.modificada.localeCompare(x.modificada));
      const opt = (id, icon, t, d, extra) => h('button', { type: 'button', class: 'wopt', 'aria-pressed': String(wiz.base === id), onclick: () => { wiz.base = id; if (id === 'copy' && !wiz.copyId) wiz.copyId = copies[0] && copies[0].id; renderWizard(); } }, h('span', { class: 'wico', html: icon }), h('b', {}, t), h('span', {}, d), extra || null);
      opts.append(
        opt('blank', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>', 'En blanco', 'Con los valores habituales y sin datos de la promoción.'),
        opt('example', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/></svg>', 'Desde el ejemplo', '62 viviendas con datos inventados, para cambiar lo que quieras.'),
        opt('copy', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>', 'Copiar una mía', 'Parte de una promoción que ya tienes.',
          wiz.base === 'copy' ? h('select', { class: 'wcopy', onclick: (e) => e.stopPropagation(), onchange: (e) => { wiz.copyId = e.target.value; } }, copies.map((p) => h('option', { value: p.id, selected: p.id === wiz.copyId }, p.nombre))) : null));
      b.append(opts);
      setTimeout(() => name.focus(), 50);
    } else if (wiz.step === 2) {
      b.append(h('p', { class: 'wintro' }, 'Los datos básicos. Todo lo demás viene con valores habituales marcados para revisar, y lo puedes cambiar después.'));
      const g = h('div', { class: 'wgrid' }); for (const id of WIZ_FIELDS) g.append(wizField(id)); b.append(g);
      b.append(h('div', { class: 'wprev', id: 'wizPrev' })); wizSchedulePreview();
    } else {
      const v = CALC.withDefaults(wiz.data), L = wizLlaves();
      if (!wiz.gen.hasta) wiz.gen.hasta = Math.max(wiz.gen.desde, L - 3);
      if (wiz.base === 'copy' && !wiz.replan) b.append(h('p', { class: 'wintro' }, 'Se mantiene el calendario de ventas de la promoción que copias. Si quieres uno nuevo, cámbialo aquí.', ' ', h('button', { type: 'button', class: 'btn small', onclick: () => { wiz.replan = true; renderWizard(); } }, 'Hacer uno nuevo')));
      else {
        b.append(h('p', { class: 'wintro' }, `¿Cuándo se venden las ${fmtNum(v.n_viviendas)} viviendas? Las plazas y los trasteros siguen el mismo ritmo.`));
        const gi = (k, label, max) => h('label', { class: 'wfield sm' }, h('span', { class: 'wl' }, label), h('span', { class: 'wctrl' + (k === 'pct' ? ' has-unit' : '') }, h('input', { inputmode: 'numeric', value: wiz.gen[k], onchange: (e) => { const x = Math.max(k === 'pct' ? 0 : 1, Math.min(max, Math.round(parseNum(e.target.value) || 0))); wiz.gen[k] = x; renderWizard(); } }), k === 'pct' ? h('i', {}, '%') : null));
        b.append(h('div', { class: 'wgen' }, gi('mes', 'Preventa en el mes', 84), gi('pct', 'Unidades en preventa', 100), gi('desde', 'Resto desde el mes', 84), gi('hasta', 'hasta el mes', 84)));
        const plan = wizPlan();
        b.append(h('div', { class: 'wbarsbox' }, planBars(plan), h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--s1)' }), 'Viviendas vendidas cada mes'), h('span', {}, h('i', { style: 'background:var(--accent-soft);border:1px solid var(--line-2)' }), 'Meses de obra'), h('span', {}, h('i', { style: 'background:var(--s2)' }), 'Entrega de llaves'))));
        if (wiz.gen.hasta >= L) b.append(h('p', { class: 'help' }, 'Hay ventas después de la entrega de llaves: se cobran enteras en el mes de la venta.'));
      }
      b.append(h('div', { class: 'wprev', id: 'wizPrev' })); wizSchedulePreview();
    }
  }
  $('#wizNext').addEventListener('click', (e) => {
    e.preventDefault();
    if (wiz.step === 1) { if (!wiz.nombre.trim()) { toast('Escribe un nombre'); $('#wizName').focus(); return; } wiz.data = wizBaseData(); wiz.replan = false; wiz.ccaaChanged = false; wiz.step = 2; }
    else if (wiz.step === 2) { const miss = CALC.check(wiz.data).missing; if (miss.length) { toast('Faltan: ' + miss.map((f) => f.label.toLowerCase()).join(', ')); return; } wiz.step = 3; }
    else { const src = wiz.base === 'copy' && lib.promociones.find((x) => x.id === wiz.copyId); const p = newPromo(wiz.nombre.trim(), wizFinalData()); if (src) p.revisados = [...(src.revisados || [])]; if (wiz.base === 'example') p.ejemplo = true; saveLib(); wizDlg.close(); openEditor(p.id); toast('Promoción creada. Revisa los datos en amarillo.'); return; }
    renderWizard();
  });
  $('#wizBack').addEventListener('click', (e) => { e.preventDefault(); wiz.step = Math.max(1, wiz.step - 1); renderWizard(); });
  $('#wizClose').addEventListener('click', (e) => { e.preventDefault(); wizDlg.close(); });
  $('#libBtn').addEventListener('click', () => setMode('lib'));

  loadLib(); saveLib(); setHdr(); startWorker(); openPromo(); setMode('lib');
  window.__calc = { ui, lib: () => lib }; // para las pruebas
})();
