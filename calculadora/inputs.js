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
    if (!near(sum([v.cobro_contrato, v.cobro_obra, v.cobro_llaves]), 1)) warn.push(['cobro_contrato', 'Los cobros a los compradores tienen que sumar el 100 %.']);
    if (!near(sum([v.pct_com_contrato, v.pct_com_escritura]), 1)) warn.push(['pct_com_contrato', 'Los pagos de la comisión de venta tienen que sumar el 100 %.']);
    if (!near(sum([v.arq_anteproyecto, v.arq_basico, v.arq_ejecucion, v.arq_licencia, v.arq_obra, v.arq_cfo, v.arq_cedula]), 1)) warn.push(['arq_anteproyecto', 'Los pagos al arquitecto tienen que sumar el 100 %.']);
    if (Number(v.reparto_obra) === 1) {
      const c = v.curva_obra || [];
      const used = c.slice(0, Number(v.meses_obra));
      if (!near(sum(used), 1)) warn.push(['curva_obra', 'La curva de obra tiene que sumar el 100 % en los ' + v.meses_obra + ' meses de obra (ahora suma ' + (sum(used) * 100).toFixed(1).replace('.', ',') + ' %).']);
    }
    const plan = v.plan_ventas || {};
    const salesRows = SCHEMA.fields.find((f) => f.type === 'salesplan').rows;
    const llaves = Number(v.meses_inicio) + Number(v.meses_obra) + Number(v.meses_llaves);
    for (const [key, label, , unitsField] of salesRows) {
      const total = (Number(v[unitsField]) || 0) - (permuta && v.forma_pago_suelo === 'a' ? permuta[key] || 0 : 0);
      const list = plan[key] || [];
      const sold = sum(list);
      if (total && !near(sold, total)) warn.push(['plan_ventas', `${label}: el calendario vende ${fmtInt(sold)} y hay ${fmtInt(total)} a la venta${permuta && v.forma_pago_suelo === 'a' && permuta[key] ? ' (las otras ' + fmtInt(permuta[key]) + ' van a la permuta)' : ''}.`]);
      const late = list.slice(llaves).some((x) => Number(x) > 0);
      if (late) warn.push(['plan_ventas', `${label}: hay ventas después de la entrega de llaves (mes ${llaves}); el modelo las cobra como si se vendieran antes.`]);
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

  const API = { apply, check, withDefaults, visible, dateToSerial, spread, curveS, curveFlat };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CALC = API;
})(typeof window !== 'undefined' ? window : globalThis);
