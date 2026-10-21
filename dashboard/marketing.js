// Marketing inmobiliario: calendario de lanzamiento de cada promoción (web, landing, redes…),
// campañas por canal, emails y contactos, con las reservas del sistema de ventas. Sin Salesforce.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DAY = 864e5;
  const dn = (s) => Math.floor(Date.parse(s) / DAY); // número de día (UTC)
  const dd = (d) => Math.floor(+d / DAY);
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fch = (n) => { if (n == null) return '—'; const d = new Date(n * DAY); return d.getUTCDate() + ' ' + MES[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const CLAVE = new Set(['web', 'landing', 'rrss']); // lo imprescindible para lanzar
  const short = (s) => s.replace(/^Residencial /, '').replace(' (nombre provisional)', '');
  let M = null; // datos preparados

  function prep(raw, viv) {
    if (M && M.raw === raw && M.viv === viv) return M;
    const fc = raw.campos_campanas, fe = raw.campos_emails;
    const camp = raw.campanas.map((r) => { const o = {}; fc.forEach((k, i) => (o[k] = r[i])); o.a = dn(o.desde); o.b = dn(o.hasta); o.n = o.b - o.a + 1; o.pid = raw.promociones[o.promo].id; o.can = raw.canales[o.canal]; return o; });
    const mails = raw.emails.map((r) => { const o = {}; fe.forEach((k, i) => (o[k] = r[i])); o.d = dn(o.fecha); o.pid = raw.promociones[o.promo].id; return o; });
    const promos = raw.promociones.map((p) => ({ ...p, l: dn(p.lanzamiento), f: dn(p.fin), tt: p.tareas.map((t) => ({ ...t, p: dn(t.prevista), r: t.real ? dn(t.real) : null })) }));
    const res = {}; // reservas por promoción (días)
    (viv || []).forEach((v) => { if (v.fecha_reserva) (res[v.promo_id] = res[v.promo_id] || []).push(dn(v.fecha_reserva)); });
    const tareas = Object.fromEntries(raw.tareas.map((t) => [t.t, t]));
    const hoy = dn(raw.hoy);
    M = { raw, viv, camp, mails, promos, res, tareas, hoy };
    return M;
  }
  // suma de campañas dentro de [a, b] repartiendo cada registro por días
  const sumCamp = (rows, a, b) => {
    const t = { inversion: 0, impresiones: 0, clics: 0, interacciones: 0, publicaciones: 0, contactos: 0 };
    rows.forEach((r) => {
      const x = Math.max(a, r.a), z = Math.min(b, r.b);
      if (z < x) return;
      const k = (z - x + 1) / r.n;
      for (const f in t) t[f] += r[f] * k;
    });
    return t;
  };
  const sumMail = (rows, a, b) => {
    const t = { n: 0, enviados: 0, aperturas: 0, clics: 0, bajas: 0, contactos: 0 };
    rows.forEach((r) => { if (r.d < a || r.d > b) return; t.n++; for (const f of ['enviados', 'aperturas', 'clics', 'bajas', 'contactos']) t[f] += r[f]; });
    return t;
  };
  const nRes = (pids, a, b) => pids.reduce((t, id) => t + (M.res[id] || []).filter((d) => d >= a && d <= b).length, 0);
  const ratio = (x, y) => (y ? x / y : null);
  const eur0 = (v) => (v == null ? '—' : NZ.eur(Math.round(v)));

  // estado de una tarea respecto a hoy
  const estadoT = (t, hoy) => (t.r != null ? (t.r > t.p + 2 ? 'Hecha con retraso' : 'Hecha') : t.p < hoy ? 'Retrasada' : t.p - hoy <= 7 ? 'Esta semana' : 'Pendiente');
  const CLS = { Hecha: 'nz-good', 'Hecha con retraso': 'nz-warn', Retrasada: 'nz-bad', 'Esta semana': 'nz-warn', Pendiente: '' };

  function draw(ctx) {
    const { ok, failed, P, setP } = ctx, C = ctx.C();
    const raw = ok('marketing');
    const viv = ok('viviendas');
    if (!raw || !window.PER || !PER.ready) {
      ['#mk-proximos', '#ch-mk-gantt', '#ch-mk-leads'].forEach((s) => failed($(s), 'marketing'));
      return;
    }
    prep(raw, viv);
    const hoy = M.hoy;
    const pid = P().mk_promo || '';
    const vista = P().mk_vista || 'abiertas';
    const sel = pid ? M.promos.filter((p) => p.id === pid) : M.promos;
    const pids = sel.map((p) => p.id);
    const camp = M.camp.filter((r) => !pid || r.pid === pid);
    const mails = M.mails.filter((r) => !pid || r.pid === pid);
    const { cur, cmp } = PER.periods();
    const A = dd(cur.a), B = dd(cur.b), A2 = dd(cmp.a), B2 = dd(cmp.b);

    // ---- selector de promoción
    const sp = $('#sel-mk-promo');
    if (!sp._filled) {
      sp._filled = true;
      const grp = (lab, est) => { const g = document.createElement('optgroup'); g.label = lab; M.promos.filter((p) => p.estado === est).forEach((p) => g.appendChild(new Option(short(p.promocion), p.id))); return g; };
      sp.replaceChildren(new Option('Todas las promociones', ''), grp('Próximos lanzamientos', 'Próximo lanzamiento'), grp('En comercialización', 'En comercialización'), grp('Cerradas', 'Cerrada'));
    }
    sp.value = pid;

    // ---- próximos lanzamientos
    const prox = M.promos.filter((p) => p.estado === 'Próximo lanzamiento').sort((a, b) => a.l - b.l);
    const pb = $('#mk-proximos'); pb.replaceChildren(); pb.classList.remove('dash-skeleton');
    prox.forEach((p) => {
      const card = NZ.el('div', 'nz-mkp' + (pid === p.id ? ' nz-on' : ''));
      const falta = p.l - hoy;
      const hechas = p.tt.filter((t) => t.r != null).length;
      const retr = p.tt.filter((t) => t.r == null && t.p < hoy).length;
      const head = NZ.el('div', 'nz-mkp-h');
      head.append(NZ.el('div', 'nz-tl', short(p.promocion)), NZ.el('div', 'nz-big', falta > 0 ? 'en ' + falta + ' días' : 'hoy'));
      const meta = NZ.el('div', 'nz-meta');
      meta.append(NZ.el('span', null, 'Lanzamiento ' + fch(p.l)), NZ.el('span', null, p.viviendas + ' viviendas'));
      const bar = NZ.el('div', 'nz-mkp-bar'); const fill = NZ.el('span'); fill.style.width = (hechas / p.tt.length) * 100 + '%'; fill.style.background = C[0]; bar.appendChild(fill);
      const prog = NZ.el('div', 'nz-mkp-prog', hechas + ' de ' + p.tt.length + ' tareas hechas' + (retr ? ' · ' : ''));
      if (retr) prog.appendChild(NZ.el('b', 'nz-bad', retr + (retr === 1 ? ' retrasada' : ' retrasadas')));
      const ul = NZ.el('ul', 'nz-mkp-list');
      p.tt.filter((t) => t.p <= p.l).forEach((t) => {
        const e = estadoT(t, hoy);
        const li = NZ.el('li', CLAVE.has(t.t) ? 'nz-key' : '');
        const ic = NZ.el('span', 'nz-mkp-ic ' + (CLS[e] || ''), t.r != null ? '✓' : e === 'Retrasada' ? '!' : '○');
        li.append(ic, NZ.el('span', 'nz-mkp-n', M.tareas[t.t].nombre), NZ.el('span', 'nz-mkp-d ' + (CLS[e] || ''), t.r != null ? fch(t.r) : e === 'Retrasada' ? 'era el ' + fch(t.p) : fch(t.p)));
        ul.appendChild(li);
      });
      card.append(head, meta, bar, prog, ul);
      card.tabIndex = 0; card.classList.add('nz-click');
      card.addEventListener('click', () => setP({ mk_promo: pid === p.id ? '' : p.id }));
      pb.appendChild(card);
    });

    // ---- calendario de todas las promociones (Gantt)
    $$('#seg-mk-vista button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === vista)));
    const gp = M.promos.filter((p) => vista === 'todas' || (vista === 'cerradas' ? p.estado === 'Cerrada' : p.estado !== 'Cerrada')).sort((a, b) => a.l - b.l);
    gantt($('#ch-mk-gantt'), gp, C, pid, (p) => setP({ mk_promo: pid === p.id ? '' : p.id }));

    // ---- detalle de tareas de la promoción elegida
    const det = $('#card-mk-tareas');
    const pp = pid ? sel[0] : prox[0];
    $('#h-mk-tareas').textContent = 'Calendario de lanzamiento · ' + short(pp.promocion);
    $('#n-mk-tareas').textContent = (pid ? '' : 'El próximo lanzamiento (elige otra promoción arriba). ') + 'Fecha prevista (círculo vacío) y fecha real (círculo lleno) de cada tarea. La línea marca el día del lanzamiento: ' + fch(pp.l) + '.';
    tareasChart($('#ch-mk-tareas'), pp, C, hoy);
    NZ.table($('#t-mk-tareas'), pp.tt.map((t) => ({ ...t, id: t.t, nombre: M.tareas[t.t].nombre, responsable: M.tareas[t.t].responsable, estado: estadoT(t, hoy), desvio: t.r != null ? t.r - t.p : t.p < hoy ? hoy - t.p : null })), {
      nombre: { render: (td, r) => { td.textContent = r.nombre; if (CLAVE.has(r.t)) td.appendChild(NZ.el('span', 'nz-chip nz-keychip', 'clave')); } },
      p: { num: true, fmt: fch }, r: { num: true, fmt: fch },
      estado: { render: (td, r) => NZ.chip(td, r.estado, CLS[r.estado]) },
      desvio: { num: true, fmt: (v) => (v == null ? '—' : v === 0 ? 'en fecha' : v > 0 ? '+' + v + ' días' : v + ' días') },
    }, { key: 'id', sortField: 'p', sortDir: 1 });
    det.hidden = !pp;

    // ---- KPIs del periodo
    const c1 = sumCamp(camp, A, B), c0 = sumCamp(camp, A2, B2);
    const m1 = sumMail(mails, A, B), m0 = sumMail(mails, A2, B2);
    const r1 = nRes(pids, A, B), r0 = nRes(pids, A2, B2);
    const L1 = c1.contactos + m1.contactos, L0 = c0.contactos + m0.contactos;
    const k = [
      ['Inversión en campañas', NZ.eurC(c1.inversion), ratio(c1.inversion, c0.inversion), false, NZ.eurC(c0.inversion)],
      ['Contactos (leads)', NZ.int(L1), ratio(L1, L0), true, NZ.int(L0)],
      ['Coste por contacto', eur0(ratio(c1.inversion, L1)), ratio(ratio(c1.inversion, L1), ratio(c0.inversion, L0)), false, eur0(ratio(c0.inversion, L0))],
      ['Reservas de vivienda', NZ.int(r1), ratio(r1, r0), true, NZ.int(r0)],
      ['Contactos por reserva', r1 ? NZ.int(L1 / r1) : '—', r1 && r0 ? ratio(L1 / r1, L0 / r0) : null, false, r0 ? NZ.int(L0 / r0) : '—'],
      ['Apertura de emails', NZ.pct(ratio(m1.aperturas, m1.enviados)), null, true, NZ.pct(ratio(m0.aperturas, m0.enviados))],
    ];
    const kt = $('#mk-kpis'); kt.replaceChildren();
    k.forEach(([t, v, d, up, prev]) => {
      const el = NZ.el('div', 'nz-tile');
      const meta = NZ.el('div', 'nz-meta');
      const ds = NZ.el('span'); if (d != null) NZ.delta(ds, d - 1, up); else ds.textContent = '';
      meta.append(ds, NZ.el('span', null, PER.cmpShort() + ': ' + prev));
      el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big', v), meta);
      kt.appendChild(el);
    });
    $('#h-mk-kpis').firstChild.textContent = (pid ? short(sel[0].promocion) : 'Todas las promociones') + ' ';

    // ---- contactos y reservas por mes (años del filtro)
    const ys = (ch) => ch.series.filter((x) => x.k === 0 || x.values.some((v) => v != null)).reverse().map((x) => ({ name: x.name, color: PER.colorYear(x.k), thin: x.k >= 2, values: x.values }));
    const chL = PER.chart((a, b) => { const x = dd(a), z = dd(b); return sumCamp(camp, x, z).contactos + sumMail(mails, x, z).contactos; });
    NZ.lines($('#ch-mk-leads'), chL.xs, ys(chL), { fmtY: NZ.numC, fmtTip: (v) => NZ.int(v) + ' contactos', xLabel: chL.label, tipTitle: chL.tip });
    const chR = PER.chart((a, b) => nRes(pids, dd(a), dd(b)));
    NZ.lines($('#ch-mk-res'), chR.xs, ys(chR), { fmtY: NZ.numC, fmtTip: (v) => NZ.int(v) + ' reservas', xLabel: chR.label, tipTitle: chR.tip, height: 170 });
    NZ.legend($('#lg-mk-leads'), ys(chL).slice().reverse().map((x) => ({ name: x.name, color: x.color })));

    // ---- canales
    const canRows = raw.canales.map((c, i) => {
      const rr = camp.filter((r) => r.canal === i);
      const t = sumCamp(rr, A, B), t0 = sumCamp(rr, A2, B2);
      return { canal: c, i, ...t, ctr: ratio(t.clics, t.impresiones), cpl: c === 'Web y SEO' ? null : ratio(t.inversion, t.contactos), conv: ratio(t.contactos, t.clics), var: t0.contactos ? t.contactos / t0.contactos - 1 : null };
    });
    const em = { canal: 'Email', i: 6, inversion: 0, impresiones: m1.enviados, clics: m1.clics, contactos: m1.contactos, interacciones: 0, publicaciones: 0, ctr: ratio(m1.clics, m1.enviados), cpl: null, conv: ratio(m1.contactos, m1.clics), var: m0.contactos ? m1.contactos / m0.contactos - 1 : null };
    canRows.push(em);
    const totL = canRows.reduce((t, r) => t + r.contactos, 0);
    canRows.forEach((r) => (r.share = ratio(r.contactos, totL)));
    const colCan = (r) => C[r.i % C.length];
    NZ.hbars($('#ch-mk-canal'), canRows.filter((r) => r.contactos > 0).sort((a, b) => b.contactos - a.contactos), {
      label: (r) => r.canal, value: (r) => r.contactos, fmt: (v) => NZ.int(v), color: colCan,
      sub: (r) => ({ text: r.cpl == null ? (r.canal === 'Email' ? 'sin coste' : 'orgánico') : eur0(r.cpl) + '/contacto' }),
    });
    NZ.table($('#t-mk-canal'), canRows, {
      inversion: { num: true, fmt: NZ.eurC }, impresiones: { num: true, fmt: NZ.int }, clics: { num: true, fmt: NZ.int },
      ctr: { num: true, fmt: (v) => NZ.pct(v, 1) }, contactos: { num: true, fmt: NZ.int }, share: { num: true, fmt: (v) => NZ.pct(v) },
      cpl: { num: true, fmt: eur0 }, var: { num: true, render: (td, r) => { if (r.var == null) td.textContent = '—'; else NZ.deltaRender('var')(td, r); } },
    }, { key: 'canal', sortField: 'contactos' });

    // ---- por promoción (periodo)
    const prRows = M.promos.filter((p) => p.l - 60 <= B && p.f >= A).map((p) => {
      const rr = M.camp.filter((r) => r.pid === p.id), mm = M.mails.filter((r) => r.pid === p.id);
      const t = sumCamp(rr, A, B), e = sumMail(mm, A, B), rs = nRes([p.id], A, B);
      const L = t.contactos + e.contactos;
      return { id: p.id, promocion: short(p.promocion), ciudad: p.ciudad, estado: p.estado, inversion: t.inversion, contactos: L, cpl: ratio(t.inversion, L), reservas: rs, conv: ratio(rs, L), cpr: ratio(t.inversion, rs) };
    }).filter((r) => r.inversion > 0 || r.contactos > 0 || r.reservas > 0);
    NZ.table($('#t-mk-promos'), prRows, {
      estado: { render: (td, r) => NZ.chip(td, r.estado, r.estado === 'Próximo lanzamiento' ? 'nz-warn' : r.estado === 'Cerrada' ? '' : 'nz-good') },
      inversion: { num: true, fmt: NZ.eurC }, contactos: { num: true, fmt: NZ.int }, cpl: { num: true, fmt: eur0 },
      reservas: { num: true, fmt: NZ.int }, conv: { num: true, fmt: (v) => NZ.pct(v, 1) }, cpr: { num: true, fmt: eur0 },
    }, { key: 'id', sortField: 'contactos', active: (r) => r.id === pid, onRow: (r) => setP({ mk_promo: r.id === pid ? '' : r.id }), count: $('#c-mk-promos') });

    // ---- emails
    const emRows = mails.filter((r) => r.d >= A && r.d <= B).map((r, i) => ({ id: r.pid + r.fecha + i, d: r.d, promocion: short(M.promos.find((p) => p.id === r.pid).promocion), asunto: r.asunto, enviados: r.enviados, ap: ratio(r.aperturas, r.enviados), cl: ratio(r.clics, r.enviados), bajas: r.bajas, contactos: r.contactos }));
    NZ.table($('#t-mk-emails'), emRows, {
      d: { num: true, fmt: fch }, enviados: { num: true, fmt: NZ.int }, ap: { num: true, fmt: (v) => NZ.pct(v, 1) }, cl: { num: true, fmt: (v) => NZ.pct(v, 1) },
      bajas: { num: true, fmt: NZ.int }, contactos: { num: true, fmt: NZ.int },
    }, { key: 'id', sortField: 'd', count: $('#c-mk-emails') });
    $('#mk-email-sum').textContent = m1.n ? `${NZ.int(m1.n)} envíos · ${NZ.int(m1.enviados)} emails · apertura ${NZ.pct(ratio(m1.aperturas, m1.enviados), 1)} · clics ${NZ.pct(ratio(m1.clics, m1.enviados), 1)} · ${NZ.int(m1.contactos)} contactos` : 'Sin envíos en el periodo.';

    // ---- redes sociales
    const soc = ['Instagram', 'Facebook', 'LinkedIn'];
    const soRows = [];
    sel.forEach((p) => soc.forEach((c) => {
      const ci = raw.canales.indexOf(c);
      const t = sumCamp(M.camp.filter((r) => r.pid === p.id && r.canal === ci), A, B);
      if (t.publicaciones + t.impresiones < 1) return;
      soRows.push({ id: p.id + c, promocion: short(p.promocion), canal: c, publicaciones: t.publicaciones, impresiones: t.impresiones, interacciones: t.interacciones, tasa: ratio(t.interacciones, t.impresiones), clics: t.clics, contactos: t.contactos });
    }));
    NZ.table($('#t-mk-redes'), soRows, {
      publicaciones: { num: true, fmt: (v) => NZ.int(Math.round(v)) }, impresiones: { num: true, fmt: NZ.int }, interacciones: { num: true, fmt: NZ.int },
      tasa: { num: true, fmt: (v) => NZ.pct(v, 1) }, clics: { num: true, fmt: NZ.int }, contactos: { num: true, fmt: NZ.int },
    }, { key: 'id', sortField: 'impresiones', count: $('#c-mk-redes') });

    // ---- histórico de promociones cerradas (toda su vida)
    const hRows = M.promos.filter((p) => p.estado === 'Cerrada').map((p) => {
      const t = sumCamp(M.camp.filter((r) => r.pid === p.id), -1e9, 1e9), e = sumMail(M.mails.filter((r) => r.pid === p.id), -1e9, 1e9);
      const L = t.contactos + e.contactos, rs = (M.res[p.id] || []).length;
      const tt = p.tt.filter((x) => x.t !== 'valla' && x.t !== 'evento');
      return { id: p.id, promocion: short(p.promocion), ciudad: p.ciudad, l: p.l, meses: Math.max(1, Math.round((p.f - p.l) / 30.4)), viviendas: p.viviendas, inversion: t.inversion, contactos: L, cpl: ratio(t.inversion, L), cpv: ratio(t.inversion, rs), puntual: ratio(tt.filter((x) => x.r != null && x.r <= x.p + 2).length, tt.length) };
    });
    NZ.table($('#t-mk-hist'), hRows, {
      l: { num: true, fmt: fch }, meses: { num: true, fmt: (v) => v + ' meses' }, viviendas: { num: true, fmt: NZ.int },
      inversion: { num: true, fmt: NZ.eurC }, contactos: { num: true, fmt: NZ.int }, cpl: { num: true, fmt: eur0 }, cpv: { num: true, fmt: eur0 },
      puntual: { num: true, fmt: (v) => NZ.pct(v) },
    }, { key: 'id', sortField: 'l', active: (r) => r.id === pid, onRow: (r) => setP({ mk_promo: r.id === pid ? '' : r.id }), count: $('#c-mk-hist') });
    const hi = hRows.reduce((t, r) => ({ inv: t.inv + r.inversion, viv: t.viv + r.viviendas, L: t.L + r.contactos }), { inv: 0, viv: 0, L: 0 });
    $('#mk-hist-sum').textContent = `${hRows.length} promociones cerradas · ${NZ.int(hi.viv)} viviendas · ${NZ.eurC(hi.inv)} invertidos · ${eur0(hi.inv / hi.viv)} de marketing por vivienda vendida · ${NZ.int(hi.L / hi.viv)} contactos por vivienda.`;
  }

  // ---- Gantt de promociones: preparación (desde la primera tarea) y comercialización
  function gantt(box, rows, C, pid, onClick) {
    NZ.clear(box); box.classList.remove('dash-skeleton');
    if (!rows.length) { box.appendChild(NZ.el('div', 'nz-empty', 'Sin promociones')); return; }
    const W = Math.max(320, box.clientWidth || 800), narrow = W < 640;
    const lw = narrow ? 120 : 210, rh = 24, top = 36, H = top + rows.length * rh + 6;
    const start = d3.min(rows, (p) => d3.min(p.tt, (t) => t.p)) - 15, end = Math.max(M.hoy + 75, d3.max(rows, (p) => p.f)) + 10;
    const x = d3.scaleUtc().domain([new Date(start * DAY), new Date(end * DAY)]).range([lw, W - 10]);
    const svg = d3.select(box).append('svg').attr('width', W).attr('height', H).attr('class', 'nz-svg nz-gantt').attr('role', 'img').attr('aria-label', 'Calendario de promociones');
    const ticks = x.ticks(narrow ? 4 : 8);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top - 4).attr('y2', H).attr('class', 'nz-grid');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', 12).attr('text-anchor', 'middle').attr('class', 'nz-tick').text((d) => (d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MES[d.getUTCMonth()] + (ticks.length < 6 ? ' ' + String(d.getUTCFullYear()).slice(2) : '')));
    const tip = NZ.tip(box);
    const col = (p) => (p.estado === 'Cerrada' ? 'var(--cds-chart-muted)' : p.estado === 'Próximo lanzamiento' ? C[3] : C[0]);
    rows.forEach((p, i) => {
      const y = top + i * rh;
      const g = svg.append('g').attr('class', 'nz-click' + (p.id === pid ? ' nz-gsel' : '')).style('cursor', 'pointer');
      g.append('rect').attr('x', 0).attr('y', y).attr('width', W).attr('height', rh).attr('class', 'nz-grow');
      const nm = short(p.promocion);
      g.append('text').attr('x', 4).attr('y', y + rh / 2 + 4).attr('class', 'nz-glab').text(narrow && nm.length > 16 ? nm.slice(0, 15) + '…' : nm);
      const p0 = d3.min(p.tt, (t) => t.p);
      g.append('rect').attr('x', x(new Date(p0 * DAY))).attr('y', y + 8).attr('width', Math.max(2, x(new Date(p.l * DAY)) - x(new Date(p0 * DAY)))).attr('height', rh - 16).attr('rx', 3).style('fill', col(p)).style('opacity', 0.35);
      if (p.estado !== 'Próximo lanzamiento') g.append('rect').attr('x', x(new Date(p.l * DAY))).attr('y', y + 6).attr('width', Math.max(2, x(new Date(p.f * DAY)) - x(new Date(p.l * DAY)))).attr('height', rh - 12).attr('rx', 3).style('fill', col(p));
      g.append('path').attr('d', d3.symbol(d3.symbolDiamond, 60)()).attr('transform', `translate(${x(new Date(p.l * DAY))},${y + rh / 2})`).style('fill', col(p)).style('stroke', 'var(--color-panel)').style('stroke-width', 1.5);
      const retr = p.tt.filter((t) => t.r == null && t.p < M.hoy).length;
      g.on('mousemove', (ev) => tip.show(ev, [p.promocion, p.estado, 'Lanzamiento: ' + fch(p.l), p.estado === 'Cerrada' ? 'Última reserva: ' + fch(p.f) : p.estado === 'En comercialización' ? 'En venta desde hace ' + Math.round((M.hoy - p.l) / 30.4) + ' meses' : 'Faltan ' + (p.l - M.hoy) + ' días' + (retr ? ' · ' + retr + ' tareas retrasadas' : ''), p.viviendas + ' viviendas']))
        .on('mouseleave', () => tip.hide()).on('click', () => onClick(p));
    });
    const xh = x(new Date(M.hoy * DAY));
    svg.append('line').attr('x1', xh).attr('x2', xh).attr('y1', top - 2).attr('y2', H).attr('class', 'nz-today');
    svg.append('text').attr('x', xh + 3).attr('y', top - 6).attr('class', 'nz-tick nz-today-t').text('hoy');
  }

  // ---- tareas de una promoción: prevista (vacío) y real (lleno)
  function tareasChart(box, p, C, hoy) {
    NZ.clear(box); box.classList.remove('dash-skeleton');
    const W = Math.max(320, box.clientWidth || 800), narrow = W < 640;
    const lw = narrow ? 130 : 290, rh = 22, top = 36, H = top + p.tt.length * rh + 6;
    const ds = p.tt.flatMap((t) => [t.p, t.r]).filter((v) => v != null).concat(p.estado === 'Próximo lanzamiento' ? [p.l, hoy] : [p.l]);
    const x = d3.scaleUtc().domain([new Date((d3.min(ds) - 5) * DAY), new Date((d3.max(ds) + 5) * DAY)]).range([lw, W - 14]);
    const svg = d3.select(box).append('svg').attr('width', W).attr('height', H).attr('class', 'nz-svg nz-gantt');
    const ticks = x.ticks(narrow ? 4 : 7);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top - 4).attr('y2', H).attr('class', 'nz-grid');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', 12).attr('text-anchor', 'middle').attr('class', 'nz-tick').text((d) => (d.getUTCDate() === 1 && d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : d.getUTCDate() + ' ' + MES[d.getUTCMonth()]));
    const tip = NZ.tip(box);
    const X = (n) => x(new Date(n * DAY));
    p.tt.slice().sort((a, b) => a.p - b.p).forEach((t, i) => {
      const y = top + i * rh + rh / 2, e = estadoT(t, hoy);
      const c = e === 'Retrasada' ? 'var(--color-bad)' : e === 'Hecha con retraso' ? 'var(--color-warn)' : C[0];
      const g = svg.append('g');
      g.append('rect').attr('x', 0).attr('y', y - rh / 2).attr('width', W).attr('height', rh).attr('class', 'nz-grow');
      const nm = M.tareas[t.t].nombre;
      g.append('text').attr('x', 4).attr('y', y + 4).attr('class', 'nz-glab' + (CLAVE.has(t.t) ? ' nz-glab-key' : '')).text(narrow && nm.length > 18 ? nm.slice(0, 17) + '…' : nm);
      const end = t.r != null ? t.r : t.p < hoy ? hoy : null;
      if (end != null && end !== t.p) g.append('line').attr('x1', X(t.p)).attr('x2', X(end)).attr('y1', y).attr('y2', y).style('stroke', c).style('stroke-width', 2).style('stroke-dasharray', t.r == null ? '3 3' : null);
      g.append('circle').attr('cx', X(t.p)).attr('cy', y).attr('r', 5).style('fill', 'var(--color-panel)').style('stroke', c).style('stroke-width', 1.8);
      if (t.r != null) g.append('circle').attr('cx', X(t.r)).attr('cy', y).attr('r', 5).style('fill', c);
      g.on('mousemove', (ev) => tip.show(ev, [nm, 'Responsable: ' + M.tareas[t.t].responsable, 'Prevista: ' + fch(t.p), 'Real: ' + (t.r != null ? fch(t.r) : 'sin hacer'), e]))
        .on('mouseleave', () => tip.hide());
    });
    svg.append('line').attr('x1', X(p.l)).attr('x2', X(p.l)).attr('y1', top - 2).attr('y2', H).attr('class', 'nz-launch').style('stroke', C[1]);
    svg.append('text').attr('x', X(p.l) + 3).attr('y', top - 6).attr('class', 'nz-tick').text('lanzamiento');
    if (hoy >= x.domain()[0] / DAY && hoy <= x.domain()[1] / DAY) {
      svg.append('line').attr('x1', X(hoy)).attr('x2', X(hoy)).attr('y1', top - 2).attr('y2', H).attr('class', 'nz-today');
    }
  }

  function wire(setP) {
    $('#sel-mk-promo').addEventListener('change', (e) => setP({ mk_promo: e.target.value }));
    $$('#seg-mk-vista button').forEach((b) => b.addEventListener('click', () => setP({ mk_vista: b.dataset.v })));
  }
  window.MKT = { draw, wire };
})();
