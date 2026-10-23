// Balneario: canales de reserva (volumen y rentabilidad) y reseñas de los clientes.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const TIPO = { Directo: 0, OTA: 1, Agencia: 3, Turoperador: 4 };
  const SENT = { positivo: 'var(--color-ok)', neutro: 'var(--cds-chart-muted)', negativo: 'var(--color-bad)' };

  // ---------------- canales ----------------
  function drawCanales(ctx) {
    const { ok, failed, NZ } = ctx, C = ctx.C();
    const rows = ok('hotel_canales');
    if (!rows) { ['#ch-canal-neto', '#ch-canal-resv'].forEach((s) => failed($(s), 'hotel_canales')); return; }
    const tot = rows.reduce((a, r) => ({ resv: a.resv + r.reservas, ing: a.ing + r.ingresos, com: a.com + r.comision, neto: a.neto + r.neto }), { resv: 0, ing: 0, com: 0, neto: 0 });
    const directo = rows.filter((r) => r.tipo === 'Directo').reduce((t, r) => t + r.ingresos, 0);
    const tiles = [
      ['Reservas', NZ.int(tot.resv), 'en el periodo'],
      ['Ingresos', NZ.eurC(tot.ing), 'alojamiento'],
      ['Comisiones a canales', NZ.eurC(tot.com), NZ.pct(tot.ing ? tot.com / tot.ing : null) + ' de los ingresos'],
      ['Ingreso neto', NZ.eurC(tot.neto), 'tras comisiones'],
      ['Venta directa', NZ.pct(tot.ing ? directo / tot.ing : null), 'sin comisión'],
    ];
    const tb = $('#hcanal-tiles'); tb.replaceChildren();
    tiles.forEach(([t, v, m]) => tb.append(tileEl(NZ, t, v, m)));

    // ingresos con comisión (apilado): neto + comisión
    const box = $('#ch-canal-neto'); NZ.clear(box); box.classList.remove('dash-skeleton');
    const max = Math.max(...rows.map((r) => r.ingresos)) || 1;
    const list = NZ.el('div', 'nz-hbars');
    rows.slice().sort((a, b) => b.ingresos - a.ingresos).forEach((r) => {
      const row = NZ.el('div', 'nz-hb');
      row.append(NZ.el('div', 'nz-hb-l', r.canal));
      const track = NZ.el('div', 'nz-hb-t'); track.style.display = 'flex';
      const neto = NZ.el('div'); neto.style.cssText = `height:100%;width:${(r.neto / max) * 100}%;background:${C[TIPO[r.tipo]]};border-radius:4px 0 0 4px`;
      const com = NZ.el('div'); com.style.cssText = `height:100%;width:${(r.comision / max) * 100}%;background:var(--color-fg);opacity:.55;border-radius:0 4px 4px 0`;
      track.append(neto, com);
      const v = NZ.el('div', 'nz-hb-v', NZ.eurC(r.ingresos));
      if (r.comision) v.append(NZ.el('span', 'nz-hb-s', '−' + NZ.eurC(r.comision)));
      row.append(track, v); list.appendChild(row);
    });
    box.appendChild(list);

    NZ.hbars($('#ch-canal-resv'), rows.slice().sort((a, b) => b.reservas - a.reservas), {
      label: (r) => r.canal, value: (r) => r.reservas, fmt: NZ.int, color: (r) => C[TIPO[r.tipo]],
      sub: (r) => ({ text: NZ.pct(r.cuota_reservas, 0) }),
    });

    NZ.table($('#t-canales'), rows, {
      tipo: { render: (td, r) => NZ.chip(td, r.tipo, r.tipo === 'Directo' ? 'nz-ok' : '') },
      reservas: { num: true, fmt: NZ.int }, noches: { num: true, fmt: NZ.int }, ingresos: { num: true, fmt: NZ.eur },
      comision_pct: { num: true, fmt: (v) => (v ? NZ.pct(v, 0) : '—') }, comision: { num: true, fmt: NZ.eur }, neto: { num: true, fmt: NZ.eur },
      ingreso_medio: { num: true, fmt: (v) => (v == null ? '—' : NZ.eur(v)) }, cuota: { num: true, fmt: (v) => NZ.pct(v) },
      variacion: { num: true, render: (td, r) => { if (r.variacion == null) td.textContent = '—'; else NZ.deltaRender('variacion')(td, r); } },
    }, { key: 'id', sortField: 'ingresos' });
  }
  function tileEl(NZ, t, v, m) { const el = NZ.el('div', 'nz-tile'); el.append(NZ.el('div', 'nz-tl', t), NZ.el('div', 'nz-big', v), NZ.el('div', 'nz-meta', m)); return el; }

  // ---------------- reseñas ----------------
  let R = null;
  function prep(raw) {
    if (R && R.raw === raw) return R;
    const hoy = new Date(raw.hoy);
    R = { raw, hoy, rows: raw.resenas.map((x) => ({ ...x, d: new Date(x.fecha), mi: (() => { const d = new Date(x.fecha); return d.getUTCFullYear() * 12 + d.getUTCMonth(); })() })) };
    return R;
  }
  function drawResenas(ctx) {
    const { ok, failed, P, setP, NZ } = ctx, C = ctx.C();
    const raw = ok('resenas');
    if (!raw) { ['#ch-res-mes', '#ch-res-temas', '#ch-res-fuente'].forEach((s) => failed($(s), 'resenas')); return; }
    prep(raw);
    const hotel = P().res_hotel || 'Total', meses = +(P().res_rango || 12), tema = P().res_tema || '';
    const hoyMi = R.hoy.getUTCFullYear() * 12 + R.hoy.getUTCMonth();
    let rows = R.rows.filter((r) => (hotel === 'Total' || r.hotel === hotel) && r.mi > hoyMi - meses);
    $$('#seg-res-hotel button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === hotel)));
    $$('#seg-res-rango button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(meses))));

    const media = rows.length ? rows.reduce((t, r) => t + r.nota, 0) / rows.length : null;
    const pos = rows.filter((r) => r.sentimiento === 'positivo').length;
    const neg = rows.filter((r) => r.sentimiento === 'negativo').length;
    const porFuente = {}; rows.forEach((r) => { (porFuente[r.fuente] = porFuente[r.fuente] || []).push(r.nota); });
    const fuentePrin = Object.entries(porFuente).sort((a, b) => b[1].length - a[1].length)[0];
    const tiles = [
      ['Nota media', media == null ? '—' : media.toFixed(1).replace('.', ',') + ' / 10', rows.length + ' reseñas'],
      ['Positivas', NZ.pct(rows.length ? pos / rows.length : null, 0), pos + ' de ' + rows.length],
      ['Negativas', NZ.pct(rows.length ? neg / rows.length : null, 0), neg + ' reseñas'],
      ['Fuente principal', fuentePrin ? fuentePrin[0] : '—', fuentePrin ? fuentePrin[1].length + ' reseñas' : ''],
    ];
    const tb = $('#res-tiles'); tb.replaceChildren(); tiles.forEach(([t, v, m]) => tb.append(tileEl(NZ, t, v, m)));

    // nota media por mes
    const buckets = []; for (let i = meses - 1; i >= 0; i--) buckets.push(hoyMi - i);
    const serie = buckets.map((mi) => { const rr = rows.filter((r) => r.mi === mi); return rr.length ? rr.reduce((t, r) => t + r.nota, 0) / rr.length : null; });
    const xs = buckets.map((_, i) => i);
    NZ.lines($('#ch-res-mes'), xs, [{ name: 'Nota media', color: C[0], values: serie }, { name: 'Media del periodo', color: 'var(--cds-chart-muted)', thin: true, values: buckets.map(() => media) }],
      { fmtY: (v) => v.toFixed(1), fmtTip: (v) => v.toFixed(1).replace('.', ',') + ' /10', xLabel: (i) => MES[buckets[i] % 12] + (buckets[i] % 12 === 0 || i === 0 ? ' ' + String(Math.floor(buckets[i] / 12)).slice(2) : ''), min: Math.max(0, Math.floor((Math.min(...serie.filter((v) => v != null)) || 6) - 1)), max: 10 });

    // temas
    const temas = raw.temas.map((t) => { const rr = rows.filter((r) => r.temas.includes(t)); const p = rr.filter((r) => r.sentimiento === 'positivo').length, n = rr.filter((r) => r.sentimiento === 'negativo').length; return { t, n: rr.length, pos: p, neg: n, ratio: rr.length ? p / rr.length : 0 }; }).filter((x) => x.n).sort((a, b) => b.n - a.n);
    NZ.hbars($('#ch-res-temas'), temas, {
      label: (r) => r.t, value: (r) => r.n, fmt: NZ.int, color: (r) => (r.ratio >= 0.6 ? 'var(--color-ok)' : r.ratio >= 0.4 ? 'var(--cds-chart-muted)' : 'var(--color-bad)'),
      sub: (r) => ({ text: NZ.pct(r.ratio, 0) + ' pos.' }), active: (r) => r.t === tema, onClick: (r) => setP({ res_tema: r.t === tema ? '' : r.t }),
    });

    // fuente
    NZ.hbars($('#ch-res-fuente'), Object.entries(porFuente).map(([f, a]) => ({ f, n: a.length, nota: a.reduce((t, x) => t + x, 0) / a.length })).sort((a, b) => b.n - a.n), {
      label: (r) => r.f, value: (r) => r.n, fmt: NZ.int, color: () => C[2], sub: (r) => ({ text: r.nota.toFixed(1).replace('.', ',') + ' /10' }),
    });

    // lista
    $('#h-res-list').textContent = tema ? 'Reseñas sobre «' + tema + '»' : 'Últimas reseñas';
    const list = $('#res-list'); list.replaceChildren();
    const sel = (tema ? rows.filter((r) => r.temas.includes(tema)) : rows).sort((a, b) => b.d - a.d).slice(0, 14);
    if (!sel.length) list.append(NZ.el('div', 'nz-empty', 'Sin reseñas con este filtro'));
    sel.forEach((r) => {
      const el = NZ.el('div', 'nz-resena');
      const head = NZ.el('div', 'nz-res-head');
      const nota = NZ.el('span', 'nz-res-nota'); nota.style.background = SENT[r.sentimiento]; nota.textContent = r.nota.toFixed(1).replace('.', ',');
      head.append(nota, NZ.el('b', null, r.fuente), NZ.el('span', 'nz-res-meta', r.hotel + ' · ' + r.d.getUTCDate() + ' ' + MES[r.d.getUTCMonth()] + ' ' + r.d.getUTCFullYear()));
      const chips = NZ.el('div', 'nz-res-chips'); r.temas.forEach((t) => chips.append(NZ.el('span', 'nz-chip', t)));
      el.append(head, NZ.el('div', 'nz-res-txt', r.texto), chips); list.appendChild(el);
    });
  }

  function wire(setP) {
    $$('#seg-res-hotel button').forEach((b) => b.addEventListener('click', () => setP({ res_hotel: b.dataset.v })));
    $$('#seg-res-rango button').forEach((b) => b.addEventListener('click', () => setP({ res_rango: b.dataset.v })));
  }
  window.HOTX = { drawCanales, drawResenas, wire };
})();
