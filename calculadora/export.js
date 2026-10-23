/* Formatos, notas del modelo y exportación a Excel y PDF. */
(function (root) {
  const SCHEMA = root.SCHEMA || (typeof require !== 'undefined' ? require('./schema.js') : null);

  // ---------- formatos (siempre con separador de miles, también en 4 cifras) ----------
  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtNum(v, dec = 0) {
    if (v === null || v === undefined || v === '' || !isFinite(v)) return '—';
    const neg = v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -dec);
    const s = Math.abs(v).toFixed(dec); const [i, d] = s.split('.');
    return (neg ? '-' : '') + group(i) + (d ? ',' + d : '');
  }
  const fmtEur = (v, dec = 0) => (v === null || v === undefined || !isFinite(v) ? '—' : fmtNum(v, dec) + ' €');
  function fmtPct(v, dec) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const p = v * 100; if (dec === undefined) dec = Math.abs(p) < 1 && p !== 0 ? (Math.abs(p * 100 - Math.round(p * 100)) < 1e-6 ? 2 : 3) : Math.abs(p - Math.round(p)) < 1e-9 ? 0 : 2;
    return fmtNum(p, dec) + ' %';
  }
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fmtDate(iso) { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${+d}/${+m}/${y}`; }
  function fmtMonth(iso) { if (!iso) return ''; const [y, m] = iso.split('-'); return MESES[+m - 1] + ' ' + y.slice(2); }
  function fmtMonthLong(iso) { if (!iso) return ''; const [y, m] = iso.split('-'); return MESES_L[+m - 1] + ' de ' + y; }
  function fmtField(f, v) {
    if (v === null || v === undefined || v === '') return '';
    if (f.type === 'select') { const o = f.options.find((x) => String(x[0]) === String(v)); return o ? o[1] : String(v); }
    if (f.type === 'pct') return fmtPct(Number(v));
    if (f.type === 'eur') return fmtEur(Number(v), Number(v) % 1 ? 2 : 0);
    if (f.type === 'eur_m2') return fmtNum(Number(v), Number(v) % 1 ? 2 : 0) + ' €/m²';
    if (f.type === 'm2') return fmtNum(Number(v), Number(v) % 1 ? 2 : 0) + ' m²';
    if (f.type === 'int') return fmtNum(Number(v));
    if (f.type === 'date') return fmtDate(v);
    return String(v);
  }

  // ---------- notas del modelo ----------
  const NOTAS = {
    correcciones: [
      ['Préstamo de los locales', 'La última disposición del préstamo de los locales apuntaba a una celda de otro bloque: una parte del préstamo no se devolvía nunca y la caja final no cuadraba con el resultado. Ahora cuadra.'],
      ['Intereses en el flujo anual', 'A partir del segundo año, cada año sumaba intereses de meses que ya estaban en el año anterior. Se contaban de más y la rentabilidad del proyecto salía mejor de lo que es.'],
      ['Gastos del préstamo del suelo', 'La notaría y el registro del préstamo del suelo se volvían a pagar cada vez que se pagaba una parte del suelo. Con pago por hitos o lineal salían varias veces en la caja. Ahora se pagan una vez, con el primer pago.'],
      ['Permuta', 'Con el suelo pagado en permuta se seguía calculando un préstamo del suelo con su comisión y su tasación, que sumaban costes que nunca se pagaban. Ahora, con permuta, no hay préstamo del suelo. Además, las viviendas en aportación que se entregan en la permuta estaban escritas a mano; ahora se calculan como las demás.'],
      ['IVA de las ventas del mes 1', 'Lo que se cobraba a los compradores en el mes 1 no llevaba IVA (estaba multiplicado por 0 %). Ahora lleva el tipo de IVA de las ventas.'],
      ['Préstamo promotor dispuesto al final', 'La parte del préstamo que se dispone al terminar la obra estaba escrita a mano (10 %). Si se cambiaba la parte que se dispone durante la obra, las dos ya no sumaban el 100 %. Ahora se calcula sola.'],
      ['IAE', 'El impuesto de actividades económicas sumaba el número de cocinas como si fueran metros cuadrados. Ahora solo suma metros.'],
      ['Descuento de efectos', 'La hoja enseñaba un 0,05 %, pero el cálculo usaba un 0,5 % escrito en otra celda. Ahora hay un solo dato (0,5 % por defecto, para revisar).'],
      ['Curva de obra', 'El reparto del coste de obra con curva solo funcionaba si la obra duraba exactamente 22 meses; con otra duración se repartía a partes iguales sin avisar. Ahora se elige: a partes iguales o con una curva propia de la duración que sea.'],
      ['Fechas', 'El inicio de obra, el fin de obra y las llaves se calculaban con meses de 30 o 31 días, y las fechas se iban desplazando. Ahora se suman meses exactos.'],
      ['Datos escondidos en fórmulas', 'La edificabilidad, la superficie de viviendas, el 136 % de responsabilidad hipotecaria, el 19 % de la constructora, los 36 meses de coordinación de seguridad, los tipos de IVA, las comisiones de los préstamos y el 5 % de la VAN estaban escritos dentro de las fórmulas. Ahora son datos que se ven y se pueden cambiar.'],
    ],
    limites: [
      'El cálculo cubre 84 meses (7 años) desde la compra del suelo, que es el mes 1.',
      'El flujo anual agrupa bloques de 12 meses contados desde la compra, no años naturales.',
      'La TIR y la VAN se calculan sobre el flujo anual. La VAN usa la tasa del grupo «Cálculo de la rentabilidad» (5 % por defecto).',
      'El IVA de las ventas es un único tipo para todo lo que se vende (los locales suelen ir al 21 %).',
      'Las primeras plazas de garaje van incluidas en el precio de la vivienda: solo se cobran las que superan una por vivienda.',
      'Lo que se vende después de la entrega de llaves se cobra entero en el mes de la venta.',
      'Los plazos admitidos son los mismos que en el modelo original: obra de 18 a 48 meses, de 2 a 12 meses hasta empezar, de 1 a 5 meses hasta las llaves y de 0 a 150 días para pagar a la constructora.',
    ],
    fijos: [
      'El AJD y la notaría y el registro de la obra nueva y la división horizontal se pagan 4 meses antes del fin de obra; los de la distribución hipotecaria, 3 meses antes.',
      'El seguro de afianzamiento que no se paga con las ventas se reparte en cuatro pagos iguales en los meses 1, 13, 25 y 37.',
      'Los préstamos pagan intereses cada mes sobre lo que se debe ese mes (el interés anual dividido entre 12).',
      'El préstamo promotor se devuelve con lo que pagan los compradores en la entrega de llaves.',
      'El IVA que se paga se recupera de Hacienda: cada mes se compensa con el IVA que se cobra a los compradores.',
      'El capital propio previsto es lo que hay que poner al principio: suelo con sus gastos, licencia, ICIO, AJD de la compra y del préstamo del suelo, notaría «varios», la mitad del arquitecto y el estudio geotécnico, menos el préstamo del suelo. Se redondea hacia arriba a cientos de miles de euros.',
      'Los impuestos autonómicos que se rellenan al elegir una comunidad son orientativos (consultados en octubre de 2026). Los municipales dependen de cada ayuntamiento.',
    ],
  };

  // ---------- estado de cada dato ----------
  function fieldState(f, promo, values) {
    const v = values[f.id];
    if (f.def === null && !f.sync && (v === null || v === undefined || v === '')) return 'falta';
    if (f.revisar && !(promo.revisados || []).includes(f.id)) return 'revisar';
    return 'ok';
  }

  // ---------- filas comunes ----------
  function summaryRows(res) {
    const k = res.kpis;
    return [
      ['Ingresos por ventas', k.ingresos, 'eur'], ['Costes totales', k.costes, 'eur'], ['Resultado (beneficio antes de impuestos)', k.resultado, 'eur'], ['Margen sobre ventas', k.margen, 'pct'],
      ['TIR del proyecto (sin financiación)', k.tirOperativa, 'pct'], ['VAN del proyecto', k.vanOperativo, 'eur'],
      ['TIR con financiación', k.tirFinanciera, 'pct'], ['VAN con financiación', k.vanFinanciero, 'eur'],
      ['Capital propio previsto', k.capital, 'eur'], ['Resultado sobre el capital propio', k.rentCapital, 'pct'],
      ['Saldo de caja más bajo', k.peorSaldo, 'eur'], ['Mes del saldo más bajo', k.mesPeorSaldo + ' (' + fmtMonthLong(k.fechaPeorSaldo) + ')', ''],
      ['Préstamo del suelo', k.prestamoSuelo, 'eur'], ['Préstamo promotor', k.prestamoPromotor, 'eur'],
      ['Presupuesto de ejecución material (PEM)', k.pem, 'eur'], ['Precio del suelo por m² edificable', k.precioSueloM2, 'eur'],
    ];
  }
  function decision(res, values) {
    const k = res.kpis, t = CALC.tramoMargen(k.margen, values || {}), min = t.min;
    const suelo = res.capitulos[0].importe, obra = res.capitulos[4].importe;
    return { min, hol: t.hol, tramo: t, ok: k.margen >= min, suelo, obra, pesoSuelo: k.costes ? suelo / k.costes : 0, pesoObra: k.costes ? obra / k.costes : 0 };
  }
  const dateRows = (k) => [['Compra del suelo (mes 1)', k.fechas.compra], ['Inicio de obra', k.fechas.inicioObra], ['Fin de obra', k.fechas.finObra], ['Entrega de llaves', k.fechas.llaves]];

  // ---------- Excel ----------
  function toXlsx({ promo, values, res, check }) {
    const H = (v) => ({ v, s: 'h' }), HR = (v) => ({ v, s: 'hr' });
    const hoy = new Date().toISOString().slice(0, 10);
    const k = res.kpis;
    const sheets = [];
    // Resumen
    const r = [[{ v: promo.nombre || 'Promoción', s: 't' }], [{ v: 'Calculado el ' + fmtDate(hoy) + ' con la calculadora de promociones (versión de prueba).', s: 'note' }], []];
    const pend = SCHEMA.fields.filter((f) => fieldState(f, promo, values) === 'revisar').length;
    if (pend) r.push([{ v: `Hay ${pend} datos con valores habituales sin revisar. Están marcados en la hoja «Datos de entrada».`, s: 'warn' }, { v: '', s: 'warn' }]), r.push([]);
    const dec = decision(res, values);
    r.push([H('Decisión'), HR('Valor')]);
    r.push([{ v: 'Margen sobre ventas', s: 'b' }, { v: k.margen, s: 'pctb' }], ['Viabilidad mínima (por debajo no financian los bancos)', { v: dec.min, s: 'pct' }], ['Viabilidad deseada', { v: dec.hol, s: 'pct' }], ['Resultado', dec.tramo.cls === 'bad' ? { v: dec.tramo.texto, s: 'warn' } : dec.tramo.texto]);
    r.push([], [H('Suelo y construcción'), HR('Importe'), HR('% de los costes')]);
    r.push(['Coste del suelo', { v: dec.suelo, s: 'eur' }, { v: dec.pesoSuelo, s: 'pct' }], ['Coste de construcción', { v: dec.obra, s: 'eur' }, { v: dec.pesoObra, s: 'pct' }]);
    r.push([], [H('Indicador'), HR('Valor')]);
    for (const [l, v, t] of summaryRows(res)) r.push([l, t ? { v, s: t } : v]);
    r.push([], [H('Fechas'), HR('')]);
    for (const [l, d] of dateRows(k)) r.push([l, { v: d, s: 'date' }]);
    r.push([], [H('Costes por capítulo'), HR('Importe'), HR('% del total')]);
    for (const c of res.capitulos) r.push([c.label, { v: c.importe, s: 'eur' }, { v: c.pct, s: 'pct' }]);
    r.push([{ v: 'Total costes', s: 'b' }, { v: k.costes, s: 'eurb' }, { v: 1, s: 'pctb' }]);
    r.push([], [H('Ingresos'), HR('Unidades'), HR('Importe')]);
    for (const i of res.ingresos) r.push([i.label, { v: i.unidades, s: 'int' }, { v: i.importe, s: 'eur' }]);
    r.push([{ v: 'Total ingresos', s: 'b' }, '', { v: k.ingresos, s: 'eurb' }]);
    sheets.push({ name: 'Resumen', cols: [46, 20, 14], rows: r });
    // Costes
    const c = [[{ v: 'Detalle de costes', s: 't' }], [], [H('Partida'), HR('Porcentaje o base'), HR('Importe')]];
    for (const d of res.detalle) {
      c.push([{ v: d.capitulo, s: 'b' }]);
      for (const l of d.lineas) c.push(['   ' + l.label, l.base ? { v: l.base.v, s: l.base.type === 'pct' ? 'pct' : 'num2' } : '', { v: l.importe, s: 'eur' }]);
      c.push([{ v: 'Total ' + d.capitulo.toLowerCase(), s: 'b' }, '', { v: d.total, s: 'eurb' }], []);
    }
    c.push([{ v: 'Total costes', s: 'b' }, '', { v: k.costes, s: 'eurb' }]);
    sheets.push({ name: 'Costes', cols: [52, 18, 18], rows: c, freeze: 'A4' });
    // Flujo mensual
    const n = res.ultimoMes;
    const fm = [[H('Mes'), ...res.meses.slice(0, n).map((m) => HR('Mes ' + m.n))], [H('Fecha'), ...res.meses.slice(0, n).map((m) => ({ v: m.fecha, s: 'date' }))]];
    for (const f of res.mensual) {
      if (f.seccion) { fm.push([{ v: f.label, s: 'b' }]); continue; }
      fm.push([f.kind === 'total' ? { v: f.label, s: 'b' } : f.label, ...f.valores.slice(0, n).map((v) => ({ v, s: f.kind === 'total' ? 'eurb' : 'eur' }))]);
    }
    fm.push([], [{ v: `Se muestran los meses 1 a ${n}; del ${n + 1} al 84 no hay movimientos.`, s: 'note' }]);
    sheets.push({ name: 'Flujo mensual', cols: [44, ...Array(n).fill(14)], rows: fm, freeze: 'B3', landscape: true });
    // Flujo anual
    const fa = [[H('Año'), ...res.años.map((a) => HR('Año ' + a.n)), HR('Total')], [H('Desde'), ...res.años.map((a) => ({ v: a.desde, s: 'date' })), '']];
    for (const f of res.anual) {
      if (f.seccion) { fa.push([{ v: f.label, s: 'b' }]); continue; }
      const st = f.kind === 'total' ? 'eurb' : 'eur';
      fa.push([f.kind === 'total' ? { v: f.label, s: 'b' } : f.label, ...f.valores.map((v) => ({ v, s: st })), /acumulado/.test(f.label) ? '' : { v: f.valores.reduce((a, b) => a + b, f.previo || 0), s: st }]);
    }
    fa.push([], ['TIR del proyecto (sin financiación)', { v: k.tirOperativa, s: 'pct' }], ['VAN del proyecto (tasa en «Datos de entrada»)', { v: k.vanOperativo, s: 'eur' }], ['TIR con financiación', { v: k.tirFinanciera, s: 'pct' }], ['VAN con financiación', { v: k.vanFinanciero, s: 'eur' }]);
    fa.push([], [{ v: 'Cada año es un bloque de 12 meses desde la compra del suelo.', s: 'note' }]);
    sheets.push({ name: 'Flujo anual', cols: [44, 15, 15, 15, 15, 15, 15, 15, 16], rows: fa, freeze: 'B3', landscape: true });
    // Ventas
    const plan = values.plan_ventas || {};
    const rowsDef = SCHEMA.fields.find((f) => f.type === 'salesplan').rows.filter(([key, , , u]) => Number(values[u]) > 0 || (plan[key] || []).some((x) => x > 0));
    const v = [[H('Mes'), H('Fecha'), ...rowsDef.map(([, l]) => HR(l))]];
    const lastSale = Math.max(1, ...rowsDef.map(([key]) => { const a = plan[key] || []; let L = 0; a.forEach((x, i) => { if (x > 0) L = i + 1; }); return L; }));
    for (let i = 0; i < Math.max(lastSale, 1); i++) v.push([{ v: i + 1, s: 'int' }, { v: res.meses[i].fecha, s: 'date' }, ...rowsDef.map(([key]) => ({ v: Number((plan[key] || [])[i]) || 0, s: 'int' }))]);
    v.push([{ v: 'Total', s: 'b' }, '', ...rowsDef.map(([key]) => ({ v: (plan[key] || []).reduce((s, x) => s + (Number(x) || 0), 0), s: 'int' }))]);
    sheets.push({ name: 'Ventas', cols: [8, 12, ...rowsDef.map(() => 18)], rows: v, freeze: 'C2' });
    // Datos de entrada
    const d = [[{ v: 'Datos de entrada', s: 't' }], [], [H('Grupo'), H('Dato'), HR('Valor'), H('Estado'), H('Qué es'), H('Origen')]];
    for (const g of SCHEMA.groups) {
      for (const f of SCHEMA.fields.filter((x) => x.group === g.id)) {
        if (f.type === 'salesplan') continue;
        if (f.when && !Object.entries(f.when).every(([kk, x]) => String(values[kk]) === String(x))) continue;
        let val;
        if (f.type === 'curve') val = (values[f.id] || []).slice(0, Number(values.meses_obra)).map((x) => fmtPct(Number(x) || 0, 1)).join(' · ');
        else if (f.calc) val = f.id === 'pct_permuta_viviendas' && res.permuta ? fmtPct(res.permuta.pct, 2) + ' (' + fmtNum(res.permuta.viviendas) + ' viviendas)' : '';
        else val = fmtField(f, values[f.id]);
        const st = fieldState(f, promo, values);
        d.push([g.title, f.label, { v: val, s: st === 'revisar' ? 'warn' : '' }, st === 'revisar' ? { v: 'Revisar este dato', s: 'warn' } : st === 'falta' ? 'Falta' : f.revisar ? 'Revisado' : '', { v: f.help || '', s: 'note' }, f.hoja === 'modelo' ? 'Supuesto del modelo' : f.hoja ? 'Hoja ' + f.hoja : '']);
      }
    }
    sheets.push({ name: 'Datos de entrada', cols: [26, 50, 22, 18, 90, 20], rows: d, freeze: 'C4' });
    // Notas
    const no = [[{ v: 'Avisos y notas', s: 't' }], []];
    if (check.warn.length) { no.push([H('Avisos sobre los datos')]); for (const [, t] of check.warn) no.push([{ v: t, s: 'warn' }]); no.push([]); }
    no.push([H('Cambios respecto al Excel original')]);
    for (const [t, x] of NOTAS.correcciones) no.push([{ v: t + ': ' + x, s: 'note' }]);
    no.push([], [H('Cómo calcula')]);
    for (const x of NOTAS.limites) no.push([{ v: x, s: 'note' }]);
    no.push([], [H('Supuestos fijos del modelo')]);
    for (const x of NOTAS.fijos) no.push([{ v: x, s: 'note' }]);
    sheets.push({ name: 'Notas', cols: [120], rows: no });
    return root.XLSX.build(sheets, { title: promo.nombre });
  }

  // ---------- PDF ----------
  const WIN = (s) => String(s).replace(/[²]/g, '2').replace(/[−]/g, '-').replace(/[≈]/g, '~').replace(/[✓]/g, '').replace(/[^\x00-\xff€…–—‘’“”•·]/g, '');
  async function toPdf({ promo, values, res, check }) {
    const { PDFDocument, StandardFonts, rgb } = root.PDFLib;
    const doc = await PDFDocument.create();
    doc.setTitle(WIN(promo.nombre || 'Promoción')); doc.setCreator('Calculadora de promociones'); doc.setProducer('Calculadora de promociones');
    const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
    const C = { ink: rgb(0.1, 0.12, 0.15), mute: rgb(0.42, 0.45, 0.5), line: rgb(0.85, 0.86, 0.88), head: rgb(0.18, 0.29, 0.43), warnBg: rgb(1, 0.95, 0.8), blue: rgb(0.165, 0.47, 0.84), orange: rgb(0.92, 0.41, 0.2), neg: rgb(0.75, 0.15, 0.15), band: rgb(0.96, 0.97, 0.98) };
    const k = res.kpis; const hoy = new Date().toISOString().slice(0, 10);
    let page, W, Hh, y; const M = 40; let pageNo = 0;
    const newPage = (land) => { page = doc.addPage(land ? [842, 595] : [595, 842]); W = page.getWidth(); Hh = page.getHeight(); y = Hh - M; pageNo++;
      page.drawText(WIN((promo.nombre || 'Promoción') + ' · ' + fmtDate(hoy)), { x: M, y: 22, size: 7.5, font: F, color: C.mute });
      page.drawText('Página ' + pageNo, { x: W - M - 40, y: 22, size: 7.5, font: F, color: C.mute }); };
    const text = (t, x, yy, o = {}) => { const f = o.bold ? FB : F, s = o.size || 9; let str = WIN(t); if (o.maxW) while (str.length > 1 && f.widthOfTextAtSize(str, s) > o.maxW) str = str.slice(0, -2) + '…'; const w = f.widthOfTextAtSize(str, s); page.drawText(str, { x: o.right ? x - w : x, y: yy, size: s, font: f, color: o.color || C.ink }); return w; };
    const wrap = (t, x, maxW, o = {}) => { const f = o.bold ? FB : F, s = o.size || 9, lh = s * 1.4; const words = WIN(t).split(' '); let line = ''; for (const w of words) { const tryL = line ? line + ' ' + w : w; if (f.widthOfTextAtSize(tryL, s) > maxW && line) { ensure(lh); text(line, x, y, o); y -= lh; line = w; } else line = tryL; } if (line) { ensure(lh); text(line, x, y, o); y -= lh; } };
    const ensure = (h, land) => { if (y - h < M + 10) newPage(land); };
    const h2 = (t) => { ensure(40); y -= 8; text(t, M, y, { bold: true, size: 12, color: C.head }); y -= 16; };
    const table = (cols, rows, o = {}) => { // cols: [{w, right, label}]
      const lh = o.lh || 14; const x0 = M; const tw = cols.reduce((s, c) => s + c.w, 0);
      const head = () => { page.drawRectangle({ x: x0, y: y - 4, width: tw, height: lh, color: C.head }); let x = x0; cols.forEach((c) => { text(c.label || '', c.right ? x + c.w - 4 : x + 4, y, { bold: true, size: 8, color: rgb(1, 1, 1), right: c.right, maxW: c.w - 6 }); x += c.w; }); y -= lh; };
      ensure(lh * 2, o.land); head();
      rows.forEach((r, i) => {
        if (y - lh < M + 10) { newPage(o.land); head(); }
        if (r.section) { y -= 2; text(r.section, x0 + 4, y, { bold: true, size: 8.5, color: C.head }); y -= lh; return; }
        if (r.bold) page.drawLine({ start: { x: x0, y: y + lh - 4 }, end: { x: x0 + tw, y: y + lh - 4 }, thickness: 0.6, color: C.line });
        else if (i % 2) page.drawRectangle({ x: x0, y: y - 4, width: tw, height: lh, color: C.band });
        let x = x0; r.cells.forEach((v, j) => { const c = cols[j]; const isNeg = typeof v === 'string' && /^-\d/.test(v); text(v ?? '', c.right ? x + c.w - 4 : x + 4, y, { size: o.size || 8.5, bold: r.bold, right: c.right, maxW: c.w - 6, color: r.warn && j === cols.length - 1 ? rgb(0.6, 0.4, 0) : isNeg ? C.neg : C.ink }); x += c.w; });
        y -= lh;
      });
      y -= 6;
    };

    // Página 1: resumen
    newPage();
    text(promo.nombre || 'Promoción', M, y, { bold: true, size: 18 }); y -= 18;
    text('Estudio económico de la promoción · calculado el ' + fmtDate(hoy), M, y, { size: 9, color: C.mute }); y -= 22;
    const pend = SCHEMA.fields.filter((f) => fieldState(f, promo, values) === 'revisar');
    if (pend.length) { page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: C.warnBg }); text(`Atención: ${pend.length} datos llevan un valor habitual sin revisar (lista al final del informe).`, M + 8, y, { size: 9, bold: true, color: rgb(0.45, 0.3, 0) }); y -= 28; }
    // fichas
    // recuadro del margen: es lo que decide si la operación se hace
    const dec = decision(res, values);
    const tone = k.margen < 0 ? [rgb(0.99, 0.91, 0.9), rgb(0.71, 0.14, 0.09), 'Pérdidas: la operación no cubre sus costes'] : dec.tramo.cls === 'ok' ? [rgb(0.89, 0.96, 0.92), rgb(0.07, 0.48, 0.24), dec.tramo.texto] : dec.tramo.cls === 'warn' ? [rgb(1, 0.95, 0.84), rgb(0.54, 0.35, 0), dec.tramo.texto] : [rgb(0.99, 0.91, 0.9), rgb(0.71, 0.14, 0.09), dec.tramo.texto];
    const mbw = W - 2 * M, mbh = 74;
    page.drawRectangle({ x: M, y: y - mbh + 10, width: mbw, height: mbh, color: tone[0], borderColor: tone[1], borderWidth: 1.2 });
    text('Margen sobre ventas', M + 12, y - 6, { size: 9, bold: true, color: C.mute });
    text(fmtPct(k.margen, 2), M + 12, y - 36, { size: 28, bold: true, color: k.margen < 0 ? C.neg : C.ink });
    text(tone[2], W - M - 12, y - 8, { size: 10, bold: true, color: tone[1], right: true });
    text(`Resultado de ${fmtEur(k.resultado)} sobre ${fmtEur(k.ingresos)} de ventas`, W - M - 12, y - 22, { size: 8.5, color: C.mute, right: true });
    const gx0 = M + 200, gx1 = W - M - 12, gyy = y - 48, esc = Math.max(0.2, dec.hol * 1.6, k.margen * 1.15), gp = (v) => gx0 + Math.max(0, Math.min(1, v / esc)) * (gx1 - gx0);
    page.drawRectangle({ x: gx0, y: gyy, width: gx1 - gx0, height: 8, color: rgb(1, 1, 1), borderColor: C.line, borderWidth: 0.6 });
    if (k.margen > 0) page.drawRectangle({ x: gx0, y: gyy, width: gp(k.margen) - gx0, height: 8, color: tone[1] });
    page.drawLine({ start: { x: gp(dec.min), y: gyy - 3 }, end: { x: gp(dec.min), y: gyy + 11 }, thickness: 1.5, color: C.ink });
    text(fmtPct(dec.min, 0) + ' viab. mínima', gp(dec.min) + 3, gyy - 10, { size: 7, color: C.mute });
    page.drawLine({ start: { x: gp(dec.hol), y: gyy - 3 }, end: { x: gp(dec.hol), y: gyy + 11 }, thickness: 1.5, color: C.ink });
    text(fmtPct(dec.hol, 0) + ' viab. deseada', gp(dec.hol) + 3, gyy - 22, { size: 7, color: C.mute });
    y -= mbh + 8;
    const tiles = [['Coste del suelo', fmtEur(dec.suelo), fmtPct(dec.pesoSuelo, 1) + ' de los costes'], ['Coste de construcción', fmtEur(dec.obra), fmtPct(dec.pesoObra, 1) + ' de los costes'], ['Resultado', fmtEur(k.resultado), 'antes de impuestos'], ['Ingresos', fmtEur(k.ingresos), 'sin IVA'],
      ['Costes totales', fmtEur(k.costes), 'sin IVA'], ['TIR del proyecto', fmtPct(k.tirOperativa, 2), 'sin financiación'], ['TIR con financiación', fmtPct(k.tirFinanciera, 2), ''], ['Saldo de caja más bajo', fmtEur(k.peorSaldo), 'mes ' + k.mesPeorSaldo]];
    const tw = (W - 2 * M - 3 * 8) / 4;
    tiles.forEach(([l, v, sub], i) => { const col = i % 4, row = Math.floor(i / 4); const x = M + col * (tw + 8), yy = y - row * 58; page.drawRectangle({ x, y: yy - 42, width: tw, height: 52, borderColor: i < 2 ? C.blue : C.line, borderWidth: i < 2 ? 1 : 0.8 }); text(l, x + 8, yy - 2, { size: 7.5, color: C.mute }); text(v, x + 8, yy - 21, { size: 12.5, bold: true, color: /^-/.test(v) ? C.neg : C.ink, maxW: tw - 12 }); if (sub) text(sub, x + 8, yy - 34, { size: 7.5, color: i < 2 ? C.blue : C.mute, bold: i < 2 }); });
    y -= 128;
    h2('Fechas clave');
    table([{ w: 200, label: 'Hito' }, { w: 120, label: 'Fecha', right: true }], dateRows(k).map(([l, d]) => ({ cells: [l, fmtDate(d)] })));
    h2('Costes por capítulo');
    table([{ w: 300, label: 'Capítulo' }, { w: 120, label: 'Importe', right: true }, { w: 95, label: '% del total', right: true }], [...res.capitulos.map((c) => ({ cells: [c.label, fmtEur(c.importe), fmtPct(c.pct, 2)] })), { bold: true, cells: ['Total costes', fmtEur(k.costes), '100 %'] }]);
    h2('Ingresos');
    table([{ w: 300, label: 'Producto' }, { w: 95, label: 'Unidades', right: true }, { w: 120, label: 'Importe', right: true }], [...res.ingresos.map((i) => ({ cells: [i.label, fmtNum(i.unidades), fmtEur(i.importe)] })), { bold: true, cells: ['Total ingresos', '', fmtEur(k.ingresos)] }]);
    h2('Financiación y otros indicadores');
    table([{ w: 300, label: 'Indicador' }, { w: 215, label: 'Valor', right: true }], summaryRows(res).slice(4).filter(([l]) => !/^TIR|^Resultado sobre|^Saldo de caja/.test(l)).map(([l, v, t]) => ({ cells: [l, t === 'eur' ? fmtEur(v) : t === 'pct' ? fmtPct(v, 2) : String(v)] })));

    // Página: saldo de caja (gráfico)
    newPage();
    h2('Saldo de caja acumulado, mes a mes');
    const n = res.ultimoMes; const saldo = res.mensual.find((f) => f.label === 'Saldo acumulado').valores.slice(0, n);
    const cobros = res.mensual.find((f) => f.label === 'Total cobros').valores.slice(0, n), pagos = res.mensual.find((f) => f.label === 'Total pagos').valores.slice(0, n);
    const gx = M + 50, gw = W - 2 * M - 60, gh = 220, gy = y - gh - 10;
    const all = [...saldo, 0]; let lo = Math.min(...all), hi = Math.max(...all); if (hi === lo) hi = lo + 1; const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const Y = (v) => gy + ((v - lo) / (hi - lo)) * gh, X = (i) => gx + (i + 0.5) * (gw / n);
    const step = niceStep((hi - lo) / 5);
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) { page.drawLine({ start: { x: gx, y: Y(t) }, end: { x: gx + gw, y: Y(t) }, thickness: t === 0 ? 0.9 : 0.4, color: t === 0 ? C.mute : C.line }); text(fmtMill(t), gx - 6, Y(t) - 3, { size: 7, color: C.mute, right: true }); }
    for (let i = 1; i < n; i++) page.drawLine({ start: { x: X(i - 1), y: Y(saldo[i - 1]) }, end: { x: X(i), y: Y(saldo[i]) }, thickness: 1.8, color: C.blue });
    for (let i = 0; i < n; i += Math.max(1, Math.ceil(n / 12))) text(fmtMonth(res.meses[i].fecha), X(i), gy - 12, { size: 6.5, color: C.mute });
    y = gy - 30;
    text(`El punto más bajo es ${fmtEur(k.peorSaldo)} en el mes ${k.mesPeorSaldo} (${fmtMonthLong(k.fechaPeorSaldo)}). Al final, la caja queda en ${fmtEur(k.saldoFinal)}.`, M, y, { size: 9 }); y -= 24;
    h2('Cobros y pagos totales de cada mes');
    const bh = 150, by = y - bh - 10; let bmax = Math.max(1, ...cobros, ...pagos);
    const BY = (v) => by + (v / bmax) * bh; const bw = gw / n;
    const st2 = niceStep(bmax / 4); for (let t = 0; t <= bmax; t += st2) { page.drawLine({ start: { x: gx, y: BY(t) }, end: { x: gx + gw, y: BY(t) }, thickness: 0.4, color: C.line }); text(fmtMill(t), gx - 6, BY(t) - 3, { size: 7, color: C.mute, right: true }); }
    for (let i = 0; i < n; i++) { const x = gx + i * bw; if (cobros[i] > 0) page.drawRectangle({ x: x + bw * 0.12, y: by, width: bw * 0.36, height: BY(cobros[i]) - by, color: C.blue }); if (pagos[i] > 0) page.drawRectangle({ x: x + bw * 0.52, y: by, width: bw * 0.36, height: BY(pagos[i]) - by, color: C.orange }); }
    for (let i = 0; i < n; i += Math.max(1, Math.ceil(n / 12))) text(fmtMonth(res.meses[i].fecha), gx + (i + 0.5) * bw, by - 12, { size: 6.5, color: C.mute });
    y = by - 30; page.drawRectangle({ x: M, y: y - 1, width: 9, height: 9, color: C.blue }); text('Cobros (con IVA y préstamos)', M + 14, y, { size: 8 }); page.drawRectangle({ x: M + 170, y: y - 1, width: 9, height: 9, color: C.orange }); text('Pagos (con IVA)', M + 184, y, { size: 8 }); y -= 20;

    // Detalle de costes
    newPage(); h2('Detalle de costes');
    const drows = [];
    for (const d of res.detalle) { drows.push({ section: d.capitulo }); for (const l of d.lineas) drows.push({ cells: [l.label, baseTxt(l.base), fmtEur(l.importe)] }); drows.push({ bold: true, cells: ['Total ' + d.capitulo.toLowerCase(), '', fmtEur(d.total)] }); }
    drows.push({ bold: true, cells: ['Total costes', '', fmtEur(k.costes)] });
    table([{ w: 320, label: 'Partida' }, { w: 90, label: '% o base', right: true }, { w: 105, label: 'Importe', right: true }], drows, { lh: 13, size: 8 });

    // Flujo anual (apaisado)
    newPage(true); h2('Flujo de caja anual');
    const acols = [{ w: 210, label: '' }, ...res.años.map((a) => ({ w: 72, label: 'Año ' + a.n, right: true })), { w: 78, label: 'Total', right: true }];
    table(acols, [{ cells: ['Desde', ...res.años.map((a) => fmtDate(a.desde)), ''] }, ...res.anual.map((f) => (f.seccion ? { section: f.label } : { bold: f.kind === 'total', cells: [f.label, ...f.valores.map((v) => fmtEur(v)), /acumulado/.test(f.label) ? '' : fmtEur(f.valores.reduce((a, b) => a + b, f.previo || 0))] }))], { land: true });
    text('Cada año es un bloque de 12 meses desde la compra del suelo. TIR del proyecto: ' + fmtPct(k.tirOperativa, 2) + ' · TIR con financiación: ' + fmtPct(k.tirFinanciera, 2), M, y, { size: 8, color: C.mute }); y -= 16;

    // Flujo mensual (apaisado, por bloques de 12 meses)
    const rowsM = res.mensual;
    for (let s = 0; s < n; s += 12) {
      newPage(true); h2(`Flujo de caja mensual · meses ${s + 1} a ${Math.min(n, s + 12)}`);
      const idx = Array.from({ length: Math.min(12, n - s) }, (_, i) => s + i);
      table([{ w: 186, label: '' }, ...idx.map((i) => ({ w: 48, label: fmtMonth(res.meses[i].fecha), right: true }))], rowsM.map((f) => (f.seccion ? { section: f.label } : { bold: f.kind === 'total', cells: [f.label, ...idx.map((i) => fmtK(f.valores[i]))] })), { land: true, lh: 12.5, size: 7 });
      text('Importes en miles de euros.', M, y, { size: 7.5, color: C.mute }); y -= 12;
    }

    // Datos de entrada, avisos y notas
    newPage(); h2('Datos de entrada');
    const irows = [];
    for (const g of SCHEMA.groups) {
      const fs = SCHEMA.fields.filter((f) => f.group === g.id && f.type !== 'salesplan' && f.type !== 'curve' && !f.calc && (!f.when || Object.entries(f.when).every(([kk, x]) => String(values[kk]) === String(x))));
      if (!fs.length) continue; irows.push({ section: g.title });
      for (const f of fs) { const st = fieldState(f, promo, values); irows.push({ warn: st === 'revisar', cells: [f.label, fmtField(f, values[f.id]), st === 'revisar' ? 'Revisar este dato' : st === 'falta' ? 'Falta' : ''] }); }
    }
    table([{ w: 300, label: 'Dato' }, { w: 120, label: 'Valor', right: true }, { w: 95, label: 'Estado' }], irows, { lh: 12.5, size: 7.5 });
    if (check.warn.length) { h2('Avisos sobre los datos'); for (const [, t] of check.warn) wrap('• ' + t, M, W - 2 * M, { size: 8.5 }); }
    h2('Cambios respecto al Excel original');
    for (const [t, x] of NOTAS.correcciones) { wrap(t + '. ' + x, M, W - 2 * M, { size: 8.5 }); y -= 3; }
    h2('Cómo calcula');
    for (const x of NOTAS.limites) wrap('• ' + x, M, W - 2 * M, { size: 8.5 });
    h2('Supuestos fijos del modelo');
    for (const x of NOTAS.fijos) wrap('• ' + x, M, W - 2 * M, { size: 8.5 });
    return await doc.save();
  }
  function baseTxt(b) { if (!b) return ''; if (b.type === 'pct') return fmtPct(b.v); if (b.type === 'eur_m2') return fmtNum(b.v, b.v % 1 ? 2 : 0) + ' €/m2'; return fmtEur(b.v); }
  function niceStep(r) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(r, 1e-9)))); const m = r / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function fmtMill(v) { const a = Math.abs(v); if (a >= 1e6) return fmtNum(v / 1e6, a % 1e6 ? 1 : 0) + ' M€'; if (a >= 1e3) return fmtNum(v / 1e3) + ' mil €'; return fmtNum(v) + ' €'; }
  function fmtK(v) { if (!v || Math.abs(v) < 0.5) return '–'; return fmtNum(v / 1000, Math.abs(v) < 10000 ? 1 : 0); }

  const API = { baseTxt, fmtNum, fmtEur, fmtPct, fmtDate, fmtMonth, fmtMonthLong, fmtField, fmtMill, fmtK, niceStep, NOTAS, fieldState, toXlsx, toPdf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.EXPORT = API;
})(typeof window !== 'undefined' ? window : globalThis);
