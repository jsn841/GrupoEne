// Consumos del balneario por tipo (spa, comida, bebida y punto de venta): reparto, más y menos vendidos,
// margen y cuándo se consume (día de la semana × hora) con recomendaciones para stock, turnos y ofertas.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const FAM = ['Spa', 'Comida', 'Bebida', 'Punto de venta'];
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DIAS_C = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const UNIDAD = { Spa: 'servicios', Comida: 'platos', Bebida: 'bebidas', 'Punto de venta': 'artículos', Todo: 'unidades' };
  const famColor = (C, f) => ({ Spa: C[4], Comida: C[1], Bebida: C[0], 'Punto de venta': C[3] }[f] || C[5]);
  const residual = (r) => /^(Resto|Otros)/.test(r.producto) || r.precio_fuente === 'Precio medio estimado';
  const hh = (h) => String(h % 24).padStart(2, '0') + ':00';

  function draw(ctx) {
    const { ok, failed, P, setP, NZ } = ctx, C = ctx.C();
    const hp = ok('hotel_productos');
    if (!hp) { ['#ch-cons-local', '#ch-cons-top', '#ch-cons-bottom', '#ch-cons-mtop', '#ch-cons-mbottom', '#ch-cons-heat'].forEach((s) => failed($(s), 'hotel_productos')); return; }
    const h = P().hotel || 'Total';
    const scope = hp.filter((r) => h === 'Total' || r.ubicacion === h);
    const locales = [...new Set(scope.map((r) => r.punto))].sort((a, b) => scope.filter((r) => r.punto === b).reduce((t, r) => t + r.ingresos, 0) - scope.filter((r) => r.punto === a).reduce((t, r) => t + r.ingresos, 0));
    let local = P().cons_local || ''; if (local && !locales.includes(local)) local = '';
    const fam = P().cons_fam || 'Todo', medida = P().cons_medida || 'unidades';
    let cuando = P().cons_cuando || 'Bebida';

    // ---- fichas por tipo
    const tiles = $('#cons-tiles'); tiles.replaceChildren();
    const tot = scope.reduce((t, r) => t + r.ingresos, 0);
    FAM.forEach((f) => {
      const rr = scope.filter((r) => r.familia === f);
      const ing = rr.reduce((t, r) => t + r.ingresos, 0), ant = rr.reduce((t, r) => t + (r.ingresos_ant || 0), 0), bb = rr.reduce((t, r) => t + r.beneficio, 0);
      const t = NZ.el('div', 'nz-tile nz-click' + (fam === f ? ' nz-on' : ''));
      t.tabIndex = 0; t.style.borderTop = `3px solid ${famColor(C, f)}`;
      t.addEventListener('click', () => setP({ cons_fam: fam === f ? 'Todo' : f }));
      const meta = NZ.el('div', 'nz-meta');
      const d = NZ.el('span'); NZ.delta(d, ant ? ing / ant - 1 : null);
      meta.append(NZ.el('span', null, NZ.pct(tot ? ing / tot : null) + ' del total'), d, NZ.el('span', null, 'margen ' + NZ.pct(ing ? bb / ing : null)));
      t.append(NZ.el('div', 'nz-tl', f), NZ.el('div', 'nz-big', NZ.eurC(ing)), meta);
      tiles.appendChild(t);
    });

    // ---- qué se consume en cada local
    const cells = [];
    locales.forEach((l) => FAM.forEach((f) => { const v = scope.filter((r) => r.punto === l && r.familia === f).reduce((t, r) => t + r.ingresos, 0); if (v) cells.push({ l, f, v }); }));
    NZ.heat($('#ch-cons-local'), cells, { row: (r) => r.l, col: (r) => r.f, value: (r) => r.v, rows: locales, cols: FAM, corner: 'Local', fmt: NZ.eur, color: C[0] });

    // ---- controles
    $$('#seg-fam button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === fam)));
    $$('#seg-medida button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === medida)));
    const sel = $('#sel-cons-local');
    sel.replaceChildren(new Option(h === 'Total' ? 'Todos los locales' : 'Todos los locales de este hotel', ''), ...locales.map((l) => new Option(l, l)));
    sel.value = local;

    // ---- más y menos vendidos, margen
    const rows = scope.filter((r) => (fam === 'Todo' || r.familia === fam) && (!local || r.punto === local) && !residual(r) && r.ingresos > 0);
    const val = (r) => (medida === 'ingresos' ? r.ingresos : r.unidades);
    const fmtV = medida === 'ingresos' ? NZ.eurC : (v) => NZ.int(v) + ' u.';
    const label = (r) => r.producto + (local ? '' : ' · ' + r.punto);
    const varOf = (r) => (medida === 'ingresos' ? (r.ingresos_ant ? r.ingresos / r.ingresos_ant - 1 : null) : r.variacion);
    const sub = (r) => { const v = varOf(r); return { text: NZ.dpct(v), cls: v > 0 ? 'nz-good' : v < 0 ? 'nz-bad' : '' }; };
    const color = (r) => famColor(C, r.familia);
    const que = fam === 'Todo' ? 'productos' : fam === 'Spa' ? 'servicios del spa' : fam === 'Punto de venta' ? 'artículos de la tienda' : fam === 'Comida' ? 'platos' : 'bebidas';
    $('#h-cons-top').textContent = `${que[0].toUpperCase() + que.slice(1)} más vendidos`;
    $('#h-cons-bottom').textContent = `${que[0].toUpperCase() + que.slice(1)} menos vendidos`;
    NZ.hbars($('#ch-cons-top'), rows.slice().sort((a, b) => val(b) - val(a)).slice(0, 10), { label, value: val, fmt: fmtV, color, sub });
    NZ.hbars($('#ch-cons-bottom'), rows.slice().sort((a, b) => val(a) - val(b)).slice(0, 10), { label, value: val, fmt: fmtV, color, sub });
    const msub = (r) => ({ text: NZ.eurC(r.beneficio) });
    NZ.hbars($('#ch-cons-mtop'), rows.slice().sort((a, b) => b.margen - a.margen).slice(0, 10), { label, value: (r) => Math.max(0, r.margen), fmt: (v) => NZ.pct(v), color, sub: msub });
    NZ.hbars($('#ch-cons-mbottom'), rows.slice().sort((a, b) => a.margen - b.margen).slice(0, 10), { label, value: (r) => Math.max(0, r.margen), fmt: (v) => NZ.pct(v), color, sub: msub });

    // ---- cuándo se consume
    const famsHere = FAM.filter((f) => scope.some((r) => r.familia === f && (!local || r.punto === local)));
    if (!famsHere.includes(cuando)) cuando = famsHere[0] || 'Bebida';
    $$('#seg-cuando button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.v === cuando)); b.disabled = !famsHere.includes(b.dataset.v); });
    const M = Array.from({ length: 7 }, () => new Array(24).fill(0));
    let total = 0;
    const outs = (local ? [local] : locales);
    outs.forEach((l) => {
      const u = scope.filter((r) => r.punto === l && r.familia === cuando).reduce((t, r) => t + (r.unidades || 0), 0);
      const pf = PER.perfil(l, cuando), pd = PER.pesoDia(l);
      if (!u || !pf || !pd) return;
      const sd = pd.reduce((a, b) => a + b, 0);
      for (let d = 0; d < 7; d++) for (let k = 0; k < 24; k++) { const x = u * (pd[d] / sd) * pf[d][k]; M[d][k] += x; total += x; }
    });
    const unidad = UNIDAD[cuando];
    $('#h-cons-cuando').textContent = `Cuándo se consume · ${cuando}${local ? ' · ' + local : h === 'Total' ? ' · todo el balneario' : ' · ' + h}`;
    $('#n-cons-cuando').textContent = `${unidad[0].toUpperCase() + unidad.slice(1)} por día de la semana y hora en el periodo elegido (${NZ.int(total)} en total). Sirve para planificar stock, turnos y ofertas.`;
    // horas con actividad, empezando de madrugada al final (6 h → 5 h)
    const order = [...Array(24).keys()].map((k) => (k + 6) % 24).filter((k) => M.some((r) => r[k] > total * 0.0005));
    const heat = [];
    for (let d = 0; d < 7; d++) for (const k of order) if (M[d][k] > 0) heat.push({ d: DIAS[d], h: hh(k).slice(0, 2) + ' h', v: M[d][k] });
    NZ.heat($('#ch-cons-heat'), heat, { row: (r) => r.d, col: (r) => r.h, value: (r) => r.v, rows: DIAS, cols: order.map((k) => hh(k).slice(0, 2) + ' h'), corner: 'Día', unit: ' ' + unidad, color: famColor(C, cuando) });
    const porDia = M.map((r) => r.reduce((a, b) => a + b, 0));
    const porHora = [...Array(24).keys()].map((k) => M.reduce((t, r) => t + r[k], 0));
    NZ.cols($('#ch-cons-dia'), DIAS_C, [{ name: cuando, color: famColor(C, cuando), values: porDia }], { fmtY: NZ.numC, fmtTip: (v) => NZ.int(v) + ' ' + unidad, xLabel: (x) => x, height: 170, tipTitle: (x) => DIAS[DIAS_C.indexOf(x)] });
    NZ.cols($('#ch-cons-hora'), order.map((k) => hh(k).slice(0, 2)), [{ name: cuando, color: famColor(C, cuando), values: order.map((k) => porHora[k]) }], { fmtY: NZ.numC, fmtTip: (v) => NZ.int(v) + ' ' + unidad, xLabel: (x) => x + 'h', height: 170, tipTitle: (x) => `De ${x}:00 a ${String((+x + 1) % 24).padStart(2, '0')}:00` });

    // ---- recomendaciones
    const box = $('#cons-insights'); box.replaceChildren();
    if (!total) { box.appendChild(NZ.el('p', 'nz-note', 'Sin ventas de este tipo en el periodo.')); return; }
    const slots = []; for (let d = 0; d < 7; d++) for (const k of order) slots.push({ d, k, v: M[d][k] });
    const open = slots.filter((s) => s.v > 0);
    const top = open.slice().sort((a, b) => b.v - a.v);
    const pct = (v) => NZ.pct(v / total, 1);
    // franjas de 3 horas para recomendar refuerzos y ofertas
    const blocks = [];
    for (let d = 0; d < 7; d++) for (let i = 0; i + 2 < order.length; i++) { const ks = order.slice(i, i + 3); if (ks[2] !== (ks[0] + 2) % 24) continue; const v = ks.reduce((t, k) => t + M[d][k], 0); if (ks.every((k) => M[d][k] > 0)) blocks.push({ d, a: ks[0], b: (ks[2] + 1) % 24, v }); }
    const bTop = blocks.slice().sort((a, b) => b.v - a.v)[0];
    const bLow = blocks.filter((b) => b.d <= 3).sort((a, b) => a.v - b.v)[0];
    const finde = (porDia[4] + porDia[5] + porDia[6]) / total;
    const pico3 = top.slice(0, 3).map((s) => `${DIAS[s.d].toLowerCase()} de ${hh(s.k)} a ${hh(s.k + 1)}`);
    const media = total / open.length;
    const items = [
      ['Picos', `Las horas con más ${unidad}: ${pico3.join('; ')}. En la hora punta se vende ${NZ.int(top[0].v / media * 10) / 10 > 1 ? (top[0].v / media).toFixed(1).replace('.', ',') + ' veces' : 'lo mismo que'} la media de las horas abiertas.`],
      ['Personal', bTop ? `Refuerza el turno del ${DIAS[bTop.d].toLowerCase()} de ${hh(bTop.a)} a ${hh(bTop.b)}: en esas tres horas se concentra el ${pct(bTop.v)} de todas las ${unidad} de la semana.` : ''],
      ['Stock', `De viernes a domingo se vende el ${NZ.pct(finde, 0)} de la semana. ${cuando === 'Spa' ? 'Ajusta cabinas y terapeutas' : 'Cierra el pedido a proveedores el jueves'} para llegar con ${cuando === 'Spa' ? 'disponibilidad' : 'existencias'} al pico del ${DIAS[porDia.indexOf(Math.max(...porDia))].toLowerCase()}.`],
      ['Ofertas', bLow ? `La franja más floja con el local abierto es el ${DIAS[bLow.d].toLowerCase()} de ${hh(bLow.a)} a ${hh(bLow.b)} (${pct(bLow.v)} de la semana): buen momento para ${cuando === 'Bebida' ? 'una hora feliz o un 2×1' : cuando === 'Spa' ? 'tarifas de tarde entre semana' : cuando === 'Comida' ? 'un menú o una tapa de tarde' : 'una promoción en recepción'}, o para reducir personal.` : ''],
    ].filter((x) => x[1]);
    const ul = NZ.el('ul', 'nz-ins');
    items.forEach(([t, x]) => { const li = NZ.el('li'); li.append(NZ.el('b', null, t + ': '), document.createTextNode(x)); ul.appendChild(li); });
    box.append(NZ.el('h4', 'nz-h4', 'Qué hacer con estos datos'), ul, NZ.el('p', 'nz-note', 'El reparto por hora sale del perfil de cada local (la hora de cada ticket en la caja). Con datos reales, cada celda serían los tickets cobrados en esa hora.'));
  }
  function wire(setP) {
    $$('#seg-fam button').forEach((b) => b.addEventListener('click', () => setP({ cons_fam: b.dataset.v })));
    $$('#seg-medida button').forEach((b) => b.addEventListener('click', () => setP({ cons_medida: b.dataset.v })));
    $$('#seg-cuando button').forEach((b) => b.addEventListener('click', () => setP({ cons_cuando: b.dataset.v })));
    $('#sel-cons-local').addEventListener('change', (e) => setP({ cons_local: e.target.value }));
  }
  window.CONS = { draw, wire };
})();
