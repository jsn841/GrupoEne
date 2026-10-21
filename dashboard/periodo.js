// Filtro de fechas común a todos los paneles: periodo, comparación y años que se enseñan.
// Suma las series diarias de data/series.json y rehace con ellas los resúmenes que usa el panel
// (mismos nombres y campos que antes: «…_ant» es ahora el periodo de comparación).
(function () {
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const iso = (d) => d.toISOString().slice(0, 10);
  const D = (s) => new Date(s + 'T00:00:00Z');
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  const ym = (d) => [d.getUTCFullYear(), d.getUTCMonth()];
  const lastDay = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const shiftMonths = (d, k) => { const y = d.getUTCFullYear(), m = d.getUTCMonth() + k; const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12; return new Date(Date.UTC(ty, tm, Math.min(d.getUTCDate(), lastDay(ty, tm)))); };
  const shiftYears = (d, k) => shiftMonths(d, 12 * k);

  const DEF = { per_tipo: 'ytd', per_q: null, per_m: null, per_desde: null, per_hasta: null, per_comp: 'yoy', per_anios: 2 };
  const P = window.PER = { ready: false, MES, MES_L };
  let S = null, T0 = null, HOY = null, pref = {};

  // ---------- estado ----------
  const st = () => ({ ...DEF, ...dash.params() });
  function period() {
    const s = st(), y = HOY.getUTCFullYear();
    let a, b, tipo = s.per_tipo;
    if (tipo === 'trimestre') {
      const q = s.per_q || `${y}-T${Math.floor(HOY.getUTCMonth() / 3) + 1}`;
      const qy = +q.slice(0, 4), qn = +q.slice(-1);
      a = new Date(Date.UTC(qy, (qn - 1) * 3, 1)); b = new Date(Date.UTC(qy, qn * 3, 0));
    } else if (tipo === 'mes') {
      const m = s.per_m || iso(HOY).slice(0, 7);
      a = D(m + '-01'); b = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0));
    } else if (tipo === 'custom') {
      a = D(s.per_desde || `${y}-01-01`); b = D(s.per_hasta || iso(HOY));
      if (b < a) b = a;
    } else { a = new Date(Date.UTC(y, 0, 1)); b = HOY; tipo = 'ytd'; }
    if (b > HOY) b = HOY;
    if (a < T0) a = T0;
    return { a, b, tipo };
  }
  // «mismos días / todo el mes pasado» solo tienen sentido para un mes o menos
  const shortPeriod = (cur) => Math.round((cur.b - cur.a) / 86400000) + 1 <= 31;
  function comparison(cur) {
    let c = st().per_comp;
    if ((c === 'mom' || c === 'lm') && !shortPeriod(cur)) c = 'yoy';
    if (c === 'ly') { const y = cur.b.getUTCFullYear() - 1; return { a: new Date(Date.UTC(y, 0, 1)), b: new Date(Date.UTC(y, 11, 31)), tipo: c }; }
    if (c === 'mom') return { a: shiftMonths(cur.a, -1), b: shiftMonths(cur.b, -1), tipo: c };
    if (c === 'lm') { const [y, m] = ym(shiftMonths(new Date(Date.UTC(cur.a.getUTCFullYear(), cur.a.getUTCMonth(), 1)), -1)); return { a: new Date(Date.UTC(y, m, 1)), b: new Date(Date.UTC(y, m, lastDay(y, m))), tipo: c }; }
    return { a: shiftYears(cur.a, -1), b: shiftYears(cur.b, -1), tipo: 'yoy' };
  }
  P.periods = () => {
    const cur = period(), cmp = comparison(cur), n = Math.max(2, Math.min(6, +st().per_anios || 2));
    const years = []; for (let k = 0; k < n; k++) years.push({ k, a: shiftYears(cur.a, -k), b: shiftYears(cur.b, -k) });
    return { cur, cmp, years };
  };

  // ---------- etiquetas ----------
  const fd = (d, withYear = true) => `${d.getUTCDate()} ${MES[d.getUTCMonth()]}${withYear ? ' ' + d.getUTCFullYear() : ''}`;
  P.rango = (p) => {
    const sy = p.a.getUTCFullYear() === p.b.getUTCFullYear();
    const fullMonth = p.a.getUTCDate() === 1 && p.b.getUTCDate() === lastDay(...ym(p.b));
    if (sy && fullMonth && p.a.getUTCMonth() === 0 && p.b.getUTCMonth() === 11) return 'todo ' + p.a.getUTCFullYear();
    if (sy && fullMonth && p.a.getUTCMonth() === p.b.getUTCMonth()) return MES_L[p.a.getUTCMonth()] + ' ' + p.a.getUTCFullYear();
    return sy ? `${fd(p.a, false)} – ${fd(p.b)}` : `${fd(p.a)} – ${fd(p.b)}`;
  };
  // etiqueta corta de cada año de la progresión (o del periodo si cruza de año)
  P.yearLabel = (p) => (p.a.getUTCFullYear() === p.b.getUTCFullYear() ? String(p.a.getUTCFullYear()) : `${String(p.a.getUTCFullYear()).slice(2)}/${String(p.b.getUTCFullYear()).slice(2)}`);
  P.cmpShort = () => {
    if (!P.ready) return '';
    const { cur, cmp } = P.periods();
    if (cmp.tipo === 'ly') return 'Todo ' + cmp.a.getUTCFullYear();
    if (cmp.tipo === 'lm') return MES[cmp.a.getUTCMonth()] + ' ' + cmp.a.getUTCFullYear();
    if (cmp.tipo === 'mom') return 'Mes anterior';
    return P.yearLabel(cmp) === P.yearLabel(cur) ? 'Año anterior' : P.yearLabel(cmp);
  };
  P.cmpLong = () => {
    if (!P.ready) return '';
    const { cmp } = P.periods();
    return { yoy: 'al mismo periodo del año anterior', ly: 'a todo el año anterior', mom: 'a los mismos días del mes anterior', lm: 'a todo el mes anterior' }[cmp.tipo] + ' (' + P.rango(cmp) + ')';
  };
  P.curLong = () => (P.ready ? P.rango(P.periods().cur) : '');

  // ---------- sumas ----------
  const idx = (d) => Math.round((d - T0) / 86400000);
  function sum(key, a, b) { // suma de una serie diaria entre dos fechas (incluidas)
    const p = pref[key]; if (!p) return 0;
    let i = Math.max(0, idx(a)), j = Math.min(S.dias - 1, idx(b));
    if (j < i) return 0;
    return p[j + 1] - p[i];
  }
  P.sum = sum;
  P.days = (a, b) => { const i = Math.max(0, idx(a)), j = Math.min(S.dias - 1, idx(b)); return Math.max(0, j - i + 1); };
  // trocea un periodo por años naturales (para aplicar el reparto de cada año)
  function byYear(a, b) {
    const out = [];
    for (let y = a.getUTCFullYear(); y <= b.getUTCFullYear(); y++) {
      const x = new Date(Math.max(a, Date.UTC(y, 0, 1))), z = new Date(Math.min(b, Date.UTC(y, 11, 31)));
      if (z >= x) out.push([String(Math.min(2026, Math.max(2021, y))), x, z]);
    }
    return out;
  }
  P.byYear = byYear;

  // ---------- métricas por negocio ----------
  const H = { 'Gran Hotel': 'gh', 'Hotel Continental': 'co' };
  function hotel(h, a, b) {
    const ks = h === 'Total' ? ['gh', 'co'] : [H[h]];
    const r = { noches: 0, ing: 0, hu: 0, disp: 0 };
    for (const k of ks) { r.noches += sum(`hotel.${k}.noches`, a, b); r.ing += sum(`hotel.${k}.ing`, a, b); r.hu += sum(`hotel.${k}.hu`, a, b); r.disp += S.meta[`hotel.${k}.habitaciones`] * P.days(a, b); }
    const ub = h === 'Total' ? null : h;
    let fb = 0, fbbb = 0, zc = 0;
    S.meta.puntos_orden.forEach((pt, i) => {
      const meta = S.meta.puntos.find((x) => x.punto === pt);
      const ing = sum(`punto.${i}.ing`, a, b), co = sum(`punto.${i}.coste`, a, b);
      if (meta.ubicacion === 'Zonas comunes') zc += ing;
      if (!ub || meta.ubicacion === ub) { fb += ing; fbbb += ing - co; }
    });
    r.fb = fb; r.zc = zc; r.fact = r.ing + fb; r.bb = r.ing * (1 - S.meta.coste_habitacion) + fbbb;
    return r;
  }
  P.hotel = hotel;
  function punto(i, a, b) { const ing = sum(`punto.${i}.ing`, a, b), co = sum(`punto.${i}.coste`, a, b); return { ing, co, bb: ing - co }; }
  P.punto = punto;
  function bodegaDirect(bi, a, b) {
    const o = {}; let f = 0;
    for (const c of ['online', 'visitas', 'tienda']) { o[c] = { q: sum(`vino.${bi}.${c}.q`, a, b), f: sum(`vino.${bi}.${c}.f`, a, b) }; f += o[c].f; }
    o.total = f; return o;
  }
  // referencias de una bodega: facturación, botellas, beneficio, exportación
  function refs(bi, a, b) {
    const R = S.reparto.refs, out = [];
    R.items.forEach((it, j) => { if (it.b === bi) out.push({ j, it, fa: 0, bot: 0, bb: 0, exp: 0 }); });
    for (const [y, x, z] of byYear(a, b)) {
      const tot = sum(`vino.${bi}.mayorista`, x, z), infl = Math.pow(1.025, 2026 - +y);
      for (const r of out) {
        const f = tot * R.fa[y][r.j], bot = f / (r.it.eur_bot / infl);
        r.fa += f; r.bot += bot; r.bb += f - bot * (r.it.coste_bot / infl); r.exp += f * R.exp[y][r.j];
      }
    }
    return out;
  }
  P.refs = refs;
  function bodega(bi, a, b) {
    const rr = refs(bi, a, b), d = bodegaDirect(bi, a, b);
    const may = rr.reduce((t, r) => t + r.fa, 0);
    return { fact: may + d.total, bb: rr.reduce((t, r) => t + r.bb, 0) + d.total * S.meta.margen_directo, bot: rr.reduce((t, r) => t + r.bot, 0), exp: rr.reduce((t, r) => t + r.exp, 0), may, direct: d.total, d };
  }
  P.bodega = bodega;
  P.direct = bodegaDirect;
  P.perfil = (punto, fam) => (S.meta.perfiles || {})[punto + '|' + fam];
  P.pesoDia = (punto) => (S.meta.peso_dia || {})[punto];
  P.familias = () => S.meta.familias || [];
  P.puntoIdx = (name) => S.meta.puntos_orden.indexOf(name);
  P.bodegaIdx = (name) => S.meta.bodegas.indexOf(name);
  function inmo(a, b) {
    let bb = 0; const fact = sum('inmo.escriturado', a, b);
    for (const [y, x, z] of byYear(a, b)) bb += sum('inmo.escriturado', x, z) * S.meta.margen_inmo[y];
    return { fact, bb, reservas: sum('inmo.reservas', a, b), comprometido: sum('inmo.comprometido', a, b) };
  }
  P.inmo = inmo;
  P.grupo = (a, b) => {
    const i = inmo(a, b), h = hotel('Total', a, b); let bf = 0, bbb = 0;
    S.meta.bodegas.forEach((_, bi) => { const x = bodega(bi, a, b); bf += x.fact; bbb += x.bb; });
    return { Inmobiliario: { fact: i.fact, bb: i.bb }, Hotelero: { fact: h.fact, bb: h.bb }, Bodegas: { fact: bf, bb: bbb }, Grupo: { fact: i.fact + h.fact + bf, bb: i.bb + h.bb + bbb } };
  };

  // ---------- series para los gráficos: el periodo de cada año, por meses o por días ----------
  // fn(a, b) devuelve el valor de un tramo; devuelve { xs, label, tip, series:[{name, values}] }
  P.chart = (fn, o = {}) => {
    if (!P.ready) return { xs: [], label: () => '', tip: () => '', series: [], byDay: false };
    const { cur, years } = P.periods();
    const span = P.days(cur.a, cur.b);
    const byDay = span <= 62;
    const buckets = [];
    if (byDay) for (let i = 0; i < span; i++) buckets.push({ off: i });
    else { let d = new Date(Date.UTC(cur.a.getUTCFullYear(), cur.a.getUTCMonth(), 1)); while (d <= cur.b) { buckets.push({ m: d }); d = shiftMonths(d, 1); } }
    const range = (bk, yr) => {
      if (byDay) { const x = addDays(yr.a, bk.off); return x > yr.b ? null : [x, x]; }
      const s = shiftYears(bk.m, -yr.k), e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), lastDay(...ym(s))));
      const x = new Date(Math.max(s, yr.a)), z = new Date(Math.min(e, yr.b));
      return z < x ? null : [x, z];
    };
    const series = years.map((yr) => ({ name: P.yearLabel(yr), k: yr.k, values: buckets.map((bk) => { const r = range(bk, yr); if (!r || r[0] < T0) return null; const v = fn(r[0], r[1]); return v == null || !isFinite(v) ? null : v; }) }));
    if (o.cumulative) series.forEach((s) => { let t = 0; s.values = s.values.map((v) => (v == null ? null : (t += v))); });
    const xs = buckets.map((_, i) => i);
    const label = (i) => (byDay ? fd(addDays(cur.a, buckets[i].off), false) : MES[buckets[i].m.getUTCMonth()] + (cur.a.getUTCFullYear() !== cur.b.getUTCFullYear() ? ' ' + String(buckets[i].m.getUTCFullYear()).slice(2) : ''));
    const partial = (i) => {
      if (byDay) return '';
      const m = buckets[i].m, e = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), lastDay(...ym(m))));
      if (cur.a > m && cur.b < e) return ` (del ${cur.a.getUTCDate()} al ${cur.b.getUTCDate()})`;
      if (cur.a > m) return ` (desde el ${cur.a.getUTCDate()})`;
      if (cur.b < e) return ` (hasta el ${cur.b.getUTCDate()})`;
      return '';
    };
    const tip = (i) => (byDay ? fd(addDays(cur.a, buckets[i].off), false) : MES_L[buckets[i].m.getUTCMonth()] + partial(i));
    return { xs, label, tip, series, byDay };
  };
  // colores de los años: el actual y el anterior con color; los demás en grises cada vez más claros
  P.colorYear = (k) => (k === 0 ? 'var(--c1)' : k === 1 ? 'var(--c2)' : ['var(--cds-chart-muted)', 'var(--py3)', 'var(--py4)', 'var(--py5)'][k - 2]);

  // ---------- resúmenes con los mismos campos que antes ----------
  const R0 = (x) => Math.round(x);
  const varr = (a, b) => (b ? a / b - 1 : null);
  function build() {
    const { cur, cmp } = P.periods(), A = cur.a, B = cur.b, a2 = cmp.a, b2 = cmp.b;
    const ds = {};
    // grupo
    const g1 = P.grupo(A, B), g2 = P.grupo(a2, b2);
    const det = { Inmobiliario: 'Escrituras de viviendas entregadas', Hotelero: 'Balneario de Panticosa: alojamiento, restauración y spa', Bodegas: 'Enate, Laus y Las Moradas de San Martín', Grupo: 'Total de los tres negocios' };
    ds.grupo_resumen = ['Inmobiliario', 'Hotelero', 'Bodegas', 'Grupo'].map((n) => ({ negocio: n, facturacion: R0(g1[n].fact), facturacion_ant: R0(g2[n].fact), beneficio_bruto: R0(g1[n].bb), beneficio_bruto_ant: R0(g2[n].bb), detalle: det[n], variacion: varr(g1[n].fact, g2[n].fact), margen: g1[n].fact ? g1[n].bb / g1[n].fact : null }));
    // progresión por años del grupo
    ds.grupo_anios = P.periods().years.map((yr) => { const g = P.grupo(yr.a, yr.b); return { k: yr.k, anio: P.yearLabel(yr), completo: yr.a >= T0, ...Object.fromEntries(Object.entries(g).map(([n, v]) => [n, v.fact])) }; });
    // inmobiliario
    const i1 = inmo(A, B), i2 = inmo(a2, b2);
    const it = { escriturado_cur: i1.fact, escriturado_cmp: i2.fact, reservas_cur: i1.reservas, reservas_cmp: i2.reservas, comprometido_cur: i1.comprometido, comprometido_cmp: i2.comprometido };
    ['escriturado', 'reservas', 'comprometido'].forEach((k) => { it['var_' + k] = varr(it[k + '_cur'], it[k + '_cmp']); });
    ds.inmo_mes_totales = [it];
    // hotel
    ds.hotel_resumen = ['Gran Hotel', 'Hotel Continental', 'Total'].map((h) => {
      const x = hotel(h, A, B), y = hotel(h, a2, b2);
      return { hotel: h, habitaciones: h === 'Total' ? S.meta['hotel.gh.habitaciones'] + S.meta['hotel.co.habitaciones'] : S.meta[`hotel.${H[h]}.habitaciones`],
        ocupacion: x.disp ? x.noches / x.disp : null, ocupacion_ant: y.disp ? y.noches / y.disp : null, adr: x.noches ? x.ing / x.noches : null, adr_ant: y.noches ? y.ing / y.noches : null,
        revpar: x.disp ? x.ing / x.disp : null, revpar_ant: y.disp ? y.ing / y.disp : null, noches_vendidas: R0(x.noches), huespedes: R0(x.hu), huespedes_ant: R0(y.hu),
        ingresos_alojamiento: R0(x.ing), ingresos_puntos_venta: R0(x.fb), facturacion: R0(x.fact), facturacion_ant: R0(y.fact), beneficio_bruto: R0(x.bb), beneficio_bruto_ant: R0(y.bb), ingresos_zonas_comunes: h === 'Total' ? R0(x.zc) : 0 };
    });
    ds.hotel_puntos_resumen = S.meta.puntos_orden.map((pt, i) => {
      const m = S.meta.puntos.find((x) => x.punto === pt), x = punto(i, A, B), y = punto(i, a2, b2);
      return { punto: pt, tipo: m.tipo, ubicacion: m.ubicacion, ingresos: R0(x.ing), ingresos_ant: R0(y.ing), variacion: varr(x.ing, y.ing), coste_directo: R0(x.co), beneficio_bruto: R0(x.bb), beneficio_bruto_ant: R0(y.bb), margen: x.ing ? x.bb / x.ing : null };
    });
    // productos de las cartas
    const PR = S.reparto.productos;
    const prodVals = (a, b) => {
      const v = PR.items.map(() => ({ ing: 0, u: 0, co: 0 }));
      for (const [y, x, z] of byYear(a, b)) {
        const t = S.meta.puntos_orden.map((_, i) => sum(`punto.${i}.ing`, x, z));
        const tc = S.meta.puntos_orden.map((_, i) => sum(`punto.${i}.coste`, x, z));
        // el coste de cada producto se ajusta para que la suma cuadre con el coste del local
        const pond = S.meta.puntos_orden.map(() => 0);
        PR.items.forEach((it, j) => { pond[it.p] += PR.ing[y][j] * (it.coste || 0); });
        PR.items.forEach((it, j) => {
          const ing = t[it.p] * PR.ing[y][j]; v[j].ing += ing; if (PR.precio[y][j]) v[j].u += ing / PR.precio[y][j];
          const k = pond[it.p] && t[it.p] ? tc[it.p] / t[it.p] / pond[it.p] : 1;
          v[j].co += ing * (it.coste || 0) * k;
        });
      }
      return v;
    };
    const p1 = prodVals(A, B), p2 = prodVals(a2, b2);
    ds.hotel_productos = PR.items.map((it, j) => ({ id: it.id, punto: it.punto, tipo: it.tipo, familia: it.familia || 'Otros', categoria: it.categoria, producto: it.producto, precio: it.precio, precio_fuente: it.precio_fuente,
      ubicacion: (S.meta.puntos.find((x) => x.punto === it.punto) || {}).ubicacion,
      unidades: it.precio ? R0(p1[j].u) : null, unidades_ant: it.precio ? R0(p2[j].u) : null, variacion: it.precio ? varr(p1[j].u, p2[j].u) : null, ingresos: R0(p1[j].ing), ingresos_ant: R0(p2[j].ing),
      coste: R0(p1[j].co), beneficio: R0(p1[j].ing - p1[j].co), beneficio_ant: R0(p2[j].ing - p2[j].co), margen: p1[j].ing ? (p1[j].ing - p1[j].co) / p1[j].ing : null, ranking: null }));
    for (const pt of S.meta.puntos_orden) ds.hotel_productos.filter((r) => r.punto === pt && r.precio).sort((x, y) => y.ingresos - x.ingresos).forEach((r, i) => { r.ranking = i + 1; });
    // origen de los huéspedes
    const OR = S.reparto.origen;
    const oriVals = (a, b) => {
      const v = OR.items.map(() => ({ hu: 0, no: 0, fa: 0 }));
      for (const [y, x, z] of byYear(a, b)) {
        const T = { gh: { hu: sum('hotel.gh.hu', x, z), no: sum('hotel.gh.noches', x, z), fa: sum('hotel.gh.ing', x, z) }, co: { hu: sum('hotel.co.hu', x, z), no: sum('hotel.co.noches', x, z), fa: sum('hotel.co.ing', x, z) } };
        OR.items.forEach((it, j) => { for (const k of ['hu', 'no', 'fa']) v[j][k] += T[it.hotel][k] * OR[k][y][j]; });
      }
      return v;
    };
    const o1 = oriVals(A, B), o2 = oriVals(a2, b2);
    const HN = { gh: 'Gran Hotel', co: 'Hotel Continental' };
    const ori = OR.items.map((it, j) => ({ hotel: HN[it.hotel], ambito: it.ambito, origen: it.origen, huespedes: R0(o1[j].hu), huespedes_ant: R0(o2[j].hu), noches: R0(o1[j].no), facturacion: R0(o1[j].fa), facturacion_ant: R0(o2[j].fa) }));
    const tot = ori.filter((o) => o.hotel === 'Gran Hotel').map((o) => { const rr = ori.filter((x) => x.origen === o.origen); const s = (f) => rr.reduce((t, x) => t + x[f], 0); return { hotel: 'Total', ambito: o.ambito, origen: o.origen, huespedes: s('huespedes'), huespedes_ant: s('huespedes_ant'), noches: s('noches'), facturacion: s('facturacion'), facturacion_ant: s('facturacion_ant') }; });
    const all = ori.concat(tot);
    for (const o of all) {
      o.id = o.hotel + '|' + o.origen; o.variacion = varr(o.facturacion, o.facturacion_ant);
      o.estancia_media = o.huespedes ? o.noches / o.huespedes : null; o.gasto_por_huesped = o.huespedes ? o.facturacion / o.huespedes : null;
      const th = all.filter((x) => x.hotel === o.hotel).reduce((t, x) => t + x.facturacion, 0); o.cuota = th ? o.facturacion / th : null;
    }
    ds.hotel_origen = all;
    // bodegas
    const B_ = S.meta.bodegas;
    ds.vino_referencias = []; ds.vino_resumen = []; ds.vino_canales_resumen = [];
    const prov = [], pais = [];
    B_.forEach((b, bi) => {
      const r1 = refs(bi, A, B), r2 = refs(bi, a2, b2), x = bodega(bi, A, B), y = bodega(bi, a2, b2);
      r1.forEach((r, n) => {
        const q = r2[n];
        ds.vino_referencias.push({ bodega: b, referencia: r.it.referencia, tipo: r.it.tipo, pvp: r.it.pvp, botellas: R0(r.bot), botellas_ant: R0(q.bot), facturacion: R0(r.fa), facturacion_ant: R0(q.fa),
          variacion: varr(r.fa, q.fa), beneficio_bruto: R0(r.bb), margen: r.fa ? r.bb / r.fa : null, facturacion_nacional: R0(r.fa - r.exp), facturacion_export: R0(r.exp) });
      });
      ds.vino_resumen.push({ bodega: b, facturacion: R0(x.fact), facturacion_ant: R0(y.fact), variacion: varr(x.fact, y.fact), beneficio_bruto: R0(x.bb), beneficio_bruto_ant: R0(y.bb), margen: x.fact ? x.bb / x.fact : null,
        botellas: R0(x.bot), botellas_ant: R0(y.bot), facturacion_nacional: R0(x.may - x.exp), facturacion_export: R0(x.exp), facturacion_directa: R0(x.direct), pct_export: x.fact ? x.exp / x.fact : null, referencias: r1.length });
      [['Tienda online', 'online', 'pedidos'], ['Visitas a la bodega', 'visitas', 'visitantes'], ['Tienda de la bodega', 'tienda', 'tickets']].forEach(([cn, k, u]) => {
        const c1 = x.d[k], c2 = y.d[k];
        ds.vino_canales_resumen.push({ id: b + '|' + cn, bodega: b, canal: cn, unidad: u, cantidad: R0(c1.q), cantidad_ant: R0(c2.q), facturacion: R0(c1.f), facturacion_ant: R0(c2.f), variacion: varr(c1.f, c2.f), ticket_medio: c1.q ? c1.f / c1.q : null });
      });
    });
    // provincia y país por referencia
    const split = (kind, field, a, b) => {
      const R = S.reparto[kind], v = R.items.map(() => ({ fa: 0, bot: 0 }));
      for (const [y, x, z] of byYear(a, b)) {
        const infl = Math.pow(1.025, 2026 - +y);
        const refv = S.meta.bodegas.map((_, bi) => refs(bi, x, z)).flat();
        const byRef = new Map(refv.map((r) => [r.j, r]));
        R.items.forEach((it, j) => { const r = byRef.get(it.r); if (!r) return; const base = kind === 'prov' ? r.fa - r.exp : r.exp; const f = base * R.fa[y][j]; v[j].fa += f; v[j].bot += f / (it.eur_bot / infl); });
      }
      return v;
    };
    const mk = (kind, field) => {
      const R = S.reparto[kind], v1 = split(kind, field, A, B), v2 = split(kind, field, a2, b2);
      return R.items.map((it, j) => { const ref = S.reparto.refs.items[it.r]; return { bodega: S.meta.bodegas[ref.b], [field]: it[field], referencia: ref.referencia, botellas: R0(v1[j].bot), botellas_ant: R0(v2[j].bot), facturacion: R0(v1[j].fa), facturacion_ant: R0(v2[j].fa), id: ref.referencia + '|' + it[field] }; }).filter((r) => r.botellas > 0 || r.botellas_ant > 0);
    };
    ds.vino_provincia_referencia = mk('prov', 'provincia');
    ds.vino_export_referencia = mk('pais', 'pais');
    const agg = (rows, key) => {
      const m = new Map();
      for (const r of rows) { const k = r.bodega + '|' + r[key]; const e = m.get(k) || { bodega: r.bodega, [key]: r[key], botellas: 0, botellas_ant: 0, facturacion: 0, facturacion_ant: 0, id: k }; for (const f of ['botellas', 'botellas_ant', 'facturacion', 'facturacion_ant']) e[f] += r[f]; m.set(k, e); }
      return [...m.values()].map((e) => ({ ...e, variacion: varr(e.facturacion, e.facturacion_ant) })).sort((x, y) => y.facturacion - x.facturacion);
    };
    ds.vino_provincias = agg(ds.vino_provincia_referencia, 'provincia');
    ds.vino_paises = agg(ds.vino_export_referencia, 'pais');
    // facturación por año natural (para el gráfico anual)
    ds.vino_anual = [];
    B_.forEach((b, bi) => { for (let y = T0.getUTCFullYear(); y <= HOY.getUTCFullYear(); y++) { const a = new Date(Date.UTC(y, 0, 1)), z = y === HOY.getUTCFullYear() ? HOY : new Date(Date.UTC(y, 11, 31)); const x = bodega(bi, a, z); ds.vino_anual.push({ id: b + '|' + y, bodega: b, anio: y === HOY.getUTCFullYear() ? `${y} (hasta ${fd(HOY, false)})` : String(y), facturacion: R0(x.fact), beneficio_bruto: R0(x.bb), botellas: R0(x.bot), parcial: y === HOY.getUTCFullYear() }); } });
    return ds;
  }

  // ---------- barra del filtro ----------
  function quarters() { const out = []; for (let y = HOY.getUTCFullYear(); y >= T0.getUTCFullYear(); y--) for (let q = 4; q >= 1; q--) { const a = new Date(Date.UTC(y, (q - 1) * 3, 1)); if (a > HOY) continue; const b = new Date(Date.UTC(y, q * 3, 0)); out.push([`${y}-T${q}`, `T${q} ${y}` + (b > HOY ? ` (hasta el ${fd(HOY, false)})` : '')]); } return out; }
  function months() { const out = []; let d = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth(), 1)); while (d >= T0) { const k = iso(d).slice(0, 7); out.push([k, MES_L[d.getUTCMonth()].replace(/^./, (c) => c.toUpperCase()) + ' ' + d.getUTCFullYear() + (k === iso(HOY).slice(0, 7) ? ` (hasta el ${HOY.getUTCDate()})` : '')]); d = shiftMonths(d, -1); } return out; }
  function renderBar() {
    const bar = document.getElementById('nz-periodo'); if (!bar || !S) return;
    const s = st(), { cur, cmp, years } = P.periods();
    const opt = (list, v) => list.map(([k, l]) => `<option value="${k}"${String(k) === String(v) ? ' selected' : ''}>${l}</option>`).join('');
    const seg = (name, list, v) => `<div class="nz-seg nz-perseg" data-p="${name}" role="group">${list.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${String(k) === String(v)}">${l}</button>`).join('')}</div>`;
    const firstYear = years[years.length - 1];
    bar.innerHTML = `
      <div class="nz-pf"><span class="nz-pl">Periodo</span>${seg('per_tipo', [['ytd', 'Año en curso'], ['trimestre', 'Trimestre'], ['mes', 'Mes'], ['custom', 'Fechas']], cur.tipo)}
        ${cur.tipo === 'trimestre' ? `<select class="nz-select" data-p="per_q" aria-label="Trimestre">${opt(quarters(), s.per_q || quarters()[0][0])}</select>` : ''}
        ${cur.tipo === 'mes' ? `<select class="nz-select" data-p="per_m" aria-label="Mes">${opt(months(), s.per_m || months()[0][0])}</select>` : ''}
        ${cur.tipo === 'custom' ? `<label class="nz-pd">Del <input type="date" data-p="per_desde" min="${iso(T0)}" max="${iso(HOY)}" value="${iso(cur.a)}"></label><label class="nz-pd">al <input type="date" data-p="per_hasta" min="${iso(T0)}" max="${iso(HOY)}" value="${iso(cur.b)}"></label>` : ''}
      </div>
      <div class="nz-pf"><span class="nz-pl">Comparar con</span><select class="nz-select" data-p="per_comp" aria-label="Comparar con">${[['yoy', 'Mismo periodo del año pasado'], ['ly', 'Año pasado entero'], ['mom', 'Mismos días del mes pasado'], ['lm', 'Mes pasado entero']].map(([k, l]) => { const off = (k === 'mom' || k === 'lm') && !shortPeriod(cur); return `<option value="${k}"${k === cmp.tipo ? ' selected' : ''}${off ? ' disabled' : ''}>${l}${off ? ' (para un mes o menos)' : ''}</option>`; }).join('')}</select></div>
      <div class="nz-pf"><span class="nz-pl" title="Cuántos años anteriores se enseñan en los gráficos y en la progresión">Años anteriores</span>${seg('per_anios', [[2, '1'], [3, '2'], [4, '3'], [5, '4'], [6, '5']], years.length)}</div>
      <p class="nz-psum"><b>${P.rango(cur)}</b> frente ${P.cmpLong()}. Los gráficos enseñan este mismo periodo en ${years.length === 2 ? 'este año y el anterior' : `los últimos ${years.length} años (desde ${P.yearLabel(firstYear)})`}${firstYear.a < T0 ? '; los datos empiezan en enero de 2021' : ''}.</p>`;
    bar.querySelectorAll('.nz-perseg').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => set({ [g.dataset.p]: g.dataset.p === 'per_anios' ? +b.dataset.v : b.dataset.v }))));
    bar.querySelectorAll('select[data-p], input[data-p]').forEach((el) => el.addEventListener('change', () => {
      if (!el.value && el.type === 'date') return;
      const o = { [el.dataset.p]: el.value || null };
      if (el.dataset.p === 'per_desde' && el.value > iso(period().b)) o.per_hasta = el.value;
      if (el.dataset.p === 'per_hasta' && el.value < iso(period().a)) o.per_desde = el.value;
      set(o);
    }));
    document.querySelectorAll('.pl-cur').forEach((e) => { e.textContent = P.rango(cur); });
    document.querySelectorAll('.pl-cmp').forEach((e) => { e.textContent = P.cmpShort() + (e.classList.contains('pl-colon') ? ':' : ''); });
    document.querySelectorAll('.pl-cmp-l').forEach((e) => { e.textContent = P.cmpLong(); });
    if (window.NZ && NZ.slides) NZ.slides();
  }
  function set(o) {
    if (o.per_tipo === 'custom' && !st().per_desde) { const p = period(); o.per_desde = iso(p.a); o.per_hasta = iso(p.b); }
    dash.setParams(o);
    saveHash();
  }
  // el filtro va en el enlace para poder compartirlo
  function saveHash() {
    const s = st(), q = new URLSearchParams();
    for (const k of Object.keys(DEF)) if (s[k] != null && s[k] !== DEF[k]) q.set(k.replace('per_', ''), s[k]);
    const tab = (location.hash.slice(1).split('?')[0]) || '';
    history.replaceState(null, '', '#' + tab + (q.toString() ? '?' + q : ''));
  }
  function readHash() {
    const q = new URLSearchParams(location.hash.split('?')[1] || ''); const o = {};
    for (const k of Object.keys(DEF)) { const v = q.get(k.replace('per_', '')); if (v != null) o[k] = k === 'per_anios' ? +v : v; }
    return o;
  }
  P.saveHash = saveHash;

  P.init = (series) => {
    S = series; T0 = D(S.inicio); HOY = D(S.hoy);
    for (const [k, arr] of Object.entries(S.diario)) { const p = new Float64Array(arr.length + 1); for (let i = 0; i < arr.length; i++) p[i + 1] = p[i] + arr[i]; pref[k] = p; }
    P.ready = true; P.T0 = T0; P.HOY = HOY;
    const h = readHash(); if (Object.keys(h).length) dash.setParams(h);
  };
  P.build = () => (S ? build() : {});
  P.renderBar = renderBar;
})();
