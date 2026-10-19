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
  dash.calc('vino_totales', {
    title: 'Botellas de las tres bodegas',
    description: 'Botellas vendidas por Enate, Laus y Las Moradas sumadas, este año y el mismo periodo de 2025.',
    inputs: ['vino_resumen'],
    fn: (vino_resumen) => [{
      botellas: vino_resumen.reduce((t, r) => t + r.botellas, 0),
      botellas_ant: vino_resumen.reduce((t, r) => t + r.botellas_ant, 0),
    }],
  });
  dash.calc('hotel_mes_total', {
    title: 'Hotel por mes, con total',
    description: 'Los meses de cada hotel más una fila "Total" por mes que suma los dos hoteles.',
    inputs: ['hotel_mes'],
    fn: (hotel_mes) => {
      const by = new Map();
      hotel_mes.forEach((r) => {
        const t = by.get(r.mes) || { mes: r.mes, hotel: 'Total', habitaciones_disponibles: 0, noches_vendidas: 0, ingresos_alojamiento: 0, huespedes: 0 };
        t.habitaciones_disponibles += r.habitaciones_disponibles;
        t.noches_vendidas += r.noches_vendidas;
        t.ingresos_alojamiento += r.ingresos_alojamiento;
        t.huespedes += r.huespedes;
        by.set(r.mes, t);
      });
      const tot = [...by.values()].map((t) => ({ ...t, ocupacion: t.noches_vendidas / t.habitaciones_disponibles }));
      return hotel_mes.map((r) => ({ mes: r.mes, hotel: r.hotel, habitaciones_disponibles: r.habitaciones_disponibles, noches_vendidas: r.noches_vendidas, ingresos_alojamiento: r.ingresos_alojamiento, huespedes: r.huespedes, ocupacion: r.ocupacion })).concat(tot);
    },
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
    if (['margen', 'ocupacion', 'ocupacion_ant', 'pct_export', 'pct_comercializado'].includes(f)) return (v) => NZ.pct(v);
    if (['adr', 'adr_ant', 'revpar', 'revpar_ant', 'ticket_medio'].includes(f)) return NZ.eur1;
    if (f === 'precio_medio' || f === 'precio') return NZ.eur;
    if (/facturacion|beneficio|cartera|ingresos|valor|coste|importe/.test(f)) return NZ.eurC;
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
  const setP = (o) => dash.setParams(o);
  const empty = (box, text) => {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    box.appendChild(NZ.el('div', 'nz-empty', text));
  };

  // ---------- tabs & links ----------
  const TABS = ['inicio', 'inmobiliario', 'panticosa', 'bodegas'];
  let tab = 'inicio';
  function showTab(t, scrollTo) {
    tab = t;
    TABS.forEach((x) => {
      $('#' + x).hidden = x !== t;
      $('#tab-' + x).setAttribute('aria-selected', String(x === t));
    });
    dash.setLink(scrollTo || t);
    draw();
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
  $('#sel-punto').addEventListener('change', (e) => setP({ punto: e.target.value }));
  $('#sel-ref').addEventListener('change', (e) => setP({ ref: e.target.value || null }));
  $('#sel-pais').addEventListener('change', (e) => setP({ pais: e.target.value || null }));

  // ---------- INICIO ----------
  function drawInicio() {
    const gm = ok('grupo_mes');
    const boxes = [['Inmobiliario', '#ch-grupo-inm', 0], ['Hotelero', '#ch-grupo-hot', 1], ['Bodegas', '#ch-grupo-bod', 2]];
    if (gm) {
      const meses = [...new Set(gm.map((r) => r.mes))].sort();
      boxes.forEach(([neg, sel, ci]) => {
        const rows = new Map(gm.filter((r) => r.negocio === neg).map((r) => [r.mes, r.facturacion]));
        NZ.cols($(sel), meses, [{ name: neg, color: C()[ci], values: meses.map((m) => rows.get(m) ?? null) }],
          { fmtY: NZ.eurC, xLabel: NZ.mes, height: 170, tipTitle: (m) => NZ.mes(m) + (m === '2026-10' ? ' (hasta el 19)' : '') });
      });
    } else boxes.forEach(([, sel]) => failed($(sel), 'grupo_mes'));
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
    const rt = ok('reservas_mes_total');
    if (rt) {
      const ms = rt.map((r) => r.mes);
      NZ.cols($('#ch-reservas'), ms, [{ name: 'Reservas', color: C()[0], values: rt.map((r) => r.reservas) }],
        { fmtY: NZ.int, xLabel: NZ.mes, tipTitle: (m) => NZ.mes(m) + (m === '2026-10' ? ' (hasta el 19)' : ''), fmtTip: (v) => NZ.int(v) + ' reservas' });
      NZ.lines($('#ch-reservas-acum'), ms, [{ name: 'Acumulado', color: C()[0], values: rt.map((r) => r.acumulado) }],
        { fmtY: NZ.int, xLabel: NZ.mes, height: 170, fmtTip: (v) => NZ.int(v) + ' viviendas' });
    } else { failed($('#ch-reservas'), 'reservas_mes_total'); failed($('#ch-reservas-acum'), 'reservas_mes_total'); }
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
      // promo monthly reservations
      const rm = ok('reservas_mes');
      const box = $('#ch-promo-res');
      if (rm) {
        const rows = rm.filter((r) => r.promo_id === p.id);
        if (!rows.length) empty(box, 'Promoción ya entregada: no tiene reservas en 2025–2026.');
        else NZ.cols(box, rows.map((r) => r.mes), [{ name: 'Reservas', color: C()[0], values: rows.map((r) => r.reservas) }],
          { fmtY: NZ.int, xLabel: NZ.mes, height: 170, fmtTip: (v) => NZ.int(v) + ' reservas' });
      } else failed(box, 'reservas_mes');
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
    const hm = ok('hotel_mes_total');
    const meses = d3.range(1, 13);
    const lab = (m) => NZ.MESES[m - 1];
    const series = (field) => YEARS().map(([y, col, thin]) => {
      const rows = new Map(hm.filter((r) => r.hotel === h && r.mes.startsWith(y)).map((r) => [+r.mes.slice(5), r[field]]));
      return { name: y, color: col, thin, values: meses.map((m) => rows.get(m) ?? null) };
    });
    if (hm) {
      NZ.lines($('#ch-ocupacion'), meses, series('ocupacion'), { fmtY: (v) => NZ.pct(v, 0), fmtTip: (v) => NZ.pct(v), xLabel: lab });
      const hs = series('huespedes').slice(0, 2).reverse();
      NZ.cols($('#ch-huespedes'), meses, hs.map((s) => ({ ...s, color: s.name === '2026' ? C()[0] : MUTED })), { fmtY: NZ.numC, fmtTip: NZ.int, xLabel: lab });
      NZ.lines($('#ch-ingresos-aloj'), meses, series('ingresos_alojamiento'), { fmtY: NZ.eurC, xLabel: lab });
    } else ['#ch-ocupacion', '#ch-huespedes', '#ch-ingresos-aloj'].forEach((s) => failed($(s), 'hotel_mes'));
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
    const pm = ok('hotel_puntos_mes');
    $('#h-punto-mes').textContent = punto + ' · ingresos por mes';
    if (pm) {
      const s = YEARS().map(([y, col, thin]) => {
        const rows = new Map(pm.filter((r) => r.punto === punto && r.mes.startsWith(y)).map((r) => [+r.mes.slice(5), r.ingresos]));
        return { name: y, color: col, thin, values: meses.map((m) => rows.get(m) ?? null) };
      });
      NZ.lines($('#ch-punto-mes'), meses, s, { fmtY: NZ.eurC, xLabel: lab });
    } else failed($('#ch-punto-mes'), 'hotel_puntos_mes');
    // best sellers from the menus
    const hp = ok('hotel_productos');
    if (hp) {
      const items = hp.filter((r) => r.categoria !== 'Resto');
      const top = items.slice().sort((a, b) => b.ingresos - a.ingresos).slice(0, 12);
      NZ.hbars($('#ch-top-balneario'), top, {
        label: (r) => r.producto + ' (' + r.punto + ')', value: (r) => r.ingresos, fmt: NZ.eurC,
        color: (r) => C()[TIPO[r.tipo]], sub: (r) => ({ text: NZ.int(r.unidades) + ' u.' }),
        active: (r) => r.punto === punto, onClick: (r) => { setP({ punto: r.punto }); $('#card-carta').scrollIntoView({ behavior: 'smooth' }); },
      });
      const spa = items.filter((r) => r.tipo === 'Spa' && r.categoria !== 'Circuito').sort((a, b) => b.unidades - a.unidades).slice(0, 12);
      NZ.hbars($('#ch-top-masajes'), spa, {
        label: (r) => r.producto + (r.punto === 'Spa Gran Hotel' ? ' (Gran Hotel)' : ' (Tiberio)'), value: (r) => r.unidades, fmt: (v) => NZ.int(v) + ' serv.',
        color: (r) => (r.punto === 'Spa Gran Hotel' ? C()[4] : C()[5]), sub: (r) => ({ text: NZ.eurC(r.ingresos) }),
      });
      const sel = $('#sel-punto');
      if (pr) {
        sel.replaceChildren(...pr.slice().sort((a, b) => b.ingresos - a.ingresos).map((r) => new Option(r.punto, r.punto)));
        sel.value = punto;
      }
      $('#h-carta').textContent = 'Ventas de la carta · ' + punto;
      NZ.table($('#t-carta'), hp, {
        ranking: { num: true, fmt: (v) => (v == null ? '—' : NZ.int(v)) }, precio: { num: true, fmt: NZ.eur1 },
        unidades: { num: true, fmt: NZ.int }, unidades_ant: { num: true, fmt: NZ.int },
        variacion: { num: true, render: (td, r) => { if (r.variacion == null) td.textContent = '—'; else NZ.deltaRender('variacion')(td, r); } },
        ingresos: { num: true, fmt: NZ.eur },
      }, { key: 'id', filter: (r) => r.punto === punto, sortField: 'ingresos', count: $('#c-carta') });
    } else { failed($('#ch-top-balneario'), 'hotel_productos'); failed($('#ch-top-masajes'), 'hotel_productos'); }
  }

  // ---------- BODEGAS ----------
  const TIPOV = { Tinto: 0, Blanco: 2, Rosado: 4, Dulce: 3, Frizzante: 5 };
  function drawBodegas() {
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
    const vm = ok('vino_mes');
    if (vm) {
      const rows = vm.filter((r) => r.bodega === b).sort((x, y) => x.mes - y.mes);
      NZ.lines($('#ch-vino-mes'), rows.map((r) => r.mes), [
        { name: '2026', color: C()[0], values: rows.map((r) => r.facturacion_2026) },
        { name: '2025', color: C()[1], values: rows.map((r) => r.facturacion_2025) },
        { name: '2024', color: MUTED, thin: true, values: rows.map((r) => r.facturacion_2024) },
      ], { fmtY: NZ.eurC, xLabel: (m) => NZ.MESES[m - 1] });
    } else failed($('#ch-vino-mes'), 'vino_mes');
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
    const cm = ok('vino_canales_mes');
    const chans = [['#ch-canal-online', 'facturacion_online', NZ.eurC], ['#ch-canal-visitas', 'visitantes', NZ.int], ['#ch-canal-tienda', 'facturacion_tienda', NZ.eurC]];
    if (cm) {
      const meses = d3.range(1, 13);
      chans.forEach(([sel, f, fm]) => {
        const s = YEARS().map(([y, col, thin]) => {
          const m = new Map(cm.filter((r) => r.bodega === b && r.mes.startsWith(y)).map((r) => [+r.mes.slice(5), r[f]]));
          return { name: y, color: col, thin, values: meses.map((k) => m.get(k) ?? null) };
        });
        NZ.lines($(sel), meses, s, { fmtY: fm, xLabel: (m) => NZ.MESES[m - 1], height: 170 });
      });
    } else chans.forEach(([sel]) => failed($(sel), 'vino_canales_mes'));
  }

  // ---------- main ----------
  function draw() {
    try {
      if (tab === 'inicio') drawInicio();
      else if (tab === 'inmobiliario') drawInmo();
      else if (tab === 'panticosa') drawHotel();
      else drawBodegas();
    } finally {
      fillMarks();
    }
  }
  dash.onData(draw);

  // open the place named in the link
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) {
    const el = document.getElementById(hash);
    const sec = el && el.closest('section[data-page]');
    if (sec) showTab(sec.dataset.page, hash !== sec.id ? hash : null);
  }
})();
