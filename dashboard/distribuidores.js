// Bodegas · vista por distribuidor: mapa de actuación a la izquierda y ficha del distribuidor a la derecha.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BOD = ['Enate', 'Laus', 'Las Moradas de San Martín'];
  const CAN = ['Hostelería', 'Tiendas especializadas', 'Supermercados'];
  const ratio = (x, y) => (y ? x / y : null);
  const varr = (x, y) => (y ? x / y - 1 : null);

  function draw(ctx) {
    const { ok, failed, P, setP, NZ } = ctx, C = ctx.C();
    const geo = ok('provincias');
    if (!window.PER || !PER.ready || !PER.distInfo()) { failed($('#ch-dist-mapa'), 'series'); return; }
    const DS = PER.distInfo(), items = DS.items, refsI = PER.refItems();
    const bsel = P().dist_bodega || 'Todas', bi = bsel === 'Todas' ? null : BOD.indexOf(bsel);
    const medida = P().dist_medida || 'facturacion';
    const { cur, cmp } = PER.periods();
    const d1 = PER.dist(cur.a, cur.b, bi), d0 = PER.dist(cmp.a, cmp.b, bi);
    const tot1 = d1.reduce((t, x) => t + x.fa, 0), tot0 = d0.reduce((t, x) => t + x.fa, 0);
    let di = items.findIndex((x) => x.id === P().dist_id);
    if (di < 0) di = d1.reduce((m, x, i) => (x.fa > d1[m].fa ? i : m), 0);
    const it = items[di], x1 = d1[di], x0 = d0[di];
    const puntos = (x) => x.can.reduce((t, v, i) => t + v / DS.gasto_cliente[i], 0) * Math.max(1, 365 / Math.max(1, PER.days(cur.a, cur.b)));

    $$('#seg-dbodega button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === bsel)));
    $$('#seg-dmedida button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === medida)));
    const sel = $('#sel-dist');
    if (!sel._filled) { sel._filled = true; sel.replaceChildren(...items.map((x, i) => new Option(x.nombre + ' · ' + x.sede, x.id))); }
    sel.value = it.id;

    // ---- totales
    const act = d1.filter((x) => x.fa > 0).length;
    const tiles = [
      ['Ventas a distribuidores', NZ.eurC(tot1), varr(tot1, tot0), PER.cmpShort() + ': ' + NZ.eurC(tot0)],
      ['Botellas', NZ.int(d1.reduce((t, x) => t + x.bot, 0)), varr(d1.reduce((t, x) => t + x.bot, 0), d0.reduce((t, x) => t + x.bot, 0)), ''],
      ['Distribuidores con ventas', String(act), null, 'cubren ' + Object.keys(DS.cobertura).length + ' provincias'],
      ['El mayor', items[d1.reduce((m, x, i) => (x.fa > d1[m].fa ? i : m), 0)].nombre, null, NZ.pct(Math.max(...d1.map((x) => x.fa)) / (tot1 || 1)) + ' de las ventas'],
    ];
    const tb = $('#dist-tiles'); tb.replaceChildren();
    tiles.forEach(([t, v, d, m]) => {
      const el = NZ.el('div', 'nz-tile'), meta = NZ.el('div', 'nz-meta');
      if (d != null) { const s = NZ.el('span'); NZ.delta(s, d); meta.appendChild(s); }
      if (m) meta.appendChild(NZ.el('span', null, m));
      el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big', v), meta); tb.appendChild(el);
    });

    // ---- valores por provincia (todas las de España)
    const pv = {}, pv0 = {};
    d1.forEach((x) => { for (const p in x.prov) pv[p] = (pv[p] || 0) + x.prov[p].fa; });
    d0.forEach((x) => { for (const p in x.prov) pv0[p] = (pv0[p] || 0) + x.prov[p].fa; });
    const owner = (p) => (DS.cobertura[p] || []).map(([d]) => d);
    if (geo) mapa($('#ch-dist-mapa'), geo, { pv, pv0, medida, di, items, owner, C, NZ, cob: DS.cobertura, d1, onPick: (d) => setP({ dist_id: items[d].id }) });
    else failed($('#ch-dist-mapa'), 'provincias');

    // ---- ficha del distribuidor
    $('#h-dist').textContent = it.nombre;
    $('#n-dist').textContent = `${it.sede} · trabaja con las bodegas desde ${it.desde} · ${it.web}`;
    const z = $('#dist-zona'); z.replaceChildren(...it.zona.map((p) => {
      const sh = (DS.cobertura[p] || []).find(([d]) => d === di);
      const shared = (DS.cobertura[p] || []).length > 1;
      return NZ.el('span', 'nz-chip', p + (shared ? ' (compartida)' : ''));
    }));
    const kp = $('#dist-kpis'); kp.replaceChildren();
    [
      ['Facturación', NZ.eurC(x1.fa), varr(x1.fa, x0.fa), NZ.eurC(x0.fa)],
      ['Botellas', NZ.int(x1.bot), varr(x1.bot, x0.bot), NZ.int(x0.bot)],
      ['Cuota de las ventas nacionales', NZ.pct(ratio(x1.fa, tot1)), null, NZ.pct(ratio(x0.fa, tot0))],
      ['Puntos de venta (aprox.)', NZ.int(puntos(x1)), null, 'margen ' + NZ.pct(ratio(x1.bb, x1.fa))],
    ].forEach(([t, v, d, m]) => {
      const el = NZ.el('div', 'nz-tile'), meta = NZ.el('div', 'nz-meta');
      if (d != null) { const s = NZ.el('span'); NZ.delta(s, d); meta.appendChild(s); meta.appendChild(NZ.el('span', null, PER.cmpShort() + ': ' + m)); }
      else meta.appendChild(NZ.el('span', null, t.startsWith('Cuota') ? PER.cmpShort() + ': ' + m : m));
      el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big', v), meta); kp.appendChild(el);
    });
    const cb = $('#dist-canal'); cb.replaceChildren();
    const bar = NZ.el('div', 'nz-dbar'), lg = NZ.el('div', 'nz-legend');
    const ccol = [C[0], C[1], C[2]];
    x1.can.forEach((v, i) => {
      const s = NZ.el('span'); s.style.width = (ratio(v, x1.fa) || 0) * 100 + '%'; s.style.background = ccol[i]; s.title = CAN[i]; bar.appendChild(s);
      const l = NZ.el('span', 'nz-lg'), sw = NZ.el('span', 'nz-sw'); sw.style.background = ccol[i];
      l.append(sw, document.createTextNode(`${CAN[i]} ${NZ.pct(ratio(v, x1.fa), 0)} · ${NZ.eurC(v)}`)); lg.appendChild(l);
    });
    cb.append(bar, lg);
    const ch = PER.chart((a, b) => PER.dist(a, b, bi)[di].fa);
    const ys = ch.series.filter((s) => s.k === 0 || s.values.some((v) => v != null)).reverse().map((s) => ({ name: s.name, color: PER.colorYear(s.k), thin: s.k >= 2, values: s.values }));
    NZ.legend($('#lg-dist-mes'), ys.slice().reverse().map((s) => ({ name: s.name, color: s.color })));
    NZ.lines($('#ch-dist-mes'), ch.xs, ys, { fmtY: NZ.eurC, fmtTip: NZ.eur, xLabel: ch.label, tipTitle: ch.tip, height: 180 });
    const provs = it.zona.map((p) => ({ p, v: (x1.prov[p] || { fa: 0 }).fa, v0: (x0.prov[p] || { fa: 0 }).fa })).filter((r) => r.v > 0 || r.v0 > 0).sort((a, b) => b.v - a.v);
    NZ.hbars($('#ch-dist-prov'), provs, { label: (r) => r.p, value: (r) => r.v, fmt: NZ.eurC, color: () => C[0], sub: (r) => { const v = varr(r.v, r.v0); return v == null ? null : { text: NZ.dpct(v), cls: v >= 0 ? 'nz-good' : 'nz-bad' }; } });

    // ---- productos del distribuidor
    $('#h-dist-prod').textContent = 'Productos que vende ' + it.nombre;
    const prod = [...new Set([...x1.ref.keys(), ...x0.ref.keys()])].map((r) => {
      const a = x1.ref.get(r) || { fa: 0, bot: 0 }, b = x0.ref.get(r) || { fa: 0, bot: 0 }, ri = refsI[r];
      return { id: r, referencia: ri.referencia, bodega: BOD[ri.b], tipo: ri.tipo, botellas: Math.round(a.bot), botellas_ant: Math.round(b.bot), variacion: varr(a.bot, b.bot), facturacion: Math.round(a.fa), cuota: ratio(a.fa, x1.fa) };
    }).filter((r) => r.botellas > 0 || r.botellas_ant > 0);
    NZ.table($('#t-dist-prod'), prod, {
      botellas: { num: true, fmt: NZ.int }, botellas_ant: { num: true, fmt: NZ.int },
      variacion: { num: true, render: (td, r) => { if (r.variacion == null) td.textContent = '—'; else NZ.deltaRender('variacion')(td, r); } },
      facturacion: { num: true, fmt: NZ.eur }, cuota: { num: true, fmt: (v) => NZ.pct(v) },
    }, { key: 'id', sortField: 'facturacion', count: $('#c-dist-prod') });

    // ---- todos los distribuidores
    const rows = items.map((x, i) => ({
      id: x.id, i, nombre: x.nombre, sede: x.sede, nprov: x.zona.length, facturacion: Math.round(d1[i].fa), facturacion_ant: Math.round(d0[i].fa), variacion: varr(d1[i].fa, d0[i].fa),
      botellas: Math.round(d1[i].bot), cuota: ratio(d1[i].fa, tot1), hosteleria: ratio(d1[i].can[0], d1[i].fa), puntos: Math.round(puntos(d1[i])), margen: ratio(d1[i].bb, d1[i].fa),
    }));
    NZ.table($('#t-dist'), rows, {
      nprov: { num: true, fmt: NZ.int }, facturacion: { num: true, fmt: NZ.eurC }, facturacion_ant: { num: true, fmt: NZ.eurC },
      variacion: { num: true, render: (td, r) => { if (r.variacion == null) td.textContent = '—'; else NZ.deltaRender('variacion')(td, r); } },
      botellas: { num: true, fmt: NZ.int }, cuota: { num: true, fmt: (v) => NZ.pct(v) }, hosteleria: { num: true, fmt: (v) => NZ.pct(v, 0) },
      puntos: { num: true, fmt: NZ.int }, margen: { num: true, fmt: (v) => NZ.pct(v) },
    }, { key: 'id', sortField: 'facturacion', active: (r) => r.i === di, onRow: (r) => { setP({ dist_id: r.id }); $('#card-dist-mapa').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

    // ---- bodega × distribuidor
    const per = BOD.map((_, b) => PER.dist(cur.a, cur.b, b));
    const heat = [];
    items.forEach((x, i) => BOD.forEach((b, k) => { const v = per[k][i].fa; if (v > 0) heat.push({ d: x.nombre, b: k === 2 ? 'Las Moradas' : b, v }); }));
    const order = items.map((x, i) => [x.nombre, d1[i].fa]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    NZ.heat($('#ch-dist-heat'), heat, { row: (r) => r.d, col: (r) => r.b, value: (r) => r.v, rows: order, cols: ['Enate', 'Laus', 'Las Moradas'], corner: 'Distribuidor', fmt: NZ.eurC, color: C[0] });
  }

  // ---- mapa de provincias
  function mapa(box, geo, o) {
    const { NZ, C } = o;
    NZ.clear(box); box.classList.remove('dash-skeleton');
    const W = Math.max(280, box.clientWidth || 600);
    const feats = geo.provincias.map((f) => ({ type: 'Feature', properties: { p: f.p }, geometry: { type: 'MultiPolygon', coordinates: f.r.map((r) => [r.slice().reverse()]) } }));
    const fc = { type: 'FeatureCollection', features: feats };
    const k = Math.cos((40 * Math.PI) / 180);
    const proj = d3.geoTransform({ point(x, y) { this.stream.point(x * k, -y); } });
    const tmp = d3.geoPath(proj); const bb = tmp.bounds(fc);
    const s = (W - 12) / (bb[1][0] - bb[0][0]);
    const H = Math.round((bb[1][1] - bb[0][1]) * s + 12);
    const pr = d3.geoTransform({ point(x, y) { this.stream.point(6 + (x * k - bb[0][0]) * s, 6 + (-y - bb[0][1]) * s); } });
    const path = d3.geoPath(pr);
    const P = (lon, lat) => { let x = lon, y = lat; if (lat < 30) { x += geo.canarias_desplazada[0]; y += geo.canarias_desplazada[1]; } return [6 + (x * k - bb[0][0]) * s, 6 + (-y - bb[0][1]) * s]; };
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'nz-svg nz-dmap').attr('role', 'img').attr('aria-label', 'Mapa de distribuidores por provincia');
    const zone = new Set(o.items[o.di].zona);
    const vals = feats.map((f) => o.pv[f.properties.p] || 0);
    const max = d3.max(vals) || 1, mn = Math.max(1, d3.min(vals.filter((v) => v > 0)) || 1) * 0.8;
    const vr = (p) => varr(o.pv[p] || 0, o.pv0[p] || 0);
    const fill = (p) => {
      if (o.medida === 'variacion') {
        const v = vr(p); if (v == null) return 'color-mix(in srgb, var(--color-fg) 6%, transparent)';
        const a = Math.round(12 + 70 * Math.min(1, Math.abs(v) / 0.25));
        return `color-mix(in srgb, ${v >= 0 ? 'var(--color-ok)' : 'var(--color-bad)'} ${a}%, transparent)`;
      }
      const v = o.pv[p] || 0; const a = v ? Math.round(12 + 78 * Math.max(0, Math.log(v / mn) / Math.log(max / mn))) : 4;
      return `color-mix(in srgb, ${C[0]} ${a}%, transparent)`;
    };
    const tip = NZ.tip(box);
    svg.append('g').selectAll('path').data(feats).join('path').attr('d', path).attr('class', 'nz-prov')
      .style('fill', (f) => fill(f.properties.p)).style('opacity', (f) => (zone.has(f.properties.p) ? 1 : 0.75))
      .on('mousemove', (ev, f) => {
        const p = f.properties.p, ds = (o.cob[p] || []);
        const v = vr(p);
        tip.show(ev, [p, ...ds.map(([d]) => ({ text: o.items[d].nombre + (ds.length > 1 ? ' · ' + NZ.pct((o.d1[d].prov[p] || { fa: 0 }).fa / (o.pv[p] || 1), 0) : '') })), 'Facturación: ' + NZ.eurC(o.pv[p] || 0) + (v == null ? '' : ' (' + NZ.dpct(v) + ')')]);
      })
      .on('mouseleave', () => tip.hide())
      .on('click', (ev, f) => { const ds = o.owner(f.properties.p); if (!ds.length) return; const cur = ds.indexOf(o.di); o.onPick(ds[cur >= 0 ? (cur + 1) % ds.length : 0]); });
    // borde de la zona elegida
    const zf = { type: 'FeatureCollection', features: feats.filter((f) => zone.has(f.properties.p)) };
    svg.append('path').attr('d', path(zf)).attr('class', 'nz-zona');
    // recuadro de Canarias
    const cf = feats.filter((f) => f.properties.p === 'Las Palmas' || f.properties.p === 'Santa Cruz de Tenerife');
    if (cf.length) { const b = path.bounds({ type: 'FeatureCollection', features: cf }); svg.append('rect').attr('class', 'nz-canbox').attr('x', b[0][0] - 6).attr('y', b[0][1] - 6).attr('width', b[1][0] - b[0][0] + 12).attr('height', b[1][1] - b[0][1] + 12).attr('rx', 4); }
    // sedes
    svg.append('g').selectAll('circle').data(o.items.map((x, i) => ({ ...x, i }))).join('circle')
      .attr('cx', (d) => P(d.lon, d.lat)[0]).attr('cy', (d) => P(d.lon, d.lat)[1]).attr('r', (d) => (d.i === o.di ? 6 : 3.8))
      .attr('class', (d) => 'nz-hq' + (d.i === o.di ? ' nz-on' : ''))
      .on('mousemove', (ev, d) => tip.show(ev, [d.nombre, 'Sede: ' + d.sede, d.zona.length + ' provincias · ' + NZ.eurC(o.d1[d.i].fa)]))
      .on('mouseleave', () => tip.hide()).on('click', (ev, d) => o.onPick(d.i));
    const lg = $('#lg-dist-mapa');
    if (lg) {
      lg.replaceChildren();
      const add = (c, t) => { const l = NZ.el('span', 'nz-lg'), sw = NZ.el('span', 'nz-sw'); sw.style.background = c; l.append(sw, document.createTextNode(t)); lg.appendChild(l); };
      if (o.medida === 'variacion') { add('color-mix(in srgb, var(--color-ok) 70%, transparent)', 'Sube frente a ' + PER.cmpShort().toLowerCase()); add('color-mix(in srgb, var(--color-bad) 70%, transparent)', 'Baja'); }
      else { add(`color-mix(in srgb, ${C[0]} 15%, transparent)`, 'Vende poco'); add(`color-mix(in srgb, ${C[0]} 85%, transparent)`, 'Vende mucho'); }
      add('var(--color-fg)', 'Sede del distribuidor');
    }
  }

  function wire(setP) {
    $$('#seg-dbodega button').forEach((b) => b.addEventListener('click', () => setP({ dist_bodega: b.dataset.v })));
    $$('#seg-dmedida button').forEach((b) => b.addEventListener('click', () => setP({ dist_medida: b.dataset.v })));
    $('#sel-dist').addEventListener('change', (e) => setP({ dist_id: e.target.value }));
  }
  window.DIST = { draw, wire };
})();
