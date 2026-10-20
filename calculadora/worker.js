/* Calcula en segundo plano para que la página no se quede parada (~0,6 s por cálculo). */
importScripts('engine.js', 'schema.js', 'inputs.js', 'results.js');
let wb = null;
const ready = fetch('template.json?v=' + (self.location.search.slice(1) || '1')).then((r) => r.json()).then((m) => { wb = new self.FX.Workbook(m); });
self.onmessage = async (e) => {
  const { id, data } = e.data;
  try {
    await ready;
    const t0 = Date.now();
    self.CALC.apply(wb, data);
    wb.recalc();
    const res = self.RESULTS.read(wb);
    res.ms = Date.now() - t0;
    self.postMessage({ id, ok: true, res });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
