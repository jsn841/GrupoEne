/* Lee del modelo calculado los resultados que enseña la calculadora y que se exportan. */
(function (root) {
  const FX = root.FX || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const SCHEMA = root.SCHEMA || (typeof require !== 'undefined' ? require('./schema.js') : null);
  const BASE = {}; for (const f of SCHEMA.fields) if (f.cell && /^Promoción!C\d+$/.test(f.cell)) BASE[+f.cell.slice(11)] = f;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const colAt = (start, i) => FX.colName(FX.colNum(start) + i);
  const isoFromSerial = (n) => (n ? new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10) : null);

  const CAPITULOS = [
    ['Suelo', 'Resumen!C5', 'Resumen!D5', 9],
    ['Impuestos y tasas', 'Resumen!C6', 'Resumen!D6', 25],
    ['Notaría, registro y seguros', 'Resumen!C7', 'Resumen!D7', 46],
    ['Proyectos y estudios', 'Resumen!C8', 'Resumen!D8', 64],
    ['Obra', 'Resumen!C9', 'Resumen!D9', 80],
    ['Gastos financieros', 'Resumen!C10', 'Resumen!D10', 95],
    ['Comercialización', 'Resumen!C11', 'Resumen!D11', 102],
    ['Gastos de gestión y contingencia', 'Resumen!C12', 'Resumen!D12', 108],
  ];
  const DETALLE = {
    'Suelo': [[5, 'Precio del suelo'], [6, 'Notaría de la compra'], [7, 'Registro de la compra'], [8, 'Comisión de intermediación']],
    'Impuestos y tasas': [[14, 'Tasa de licencia de obras y demolición'], [15, 'Impuesto de construcciones (ICIO)'], [16, 'Otras tasas (plusvalía municipal)'], [17, 'Licencia de primera ocupación'], [18, 'AJD agrupación'], [19, 'AJD compraventa'], [20, 'AJD obra nueva y división horizontal'], [21, 'AJD préstamo del suelo'], [22, 'AJD préstamo promotor'], [23, 'AJD distribución hipotecaria'], [24, 'IAE']],
    'Notaría, registro y seguros': [[30, 'Notaría y registro: varios'], [31, 'Notaría de obra nueva y división horizontal'], [32, 'Registro de obra nueva y división horizontal'], [33, 'Notaría del préstamo del suelo'], [34, 'Notaría del préstamo promotor'], [35, 'Registro del préstamo del suelo'], [36, 'Registro del préstamo promotor'], [37, 'Notaría de la distribución hipotecaria'], [38, 'Registro de la distribución hipotecaria'], [39, 'Tasación para el préstamo del suelo'], [40, 'Tasación para el préstamo promotor'], [41, 'Seguro de responsabilidad civil'], [42, 'Seguro decenal'], [43, 'Seguro a todo riesgo'], [44, 'Seguro de afianzamiento'], [45, 'Imprevistos']],
    'Proyectos y estudios': [[53, 'Arquitecto'], [54, 'Dirección facultativa (aparejador)'], [55, 'Reparcelación, urbanización y demolición'], [56, 'Estudio topográfico'], [57, 'Estudio geotécnico'], [58, 'Coordinación de seguridad y salud'], [59, 'Supervisión técnica externa'], [60, 'Organismo de control técnico (OCT)'], [61, 'Técnico del banco'], [62, 'Acometidas y centro de transformación'], [63, 'Imprevistos']],
    'Obra': [[70, 'Viviendas'], [71, 'Locales'], [72, 'Sótano 1'], [73, 'Sótano 2'], [74, 'Cocinas y equipamiento'], [75, 'Terrazas'], [76, 'Demolición y tala'], [77, 'Urbanización exterior y dirección de obra'], [78, 'Otros (piscina, pádel, urbanización interior)'], [79, 'Imprevistos']],
    'Gastos financieros': [[86, 'Intereses del préstamo del suelo'], [87, 'Intereses del préstamo promotor'], [88, 'Comisiones bancarias'], [89, 'Comisión del préstamo del suelo'], [90, 'Comisión del préstamo promotor'], [91, 'Comisiones de otros préstamos'], [92, 'Avales'], [93, 'Descuento de efectos y remesas'], [94, 'Imprevistos']],
    'Comercialización': [[101, 'Comisión de venta']],
    'Gastos de gestión y contingencia': [[107, 'Gastos de estructura y fondo de contingencia']],
  };
  const INGRESOS = [
    ['Viviendas', 'Resumen!K5', 'Resumen!O5'], ['Primeras plazas de garaje (adicionales)', 'Resumen!K6', 'Resumen!O6'], ['Segundas plazas de garaje', 'Resumen!K7', 'Resumen!O7'],
    ['Trasteros', 'Resumen!K8', 'Resumen!O8'], ['Viviendas en aportación', 'Resumen!K9', 'Resumen!O9'], ['Locales', 'Resumen!K10', 'Resumen!O10'],
  ];
  const MENSUAL = [
    ['Pagos', null],
    ['Suelo', 4], ['Impuestos y tasas', 5], ['Notaría, registro y seguros', 6], ['Proyectos y estudios', 7], ['Obra', 8], ['Gastos financieros', 9], ['Comercialización', 10], ['Gestión y contingencia', 11],
    ['Total pagos sin IVA', 12, 'total'], ['IVA soportado', 390], ['Retención a la constructora', 392], ['Total pagos', 394, 'total'],
    ['Cobros', null],
    ['Cobros de las ventas', 398], ['Préstamos: disposiciones menos devoluciones', 399], ['IVA repercutido', 402], ['Total cobros', 404, 'total'], ['IVA: devolución (+) o pago (−) a Hacienda', 407],
    ['Caja', null],
    ['Caja del mes', 411, 'total'], ['Saldo acumulado', 413, 'total'], ['Deuda viva de los préstamos', 339], ['Intereses del mes (incluidos en gastos financieros)', 418],
  ];
  const ANUAL = [
    ['Pagos', null], ['Suelo', 684], ['Impuestos y tasas', 685], ['Notaría, registro y seguros', 686], ['Proyectos y estudios', 687], ['Obra', 688], ['Gastos financieros sin intereses', 689], ['Comercialización', 690], ['Gestión y contingencia', 691], ['Total pagos', 692, 'total'],
    ['Cobros', null], ['Cobros de las ventas', 695],
    ['Resultado', null], ['Flujo operativo (sin financiación)', 698, 'total'], ['Flujo operativo acumulado', 699], ['Préstamos: disposiciones menos devoluciones', 702], ['Intereses', 703], ['Flujo después de financiación', 705, 'total'], ['Flujo después de financiación, acumulado', 706],
  ];

  function read(wb) {
    const g = (ref) => { const [s, a] = ref.split('!'); return wb.get(s, a); };
    const n = (ref) => num(g(ref));
    const total = n('Resumen!C13');
    const capitulos = CAPITULOS.map(([label, c]) => ({ label, importe: n(c), pct: total ? n(c) / total : 0 }));
    const detalle = CAPITULOS.map(([label, , , totRow]) => ({ capitulo: label, total: n('Promoción!D' + totRow), lineas: DETALLE[label].map(([r, l]) => ({ label: l, base: BASE[r] ? { v: n('Promoción!C' + r), type: BASE[r].type } : null, importe: n('Promoción!D' + r) })) }));
    const ingresos = INGRESOS.map(([label, u, i]) => ({ label, unidades: n(u), importe: n(i) })).filter((x) => x.unidades || x.importe);
    const cfoMes = n('CF!D265'), llavesMes = n('CF!D375');
    // meses con actividad
    let last = llavesMes;
    for (let i = 0; i < 84; i++) { const c = colAt('E', i); if (Math.abs(n('CF!' + c + '12')) > 0.5 || Math.abs(n('CF!' + c + '398')) > 0.5 || Math.abs(n('CF!' + c + '399')) > 0.5) last = Math.max(last, i + 1); }
    const meses = Array.from({ length: 84 }, (_, i) => ({ n: i + 1, fecha: isoFromSerial(n('CF!' + colAt('E', i) + '2')) }));
    const mensual = MENSUAL.map(([label, row, kind]) => (row === null ? { label, seccion: true } : { label, kind, valores: meses.map((m, i) => n('CF!' + colAt('E', i) + row)) }));
    const saldo = mensual.find((f) => f.label === 'Saldo acumulado').valores;
    let peor = 0, mesPeor = 1;
    saldo.forEach((v, i) => { if (v < peor) { peor = v; mesPeor = i + 1; } });
    const años = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, desde: isoFromSerial(n('CF!' + colAt('E', i) + '683')) }));
    const anual = ANUAL.map(([label, row, kind]) => (row === null ? { label, seccion: true } : { label, kind, previo: n('CF!D' + row), valores: años.map((a, i) => n('CF!' + colAt('E', i) + row)), total: n('CF!L' + row) }));
    const errores = [];
    for (const ref of ['Resumen!C13', 'Resumen!C14', 'Resumen!C15', 'CF!F710', 'CF!F716']) if (FX.isErr(g(ref))) errores.push(ref);
    const tir = (ref) => { const v = g(ref); return typeof v === 'number' && isFinite(v) ? v : null; };
    return {
      kpis: {
        ingresos: n('Resumen!C14'), costes: total, resultado: n('Resumen!C15'), margen: n('Resumen!C14') ? n('Resumen!C15') / n('Resumen!C14') : 0,
        capital: n('Resumen!V27'), rentCapital: n('Resumen!V27') ? n('Resumen!C15') / n('Resumen!V27') : null,
        tirOperativa: tir('CF!F710'), vanOperativo: n('CF!F709'), tirFinanciera: tir('CF!F716'), vanFinanciero: n('CF!F715'),
        peorSaldo: peor, mesPeorSaldo: mesPeor, fechaPeorSaldo: meses[mesPeor - 1].fecha, saldoFinal: saldo[83], descuadre: saldo[83] - n('Resumen!C15'),
        prestamoSuelo: n('Resumen!G20'), prestamoPromotor: n('Resumen!V11'), pem: n('Promoción!D47'), costeObra: n('Promoción!D80'),
        precioSueloM2: n('Resumen!D21'), mesCfo: cfoMes, mesLlaves: llavesMes,
        fechas: { compra: isoFromSerial(n('Resumen!F5')), inicioObra: isoFromSerial(n('Resumen!F8')), finObra: isoFromSerial(n('Resumen!F11')), llaves: isoFromSerial(n('Resumen!F15')) },
      },
      permuta: g('Resumen!G22') === 'a' ? { pct: n('Resumen!M15'), viviendas: n('Resumen!M16'), garajes1: n('Resumen!M17'), garajes2: n('Resumen!M18'), trasteros: n('Resumen!M19'), aportacion: 0, locales: n('Resumen!M21') } : null,
      capitulos, detalle, ingresos, meses, mensual, ultimoMes: Math.min(84, last), años, anual, errores,
    };
  }
  const API = { read };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RESULTS = API;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
