// Inmobiliario · ciclo de vida de una promoción: desde la compra del suelo hasta la entrega.
// Arriba del eje, reservas por mes; abajo, contactos (leads). Media de las promociones elegidas o una en concreto.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const HITOS = [['suelo', 'Compra del suelo'], ['comercial', 'Comercialización'], ['obra', 'Comienzo de obra'], ['entrega', 'Entrega']];
  const FASES = ['Preparación', 'Preventa', 'Obra', 'Tras la entrega'];
  const mi = (s) => { const d = new Date(s); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }; // índice de mes
  const mlab = (i) => MES[i % 12] + ' ' + String(Math.floor(i / 12)).slice(2);
  const mean = (a) => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : null);
  const fmt1 = (v) => (v == null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: v < 10 ? 1 : 0 }));

  function draw(ctx) {
    const { ok, failed, P, setP, NZ } = ctx, C = ctx.C();
    const raw = ok('ciclo');
    if (!raw) { failed($('#ch-ciclo'), 'ciclo'); return; }
    const all = raw.promociones, hoy = mi(raw.hoy);
    const ccaa = P().ciclo_ccaa || '', prov = P().ciclo_prov || '', pid = P().ciclo_promo || '';
    const medida = P().ciclo_medida || 'media';
    // ---- filtros encadenados
    const fill = (sel, opts, val, first) => { sel.replaceChildren(new Option(first, ''), ...opts.map(([v, t]) => new Option(t, v))); sel.value = opts.some(([v]) => v === val) ? val : ''; return sel.value; };
    const cc = fill($('#sel-ciclo-ccaa'), [...new Set(all.map((p) => p.ccaa))].sort().map((x) => [x, x]), ccaa, 'Todas las comunidades');
    const pool1 = all.filter((p) => !cc || p.ccaa === cc);
    const pv = fill($('#sel-ciclo-prov'), [...new Set(pool1.map((p) => p.provincia))].sort().map((x) => [x, x]), prov, 'Todas las provincias');
    const pool2 = pool1.filter((p) => !pv || p.provincia === pv);
    const pr = fill($('#sel-ciclo-promo'), pool2.slice().sort((a, b) => a.promocion.localeCompare(b.promocion, 'es')).map((p) => [p.id, p.promocion.replace(/^Residencial /, '') + (p.estado === 'En curso' ? ' (en curso)' : '')]), pid, 'Media de todas');
    const sel = pr ? pool2.filter((p) => p.id === pr) : pool2;
    $$('#seg-ciclo-medida button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === medida)));
    const per100 = medida === 'cien';
    const one = sel.length === 1 && !!pr;

    // ---- series por mes desde la compra del suelo
    const rows = sel.map((p) => {
      const s0 = mi(p.hitos.suelo);
      const h = Object.fromEntries(HITOS.map(([k]) => [k, mi(p.hitos[k]) - s0]));
      const end = Math.min(hoy, Math.max(mi(p.hitos.entrega), ...Object.keys(p.meses).map((k) => mi(k + '-01')))) - s0; // hasta dónde hay datos
      const k = per100 ? 100 / p.viviendas : 1;
      const res = [], led = [];
      for (let o = 0; o <= end; o++) { const m = p.meses[mlab2(s0 + o)] || [0, 0]; res.push(m[0] * k); led.push(m[1] * k); }
      return { p, s0, h, end, res, led };
    });
    if (!rows.length) { NZ.clear($('#ch-ciclo')); $('#ch-ciclo').appendChild(NZ.el('div', 'nz-empty', 'Sin promociones con este filtro')); return; }
    const maxEnd = one ? Math.max(rows[0].end, rows[0].h.entrega + 2) : Math.max(...rows.map((r) => r.end));
    const minN = one ? 1 : Math.max(1, Math.ceil(rows.length * 0.25)); // no enseñar meses con muy pocas promociones
    const xs = [], R = [], L = [], N = [];
    for (let o = 0; o <= maxEnd; o++) {
      const have = rows.filter((r) => o <= r.end);
      if (!one && have.length < minN) break;
      xs.push(o); N.push(have.length);
      R.push(mean(have.map((r) => r.res[o]))); L.push(mean(have.map((r) => r.led[o])));
    }
    const hit = HITOS.map(([k, t]) => ({ k, t, o: mean(rows.map((r) => r.h[k])), prev: rows.every((r) => (k === 'entrega' ? r.p.entrega_prevista : k === 'obra' ? r.p.obra_prevista : false)) }));

    chart($('#ch-ciclo'), { xs, R, L, N, hit, one, s0: one ? rows[0].s0 : 0, C, NZ, per100, hoyO: one ? hoy - rows[0].s0 : null });

    // ---- textos y fichas
    const ent = sel.filter((p) => p.estado === 'Entregada').length;
    $('#n-ciclo').textContent = one
      ? `${sel[0].promocion} (${sel[0].ciudad}) · ${sel[0].viviendas} viviendas · ${sel[0].estado === 'Entregada' ? 'entregada' : 'en curso: lo que falta es la previsión'}.`
      : `Media de ${sel.length} promociones (${ent} entregadas y ${sel.length - ent} en curso), alineadas en el mes de compra del suelo. Cada mes promedia las promociones que ya han llegado a él.`;
    const sold = (r, o) => r.res.slice(0, o + 1).reduce((t, v) => t + v, 0) / (per100 ? 100 : r.p.viviendas);
    const dur = (a, b) => mean(rows.map((r) => r.h[b] - r.h[a]));
    const atObra = rows.filter((r) => r.h.obra <= r.end).map((r) => sold(r, r.h.obra));
    const atEnt = rows.filter((r) => r.p.estado === 'Entregada').map((r) => sold(r, r.h.entrega));
    const totL = rows.reduce((t, r) => t + r.led.reduce((a, b) => a + b, 0), 0), totR = rows.reduce((t, r) => t + r.res.reduce((a, b) => a + b, 0), 0);
    const mesesN = (v) => (v == null ? '—' : fmt1(v) + ' meses');
    const tiles = [
      ['Del suelo a la comercialización', mesesN(dur('suelo', 'comercial')), 'preparación: licencias, proyecto, marketing'],
      ['De la comercialización a la obra', mesesN(dur('comercial', 'obra')), 'preventa antes de empezar a construir'],
      ['Duración de la obra', mesesN(dur('obra', 'entrega')), one && sel[0].entrega_prevista ? 'entrega prevista' : 'hasta la entrega'],
      ['Vendido al empezar la obra', atObra.length ? NZ.pct(mean(atObra), 0) : '—', 'reservas sobre viviendas'],
      ['Vendido a la entrega', atEnt.length ? NZ.pct(mean(atEnt), 0) : one ? NZ.pct(sold(rows[0], rows[0].end), 0) + ' hoy' : '—', atEnt.length ? 'promociones entregadas' : 'aún no entregada'],
      ['Leads por cada reserva', totR ? fmt1(totL / totR) : '—', 'contactos de marketing'],
    ];
    const tb = $('#ciclo-tiles'); tb.replaceChildren();
    tiles.forEach(([t, v, m]) => { const el = NZ.el('div', 'nz-tile'); el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big', v), NZ.el('div', 'nz-meta', m)); tb.appendChild(el); });
    NZ.legend($('#lg-ciclo'), [{ name: per100 ? 'Reservas por cada 100 viviendas' : one ? 'Reservas' : 'Reservas (media por promoción)', color: C[0] }, { name: per100 ? 'Leads por cada 100 viviendas' : one ? 'Leads' : 'Leads (media por promoción)', color: C[1] }]);
  }
  const mlab2 = (i) => Math.floor(i / 12) + '-' + String((i % 12) + 1).padStart(2, '0');

  function chart(box, o) {
    const { xs, R, L, N, hit, one, s0, C, NZ, per100, hoyO } = o;
    NZ.clear(box); box.classList.remove('dash-skeleton');
    const W = Math.max(320, box.clientWidth || 900), narrow = W < 640;
    const m = { l: 8, r: narrow ? 44 : 56, t: 44, b: 26 }, H = narrow ? 360 : 420;
    const iw = W - m.l - m.r, ih = H - m.t - m.b, mid = m.t + ih * 0.5;
    const x = d3.scaleBand().domain(xs).range([m.l, m.l + iw]).paddingInner(xs.length > 60 ? 0.12 : 0.2);
    const xc = (v) => m.l + (v + 0.5) * (iw / xs.length); // posición continua (hitos con decimales)
    const yr = d3.scaleLinear().domain([0, d3.max(R) || 1]).nice(4).range([mid - 1, m.t]);
    const yl = d3.scaleLinear().domain([0, d3.max(L) || 1]).nice(4).range([mid + 1, m.t + ih]);
    const svg = d3.select(box).append('svg').attr('width', W).attr('height', H).attr('class', 'nz-svg nz-ciclo');
    // fases sombreadas
    const hx = hit.map((h) => Math.max(m.l, Math.min(m.l + iw, xc(h.o))));
    const bands = [[hx[0], hx[1]], [hx[1], hx[2]], [hx[2], hx[3]], [hx[3], m.l + iw]];
    bands.forEach(([a, b], i) => {
      if (b - a < 2) return;
      svg.append('rect').attr('x', a).attr('y', m.t).attr('width', b - a).attr('height', ih).attr('class', 'nz-fase nz-fase' + i);
      if (b - a > 54) svg.append('text').attr('x', (a + b) / 2).attr('y', m.t + ih - 6).attr('text-anchor', 'middle').attr('class', 'nz-tick nz-fase-t').text(FASES[i]);
    });
    // rejilla y eje Y solo a la derecha
    yr.ticks(4).forEach((t) => { if (!t) return; svg.append('line').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', yr(t)).attr('y2', yr(t)).attr('class', 'nz-grid'); svg.append('text').attr('x', m.l + iw + 6).attr('y', yr(t) + 4).attr('class', 'nz-tick').text(fmt1(t)); });
    yl.ticks(4).forEach((t) => { if (!t) return; svg.append('line').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', yl(t)).attr('y2', yl(t)).attr('class', 'nz-grid'); svg.append('text').attr('x', m.l + iw + 6).attr('y', yl(t) + 4).attr('class', 'nz-tick').text(NZ.numC(t)); });
    svg.append('text').attr('x', m.l + iw + 6).attr('y', m.t - 8).attr('class', 'nz-tick nz-axt').text('Reservas ↑');
    svg.append('text').attr('x', m.l + iw + 6).attr('y', mid + 14).attr('class', 'nz-tick nz-axt').text('Leads ↓');
    // barras
    const bw = x.bandwidth();
    svg.append('g').selectAll('rect').data(xs).join('rect').attr('x', (d) => x(d)).attr('width', bw).attr('y', (d, i) => yr(R[i] || 0)).attr('height', (d, i) => Math.max(R[i] > 0 ? 1 : 0, mid - 1 - yr(R[i] || 0))).attr('rx', Math.min(2, bw / 3)).style('fill', C[0]);
    svg.append('g').selectAll('rect').data(xs).join('rect').attr('x', (d) => x(d)).attr('width', bw).attr('y', mid + 1).attr('height', (d, i) => Math.max(L[i] > 0 ? 1 : 0, yl(L[i] || 0) - mid - 1)).attr('rx', Math.min(2, bw / 3)).style('fill', C[1]);
    svg.append('line').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', mid).attr('y2', mid).attr('class', 'nz-axis');
    // eje X: timeline
    const step = Math.max(1, Math.ceil(xs.length / (narrow ? 6 : 14) / 3) * 3);
    xs.forEach((v, i) => { if (v % step) return; svg.append('text').attr('x', i === 0 ? x(v) : x(v) + bw / 2).attr('y', m.t + ih + 16).attr('text-anchor', i === 0 ? 'start' : 'middle').attr('class', 'nz-tick nz-xlab').text(one ? mlab(s0 + v) : (v === 0 ? 'mes 0' : '+' + v)); });
    // hoy (una promoción en curso)
    if (hoyO != null && hoyO < xs.length + 1) {
      const xh = xc(hoyO);
      svg.append('line').attr('x1', xh).attr('x2', xh).attr('y1', m.t).attr('y2', m.t + ih).attr('class', 'nz-today');
      svg.append('text').attr('x', xh + 4).attr('y', m.t + 12).attr('class', 'nz-tick').style('fill', 'var(--color-bad)').text('hoy');
    }
    // hitos
    hit.forEach((h, i) => {
      const xx = hx[i];
      svg.append('line').attr('x1', xx).attr('x2', xx).attr('y1', m.t - 4).attr('y2', m.t + ih).attr('class', 'nz-hito' + (h.prev ? ' nz-hito-prev' : ''));
      svg.append('circle').attr('cx', xx).attr('cy', m.t - 4).attr('r', 4).attr('class', 'nz-hito-dot');
      const lab = h.t + (one ? '' : ' · mes ' + Math.round(h.o)) + (h.prev ? ' (prev.)' : '');
      const anchor = xx < m.l + 60 ? 'start' : xx > m.l + iw - 60 ? 'end' : 'middle';
      svg.append('text').attr('x', xx).attr('y', (i % 2 ? m.t - 26 : m.t - 14)).attr('text-anchor', anchor).attr('class', 'nz-tick nz-hito-t').text(narrow ? h.t.split(' ')[0] + (h.k === 'obra' ? ' obra' : '') : lab);
    });
    // tooltip
    const tip = NZ.tip(box);
    svg.append('g').selectAll('rect').data(xs).join('rect').attr('x', (d) => x(d) - (x.step() - bw) / 2).attr('width', x.step()).attr('y', m.t).attr('height', ih).attr('fill', 'transparent')
      .on('mousemove', (ev, d) => {
        const i = xs.indexOf(d);
        const fase = FASES[Math.max(0, hit.filter((h) => h.o <= d + 0.5).length - 1)] || FASES[0];
        tip.show(ev, [one ? mlab(s0 + d) + ' · mes ' + d + ' desde el suelo' : 'Mes ' + d + ' desde la compra del suelo', fase,
          { color: C[0], text: 'Reservas: ' + fmt1(R[i]) + (per100 ? ' por 100 viv.' : '') }, { color: C[1], text: 'Leads: ' + fmt1(L[i]) + (per100 ? ' por 100 viv.' : '') }, ...(one ? [] : [N[i] + ' promociones en la media'])]);
      })
      .on('mouseleave', () => tip.hide());
  }

  function wire(setP) {
    $('#sel-ciclo-ccaa').addEventListener('change', (e) => setP({ ciclo_ccaa: e.target.value, ciclo_prov: '', ciclo_promo: '' }));
    $('#sel-ciclo-prov').addEventListener('change', (e) => setP({ ciclo_prov: e.target.value, ciclo_promo: '' }));
    $('#sel-ciclo-promo').addEventListener('change', (e) => setP({ ciclo_promo: e.target.value }));
    $$('#seg-ciclo-medida button').forEach((b) => b.addEventListener('click', () => setP({ ciclo_medida: b.dataset.v })));
  }
  window.CICLO = { draw, wire };
})();
