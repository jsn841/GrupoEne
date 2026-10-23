/* Promoción de ejemplo, con datos inventados, para probar la calculadora. */
(function (root) {
  const CALC = root.CALC || require('./inputs.js');
  function ejemplo() {
    const sp = (n) => CALC.spread(n, { preventaMes: 3, preventaPct: 0.25, desde: 4, hasta: 26 });
    return {
      ccaa: 'madrid', provincia: '28', municipio: 'Madrid', pct_ajd_compra: 0.0075, pct_ajd_obra_nueva: 0.0075, pct_ajd_prestamo_suelo: 0, pct_ajd_prestamo_promotor: 0, pct_icio: 0.0375,
      precio_suelo: 6400000, fecha_compra: '2027-03-01', forma_pago_suelo: 'b',
      edif_residencial: 6300, edif_comercial: 0, sup_viviendas: 6150, sup_sotano1: 2600,
      n_viviendas: 62, precio_m2_viv: 4100, n_trasteros: 62, n_garajes2: 10, precio_garaje2: 22000,
      coste_m2_viv: 1280, coste_m2_sot1: 620, coste_cocinas: 8500, coste_demolicion: 90000, coste_urbanizacion: 180000,
      plan_ventas: { viviendas: sp(62), garajes1: sp(62), trasteros: sp(62), garajes2: CALC.spread(10, { desde: 8, hasta: 26 }) },
    };
  }
  const API = { ejemplo, nombre: 'Ejemplo · Residencial de 62 viviendas (datos inventados)' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.EJEMPLO = API;
})(typeof window !== 'undefined' ? window : globalThis);
