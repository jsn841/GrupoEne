// Inmobiliario: bancos (dinero prestado), constructoras (coste por m²) e incidencias con su SLA de resolución.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const GRAV = ['Urgente', 'Alta', 'Media', 'Baja'];
  const num1 = (v) => (v == null || isNaN(v) ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const iso = (d) => d.toISOString().slice(0, 10);
  let M = null;

  // índices y resúmenes que no dependen del filtro
  function prep(o, promos) {
    if (M && M.o === o && M.promos === promos) return M;
    const pr = Object.fromEntries(promos.map((p) => [p.id, p]));
    const cons = Object.fromEntries(o.constructoras.map((c) => [c.id, c.nombre]));
    const banc = Object.fromEntries(o.bancos.map((b) => [b.id, b.nombre]));
    const porViv = {}; o.incidencias.forEach((x) => { porViv[x.vivienda_id] = (porViv[x.vivienda_id] || 0) + 1; });
    M = { o, promos, pr, cons, banc, porViv };
    return M;
  }
  // datos de obra de una promoción, con nombres (para las tablas de todo el panel)
  function infoPromo(id) {
    if (!M) return null;
    const x = M.o.promos[id]; if (!x) return null;
    const inc = M.o.incidencias.filter((i) => i.promo_id === id);
    return { ...x, constructora_n: M.cons[x.constructora], banco_n: M.banc[x.banco], incidencias: inc.length, abiertas: inc.filter((i) => i.estado === 'Abierta').length };
  }
  const resumenInc = (rows) => {
    const cer = rows.filter((x) => x.estado === 'Cerrada');
    return { n: rows.length, abiertas: rows.length - cer.length, sla: rows.length ? rows.filter((x) => x.dentro_sla).length / rows.length : null,
      dias: cer.length ? cer.reduce((t, x) => t + x.dias, 0) / cer.length : null, fuera: rows.filter((x) => x.estado === 'Abierta' && !x.dentro_sla).length };
  };
  const tile = (NZ, t, v, m, cls) => { const el = NZ.el('div', 'nz-tile'); const meta = NZ.el('div', 'nz-meta'); if (m && typeof m === 'object') meta.appendChild(m); else meta.textContent = m || ''; el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big' + (cls ? ' ' + cls : ''), v), meta); return el; };

  function draw(ctx) {
    const { ok, failed, P, setP, NZ } = ctx, C = ctx.C();
    const o = ok('obra'), promos = ok('promociones');
    if (!o || !promos) { ['#ch-banco', '#ch-cons', '#ch-inc-mes'].forEach((s) => failed($(s), 'obra')); return; }
    prep(o, promos);
    const pids = Object.keys(o.promos);

    // ---------- bancos ----------
    const bancos = o.bancos.map((b) => {
      const ps = pids.filter((id) => o.promos[id].banco === b.id).map((id) => ({ id, ...o.promos[id], p: M.pr[id] }));
      const conc = ps.reduce((t, x) => t + x.prestamo_concedido, 0), vivo = ps.reduce((t, x) => t + x.prestamo_vivo, 0);
      const cur = ps.filter((x) => x.p && x.p.estado === 'En curso');
      const disp = cur.reduce((t, x) => t + x.prestamo_dispuesto, 0), concCur = cur.reduce((t, x) => t + x.prestamo_concedido, 0);
      const tipo = conc ? ps.reduce((t, x) => t + x.tipo_interes * x.prestamo_concedido, 0) / conc : null;
      return { id: b.id, banco: b.nombre, promociones: ps.length, en_curso: cur.length, concedido: conc, concedido_curso: concCur, dispuesto: disp, vivo, pct_dispuesto: concCur ? disp / concCur : null, tipo, cuota: 0 };
    });
    const tv = bancos.reduce((t, b) => t + b.vivo, 0), tc = bancos.reduce((t, b) => t + b.concedido, 0), tcc = bancos.reduce((t, b) => t + b.concedido_curso, 0);
    bancos.forEach((b) => (b.cuota = tv ? b.vivo / tv : null));
    const tipoMed = tc ? bancos.reduce((t, b) => t + (b.tipo || 0) * b.concedido, 0) / tc : null;
    const tb = $('#banco-tiles'); tb.replaceChildren();
    tb.append(tile(NZ, 'Deuda viva (en curso)', NZ.eurC(tv), 'lo dispuesto y pendiente de devolver'),
      tile(NZ, 'Concedido en curso', NZ.eurC(tcc), NZ.pct(tcc ? tv / tcc : null, 0) + ' dispuesto'),
      tile(NZ, 'Prestado desde 2016', NZ.eurC(tc), bancos.filter((b) => b.promociones).length + ' bancos'),
      tile(NZ, 'Tipo de interés medio', NZ.pct(tipoMed ? tipoMed / 100 : null, 2), 'ponderado por importe'));
    const bs = bancos.filter((b) => b.promociones).sort((a, z) => z.vivo - a.vivo || z.concedido - a.concedido);
    NZ.cols($('#ch-banco'), bs.map((b) => b.banco), [
      { name: 'Concedido en curso', color: 'var(--cds-chart-muted)', values: bs.map((b) => b.concedido_curso) },
      { name: 'Dispuesto (deuda viva)', color: C[0], values: bs.map((b) => b.vivo) },
    ], { fmtY: NZ.eurC, fmtTip: NZ.eur, xLabel: (x) => x, tipTitle: (x) => x });
    NZ.legend($('#lg-banco'), [{ name: 'Concedido en promociones en curso', color: 'var(--cds-chart-muted)' }, { name: 'Dispuesto (deuda viva)', color: C[0] }]);
    NZ.table($('#t-bancos'), bancos.filter((b) => b.promociones), {
      promociones: { num: true, fmt: NZ.int }, en_curso: { num: true, fmt: NZ.int }, concedido: { num: true, fmt: NZ.eurC }, concedido_curso: { num: true, fmt: NZ.eurC },
      dispuesto: { num: true, fmt: NZ.eurC }, pct_dispuesto: { num: true, fmt: (v) => NZ.pct(v, 0) }, cuota: { num: true, fmt: (v) => NZ.pct(v, 0) }, tipo: { num: true, fmt: (v) => (v == null ? '—' : NZ.pct(v / 100, 2)) },
    }, { key: 'id', sortField: 'concedido' });

    // ---------- constructoras ----------
    const cons = o.constructoras.map((c) => {
      const ids = pids.filter((id) => o.promos[id].constructora === c.id);
      const ps = ids.map((id) => o.promos[id]);
      const m2 = ps.reduce((t, x) => t + x.m2_construidos, 0), coste = ps.reduce((t, x) => t + x.coste_obra, 0);
      const nviv = ids.reduce((t, id) => t + ((M.pr[id] || {}).viviendas || 0), 0);
      const inc = o.incidencias.filter((x) => x.constructora === c.id), R = resumenInc(inc);
      // viviendas que ya pueden tener incidencias (entregadas o en pre-entrega)
      const nvivInc = ids.filter((id) => o.incidencias.some((x) => x.promo_id === id)).reduce((t, id) => t + ((M.pr[id] || {}).viviendas || 0), 0);
      return { id: c.id, constructora: c.nombre, promociones: ids.length, en_curso: ids.filter((id) => (M.pr[id] || {}).estado === 'En curso').length, viviendas: nviv,
        m2, coste, coste_m2: m2 ? coste / m2 : null, incidencias: R.n, por100: nvivInc ? (R.n / nvivInc) * 100 : null, sla: R.sla, dias: R.dias, abiertas: R.abiertas };
    }).filter((c) => c.promociones);
    NZ.hbars($('#ch-cons'), cons.slice().sort((a, z) => z.coste_m2 - a.coste_m2), {
      label: (r) => r.constructora, value: (r) => r.coste_m2, fmt: (v) => NZ.int(v) + ' €/m²', color: () => C[1],
      sub: (r) => ({ text: NZ.int(r.m2) + ' m²' }),
    });
    NZ.hbars($('#ch-cons-inc'), cons.slice().sort((a, z) => (z.por100 || 0) - (a.por100 || 0)), {
      label: (r) => r.constructora, value: (r) => r.por100 || 0, fmt: (v) => num1(v), color: (r) => (r.sla >= 0.8 ? 'var(--color-ok)' : r.sla >= 0.65 ? 'var(--color-warn)' : 'var(--color-bad)'),
      sub: (r) => ({ text: NZ.pct(r.sla, 0) + ' SLA' }),
    });
    NZ.table($('#t-cons'), cons, {
      promociones: { num: true, fmt: NZ.int }, en_curso: { num: true, fmt: NZ.int }, viviendas: { num: true, fmt: NZ.int }, m2: { num: true, fmt: NZ.int },
      coste: { num: true, fmt: NZ.eurC }, coste_m2: { num: true, fmt: (v) => NZ.int(v) + ' €' }, incidencias: { num: true, fmt: NZ.int }, por100: { num: true, fmt: num1 },
      sla: { num: true, render: (td, r) => NZ.chip(td, NZ.pct(r.sla, 0), r.sla >= 0.8 ? 'nz-good' : r.sla >= 0.65 ? 'nz-warn' : 'nz-bad') }, dias: { num: true, fmt: (v) => num1(v) + ' d' }, abiertas: { num: true, fmt: NZ.int },
    }, { key: 'id', sortField: 'coste_m2', onRow: (r) => setP({ inc_cons: P().inc_cons === r.id ? '' : r.id }), active: (r) => r.id === P().inc_cons });

    // ---------- incidencias ----------
    const fc = P().inc_cons || '', fp = P().inc_promo || '';
    const sc = $('#sel-inc-cons'), sp = $('#sel-inc-promo');
    sc.replaceChildren(new Option('Todas las constructoras', ''), ...o.constructoras.filter((c) => cons.some((x) => x.id === c.id)).map((c) => new Option(c.nombre, c.id))); sc.value = fc;
    const conInc = [...new Set(o.incidencias.filter((x) => !fc || x.constructora === fc).map((x) => x.promo_id))];
    sp.replaceChildren(new Option('Todas las promociones', ''), ...conInc.map((id) => new Option((M.pr[id] || {}).promocion || id, id))); sp.value = conInc.includes(fp) ? fp : '';
    const fpv = sp.value;
    const base = o.incidencias.filter((x) => (!fc || x.constructora === fc) && (!fpv || x.promo_id === fpv));
    const { cur, cmp } = PER.periods(), A = iso(cur.a), B = iso(cur.b), A2 = iso(cmp.a), B2 = iso(cmp.b);
    const per = base.filter((x) => x.apertura >= A && x.apertura <= B), ant = base.filter((x) => x.apertura >= A2 && x.apertura <= B2);
    const R = resumenInc(per), R0 = resumenInc(ant), abiertas = base.filter((x) => x.estado === 'Abierta');
    const d = NZ.el('span'); NZ.delta(d, R0.n ? R.n / R0.n - 1 : null, false);
    const ti = $('#inc-tiles'); ti.replaceChildren();
    const fuera = abiertas.filter((x) => !x.dentro_sla).length;
    const mDel = NZ.el('span'); mDel.append(d, document.createTextNode(' frente a ' + PER.cmpShort().toLowerCase()));
    ti.append(tile(NZ, 'Incidencias abiertas en el periodo', NZ.int(R.n), mDel),
      tile(NZ, 'Abiertas ahora', NZ.int(abiertas.length), fuera + ' fuera de plazo', fuera ? 'nz-bad' : ''),
      tile(NZ, 'Resueltas dentro del SLA', NZ.pct(R.sla, 0), PER.cmpShort() + ': ' + NZ.pct(R0.sla, 0)),
      tile(NZ, 'Días medios de resolución', R.dias == null ? '—' : num1(R.dias), PER.cmpShort() + ': ' + num1(R0.dias) + ' días'));
    const ch = PER.chart((a, b) => { const x = iso(a), z = iso(b); return base.filter((i) => i.apertura >= x && i.apertura <= z).length; });
    const ys = ch.series.filter((s) => s.k === 0 || s.values.some((v) => v != null)).reverse().map((s) => ({ name: s.name, color: PER.colorYear(s.k), thin: s.k >= 2, values: s.values }));
    NZ.legend($('#lg-inc-mes'), ys.slice().reverse().map((s) => ({ name: s.name, color: s.color })));
    NZ.lines($('#ch-inc-mes'), ch.xs, ys, { fmtY: NZ.int, fmtTip: (v) => NZ.int(v) + ' incidencias', xLabel: ch.label, tipTitle: ch.tip, height: 200 });
    // por categoría
    const cats = [...new Set(per.map((x) => x.categoria))].map((c) => { const rr = per.filter((x) => x.categoria === c), r = resumenInc(rr); return { c, ...r }; }).sort((a, z) => z.n - a.n);
    NZ.hbars($('#ch-inc-cat'), cats, { label: (r) => r.c, value: (r) => r.n, fmt: NZ.int, color: () => C[3], sub: (r) => ({ text: num1(r.dias) + ' días · ' + NZ.pct(r.sla, 0) + ' SLA', cls: r.sla >= 0.75 ? 'nz-good' : 'nz-bad' }) });
    // SLA por gravedad
    NZ.table($('#t-sla'), GRAV.map((g) => { const rr = per.filter((x) => x.gravedad === g), r = resumenInc(rr); return { id: g, gravedad: g, sla_dias: o.sla[g], n: r.n, dias: r.dias, sla: r.sla, abiertas: abiertas.filter((x) => x.gravedad === g).length }; }), {
      sla_dias: { num: true, fmt: (v) => v + ' días' }, n: { num: true, fmt: NZ.int }, dias: { num: true, fmt: (v) => (v == null ? '—' : num1(v) + ' d') },
      sla: { num: true, render: (td, r) => (r.sla == null ? (td.textContent = '—') : NZ.chip(td, NZ.pct(r.sla, 0), r.sla >= 0.8 ? 'nz-good' : r.sla >= 0.65 ? 'nz-warn' : 'nz-bad')) }, abiertas: { num: true, fmt: NZ.int },
    }, { key: 'id' });
    // por promoción
    const porPromo = [...new Set(base.map((x) => x.promo_id))].map((id) => {
      const rr = per.filter((x) => x.promo_id === id), r = resumenInc(rr), p = M.pr[id] || {}, ab = abiertas.filter((x) => x.promo_id === id).length;
      return { id, promocion: p.promocion, estado: p.estado, constructora: M.cons[o.promos[id].constructora], viviendas: p.viviendas, n: r.n, por_viv: p.viviendas ? r.n / p.viviendas : null, abiertas: ab, sla: r.sla, dias: r.dias };
    }).filter((x) => x.n || x.abiertas);
    NZ.table($('#t-inc-promo'), porPromo, {
      viviendas: { num: true, fmt: NZ.int }, n: { num: true, fmt: NZ.int }, por_viv: { num: true, fmt: (v) => (v == null ? '—' : v.toFixed(2).replace('.', ',')) }, abiertas: { num: true, fmt: NZ.int },
      sla: { num: true, render: (td, r) => (r.sla == null ? (td.textContent = '—') : NZ.chip(td, NZ.pct(r.sla, 0), r.sla >= 0.8 ? 'nz-good' : r.sla >= 0.65 ? 'nz-warn' : 'nz-bad')) }, dias: { num: true, fmt: (v) => (v == null ? '—' : num1(v) + ' d') },
    }, { key: 'id', sortField: 'n', onRow: (r) => setP({ inc_promo: fpv === r.id ? '' : r.id }), active: (r) => r.id === fpv, count: $('#c-inc-promo') });
    // abiertas ahora, de la más antigua a la más reciente
    NZ.table($('#t-inc-abiertas'), abiertas.map((x) => ({ ...x, promocion: (M.pr[x.promo_id] || {}).promocion, constructora_n: M.cons[x.constructora] })), {
      apertura: { fmt: NZ.fecha }, dias: { num: true, fmt: (v) => v + ' d' }, sla_dias: { num: true, fmt: (v) => v + ' d' },
      gravedad: { render: (td, r) => NZ.chip(td, r.gravedad, r.gravedad === 'Urgente' || r.gravedad === 'Alta' ? 'nz-bad' : '') },
      dentro_sla: { render: (td, r) => NZ.chip(td, r.dentro_sla ? 'En plazo' : 'Fuera de plazo', r.dentro_sla ? 'nz-good' : 'nz-bad') },
    }, { key: 'id', sortField: 'dias', count: $('#c-inc-abiertas') });
  }
  function wire(setP) {
    $('#sel-inc-cons').addEventListener('change', (e) => setP({ inc_cons: e.target.value, inc_promo: '' }));
    $('#sel-inc-promo').addEventListener('change', (e) => setP({ inc_promo: e.target.value }));
  }
  window.OBRA = { draw, wire, infoPromo, prep, porVivienda: (id) => (M ? M.porViv[id] || 0 : 0), resumenInc };
})();
