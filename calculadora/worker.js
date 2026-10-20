/* Calcula en segundo plano para que la página no se quede parada (~0,7 s por cálculo). */
const Q = '?v=' + (self.location.search.slice(1) || '1');
importScripts('engine.js' + Q, 'schema.js' + Q, 'inputs.js' + Q, 'results.js' + Q);
let wb = null, tpl = null;
const ready = fetch('template.json?v=' + (self.location.search.slice(1) || '1')).then((r) => r.json()).then((m) => { tpl = m; wb = new self.FX.Workbook(m); });
const PRINT = ['Imprimir (1)', 'Imprimir (2)'];
self.onmessage = async (e) => {
  const { id, data, print } = e.data;
  try {
    await ready;
    const t0 = Date.now();
    self.CALC.apply(wb, data);
    wb.recalc();
    const res = self.RESULTS.read(wb);
    res.ms = Date.now() - t0;
    if (print) { // valores de las hojas de impresión del Excel original
      res.print = {};
      for (const s of PRINT) { const o = (res.print[s] = {}); for (const a of Object.keys(tpl[s] || {})) { const v = wb.get(s, a); if (v !== '' && v !== null && v !== undefined) o[a] = v; } }
    }
    self.postMessage({ id, ok: true, res });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
