// Informes en PDF (comité de grupo e inmobiliario) con vista previa en un popup antes de descargar.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const NZ = () => window.NZ;
  const A4 = [595.28, 841.89], M = 42;
  const C = {
    ink: [0.11, 0.12, 0.14], mute: [0.5, 0.52, 0.56], line: [0.85, 0.86, 0.88], soft: [0.96, 0.96, 0.97],
    ok: [0.12, 0.55, 0.28], warn: [0.78, 0.5, 0], bad: [0.74, 0.14, 0.09], acc: [0.16, 0.36, 0.6],
    neg: [[0.15, 0.37, 0.62], [0.78, 0.45, 0.12], [0.45, 0.32, 0.6]], // Inmobiliario, Hotelero, Bodegas
  };
  const data = (id) => { const d = dash.data(id); return d && d.status === 'ok' ? d.data : null; };
  const perLabel = () => { try { return PER.ready ? PER.rango(PER.periods().cur) : 'Año en curso'; } catch (e) { return ''; } };
  const hoyLabel = () => { const d = new Date(); return d.getDate() + ' ' + NZ().MESES[d.getMonth()] + ' ' + d.getFullYear(); };

  // ---------- motor de dibujo ----------
  async function newDoc() {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
    const col = (c) => rgb(c[0], c[1], c[2]);
    let page, y;
    const W = A4[0], H = A4[1];
    const np = () => { page = doc.addPage(A4); y = H - M; };
    const san = (s) => String(s == null ? '' : s).replace(/−/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    const txt = (s, x, yy, o = {}) => { const f = o.bold ? FB : F, size = o.size || 10; let str = san(s); if (o.max) { while (f.widthOfTextAtSize(str, size) > o.max && str.length > 1) str = str.slice(0, -2) + '…'; } page.drawText(str, { x, y: yy, size, font: f, color: col(o.color || C.ink) }); return f.widthOfTextAtSize(str, size); };
    const txtR = (s, xr, yy, o = {}) => { const f = o.bold ? FB : F, size = o.size || 10, w = f.widthOfTextAtSize(san(s), size); txt(s, xr - w, yy, o); };
    const rect = (x, yy, w, h, c, o = {}) => page.drawRectangle({ x, y: yy, width: w, height: h, color: c ? col(c) : undefined, borderColor: o.border ? col(o.border) : undefined, borderWidth: o.border ? (o.bw || 0.6) : 0 });
    const lineH = (x1, x2, yy, c) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.6, color: col(c || C.line) });
    const need = (h) => { if (y - h < M + 24) { foot(); np(); head(doc._t, true); } };
    let FOOT = 'Maqueta · datos simulados. Grupo Nozar.';
    const foot = () => { lineH(M, W - M, M + 14, C.line); txt(FOOT, M, M + 3, { size: 7, color: C.mute }); txtR('Pág. ' + doc.getPageCount(), W - M, M + 3, { size: 7, color: C.mute }); };
    const head = (title, cont) => { txt('GRUPO NOZAR', M, H - M + 2, { size: 7.5, bold: true, color: C.acc }); txtR(hoyLabel(), W - M, H - M + 2, { size: 7.5, color: C.mute }); y = H - M - 6; if (!cont) { txt(title, M, y - 14, { size: 17, bold: true }); y -= 30; } else { y -= 6; } };
    const h2 = (s) => { need(30); txt(s, M, y - 12, { size: 12, bold: true, color: C.acc }); y -= 20; };
    const h3 = (s, sub) => { need(24); txt(s, M, y - 11, { size: 10.5, bold: true }); if (sub) txtR(sub, W - M, y - 11, { size: 8.5, color: C.mute }); y -= 17; };
    const band = (title, c, right) => { need(28); rect(M, y - 18, W - 2 * M, 18, c); txt(title, M + 8, y - 13, { size: 11, bold: true, color: [1, 1, 1] }); if (right) txtR(right, W - M - 8, y - 13, { size: 9, color: [1, 1, 1] }); y -= 26; };
    const tiles = (arr) => {
      need(54); const n = arr.length, gap = 8, w = (W - 2 * M - gap * (n - 1)) / n;
      arr.forEach((t, i) => { const x = M + i * (w + gap); rect(x, y - 46, w, 46, C.soft, { border: C.line }); if (t.bar) rect(x, y, w, 2.5, t.bar);
        txt(t.label, x + 8, y - 13, { size: 7.5, color: C.mute, max: w - 16 }); txt(t.value, x + 8, y - 30, { size: 14, bold: true, max: w - 16 }); if (t.sub) txt(t.sub, x + 8, y - 41, { size: 7, color: t.subcol || C.mute, max: w - 16 }); });
      y -= 56;
    };
    const table = (cols, rows) => {
      const total = cols.reduce((t, c) => t + c.w, 0), sc = (W - 2 * M) / total;
      const row = (cells, o = {}) => {
        need(16); let x = M; const yy = y;
        if (o.head) { rect(M, yy - 13, W - 2 * M, 15, C.soft); }
        cols.forEach((c, i) => { const cw = c.w * sc, cell = cells[i]; const val = cell && cell.v !== undefined ? cell.v : cell; const color = (cell && cell.c) || (o.head ? C.mute : C.ink); const bold = o.head || o.bold || (cell && cell.b);
          if (c.align === 'r') txtR(val, x + cw - 4, yy - 9, { size: o.head ? 7.5 : 8.5, bold, color, }); else txt(val, x + 4, yy - 9, { size: o.head ? 7.5 : 8.5, bold, color, max: cw - 8 });
          x += cw; });
        lineH(M, W - M, yy - 14, C.line); y -= 15;
      };
      row(cols.map((c) => c.title), { head: true });
      rows.forEach((r) => row(r, r._o || {}));
    };
    doc._t = ''; // título corriente
    return { doc, np, head, h2, h3, band, tiles, table, txt, txtR, skip: (h) => { y -= h; }, need: (h) => need(h), foot, setFoot: (s) => (FOOT = s), setTitle: (s) => (doc._t = s), C, y: () => y };
  }

  const eurC = (v) => NZ().eurC(v), eur = (v) => NZ().eur(v), int = (v) => NZ().int(v), pct = (v, d) => NZ().pct(v, d);

  const MARGEN_INMO = 0.23;
  const varTxt = (v) => ({ v: (v >= 0 ? '+' : '') + pct(v), c: v >= 0 ? C.ok : C.bad });
  const anio = (e) => String(e).slice(0, 4);

  // ---------- informe del comité de grupo ----------
  async function grupoPDF() {
    const g = data('grupo_resumen') || [], obj = data('objetivos') || [], vino = data('vino_resumen') || [], stock = data('vino_stock') || [];
    const ik = (data('inmo_kpis') || [])[0] || {}, can = data('hotel_canales') || [], suelos = data('suelos') || null;
    const promos = (data('promociones') || []).filter((p) => p.estado === 'En curso');
    const by = (n) => g.find((x) => x.negocio === n) || {};
    const d = await newDoc(); d.setTitle('Comité del Grupo'); d.setFoot('Maqueta · datos simulados. Informe para el comité del Grupo Nozar.');
    d.np(); d.head('Informe para el comité');
    d.txt('Periodo: ' + perLabel() + '  ·  Objetivos: del 1 de enero a hoy', M, d.y() - 2, { size: 9, color: C.mute }); d.skip(16);
    const G = by('Grupo');
    d.tiles([
      { label: 'Facturación del grupo', value: eurC(G.facturacion), sub: (G.variacion >= 0 ? '+' : '') + pct(G.variacion) + ' vs periodo anterior', subcol: G.variacion >= 0 ? C.ok : C.bad, bar: C.acc },
      { label: 'Beneficio bruto', value: eurC(G.beneficio_bruto), sub: 'margen ' + pct(G.margen) },
      { label: 'Negocios', value: '3', sub: 'Inmobiliario · Hotelero · Bodegas' },
    ]);
    d.h2('Objetivos del año');
    d.table(
      [{ title: 'Negocio', w: 20 }, { title: 'Real a hoy', w: 16, align: 'r' }, { title: 'Objetivo', w: 16, align: 'r' }, { title: '% obj.', w: 10, align: 'r' }, { title: 'Proyección', w: 16, align: 'r' }, { title: 'Margen', w: 13, align: 'r' }, { title: 'Estado', w: 14, align: 'r' }],
      obj.map((o) => { const cls = o.avance_proy >= 1 ? C.ok : o.avance_proy >= 0.9 ? C.warn : C.bad; const est = o.avance_proy >= 1 ? 'Cumple' : o.avance_proy >= 0.9 ? 'Justo' : 'Corto';
        return [o.negocio, eurC(o.real), eurC(o.objetivo), pct(o.avance, 0), { v: pct(o.avance_proy, 0), c: cls }, { v: pct(o.margen) + '/' + pct(o.margen_obj, 0), c: o.cumple_margen ? C.ok : C.bad }, { v: est, c: cls, b: true }]; })
    );

    // ===== Inmobiliario =====
    const I = by('Inmobiliario'), oI = obj.find((o) => o.negocio === 'Inmobiliario') || {};
    const espera = promos.reduce((t, p) => t + p.facturacion + p.valor_disponible, 0), benef = espera * MARGEN_INMO;
    d.band('Inmobiliario', C.neg[0], perLabel());
    d.tiles([
      { label: 'Facturación escriturada', value: eurC(I.facturacion), sub: varTxt(I.variacion).v, subcol: varTxt(I.variacion).c },
      { label: 'Comercializado (en curso)', value: pct((ik.comercializadas || 0) / (ik.viviendas_en_curso || 1), 0), sub: int(ik.comercializadas) + ' de ' + int(ik.viviendas_en_curso) },
      { label: 'Facturación esperada', value: eurC(espera), sub: 'cartera de promociones en curso' },
      { label: 'Beneficio esperado', value: eurC(benef), sub: 'margen ' + pct(MARGEN_INMO, 0) },
    ]);
    d.table(
      [{ title: 'Indicador', w: 30 }, { title: 'Valor', w: 15, align: 'r' }, { title: 'Indicador', w: 30 }, { title: 'Valor', w: 15, align: 'r' }],
      [['Promociones en curso', int(ik.promos_en_curso), 'Promociones entregadas (hist.)', int(ik.promos_entregadas)],
       ['Viviendas en curso', int(ik.viviendas_en_curso), 'Viviendas entregadas (hist.)', int(ik.viviendas_entregadas)],
       ['Vendidas (contrato)', int(ik.vendidas), 'Reservadas', int(ik.reservadas)],
       ['Disponibles', int(ik.disponibles), 'Margen', pct(I.margen)],
       ['Cartera pendiente de escriturar', eurC(ik.cartera_pendiente), 'Beneficio bruto', eurC(I.beneficio_bruto)]]
    );
    d.h3('Promociones en curso (por entrega)');
    const pr = promos.map((p) => ({ ...p, esp: p.facturacion + p.valor_disponible })).sort((a, b) => anio(a.entrega).localeCompare(anio(b.entrega)) || b.esp - a.esp);
    d.table(
      [{ title: 'Promoción', w: 28 }, { title: 'Ciudad', w: 14 }, { title: 'Entrega', w: 9, align: 'r' }, { title: 'Viv.', w: 7, align: 'r' }, { title: '% com.', w: 9, align: 'r' }, { title: 'Fact. esperada', w: 16, align: 'r' }, { title: 'Benef. esp.', w: 15, align: 'r' }],
      pr.map((p) => [p.promocion.replace(/^Residencial |^Edificio /, ''), p.ciudad, anio(p.entrega), int(p.viviendas), pct(p.pct_comercializado, 0), eurC(p.esp), eurC(p.esp * MARGEN_INMO)])
    );
    if (suelos) {
      const S = suelos.suelos, cuenta = (e) => S.filter((s) => s.estado === e).length;
      d.h3('Suelos ofrecidos', S.length + ' en cartera');
      d.txt(`Ofrecidos: ${cuenta('Ofrecido')} · En análisis: ${cuenta('En análisis')} · Analizados: ${cuenta('Analizado')} · En negociación: ${cuenta('En negociación')} · Descartados: ${cuenta('Descartado')}.`, M, d.y() - 9, { size: 8.5, color: C.mute, max: A4[0] - 2 * M }); d.skip(16);
      const top = S.filter((s) => s.estado !== 'Descartado').sort((a, b) => b.margen - a.margen).slice(0, 4);
      d.txt('Mejores oportunidades por rentabilidad estimada: ' + top.map((s) => `${s.nombre} (${pct(s.margen, 0)})`).join('; ') + '.', M, d.y() - 9, { size: 8.5, max: A4[0] - 2 * M }); d.skip(14);
    }

    // ===== Hotelero =====
    const Ho = by('Hotelero'), oH = obj.find((o) => o.negocio === 'Hotelero') || {};
    const hcT = can.reduce((t, c) => ({ resv: t.resv + c.reservas, noches: t.noches + c.noches, ing: t.ing + c.ingresos, com: t.com + c.comision, neto: t.neto + c.neto }), { resv: 0, noches: 0, ing: 0, com: 0, neto: 0 });
    const directo = can.filter((c) => c.tipo === 'Directo').reduce((t, c) => t + c.ingresos, 0);
    d.band('Hotelero · Balneario de Panticosa', C.neg[1], perLabel());
    d.tiles([
      { label: 'Facturación', value: eurC(Ho.facturacion), sub: varTxt(Ho.variacion).v, subcol: varTxt(Ho.variacion).c },
      { label: 'Margen', value: pct(Ho.margen), sub: 'beneficio bruto ' + eurC(Ho.beneficio_bruto) },
      { label: 'Ocupación media', value: oH.kpi_pct ? pct(oH.kpi_real, 0) : '—', sub: 'objetivo ' + pct(oH.kpi_obj, 0) },
      { label: 'Venta directa', value: pct(hcT.ing ? directo / hcT.ing : null, 0), sub: 'sin comisión' },
    ]);
    d.table(
      [{ title: 'Indicador', w: 30 }, { title: 'Valor', w: 15, align: 'r' }, { title: 'Indicador', w: 30 }, { title: 'Valor', w: 15, align: 'r' }],
      [['Reservas', int(hcT.resv), 'Noches', int(hcT.noches)],
       ['Ingreso medio por reserva', hcT.resv ? eur(hcT.ing / hcT.resv) : '—', 'Comisiones a canales', eurC(hcT.com)],
       ['Ingreso neto (tras comisión)', eurC(hcT.neto), '% ingresos por OTA', pct(hcT.ing ? can.filter((c) => c.tipo === 'OTA').reduce((t, c) => t + c.ingresos, 0) / hcT.ing : null, 0)]]
    );

    // ===== Bodegas =====
    const B = by('Bodegas'), repo = stock.filter((s) => s.estado === 'rotura' || s.estado === 'bajo');
    const botellas = vino.reduce((t, v) => t + v.botellas, 0);
    d.band('Bodegas', C.neg[2], perLabel());
    d.tiles([
      { label: 'Facturación', value: eurC(B.facturacion), sub: varTxt(B.variacion).v, subcol: varTxt(B.variacion).c },
      { label: 'Botellas vendidas', value: int(botellas), sub: '3 bodegas' },
      { label: 'Margen', value: pct(B.margen), sub: 'beneficio bruto ' + eurC(B.beneficio_bruto) },
      { label: 'A reponer', value: String(repo.length), sub: 'referencias < 4 meses' },
    ]);
    d.table(
      [{ title: 'Bodega', w: 26 }, { title: 'Facturación', w: 18, align: 'r' }, { title: 'Var.', w: 12, align: 'r' }, { title: 'Botellas', w: 16, align: 'r' }, { title: 'Margen', w: 12, align: 'r' }, { title: 'Export.', w: 12, align: 'r' }],
      vino.map((v) => [v.bodega, eurC(v.facturacion), varTxt(v.variacion), int(v.botellas), pct(v.margen), pct(v.pct_export, 0)])
    );
    if (repo.length) { d.need(24); d.txt('Reposición: ' + repo.slice(0, 6).map((r) => r.referencia + ' (' + (r.cobertura).toFixed(1).replace('.', ',') + ' m)').join(', ') + '.', M, d.y() - 9, { size: 8.5, color: C.bad, max: A4[0] - 2 * M }); d.skip(14); }
    d.foot();
    return d.doc.save();
  }

  // ---------- informe inmobiliario (detallado) ----------
  async function inmoPDF() {
    const det = (data('promo_detalle') || { promociones: [] }).promociones;
    const promos = data('promociones') || [], suelos = data('suelos');
    const pm = {}; promos.forEach((p) => (pm[p.id] = p));
    const d = await newDoc(); d.setTitle('Inmobiliario'); d.setFoot('Maqueta · datos simulados. Grupo Nozar — Inmobiliario.');
    d.np(); d.head('Inmobiliario · promociones en curso');
    d.txt('Promociones aún no entregadas, ordenadas por fecha de entrega. Beneficio esperado = ' + pct(MARGEN_INMO, 0) + ' sobre la facturación esperada.', M, d.y() - 2, { size: 9, color: C.mute }); d.skip(16);
    const rows = det.map((p) => { const P = p.productos; const esp = P.viviendas.ingresos + P.garajes.ingresos + P.locales.ingresos; return { ...p, esp, benef: esp * MARGEN_INMO }; }).sort((a, b) => anio(a.entrega).localeCompare(anio(b.entrega)) || b.esp - a.esp);
    const T = rows.reduce((t, r) => ({ viv: t.viv + r.productos.viviendas.total, esp: t.esp + r.esp, benef: t.benef + r.benef }), { viv: 0, esp: 0, benef: 0 });
    d.tiles([
      { label: 'Promociones en curso', value: String(rows.length), sub: int(T.viv) + ' viviendas', bar: C.neg[0] },
      { label: 'Facturación esperada', value: eurC(T.esp), sub: 'viviendas + garajes + locales' },
      { label: 'Beneficio esperado', value: eurC(T.benef), sub: 'margen ' + pct(MARGEN_INMO, 0) },
    ]);
    d.h2('Detalle por promoción');
    const cols = [{ title: 'Producto', w: 20 }, { title: 'Total', w: 9, align: 'r' }, { title: 'Vend.', w: 9, align: 'r' }, { title: 'Res.', w: 9, align: 'r' }, { title: 'Disp.', w: 9, align: 'r' }, { title: '% com.', w: 11, align: 'r' }, { title: 'Precio medio', w: 16, align: 'r' }, { title: 'Por vender', w: 17, align: 'r' }];
    rows.forEach((p) => {
      const P = p.productos;
      d.h3(p.promocion.replace(/^Residencial |^Edificio /, ''), p.ciudad + ' · entrega ' + anio(p.entrega) + ' · ' + eurC(p.esp) + ' esperado · benef. ' + eurC(p.benef));
      const fila = (nombre, c) => [nombre, int(c.total), int(c.vendidos), int(c.reservados), int(c.disponibles), c.total ? pct(c.pct_com, 0) : '—', c.precio_medio ? eur(c.precio_medio) : '—', c.total ? eurC(c.por_vender) : '—'];
      d.table(cols, [fila('Viviendas', P.viviendas), fila('Garajes', P.garajes), fila('Locales comerciales', P.locales)]);
      d.skip(4);
    });
    // suelos del trimestre
    if (suelos) {
      const q0 = suelos.trimestre_inicio, ana = suelos.suelos.filter((s) => s.fecha_analisis && s.fecha_analisis >= q0);
      d.h2('Suelos analizados en ' + suelos.trimestre);
      if (!ana.length) { d.txt('No hay suelos analizados en el trimestre.', M, d.y() - 9, { size: 9, color: C.mute }); d.skip(14); }
      else {
        d.txt('Rentabilidad = beneficio estimado sobre ingresos (estimación previa, antes de cerrar el análisis).', M, d.y() - 2, { size: 8.5, color: C.mute }); d.skip(14);
        d.table(
          [{ title: 'Suelo', w: 24 }, { title: 'Municipio', w: 14 }, { title: 'Viv.', w: 7, align: 'r' }, { title: 'Coste suelo', w: 15, align: 'r' }, { title: 'Coste obra', w: 15, align: 'r' }, { title: 'Ingresos', w: 15, align: 'r' }, { title: 'Rent.', w: 9, align: 'r' }, { title: 'Estado', w: 13 }],
          ana.sort((a, b) => b.margen - a.margen).map((s) => [s.nombre, s.municipio, int(s.viviendas), eurC(s.coste_suelo), eurC(s.coste_obra), eurC(s.ingresos), { v: pct(s.margen, 0), c: s.margen >= 0.15 ? C.ok : s.margen >= 0.1 ? C.warn : C.bad }, s.estado])
        );
        const mejor = ana.slice().sort((a, b) => b.margen - a.margen)[0];
        d.need(22); d.txt('La más rentable: ' + mejor.nombre + ' (' + mejor.municipio + '), ' + pct(mejor.margen, 0) + ' con ' + int(mejor.viviendas) + ' viviendas planteadas.', M, d.y() - 9, { size: 8.5, max: A4[0] - 2 * M }); d.skip(14);
      }
    }
    d.foot();
    return d.doc.save();
  }

  // ---------- popup de vista previa ----------
  let dlg, frame, urlActual, bytesActual, nombreActual;
  function ensureModal() {
    if (dlg) return;
    dlg = document.createElement('div'); dlg.className = 'nz-pdf-modal'; dlg.hidden = true;
    dlg.innerHTML = '<div class="nz-pdf-box"><div class="nz-pdf-head"><b id="nz-pdf-t">Vista previa</b><div class="nz-pdf-act"><button class="nz-btn-pdf" id="nz-pdf-dl">Descargar PDF</button><button class="nz-btn-x" id="nz-pdf-x" aria-label="Cerrar">✕</button></div></div><div class="nz-pdf-body"><div class="nz-pdf-load" id="nz-pdf-load">Generando el informe…</div><iframe id="nz-pdf-frame" title="Vista previa del PDF" hidden></iframe></div></div>';
    document.body.appendChild(dlg);
    frame = $('#nz-pdf-frame', dlg);
    $('#nz-pdf-x', dlg).addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dlg.hidden) close(); });
    $('#nz-pdf-dl', dlg).addEventListener('click', () => { if (!bytesActual) return; const a = document.createElement('a'); a.href = urlActual; a.download = nombreActual; a.click(); });
  }
  function close() { dlg.hidden = true; frame.hidden = true; frame.src = 'about:blank'; if (urlActual) { URL.revokeObjectURL(urlActual); urlActual = null; } }
  async function abrir(titulo, nombre, builder) {
    ensureModal(); dlg.hidden = false; $('#nz-pdf-t').textContent = titulo; $('#nz-pdf-load').hidden = false; frame.hidden = true; nombreActual = nombre;
    try {
      bytesActual = await builder();
      const blob = new Blob([bytesActual], { type: 'application/pdf' });
      if (urlActual) URL.revokeObjectURL(urlActual);
      urlActual = URL.createObjectURL(blob);
      frame.src = urlActual + '#toolbar=0'; frame.hidden = false; $('#nz-pdf-load').hidden = true;
    } catch (e) { $('#nz-pdf-load').textContent = 'No se ha podido generar el PDF: ' + (e.message || e); console.error(e); }
  }
  const fecha = () => new Date().toISOString().slice(0, 10);
  window.INFORME = {
    grupo: () => abrir('Informe para el comité del Grupo', 'Nozar_comite_' + fecha() + '.pdf', grupoPDF),
    inmo: () => abrir('Informe inmobiliario · promociones en curso', 'Nozar_inmobiliario_' + fecha() + '.pdf', inmoPDF),
  };
})();
