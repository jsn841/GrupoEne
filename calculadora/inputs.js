/* Pasa los datos de una promoción (objeto { campo: valor }) a las celdas del modelo y calcula.
   Lo usan la página y las pruebas. */
(function (root) {
  const FX = root.FX || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const SCHEMA = root.SCHEMA || (typeof require !== 'undefined' ? require('./schema.js') : null);
  const colAt = (start, i) => FX.colName(FX.colNum(start) + i);

  function dateToSerial(iso) {
    if (!iso) return 0;
    const [y, m, d] = iso.split('-').map(Number);
    return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  // Valores completos (por defecto + los de la promoción)
  function withDefaults(data) {
    const v = {};
    for (const f of SCHEMA.fields) {
      if (f.type === 'salesplan') v[f.id] = (data && data[f.id]) || {};
      else if (f.type === 'curve') v[f.id] = (data && data[f.id]) || [];
      else v[f.id] = data && data[f.id] !== undefined && data[f.id] !== '' && data[f.id] !== null ? data[f.id] : f.def;
    }
    // Campos que copian otro mientras no se escriban (p. ej. trasteros = viviendas)
    for (const f of SCHEMA.fields) if (f.sync && (v[f.id] === null || v[f.id] === undefined)) v[f.id] = v[f.sync];
    return v;
  }

  function apply(wb, data) {
    const v = withDefaults(data);
    for (const f of SCHEMA.fields) {
      let x = v[f.id];
      if (f.type === 'salesplan') {
        for (const [key, , row] of f.rows) {
          const [sh, r] = row.split('!');
          const list = x[key] || [];
          for (let i = 0; i < SCHEMA.months; i++) wb.setValue(sh, colAt('F', i) + r, Number(list[i]) || 0);
        }
        continue;
      }
      if (f.type === 'curve') {
        const [sh, r] = f.row.split('!');
        for (let i = 0; i < SCHEMA.months; i++) wb.setValue(sh, colAt('E', i) + r, Number(x[i]) || 0);
        continue;
      }
      if (!f.cell && !f.sup) continue;
      if (f.type === 'date') x = dateToSerial(x);
      else if (f.type !== 'select') x = x === null || x === undefined || x === '' ? 0 : Number(x);
      else if (typeof f.options[0][0] === 'number') x = Number(x);
      if (f.sup) wb.setValue('Supuestos', f.sup, x);
      else { const [sh, a] = f.cell.split('!'); wb.setValue(sh, a, x); }
    }
    return v;
  }

  // Campos que faltan (obligatorios sin valor) y avisos de coherencia
  function check(data, permuta) {
    const v = withDefaults(data);
    const missing = SCHEMA.fields.filter((f) => f.def === null && !f.calc && !f.sync && f.type !== 'salesplan' && f.type !== 'curve' && (v[f.id] === null || v[f.id] === undefined || v[f.id] === '') && visible(f, v));
    const warn = [];
    const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    if (v.forma_pago_suelo === 'd' && !near(sum([v.hito_compra, v.hito_inicio, v.hito_cfo, v.hito_llaves]), 1)) warn.push(['forma_pago_suelo', 'Los hitos de pago del suelo tienen que sumar el 100 %.']);
    // datos con un rango razonable (por ejemplo, la responsabilidad hipotecaria es más del 100 %)
    for (const f of SCHEMA.fields) if ((f.min !== undefined || f.max !== undefined) && v[f.id] !== null && v[f.id] !== undefined && v[f.id] !== '') {
      const x = Number(v[f.id]);
      if ((f.min !== undefined && x < f.min) || (f.max !== undefined && x > f.max)) warn.push([f.id, `«${f.label}» está en ${(x * 100).toFixed(2).replace('.', ',')} %: tiene que estar entre el ${f.min * 100} % y el ${f.max * 100} % (lo normal es el ${(f.def * 100).toFixed(0)} %).`]);
    }
    const MU = (typeof window !== 'undefined' && window.MUNI) || null;
    if (MU && v.ccaa && v.provincia && MU.prov[v.provincia] && MU.prov[v.provincia][1] !== v.ccaa) warn.push(['provincia', 'La provincia no es de la comunidad autónoma elegida.']);
    if (!near(sum([v.cobro_contrato, v.cobro_obra, v.cobro_llaves]), 1)) warn.push(['cobro_contrato', 'Los cobros a los compradores tienen que sumar el 100 %.']);
    if (!near(sum([v.pct_com_contrato, v.pct_com_escritura]), 1)) warn.push(['pct_com_contrato', 'Los pagos de la comisión de venta tienen que sumar el 100 %.']);
    if (!near(sum([v.arq_anteproyecto, v.arq_basico, v.arq_ejecucion, v.arq_licencia, v.arq_obra, v.arq_cfo, v.arq_cedula]), 1)) warn.push(['arq_anteproyecto', 'Los pagos al arquitecto tienen que sumar el 100 %.']);
    if (Number(v.reparto_obra) === 1) {
      const c = v.curva_obra || [];
      const used = c.slice(0, Number(v.meses_obra));
      if (!near(sum(used), 1)) warn.push(['curva_obra', 'La curva de obra tiene que sumar el 100 % en los ' + v.meses_obra + ' meses de obra (ahora suma ' + (sum(used) * 100).toFixed(1).replace('.', ',') + ' %).']);
    }
    // Locales con metros y precio pero sin unidades: los ingresos se cuentan, pero sin calendario de ventas no se cobran nunca y el préstamo promotor se dispara
    if (!Number(v.n_locales) && Number(v.sup_locales_venta) * Number(v.precio_m2_local) > 0) warn.push(['n_locales', 'Hay metros y precio de locales a la venta pero el número de locales es 0: los ingresos se cuentan pero no se cobran (no hay calendario de ventas) y el préstamo promotor se dispara. Pon el número de locales y su calendario de ventas.']);
    const plan = v.plan_ventas || {};
    const salesRows = SCHEMA.fields.find((f) => f.type === 'salesplan').rows;
        for (const [key, label, , unitsField] of salesRows) {
      const total = (Number(v[unitsField]) || 0) - (permuta && v.forma_pago_suelo === 'a' ? permuta[key] || 0 : 0);
      const list = plan[key] || [];
      const sold = sum(list);
      if (!total && sold) { warn.push(['plan_ventas', `${label}: el calendario vende ${fmtInt(sold)} pero el número de unidades es 0.`]); continue; }
      if (total && !near(sold, total)) warn.push(['plan_ventas', `${label}: el calendario vende ${fmtInt(sold)} y hay ${fmtInt(total)} a la venta${permuta && v.forma_pago_suelo === 'a' && permuta[key] ? ' (las otras ' + fmtInt(permuta[key]) + ' van a la permuta)' : ''}.`]);
    }
    return { missing, warn };
  }
  // Reparte unidades enteras: una parte en preventa (un mes) y el resto a partes iguales entre dos meses
  function spread(total, { preventaMes = 0, preventaPct = 0, desde = 1, hasta = 1 } = {}, months = 84) {
    const out = new Array(months).fill(0);
    total = Math.max(0, Math.round(Number(total) || 0));
    if (!total) return out;
    let pre = preventaMes > 0 ? Math.round(total * preventaPct) : 0;
    if (pre) out[preventaMes - 1] += pre;
    const rest = total - pre, a = Math.max(1, desde), b = Math.max(a, hasta), n = b - a + 1;
    let acc = 0;
    for (let i = 0; i < n; i++) { const target = Math.round((rest * (i + 1)) / n); out[a - 1 + i] += target - acc; acc = target; }
    return out;
  }
  // Curva en S para la obra (más ritmo en los meses centrales); suma exactamente 1
  function curveS(meses, months = 84) {
    const out = new Array(months).fill(0); const w = [];
    for (let i = 0; i < meses; i++) { const t = (i + 0.5) / meses; w.push(Math.sin(Math.PI * t) + 0.25); }
    const s = w.reduce((a, b) => a + b, 0); let acc = 0;
    for (let i = 0; i < meses; i++) { const v = Math.round((w[i] / s) * 10000) / 10000; out[i] = v; acc += v; }
    out[Math.floor(meses / 2)] = Math.round((out[Math.floor(meses / 2)] + 1 - acc) * 10000) / 10000;
    return out;
  }
  function curveFlat(meses, months = 84) { const out = new Array(months).fill(0); let acc = 0; for (let i = 0; i < meses; i++) { out[i] = Math.round(10000 / meses) / 10000; acc += out[i]; } out[meses - 1] = Math.round((out[meses - 1] + 1 - acc) * 10000) / 10000; return out; }
  function fmtInt(n) { return Math.round(n).toLocaleString('es-ES'); }
  function visible(f, v) { if (!f.when) return true; return Object.entries(f.when).every(([k, x]) => String(v[k]) === String(x)); }

  // Tramo del margen sobre ventas según el criterio de la empresa (por defecto: menos del 10 % no financian los bancos; 10-12 % lo normal; desde el 12 % es la viabilidad deseada)
  function tramoMargen(m, v) {
    const min = Number(v && v.margen_minimo) || 0.1, hol = Math.max(min, Number(v && v.margen_holgado) || 0.12);
    const p = (x) => (x * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %';
    if (m < 0) return { cls: 'bad', ok: false, min, hol, corto: 'Pérdidas', texto: 'Pérdidas: la operación no cubre sus costes' };
    if (m < min) return { cls: 'bad', ok: false, min, hol, corto: 'No financiable', texto: `Por debajo de la viabilidad mínima del ${p(min)}: los bancos no la financian` };
    if (m < hol) return { cls: 'warn', ok: true, min, hol, corto: 'Normal', texto: `Entre el ${p(min)} y el ${p(hol)}: margen normal, se estudia` };
    return { cls: 'ok', ok: true, min, hol, corto: 'Deseada', texto: `Desde la viabilidad deseada del ${p(hol)}` };
  }

  // Problemas que hacen que el resultado NO sea válido: el reparto no suma el total o la caja no cuadra con los costes.
  const BLOQUEAN = ['plan_ventas', 'n_locales', 'forma_pago_suelo', 'cobro_contrato', 'pct_com_contrato', 'arq_anteproyecto', 'curva_obra'];
  const fmtE = (x) => Math.round(x).toLocaleString('es-ES') + ' €';
  function bloqueos(chk, res) {
    const out = (chk ? chk.warn : []).filter((w) => BLOQUEAN.includes(w[0]));
    if (res && res.cuadre) for (const c of res.cuadre) out.push([null, `${c.capitulo}: el flujo de caja paga ${fmtE(Math.abs(c.diferencia))} ${c.diferencia > 0 ? 'menos' : 'más'} de lo que suma el capítulo.`]);
    if (res && res.kpis && Math.abs(res.kpis.descuadre) > 1 && !(res.cuadre || []).length) out.push([null, `La caja final no coincide con el resultado: diferencia de ${fmtE(res.kpis.descuadre)}.`]);
    return out;
  }
  const API = { apply, check, withDefaults, visible, dateToSerial, spread, curveS, curveFlat, tramoMargen, bloqueos };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CALC = API;
})(typeof window !== 'undefined' ? window : globalThis);
