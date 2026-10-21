(function () {
  const NZ = window.NZ;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = () => dash.colors;
  const MUTED = 'var(--cds-chart-muted)';

  // ---------- calculations ----------
  dash.calc('inmo_kpis', {
    title: 'Totales inmobiliario',
    description: 'Suma de viviendas, ventas, reservas y facturación de todas las promociones, separando entregadas y en curso.',
    inputs: ['promociones'],
    fn: (promociones) => {
      const ent = promociones.filter((p) => p.estado === 'Entregada');
      const cur = promociones.filter((p) => p.estado === 'En curso');
      const s = (a, f) => a.reduce((t, p) => t + p[f], 0);
      return [{
        promos_entregadas: ent.length,
        viviendas_entregadas: s(ent, 'escrituradas'),
        facturacion_escriturada: s(ent, 'facturacion_escriturada'),
        promos_en_curso: cur.length,
        viviendas_en_curso: s(cur, 'viviendas'),
        vendidas: s(cur, 'vendidas'),
        reservadas: s(cur, 'reservadas'),
        disponibles: s(cur, 'disponibles'),
        comercializadas: s(cur, 'vendidas') + s(cur, 'reservadas'),
        cartera_pendiente: s(cur, 'cartera_pendiente'),
      }];
    },
  });
  dash.calc('hotel_origen_ambito', {
    title: 'Huéspedes de España y del extranjero',
    description: 'Facturación de alojamiento, huéspedes y su cambio frente a 2025, sumando por hotel los orígenes nacionales y los internacionales.',
    inputs: ['hotel_origen'],
    fn: (hotel_origen) => {
      const by = new Map();
      hotel_origen.forEach((o) => {
        const k = o.hotel + '|' + o.ambito;
        const t = by.get(k) || { id: k, hotel: o.hotel, ambito: o.ambito, facturacion: 0, facturacion_ant: 0, huespedes: 0 };
        t.facturacion += o.facturacion;
        t.facturacion_ant += o.facturacion_ant;
        t.huespedes += o.huespedes;
        by.set(k, t);
      });
      const rows = [...by.values()];
      rows.forEach((r) => {
        const tot = rows.filter((x) => x.hotel === r.hotel).reduce((s, x) => s + x.facturacion, 0);
        r.cuota = r.facturacion / tot;
        r.variacion = r.facturacion / r.facturacion_ant - 1;
      });
      return rows;
    },
  });
  dash.calc('vino_totales', {
    title: 'Botellas de las tres bodegas',
    description: 'Botellas vendidas por Enate, Laus y Las Moradas sumadas, este año y el mismo periodo de 2025.',
    inputs: ['vino_resumen'],
    fn: (vino_resumen) => [{
      botellas: vino_resumen.reduce((t, r) => t + r.botellas, 0),
      botellas_ant: vino_resumen.reduce((t, r) => t + r.botellas_ant, 0),
    }],
  });
  dash.calc('hotel_variaciones', {
    title: 'Variación del hotel vs 2025',
    description: 'Cambio de facturación y beneficio bruto frente al mismo periodo de 2025, por hotel.',
    inputs: ['hotel_resumen'],
    fn: (hotel_resumen) => hotel_resumen.map((r) => ({
      hotel: r.hotel,
      var_facturacion: r.facturacion / r.facturacion_ant - 1,
      var_beneficio_bruto: r.beneficio_bruto / r.beneficio_bruto_ant - 1,
    })),
  });

  // ---------- generic fill of marked values ----------
  const TEXT = ['hora', 'ciudad', 'zona', 'entrega', 'promocion', 'canal', 'unidad'];
  const fmtFor = (f) => {
    if (/^var/.test(f)) return null;
    if (['margen', 'ocupacion', 'ocupacion_ant', 'pct_export', 'pct_comercializado', 'cuota'].includes(f)) return (v) => NZ.pct(v);
    if (f === 'origen') return (v) => (v == null ? '—' : String(v));
    if (['adr', 'adr_ant', 'revpar', 'revpar_ant', 'ticket_medio'].includes(f)) return NZ.eur1;
    if (f === 'precio_medio' || f === 'precio') return NZ.eur;
    if (/facturacion|beneficio|cartera|ingresos|valor|coste|importe|escriturado|comprometido/.test(f)) return NZ.eurC;
    if (TEXT.includes(f)) return (v) => (v == null ? '—' : String(v));
    return NZ.int;
  };
  const rowFor = (el, rows) => {
    const r = el.getAttribute('data-row');
    if (r != null) return rows[+r];
    const w = el.getAttribute('data-where');
    if (!w) return rows[0];
    const conds = w.split('&').map((p) => p.split('=').map(decodeURIComponent));
    return rows.find((row) => conds.every(([k, v]) => String(row[k]) === v));
  };
  function fillMarks() {
    $$('[data-source][data-field]').forEach((el) => {
      if (el.tagName === 'TH' || el.closest('[hidden]')) return;
      const src = el.getAttribute('data-source');
      const d = dash.data(src);
      if (d.status !== 'ok') {
        if (d.status === 'error' || d.status === 'connect') { el.textContent = '—'; el.classList.remove('dash-skeleton'); }
        return;
      }
      const row = rowFor(el, d.data);
      const f = el.getAttribute('data-field');
      const v = row ? row[f] : null;
      const fm = fmtFor(f);
      if (fm) NZ.set(el, fm(v));
      else NZ.delta(el, v);
    });
  }
  const ok = (id) => {
    const d = dash.data(id);
    return d.status === 'ok' ? d.data : null;
  };
  const failed = (box, ...ids) => {
    for (const id of ids) {
      const d = dash.data(id);
      if (NZ.fail(box, d.status)) return true;
    }
    return false;
  };
  const P = () => dash.params();
  // series de los años elegidos en el filtro: el más antiguo primero, el actual al final
  const yearSeries = (ch) => ch.series.filter((x) => x.k === 0 || x.values.some((v) => v != null)).reverse().map((x) => ({ name: x.name, color: PER.colorYear(x.k), thin: x.k >= 2, values: x.values }));
  const plot = (box, ch, ser, o = {}) => (ser.length <= 3 && !o.lines ? NZ.cols : NZ.lines)(box, ch.xs, ser, { xLabel: ch.label, tipTitle: ch.tip, ...o });
  const legendYears = (el, ser) => el && NZ.legend(el, ser.slice().reverse().map((x) => ({ name: x.name, color: x.color })));
  const setP = (o) => dash.setParams(o);
  const empty = (box, text) => {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    box.appendChild(NZ.el('div', 'nz-empty', text));
  };

  // ---------- tabs & links ----------
  const TABS = ['inicio', 'inmobiliario', 'marketing', 'panticosa', 'bodegas', 'analisis'];
  let tab = 'inicio';
  function showTab(t, scrollTo) {
    tab = t;
    TABS.forEach((x) => {
      $('#' + x).hidden = x !== t;
      $('#tab-' + x).setAttribute('aria-selected', String(x === t));
    });
    dash.setLink(scrollTo || t);
    if (t === 'analisis') { const f = $('#calc-frame'); if (f && !f.src) f.src = f.dataset.src; }
    const pb = $('#nz-periodo'); if (pb) pb.hidden = t === 'analisis';
    draw();
    window.scrollTo({ top: 0 });
    if (scrollTo) { const el = document.getElementById(scrollTo); if (el) el.scrollIntoView(); }
  }
  $$('.nz-tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('.nz-pnav a').forEach((a) => a.addEventListener('click', () => {
    const el = document.getElementById(a.dataset.go);
    el.scrollIntoView({ behavior: 'smooth' });
    dash.setLink(a.dataset.go);
  }));
  $$('#seg-hotel button').forEach((b) => b.addEventListener('click', () => setP({ hotel: b.dataset.v })));
  $$('#seg-bodega button').forEach((b) => b.addEventListener('click', () => setP({ bodega: b.dataset.v, ref: null, pais: null })));
  $('#sel-promo').addEventListener('change', (e) => setP({ promo: e.target.value }));
  $('#sel-estado').addEventListener('change', () => draw());
  $('#q-viv').addEventListener('input', () => draw());
  $$('#seg-inmo button').forEach((b) => b.addEventListener('click', () => setP({ inmo_vista: b.dataset.v })));
  $('#sel-punto').addEventListener('change', (e) => setP({ punto: e.target.value }));
  $('#sel-ref').addEventListener('change', (e) => setP({ ref: e.target.value || null }));
  $('#sel-pais').addEventListener('change', (e) => setP({ pais: e.target.value || null }));

  // ---------- INICIO ----------
  function drawInicio() {
    // real-estate widget with three views
    const vista = P().inmo_vista || 'escriturado';
    const V = {
      escriturado: { t: 'Facturación escriturada', n: 'Lo que se factura al firmar la escritura y entregar las llaves. Va a saltos: cada promoción entregada se factura de golpe.', fmt: NZ.eurC, tip: NZ.eur, k: 'fact' },
      reservas: { t: 'Viviendas reservadas', n: 'Viviendas que se reservan, sumando todas las promociones.', fmt: NZ.int, tip: (v) => NZ.int(v) + ' viviendas', k: 'reservas' },
      comprometido: { t: 'Facturación comprometida por reservas', n: 'Precio de las viviendas reservadas: dinero ya comprometido que se facturará cuando se escriture.', fmt: NZ.eurC, tip: NZ.eur, k: 'comprometido' },
    }[vista];
    $$('#seg-inmo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === vista)));
    $('#h-home-inmo').textContent = V.t;
    $('#n-home-inmo').textContent = V.n;
    NZ.mark($('#hi-26'), 'inmo_mes_totales', vista + '_cur');
    NZ.mark($('#hi-25'), 'inmo_mes_totales', vista + '_cmp');
    NZ.mark($('#hi-var'), 'inmo_mes_totales', 'var_' + vista);
    ['#hi-26', '#hi-25', '#hi-var'].forEach((x) => $(x).setAttribute('data-row', '0'));
    if (PER.ready) {
      const ch = PER.chart((a, b) => PER.inmo(a, b)[V.k]);
      const ser = yearSeries(ch);
      legendYears($('#lg-home-inmo'), ser);
      plot($('#ch-home-inmo'), ch, ser, { fmtY: V.fmt, fmtTip: V.tip });
      const hot = PER.chart((a, b) => PER.hotel('Total', a, b).fact);
      const bod = PER.chart((a, b) => PER.grupo(a, b).Bodegas.fact);
      const sh = yearSeries(hot), sb = yearSeries(bod);
      legendYears($('#lg-grupo-mes'), sh);
      plot($('#ch-grupo-hot'), hot, sh, { fmtY: NZ.eurC, fmtTip: NZ.eur, height: 170 });
      plot($('#ch-grupo-bod'), bod, sb, { fmtY: NZ.eurC, fmtTip: NZ.eur, height: 170 });
      // progresión por años
      const ga = ok('grupo_anios');
      const tb = $('#t-prog');
      if (ga && tb) {
        const yrs = ga.slice().reverse();
        const rows = ['Grupo', 'Inmobiliario', 'Hotelero', 'Bodegas'];
        const th = '<thead><tr><th>Negocio</th>' + yrs.map((y) => `<th class="nz-num">${y.anio}${y.completo ? '' : '*'}</th>`).join('') + (yrs.length > 1 ? '<th class="nz-num">Var. total</th>' : '') + '</tr></thead>';
        const body = rows.map((n) => {
          const first = yrs[0][n], last = yrs[yrs.length - 1][n];
          const v = first ? last / first - 1 : null;
          return `<tr${n === 'Grupo' ? ' class="nz-strong"' : ''}><td>${n === 'Grupo' ? 'Grupo Nozar' : n}</td>` + yrs.map((y) => `<td class="nz-num">${NZ.eurC(y[n])}</td>`).join('') + (yrs.length > 1 ? `<td class="nz-num ${v > 0 ? 'nz-good' : v < 0 ? 'nz-bad' : ''}">${v == null ? '—' : NZ.dpct(v)}</td>` : '') + '</tr>';
        }).join('');
        tb.innerHTML = th + '<tbody>' + body + '</tbody>';
        $('#n-prog').textContent = 'Facturación del periodo ' + PER.curLong() + ' en cada año.' + (yrs.some((y) => !y.completo) ? ' * Año incompleto: los datos empiezan en enero de 2021.' : '') + ' «Var. total» compara el primer año con el último.';
      }
    }
    const feed = ok('actividad_hoy');
    if (feed) {
      NZ.table($('#t-feed'), feed, {
        importe: { num: true, fmt: NZ.eur },
        negocio: { render: (td, r) => { NZ.chip(td, r.negocio); td.firstChild.style.color = C()[{ Inmobiliario: 0, Hotelero: 1, Bodegas: 2 }[r.negocio]]; } },
      }, { key: 'id' });
    }
  }

  // ---------- INMOBILIARIO ----------
  const ESTADO_COLOR = () => ({ Vendida: C()[0], Reservada: C()[2], Disponible: 'var(--color-fg-muted)', Escriturada: C()[1] });
  function promoSel(promos) {
    const sel = $('#sel-promo');
    if (!sel._filled) {
      sel._filled = true;
      sel.replaceChildren();
      [['En curso', 'Promociones en curso'], ['Entregada', 'Promociones entregadas']].forEach(([st, lab]) => {
        const g = document.createElement('optgroup');
        g.label = lab;
        promos.filter((p) => p.estado === st).forEach((p) => g.appendChild(new Option(p.promocion + ' · ' + p.ciudad, p.id)));
        sel.appendChild(g);
      });
    }
    sel.value = P().promo || '';
  }
  function drawInmo() {
    const promos = ok('promociones');
    const promo = P().promo;
    // map
    const mapBox = $('#ch-mapa');
    if (promos) {
      NZ.legend($('#lg-mapa'), [{ name: 'En curso', color: C()[0] }, { name: 'Entregada', color: C()[1] }]);
      NZ.map(mapBox, promos, {
        size: (d) => d.viviendas,
        color: (d) => (d.estado === 'En curso' ? C()[0] : C()[1]),
        active: (d) => d.id === promo,
        onClick: (d) => setP({ promo: d.id }),
        tip: (d) => [d.promocion, d.zona + ' · ' + d.ciudad + ' (' + d.provincia + ')', d.estado + ' · entrega ' + d.entrega,
          NZ.int(d.viviendas) + ' viviendas' + (d.estado === 'En curso' ? ' · ' + NZ.int(d.vendidas) + ' vendidas, ' + NZ.int(d.reservadas) + ' reservadas' : ''),
          'Facturación: ' + NZ.eurC(d.facturacion)],
      });
      promoSel(promos);
    } else failed(mapBox, 'promociones');
    // reservations
    if (PER.ready) {
      const ch = PER.chart((a, b) => PER.sum('inmo.reservas', a, b));
      const ser = yearSeries(ch);
      legendYears($('#lg-reservas'), ser);
      plot($('#ch-reservas'), ch, ser, { fmtY: NZ.int, fmtTip: (v) => NZ.int(v) + ' reservas' });
      const ac = PER.chart((a, b) => PER.sum('inmo.reservas', a, b), { cumulative: true });
      NZ.lines($('#ch-reservas-acum'), ac.xs, yearSeries(ac), { fmtY: NZ.int, xLabel: ac.label, tipTitle: ac.tip, height: 170, fmtTip: (v) => NZ.int(v) + ' viviendas' });
    }
    // tables
    if (promos) {
      const mini = (td, r) => {
        const w = NZ.el('span', 'nz-mini');
        const t = NZ.el('span', 'nz-mini-t');
        const b = NZ.el('span', 'nz-mini-b');
        b.style.width = r.pct_comercializado * 100 + '%';
        b.style.background = C()[0];
        t.appendChild(b);
        w.append(t, document.createTextNode(NZ.pct(r.pct_comercializado, 0)));
        td.replaceChildren(w);
      };
      NZ.table($('#t-promos-curso'), promos, {
        viviendas: { num: true, fmt: NZ.int }, vendidas: { num: true, fmt: NZ.int }, reservadas: { num: true, fmt: NZ.int }, disponibles: { num: true, fmt: NZ.int },
        pct_comercializado: { num: true, render: mini }, facturacion: { num: true, fmt: NZ.eurC }, valor_disponible: { num: true, fmt: NZ.eurC }, precio_medio: { num: true, fmt: NZ.eur },
      }, { key: 'id', filter: (r) => r.estado === 'En curso', sortField: 'facturacion', active: (r) => r.id === promo, onRow: (r) => { setP({ promo: r.id }); $('#card-vivs').scrollIntoView({ behavior: 'smooth' }); } });
      NZ.table($('#t-promos-entregadas'), promos, {
        viviendas: { num: true, fmt: NZ.int }, facturacion_escriturada: { num: true, fmt: NZ.eurC }, precio_medio: { num: true, fmt: NZ.eur },
      }, { key: 'id', filter: (r) => r.estado === 'Entregada', sortField: 'entrega', active: (r) => r.id === promo, onRow: (r) => { setP({ promo: r.id }); $('#card-vivs').scrollIntoView({ behavior: 'smooth' }); } });
      // promo tiles
      const p = promos.find((x) => x.id === promo) || promos[0];
      const w = NZ.where({ id: p.id });
      const ent = p.estado === 'Entregada';
      NZ.mark($('#pt-viv'), 'promociones', 'viviendas', w);
      NZ.mark($('#pt-loc'), 'promociones', 'ciudad', w);
      NZ.mark($('#pt-ven'), 'promociones', ent ? 'escrituradas' : 'vendidas', w);
      NZ.mark($('#pt-res'), 'promociones', 'reservadas', w);
      NZ.mark($('#pt-dis'), 'promociones', 'disponibles', w);
      NZ.mark($('#pt-fac'), 'promociones', 'facturacion', w);
      NZ.mark($('#pt-pm'), 'promociones', 'precio_medio', w);
      $('#n-vivs').textContent = p.promocion + ' · ' + p.zona + ', ' + p.ciudad + ' · ' + (ent ? 'entregada ' + p.entrega : 'entrega prevista ' + p.entrega) + ' · ' + p.fuente_viviendas + '.';
      $$('#promo-tiles .nz-big').forEach((e) => e.classList.remove('dash-skeleton'));
      // promo reservations in the period
      const vv = ok('viviendas');
      const box = $('#ch-promo-res');
      if (vv && PER.ready) {
        const dates = vv.filter((x) => x.promo_id === p.id && x.fecha_reserva).map((x) => x.fecha_reserva);
        const iso = (d) => d.toISOString().slice(0, 10);
        const ch = PER.chart((a, b) => { const x = iso(a), z = iso(b); return dates.filter((d) => d >= x && d <= z).length; });
        const ser = yearSeries(ch);
        if (!ser.some((s) => s.values.some((v) => v))) empty(box, 'Sin reservas de esta promoción en el periodo elegido.');
        else plot(box, ch, ser, { fmtY: NZ.int, height: 170, fmtTip: (v) => NZ.int(v) + ' reservas' });
      }
    }
    const viv = ok('viviendas');
    if (viv) {
      const est = $('#sel-estado').value, q = $('#q-viv').value.trim().toLowerCase();
      const all = viv.filter((v) => v.promo_id === promo);
      NZ.table($('#t-vivs'), all, {
        dormitorios: { num: true, fmt: NZ.int }, m2: { num: true, fmt: NZ.int }, precio: { num: true, fmt: NZ.eur },
        estado: { render: (td, r) => { NZ.chip(td, r.estado); td.firstChild.style.color = ESTADO_COLOR()[r.estado]; } },
        fecha_reserva: { fmt: NZ.fecha },
      }, { key: 'id', count: $('#c-vivs'), filter: (r) => (!est || r.estado === est) && (!q || (r.vivienda + ' ' + r.tipologia).toLowerCase().includes(q)) });
    }
  }

  // ---------- PANTICOSA ----------
  const YEARS = () => [['2026', C()[0], false], ['2025', C()[1], false], ['2024', MUTED, true]];
  function drawHotel() {
    const h = P().hotel || 'Total';
    $$('#seg-hotel button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === h)));
    const w = NZ.where({ hotel: h });
    $$('#hotel-tiles [data-k]').forEach((el) => NZ.mark(el, 'hotel_resumen', el.dataset.k, w));
    $$('#hotel-tiles [data-d]').forEach((el) => NZ.mark(el, 'hotel_variaciones', 'var_' + el.dataset.d, w));
    if (PER.ready) {
      const ser = (fn) => { const ch = PER.chart(fn); return [ch, yearSeries(ch)]; };
      const [c1, s1] = ser((a, b) => { const x = PER.hotel(h, a, b); return x.disp ? x.noches / x.disp : null; });
      legendYears($('#lg-ocupacion'), s1);
      NZ.lines($('#ch-ocupacion'), c1.xs, s1, { fmtY: (v) => NZ.pct(v, 0), fmtTip: (v) => NZ.pct(v), xLabel: c1.label, tipTitle: c1.tip });
      const [c2, s2] = ser((a, b) => PER.hotel(h, a, b).hu);
      plot($('#ch-huespedes'), c2, s2, { fmtY: NZ.numC, fmtTip: NZ.int });
      const [c3, s3] = ser((a, b) => PER.hotel(h, a, b).ing);
      NZ.lines($('#ch-ingresos-aloj'), c3.xs, s3, { fmtY: NZ.eurC, fmtTip: NZ.eur, xLabel: c3.label, tipTitle: c3.tip });
    }
    // guests by origin
    $('#s-origen').textContent = (h === 'Total' ? 'todo el balneario' : h) + ' · alojamiento · ' + PER.curLong() + ' vs ' + PER.cmpShort().toLowerCase();
    $$('#origen-tiles [data-k]').forEach((el) => NZ.mark(el, 'hotel_origen_ambito', el.dataset.k, NZ.where({ id: h + '|' + el.dataset.a })));
    const ho = ok('hotel_origen');
    if (ho) {
      const rows = ho.filter((o) => o.hotel === h);
      const top = rows.filter((o) => o.ambito === 'Internacional' && o.origen !== 'Resto del mundo').sort((a, b) => b.facturacion - a.facturacion)[0];
      if (top) {
        const w = NZ.where({ id: top.id });
        NZ.mark($('#or-top'), 'hotel_origen', 'origen', w);
        NZ.mark($('#or-top-f'), 'hotel_origen', 'facturacion', w);
        NZ.mark($('#or-top-c'), 'hotel_origen', 'cuota', w);
      }
      const max = d3.max(rows, (o) => o.facturacion) || 1;
      const spec = {
        huespedes: { num: true, fmt: NZ.int }, noches: { num: true, fmt: NZ.int },
        estancia_media: { num: true, fmt: (v) => (v == null ? '—' : v.toFixed(2).replace('.', ',')) },
        facturacion: { num: true, render: (td, r) => {
          const w = NZ.el('span', 'nz-mini');
          const t = NZ.el('span', 'nz-mini-t');
          const b = NZ.el('span', 'nz-mini-b');
          b.style.width = (r.facturacion / max) * 100 + '%';
          b.style.background = r.ambito === 'Nacional' ? C()[0] : C()[1];
          t.appendChild(b);
          w.append(t, NZ.el('span', 'nz-mini-v', NZ.eurC(r.facturacion)));
          td.replaceChildren(w);
        } },
        cuota: { num: true, fmt: (v) => NZ.pct(v) },
        variacion: { num: true, render: NZ.deltaRender('variacion') },
      };
      NZ.table($('#t-origen-nac'), ho, spec, { key: 'id', filter: (o) => o.hotel === h && o.ambito === 'Nacional', sortField: 'facturacion' });
      NZ.table($('#t-origen-int'), ho, spec, { key: 'id', filter: (o) => o.hotel === h && o.ambito === 'Internacional', sortField: 'facturacion' });
    }
    const otb = ok('hotel_reservas_futuras');
    if (otb) {
      NZ.legend($('#lg-otb'), [{ name: 'Reservado a hoy', color: C()[0] }, { name: 'Mismo día de 2025', color: MUTED }]);
      NZ.cols($('#ch-otb'), otb.map((r) => r.mes), [
        { name: 'Reservado a hoy', color: C()[0], values: otb.map((r) => r.noches_reservadas) },
        { name: 'Mismo día 2025', color: MUTED, values: otb.map((r) => r.noches_mismo_dia_ant) },
      ], { fmtY: NZ.numC, fmtTip: (v) => NZ.int(v) + ' noches', xLabel: NZ.mes });
    } else failed($('#ch-otb'), 'hotel_reservas_futuras');
    const pk = ok('hotel_pickup');
    if (pk) {
      NZ.lines($('#ch-pickup'), pk.map((r) => r.semana), [
        { name: '2026', color: C()[0], values: pk.map((r) => r.reservas_creadas) },
        { name: '2025', color: MUTED, values: pk.map((r) => r.reservas_creadas_ant) },
      ], { fmtY: NZ.int, xLabel: (s) => NZ.fecha(s).replace(/ \d{4}$/, ''), height: 170, tipTitle: (s) => 'Semana del ' + NZ.fecha(s) });
    } else failed($('#ch-pickup'), 'hotel_pickup');
    const pr = ok('hotel_puntos_resumen');
    const punto = P().punto || 'Termas de Tiberio';
    const TIPO = { Restaurante: 0, Bar: 1, 'Cafetería': 2, Buffet: 3, Spa: 4 };
    if (pr) {
      NZ.hbars($('#ch-puntos'), pr.slice().sort((a, b) => b.ingresos - a.ingresos), {
        label: (r) => r.punto, value: (r) => r.ingresos, fmt: NZ.eurC,
        color: (r) => C()[TIPO[r.tipo]],
        sub: (r) => ({ text: NZ.dpct(r.variacion), cls: r.variacion > 0 ? 'nz-good' : 'nz-bad' }),
        active: (r) => r.punto === punto, onClick: (r) => setP({ punto: r.punto }),
      });
      NZ.table($('#t-puntos'), pr, {
        ingresos: { num: true, fmt: NZ.eurC }, ingresos_ant: { num: true, fmt: NZ.eurC }, variacion: { num: true, render: NZ.deltaRender('variacion') },
        coste_directo: { num: true, fmt: NZ.eurC }, beneficio_bruto: { num: true, fmt: NZ.eurC }, margen: { num: true, fmt: (v) => NZ.pct(v) },
      }, { key: 'punto', sortField: 'ingresos', active: (r) => r.punto === punto, onRow: (r) => setP({ punto: r.punto }) });
    } else failed($('#ch-puntos'), 'hotel_puntos_resumen');
    $('#h-punto-mes').textContent = punto + ' · ingresos';
    if (PER.ready) {
      const pi = PER.puntoIdx(punto);
      const ch = PER.chart((a, b) => PER.punto(pi, a, b).ing);
      NZ.lines($('#ch-punto-mes'), ch.xs, yearSeries(ch), { fmtY: NZ.eurC, fmtTip: NZ.eur, xLabel: ch.label, tipTitle: ch.tip });
    }
    // consumos: spa, comida, bebida y punto de venta
    if (window.CONS) CONS.draw({ ok, failed, P, setP, NZ, C });
    const hp = ok('hotel_productos');
    if (hp) {
      const sel = $('#sel-punto');
      if (pr) {
        sel.replaceChildren(...pr.slice().sort((a, b) => b.ingresos - a.ingresos).map((r) => new Option(r.punto, r.punto)));
        sel.value = punto;
      }
      $('#h-carta').textContent = 'Carta de ' + punto;
      NZ.table($('#t-carta'), hp, {
        ranking: { num: true, fmt: (v) => (v == null ? '—' : NZ.int(v)) }, precio: { num: true, fmt: NZ.eur1 },
        unidades: { num: true, fmt: NZ.int }, unidades_ant: { num: true, fmt: NZ.int },
        variacion: { num: true, render: (td, r) => { if (r.variacion == null) td.textContent = '—'; else NZ.deltaRender('variacion')(td, r); } },
        ingresos: { num: true, fmt: NZ.eur }, margen: { num: true, fmt: (v) => NZ.pct(v) },
      }, { key: 'id', filter: (r) => r.punto === punto, sortField: 'ingresos', count: $('#c-carta') });
    } else failed($('#t-carta'), 'hotel_productos');
  }

  // ---------- BODEGAS ----------
  const TIPOV = { Tinto: 0, Blanco: 2, Rosado: 4, Dulce: 3, Frizzante: 5 };
  function drawBodegas() {
    const vista = P().bvista || 'bodega';
    $$('#seg-bvista button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === vista)));
    $('#b-clasica').hidden = vista === 'dist';
    $('#b-dist').hidden = vista !== 'dist';
    $('#seg-bodega').hidden = vista === 'dist';
    if (vista === 'dist') { if (window.DIST) DIST.draw({ ok, failed, P, setP, NZ, C }); return; }
    const b = P().bodega || 'Enate';
    $$('#seg-bodega button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === b)));
    const wb = NZ.where({ bodega: b });
    $$('#vino-tiles [data-k]').forEach((el) => NZ.mark(el, 'vino_resumen', el.dataset.k, wb));
    $$('#vino-tiles [data-d]').forEach((el) => NZ.mark(el, 'vino_resumen', el.dataset.d, wb));
    // annual
    const an = ok('vino_anual');
    if (an) {
      const rows = an.filter((r) => r.bodega === b);
      NZ.legend($('#lg-vino-anual'), [{ name: 'Facturación', color: C()[0] }, { name: 'Beneficio bruto', color: C()[1] }]);
      NZ.cols($('#ch-vino-anual'), rows.map((r) => r.anio), [
        { name: 'Facturación', color: C()[0], values: rows.map((r) => r.facturacion) },
        { name: 'Beneficio bruto', color: C()[1], values: rows.map((r) => r.beneficio_bruto) },
      ], { fmtY: NZ.eurC, xLabel: (a) => (a.startsWith('2026') ? '2026*' : a), tipTitle: (a) => a });
    } else failed($('#ch-vino-anual'), 'vino_anual');
    if (PER.ready) {
      const bi = PER.bodegaIdx(b);
      const ch = PER.chart((x, z) => PER.bodega(bi, x, z).fact);
      const ser = yearSeries(ch);
      legendYears($('#lg-vino-mes'), ser);
      NZ.lines($('#ch-vino-mes'), ch.xs, ser, { fmtY: NZ.eurC, fmtTip: NZ.eur, xLabel: ch.label, tipTitle: ch.tip });
    }
    // references
    const refs = ok('vino_referencias');
    const ref = P().ref;
    if (refs) {
      const rr = refs.filter((r) => r.bodega === b).sort((x, y) => y.facturacion - x.facturacion);
      NZ.hbars($('#ch-refs'), rr, {
        label: (r) => r.referencia, value: (r) => r.facturacion, fmt: NZ.eurC, color: (r) => C()[TIPOV[r.tipo] ?? 0],
        sub: (r) => ({ text: NZ.dpct(r.variacion), cls: r.variacion > 0 ? 'nz-good' : 'nz-bad' }),
        active: (r) => r.referencia === ref, onClick: (r) => { setP({ ref: r.referencia === ref ? null : r.referencia }); $('#b-provincias').scrollIntoView({ behavior: 'smooth' }); },
      });
      NZ.table($('#t-refs'), refs, {
        pvp: { num: true, fmt: NZ.eur1 }, botellas: { num: true, fmt: NZ.int }, botellas_ant: { num: true, fmt: NZ.int }, facturacion: { num: true, fmt: NZ.eurC },
        variacion: { num: true, render: NZ.deltaRender('variacion') }, beneficio_bruto: { num: true, fmt: NZ.eurC }, margen: { num: true, fmt: (v) => NZ.pct(v) },
      }, { key: 'referencia', filter: (r) => r.bodega === b, sortField: 'facturacion', active: (r) => r.referencia === ref });
      const sel = $('#sel-ref');
      sel.replaceChildren(new Option('Todas las referencias', ''), ...rr.map((r) => new Option(r.referencia, r.referencia)));
      sel.value = ref && rr.some((r) => r.referencia === ref) ? ref : '';
    } else failed($('#ch-refs'), 'vino_referencias');
    // provinces
    const vp = ok('vino_provincias'), vpr = ok('vino_provincia_referencia');
    const provBox = $('#ch-prov');
    if (vp && vpr) {
      if (ref) {
        $('#h-prov').textContent = 'Facturación por provincia · ' + ref;
        const rows = vpr.filter((r) => r.referencia === ref).sort((x, y) => y.facturacion - x.facturacion);
        NZ.hbars(provBox, rows, { label: (r) => r.provincia, value: (r) => r.facturacion, fmt: NZ.eurC, color: () => C()[0], sub: (r) => ({ text: NZ.int(r.botellas) + ' bot.' }) });
      } else {
        $('#h-prov').textContent = 'Facturación por provincia · todas las referencias';
        const rows = vp.filter((r) => r.bodega === b);
        NZ.hbars(provBox, rows, { label: (r) => r.provincia, value: (r) => r.facturacion, fmt: NZ.eurC, color: () => C()[0], sub: (r) => ({ text: NZ.dpct(r.variacion), cls: r.variacion > 0 ? 'nz-good' : 'nz-bad' }) });
      }
      const provOrder = vp.filter((r) => r.bodega === b).map((r) => r.provincia);
      const refOrder = refs ? refs.filter((r) => r.bodega === b).sort((x, y) => y.facturacion - x.facturacion).map((r) => r.referencia) : [];
      NZ.heat($('#ch-prov-heat'), vpr.filter((r) => r.bodega === b), {
        row: (r) => r.referencia, col: (r) => r.provincia, value: (r) => r.botellas, rows: refOrder, cols: provOrder, unit: ' botellas', corner: 'Referencia',
      });
    } else { failed(provBox, 'vino_provincias', 'vino_provincia_referencia'); failed($('#ch-prov-heat'), 'vino_provincia_referencia'); }
    // export
    const vpa = ok('vino_paises'), ver = ok('vino_export_referencia');
    if (vpa && ver) {
      const pr = vpa.filter((r) => r.bodega === b);
      const pais = P().pais && pr.some((r) => r.pais === P().pais) ? P().pais : pr[0] && pr[0].pais;
      NZ.hbars($('#ch-paises'), pr, {
        label: (r) => r.pais, value: (r) => r.facturacion, fmt: NZ.eurC, color: () => C()[1],
        sub: (r) => ({ text: NZ.dpct(r.variacion), cls: r.variacion > 0 ? 'nz-good' : 'nz-bad' }),
        active: (r) => r.pais === pais, onClick: (r) => setP({ pais: r.pais }),
      });
      const sel = $('#sel-pais');
      sel.replaceChildren(...pr.map((r) => new Option(r.pais, r.pais)));
      sel.value = pais || '';
      $('#h-pais-refs').textContent = 'Referencias vendidas en ' + (pais || '—');
      NZ.table($('#t-pais-refs'), ver, {
        botellas: { num: true, fmt: NZ.int }, botellas_ant: { num: true, fmt: NZ.int }, facturacion: { num: true, fmt: NZ.eurC }, facturacion_ant: { num: true, fmt: NZ.eurC },
      }, { key: 'id', filter: (r) => r.bodega === b && r.pais === pais, sortField: 'facturacion' });
      const refOrder = refs ? refs.filter((r) => r.bodega === b).sort((x, y) => y.facturacion_export - x.facturacion_export).map((r) => r.referencia) : [];
      NZ.heat($('#ch-exp-heat'), ver.filter((r) => r.bodega === b), {
        row: (r) => r.referencia, col: (r) => r.pais, value: (r) => r.botellas, rows: refOrder.filter((x) => ver.some((r) => r.referencia === x)), cols: pr.map((r) => r.pais), unit: ' botellas', corner: 'Referencia', color: C()[1],
      });
    } else { failed($('#ch-paises'), 'vino_paises'); failed($('#ch-exp-heat'), 'vino_export_referencia'); }
    // direct channels
    const cr = ok('vino_canales_resumen');
    const tiles = $('#canal-tiles');
    if (cr) {
      tiles.replaceChildren();
      cr.filter((r) => r.bodega === b).forEach((r) => {
        const w = NZ.where({ id: r.id });
        const t = NZ.el('div', 'nz-tile');
        t.appendChild(NZ.el('div', 'nz-tl', r.canal));
        const big = NZ.el('div', 'nz-big');
        NZ.mark(big, 'vino_canales_resumen', 'facturacion', w);
        const meta = NZ.el('div', 'nz-meta');
        const d = NZ.el('span');
        NZ.mark(d, 'vino_canales_resumen', 'variacion', w);
        const q = NZ.el('span');
        const qn = NZ.el('span');
        NZ.mark(qn, 'vino_canales_resumen', 'cantidad', w);
        q.append(qn, document.createTextNode(' ' + r.unidad));
        const tk = NZ.el('span');
        const tkn = NZ.el('span');
        NZ.mark(tkn, 'vino_canales_resumen', 'ticket_medio', w);
        tk.append(document.createTextNode('media '), tkn);
        meta.append(d, q, tk);
        t.append(big, meta);
        tiles.appendChild(t);
      });
    }
    if (PER.ready) {
      const bi = PER.bodegaIdx(b);
      [['#ch-canal-online', (x) => x.online.f, NZ.eurC, NZ.eur], ['#ch-canal-visitas', (x) => x.visitas.q, NZ.int, (v) => NZ.int(v) + ' personas'], ['#ch-canal-tienda', (x) => x.tienda.f, NZ.eurC, NZ.eur]].forEach(([sel, f, fm, ft]) => {
        const ch = PER.chart((x, z) => f(PER.direct(bi, x, z)));
        NZ.lines($(sel), ch.xs, yearSeries(ch), { fmtY: fm, fmtTip: ft, xLabel: ch.label, tipTitle: ch.tip, height: 170 });
      });
    }
  }

  // ---------- main ----------
  function draw() {
    try {
      if (tab === 'inicio') drawInicio();
      else if (tab === 'inmobiliario') drawInmo();
      else if (tab === 'marketing') { if (window.MKT) MKT.draw({ ok, failed, P, setP, NZ, C }); }
      else if (tab === 'panticosa') drawHotel();
      else if (tab === 'bodegas') drawBodegas();
    } finally {
      fillMarks();
      NZ.slides();
    }
  }
  if (window.CONS) CONS.wire(setP);
  if (window.MKT) MKT.wire(setP);
  if (window.DIST) DIST.wire(setP);
  $$('#seg-bvista button').forEach((b) => b.addEventListener('click', () => setP({ bvista: b.dataset.v })));
  dash.onData(draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => NZ.slides());

  // open the place named in the link
  const hash = decodeURIComponent(location.hash.slice(1).split('?')[0]);
  if (hash) {
    const el = document.getElementById(hash);
    const sec = el && el.closest('section[data-page]');
    if (sec) showTab(sec.dataset.page, hash !== sec.id ? hash : null);
  }
})();
