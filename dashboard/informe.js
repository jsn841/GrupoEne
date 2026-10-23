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
    const txt = (s, x, yy, o = {}) => { const f = o.bold ? FB : F, size = o.size || 10; let str = String(s == null ? '' : s); if (o.max) { while (f.widthOfTextAtSize(str, size) > o.max && str.length > 1) str = str.slice(0, -2) + '…'; } page.drawText(str, { x, y: yy, size, font: f, color: col(o.color || C.ink) }); return f.widthOfTextAtSize(str, size); };
    const txtR = (s, xr, yy, o = {}) => { const f = o.bold ? FB : F, size = o.size || 10, w = f.widthOfTextAtSize(String(s == null ? '' : s), size); txt(s, xr - w, yy, o); };
    const rect = (x, yy, w, h, c, o = {}) => page.drawRectangle({ x, y: yy, width: w, height: h, color: c ? col(c) : undefined, borderColor: o.border ? col(o.border) : undefined, borderWidth: o.border ? (o.bw || 0.6) : 0 });
    const lineH = (x1, x2, yy, c) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.6, color: col(c || C.line) });
    const need = (h) => { if (y - h < M + 24) { foot(); np(); head(doc._t, true); } };
    let FOOT = 'Maqueta · datos simulados. Grupo Nozar.';
    const foot = () => { lineH(M, W - M, M + 14, C.line); txt(FOOT, M, M + 3, { size: 7, color: C.mute }); txtR('Pág. ' + doc.getPageCount(), W - M, M + 3, { size: 7, color: C.mute }); };
    const head = (title, cont) => { txt('GRUPO NOZAR', M, H - M + 2, { size: 7.5, bold: true, color: C.acc }); txtR(hoyLabel(), W - M, H - M + 2, { size: 7.5, color: C.mute }); y = H - M - 6; if (!cont) { txt(title, M, y - 14, { size: 17, bold: true }); y -= 30; } else { y -= 6; } };
    const h2 = (s) => { need(30); txt(s, M, y - 12, { size: 12, bold: true, color: C.acc }); y -= 20; };
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
    return { doc, np, head, h2, tiles, table, txt, txtR, skip: (h) => { y -= h; }, need: (h) => need(h), foot, setFoot: (s) => (FOOT = s), setTitle: (s) => (doc._t = s), C, y: () => y };
  }

  const eurC = (v) => NZ().eurC(v), eur = (v) => NZ().eur(v), int = (v) => NZ().int(v), pct = (v, d) => NZ().pct(v, d);

  // ---------- informe del comité de grupo ----------
  async function grupoPDF() {
    const g = data('grupo_resumen') || [], obj = data('objetivos') || [], vino = data('vino_resumen') || [], stock = data('vino_stock') || [];
    const d = await newDoc(); d.setTitle('Comité del Grupo'); d.setFoot('Maqueta · datos simulados. Informe para el comité del Grupo Nozar.');
    d.np(); d.head('Informe para el comité');
    d.txt('Periodo: ' + perLabel() + '  ·  Objetivos: del 1 de enero a hoy', M, d.y() - 2, { size: 9, color: C.mute }); d.skip(16);
    const G = g.find((x) => x.negocio === 'Grupo') || {};
    d.tiles([
      { label: 'Facturación del grupo', value: eurC(G.facturacion), sub: (G.variacion >= 0 ? '+' : '') + pct(G.variacion) + ' vs periodo anterior', subcol: G.variacion >= 0 ? C.ok : C.bad, bar: C.acc },
      { label: 'Beneficio bruto', value: eurC(G.beneficio_bruto), sub: 'margen ' + pct(G.margen) },
      { label: 'Negocios', value: '3', sub: 'Inmobiliario · Hotelero · Bodegas' },
    ]);
    // objetivos
    d.h2('Objetivos del año');
    d.table(
      [{ title: 'Negocio', w: 20 }, { title: 'Real a hoy', w: 16, align: 'r' }, { title: 'Objetivo', w: 16, align: 'r' }, { title: '% obj.', w: 10, align: 'r' }, { title: 'Proyección', w: 16, align: 'r' }, { title: 'Margen', w: 13, align: 'r' }, { title: 'Estado', w: 14, align: 'r' }],
      obj.map((o) => { const cls = o.avance_proy >= 1 ? C.ok : o.avance_proy >= 0.9 ? C.warn : C.bad; const est = o.avance_proy >= 1 ? 'Cumple' : o.avance_proy >= 0.9 ? 'Justo' : 'Corto';
        return [o.negocio, eurC(o.real), eurC(o.objetivo), pct(o.avance, 0), { v: pct(o.avance_proy, 0), c: cls }, { v: pct(o.margen) + '/' + pct(o.margen_obj, 0), c: o.cumple_margen ? C.ok : C.bad }, { v: est, c: cls, b: true }]; })
    );
    // KPI por negocio
    d.h2('Indicadores clave');
    d.table(
      [{ title: 'Negocio', w: 26 }, { title: 'Indicador', w: 34 }, { title: 'Real', w: 20, align: 'r' }, { title: 'Objetivo', w: 20, align: 'r' }],
      obj.map((o) => [o.negocio, o.kpi, o.kpi_pct ? pct(o.kpi_real, 0) : int(o.kpi_real), o.kpi_pct ? pct(o.kpi_obj, 0) : int(o.kpi_obj)])
    );
    // bodegas
    d.h2('Situación de las bodegas');
    const repo = stock.filter((s) => s.estado === 'rotura' || s.estado === 'bajo');
    d.table(
      [{ title: 'Bodega', w: 26 }, { title: 'Facturación', w: 18, align: 'r' }, { title: 'Var.', w: 12, align: 'r' }, { title: 'Botellas', w: 16, align: 'r' }, { title: 'Margen', w: 12, align: 'r' }, { title: 'Export.', w: 12, align: 'r' }],
      vino.map((v) => [v.bodega, eurC(v.facturacion), { v: (v.variacion >= 0 ? '+' : '') + pct(v.variacion), c: v.variacion >= 0 ? C.ok : C.bad }, int(v.botellas), pct(v.margen), pct(v.pct_export, 0)])
    );
    d.need(26); d.txt('Stock: ' + repo.length + ' referencias por debajo de 4 meses de cobertura (a reponer)' + (repo.length ? ': ' + repo.slice(0, 5).map((r) => r.referencia).join(', ') : '') + '.', M, d.y() - 10, { size: 8.5, color: repo.length ? C.bad : C.mute, max: A4[0] - 2 * M });
    d.y(); d.foot();
    return d.doc.save();
  }

  // ---------- informe inmobiliario ----------
  async function inmoPDF() {
    const promos = (data('promociones') || []).filter((p) => p.estado === 'En curso');
    const margen = 0.23;
    const d = await newDoc(); d.setTitle('Inmobiliario'); d.setFoot('Maqueta · datos simulados. Grupo Nozar — Inmobiliario.');
    d.np(); d.head('Inmobiliario · promociones en curso');
    d.txt('Promociones aún no entregadas. Fact. esperada = comprometido + por vender. Beneficio esperado = ' + pct(margen, 0) + ' de la fact. esperada.', M, d.y() - 2, { size: 9, color: C.mute }); d.skip(16);
    const rows = promos.map((p) => { const espera = p.facturacion + p.valor_disponible, benef = espera * margen; return { ...p, espera, benef }; });
    const tot = rows.reduce((t, r) => ({ viv: t.viv + r.viviendas, vend: t.vend + r.vendidas, res: t.res + r.reservadas, disp: t.disp + r.disponibles, espera: t.espera + r.espera, benef: t.benef + r.benef }), { viv: 0, vend: 0, res: 0, disp: 0, espera: 0, benef: 0 });
    d.tiles([
      { label: 'Promociones en curso', value: String(rows.length), sub: int(tot.viv) + ' viviendas', bar: C.neg[0] },
      { label: 'Comercializado', value: pct((tot.vend + tot.res) / (tot.viv || 1), 0), sub: int(tot.vend + tot.res) + ' de ' + int(tot.viv) },
      { label: 'Facturación esperada', value: eurC(tot.espera), sub: 'comprometido + por vender' },
      { label: 'Beneficio esperado', value: eurC(tot.benef), sub: 'margen ' + pct(margen, 0) },
    ]);
    d.h2('Detalle por promoción');
    d.table(
      [{ title: 'Promoción', w: 26 }, { title: 'Ciudad', w: 13 }, { title: 'Entrega', w: 8, align: 'r' }, { title: 'Viv.', w: 6, align: 'r' }, { title: 'Vend.', w: 6, align: 'r' }, { title: 'Res.', w: 6, align: 'r' }, { title: 'Disp.', w: 6, align: 'r' }, { title: '% com.', w: 8, align: 'r' }, { title: 'Fact. esperada', w: 15, align: 'r' }, { title: 'Benef. esperado', w: 15, align: 'r' }],
      rows.sort((a, b) => b.espera - a.espera).map((r) => [r.promocion.replace(/^Residencial |^Edificio /, ''), r.ciudad, String(r.entrega).slice(0, 4), int(r.viviendas), int(r.vendidas), int(r.reservadas), int(r.disponibles), pct(r.pct_comercializado, 0), eurC(r.espera), eurC(r.benef)])
        .concat([[{ v: 'TOTAL', b: true }, '', '', { v: int(tot.viv), b: true }, { v: int(tot.vend), b: true }, { v: int(tot.res), b: true }, { v: int(tot.disp), b: true }, '', { v: eurC(tot.espera), b: true }, { v: eurC(tot.benef), b: true }]])
    );
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
