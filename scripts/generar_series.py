"""Series diarias (2021 – hoy) para poder filtrar el panel por cualquier periodo.

Lee los datos simulados que ya genera generar_datos.py (meses, resúmenes del año y de 2025)
y crea data/series.json con:
  - totales diarios de cada negocio (hotel, puntos de venta, bodegas, canales directos, escrituras),
  - el reparto de cada año entre productos, orígenes, referencias, provincias y países.
El panel suma los días del periodo elegido y aplica el reparto del año al que pertenece cada día.
Todo sigue siendo inventado; solo se mantiene coherente con lo que ya enseñaba el panel.
"""
import json, os, random, math, datetime as dt
from collections import defaultdict

rnd = random.Random(2021)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
load = lambda n: json.load(open(os.path.join(D, n + '.json')))
START = dt.date(2021, 1, 1)
TODAY = dt.date(2026, 10, 19)
NDAYS = (TODAY - START).days + 1
DAYS = [START + dt.timedelta(days=i) for i in range(NDAYS)]
YEARS = list(range(2021, 2027))
SEAS = [0.065, 0.065, 0.075, 0.08, 0.085, 0.09, 0.09, 0.07, 0.08, 0.09, 0.1, 0.11]

def month_key(d): return f"{d.year}-{d.month:02d}"
MONTH_DAYS = defaultdict(list)
for i, d in enumerate(DAYS): MONTH_DAYS[month_key(d)].append(i)
MONTHS = sorted(MONTH_DAYS)

def spread(total, idxs, weight):
    """Reparte un total mensual entre sus días con un peso por día; devuelve enteros que suman el total."""
    w = [max(0.0001, weight(DAYS[i]) * rnd.uniform(0.9, 1.1)) for i in idxs]
    s = sum(w); raw = [total * x / s for x in w]
    out = [int(math.floor(x)) for x in raw]
    rest = int(round(total)) - sum(out)
    order = sorted(range(len(raw)), key=lambda k: raw[k] - out[k], reverse=True)
    for k in order[:max(0, rest)]: out[k] += 1
    return out

def series_from_months(monthly, weight):
    arr = [0] * NDAYS
    for m, tot in monthly.items():
        if m not in MONTH_DAYS or tot is None: continue
        for i, v in zip(MONTH_DAYS[m], spread(tot, MONTH_DAYS[m], weight)): arr[i] = v
    return arr

def same_month(y, m): return f"{y}-{m:02d}"
WK_HOTEL = lambda d: [0.85, 0.82, 0.85, 0.95, 1.25, 1.4, 0.95][d.weekday()]
WK_TRADE = lambda d: [1.15, 1.15, 1.15, 1.15, 1.1, 0.35, 0.1][d.weekday()]
WK_FLAT = lambda d: 1.0
WK_VISIT = lambda d: [0.6, 0.5, 0.6, 0.7, 1.0, 1.9, 1.6][d.weekday()]

out = {'inicio': START.isoformat(), 'hoy': TODAY.isoformat(), 'dias': NDAYS, 'diario': {}, 'reparto': {}, 'meta': {}}
S = out['diario']

# ---------------- HOTEL ----------------
hotel_mes = load('hotel_mes')
HOT = {'Gran Hotel': 90, 'Hotel Continental': 160}
F_OCC = {2021: 0.80, 2022: 0.91, 2023: 0.97}
F_ADR = {2021: 0.86, 2022: 0.92, 2023: 0.96}
for h, hab in HOT.items():
    rows = {r['mes']: r for r in hotel_mes if r['hotel'] == h}
    mon = {k: {} for k in ('noches', 'ing', 'hu')}
    for m in MONTHS:
        y, mm = int(m[:4]), int(m[5:])
        if m in rows:
            r = rows[m]; no, ing, hu = r['noches_vendidas'], r['ingresos_alojamiento'], r['huespedes']
        else:
            base = rows[same_month(2024, mm)]
            fo = F_OCC[y] * rnd.uniform(0.96, 1.04); fa = F_ADR[y] * rnd.uniform(0.97, 1.03)
            dm = len(MONTH_DAYS[m]); db = base['habitaciones_disponibles'] / hab
            no = min(hab * dm * 0.97, base['noches_vendidas'] * fo * dm / db)
            ing = no * base['adr'] * fa; hu = no * base['huespedes'] / base['noches_vendidas']
        mon['noches'][m], mon['ing'][m], mon['hu'][m] = round(no), round(ing), round(hu)
    key = 'gh' if h == 'Gran Hotel' else 'co'
    S[f'hotel.{key}.noches'] = series_from_months(mon['noches'], WK_HOTEL)
    S[f'hotel.{key}.ing'] = series_from_months(mon['ing'], lambda d: WK_HOTEL(d) * (1.08 if d.weekday() >= 4 else 1))
    S[f'hotel.{key}.hu'] = series_from_months(mon['hu'], WK_HOTEL)
    out['meta'][f'hotel.{key}.habitaciones'] = hab

# puntos de venta
pm = load('hotel_puntos_mes')
PUNTOS = sorted(set(r['punto'] for r in pm))
out['meta']['puntos'] = [{'punto': r['punto'], 'tipo': r['tipo'], 'ubicacion': r['ubicacion']} for r in pm if r['mes'] == '2024-01']
for i, p in enumerate(PUNTOS):
    rows = {r['mes']: r for r in pm if r['punto'] == p}
    ing, cos = {}, {}
    for m in MONTHS:
        y, mm = int(m[:4]), int(m[5:])
        if m in rows: ing[m], cos[m] = rows[m]['ingresos'], rows[m]['coste_directo']
        else:
            b = rows[same_month(2024, mm)]; f = F_OCC[y] * F_ADR[y] ** 0.5 * rnd.uniform(0.94, 1.06)
            ing[m] = round(b['ingresos'] * f); cos[m] = round(b['coste_directo'] * f * rnd.uniform(0.99, 1.02))
    S[f'punto.{i}.ing'] = series_from_months(ing, WK_HOTEL)
    S[f'punto.{i}.coste'] = series_from_months(cos, WK_HOTEL)
out['meta']['puntos_orden'] = PUNTOS

def year_shares(cur, prev, growth_noise=0.04):
    """Pesos por año 2021–2026 a partir de 2026 (cur) y 2025 (prev); los años anteriores siguen la tendencia con algo de ruido."""
    res = {}
    for y in YEARS:
        if y == 2026: res[y] = cur
        elif y == 2025: res[y] = prev
        else:
            k = 2025 - y
            res[y] = [max(0.0, p * ((p / c) if c else 1) ** (k * 0.5) * rnd.uniform(1 - growth_noise, 1 + growth_noise)) if c else p * rnd.uniform(0.9, 1.1) for c, p in zip(cur, prev)]
    return {str(y): [round(x / (sum(v) or 1), 6) for x in v] for y, v in res.items()}

# productos de las cartas: reparto de los ingresos de cada punto
prod = load('hotel_productos')
R = out['reparto']
R['productos'] = {'items': [], 'ing': {}, 'precio': {}}
for i, p in enumerate(PUNTOS):
    items = [r for r in prod if r['punto'] == p]
    cur = [r['ingresos'] for r in items]
    prev = [((r['unidades_ant'] or 0) * r['precio']) if r['precio'] else r['ingresos'] * rnd.uniform(0.92, 1.0) for r in items]
    sh = year_shares(cur, prev)
    for j, r in enumerate(items):
        R['productos']['items'].append({k: r[k] for k in ('id', 'punto', 'tipo', 'categoria', 'producto', 'precio', 'precio_fuente')} | {'p': i})
    for y in YEARS:
        R['productos']['ing'].setdefault(str(y), []).extend(sh[str(y)])
        R['productos']['precio'].setdefault(str(y), []).extend([round(r['precio'] / (1.03 ** (2026 - y)), 2) if r['precio'] else None for r in items])

# origen de los huéspedes
ori = load('hotel_origen')
R['origen'] = {'items': [], 'hu': {}, 'no': {}, 'fa': {}}
for h in HOT:
    items = [o for o in ori if o['hotel'] == h]
    key = 'gh' if h == 'Gran Hotel' else 'co'
    hu = year_shares([o['huespedes'] for o in items], [o['huespedes_ant'] for o in items])
    no = year_shares([o['noches'] for o in items], [o['noches'] * o['huespedes_ant'] / max(1, o['huespedes']) for o in items])
    fa = year_shares([o['facturacion'] for o in items], [o['facturacion_ant'] for o in items])
    for o in items: R['origen']['items'].append({'hotel': key, 'ambito': o['ambito'], 'origen': o['origen']})
    for y in YEARS:
        for k, v in (('hu', hu), ('no', no), ('fa', fa)): R['origen'][k].setdefault(str(y), []).extend(v[str(y)])

# ---------------- BODEGAS ----------------
vmes = load('vino_mes'); anual = load('vino_anual'); canal = load('vino_canales_mes'); refs = load('vino_referencias')
BOD = ['Enate', 'Laus', 'Las Moradas de San Martín']
out['meta']['bodegas'] = BOD
COST = {'Enate': 0.24, 'Laus': 0.27, 'Las Moradas de San Martín': 0.26}
NET_NAC, NET_EXP = 0.56, 0.46
CH = [('online', 'pedidos_online', 'facturacion_online', WK_FLAT), ('visitas', 'visitantes', 'facturacion_visitas', WK_VISIT), ('tienda', 'tickets_tienda', 'facturacion_tienda', WK_VISIT)]
for bi, b in enumerate(BOD):
    tot = {}
    an = {int(a['anio'][:4]): a for a in anual if a['bodega'] == b}
    for m in MONTHS:
        y, mm = int(m[:4]), int(m[5:])
        if y >= 2024:
            r = next(x for x in vmes if x['bodega'] == b and x['mes'] == mm)
            tot[m] = r[f'facturacion_{y}']
        else:
            tot[m] = round(an[y]['facturacion'] * SEAS[mm - 1] * rnd.uniform(0.93, 1.07))
    # canales directos
    cm = {r['mes']: r for r in canal if r['bodega'] == b}
    direct_m = defaultdict(int)
    for cname, kq, kf, wk in CH:
        q, f = {}, {}
        for m in MONTHS:
            y, mm = int(m[:4]), int(m[5:])
            if m in cm: q[m], f[m] = cm[m][kq], cm[m][kf]
            else:
                bse = cm[same_month(2024, mm)]; g = 1.09 ** (y - 2024) * rnd.uniform(0.92, 1.08)
                q[m], f[m] = round(bse[kq] * g), round(bse[kf] * g * (1.02 ** (y - 2024)))
            direct_m[m] += f[m]
        S[f'vino.{bi}.{cname}.q'] = series_from_months(q, wk)
        S[f'vino.{bi}.{cname}.f'] = series_from_months(f, wk)
    whole = {m: max(0, tot[m] - direct_m[m]) if tot[m] is not None else None for m in MONTHS}
    S[f'vino.{bi}.mayorista'] = series_from_months(whole, WK_TRADE)

# reparto de la venta mayorista por referencia, y de cada referencia por provincia y país
R['refs'] = {'items': [], 'fa': {}, 'exp': {}}
pr = load('vino_provincia_referencia'); ex = load('vino_export_referencia')
R['prov'] = {'items': [], 'fa': {}}
R['pais'] = {'items': [], 'fa': {}}
for bi, b in enumerate(BOD):
    items = [r for r in refs if r['bodega'] == b]
    fa = year_shares([r['facturacion'] for r in items], [r['facturacion_ant'] for r in items])
    for r in items:
        ri = len(R['refs']['items'])
        # euros por botella vendida (mezcla España / exportación) y coste por botella
        R['refs']['items'].append({'b': bi, 'referencia': r['referencia'], 'tipo': r['tipo'], 'pvp': r['pvp'],
                                   'eur_bot': round(r['facturacion'] / max(1, r['botellas']), 3), 'coste_bot': round(r['pvp'] * COST[b], 3)})
        exp_share = r['facturacion_export'] / max(1, r['facturacion'])
        for y in YEARS:
            R['refs']['exp'].setdefault(str(y), []).append(round(min(0.95, max(0.02, exp_share * rnd.uniform(0.92, 1.08) if y < 2026 else exp_share)), 4))
        for kind, rows, field, net in (('prov', pr, 'provincia', NET_NAC), ('pais', ex, 'pais', NET_EXP)):
            rr = [x for x in rows if x['referencia'] == r['referencia']]
            if not rr: continue
            sh = year_shares([x['facturacion'] for x in rr], [x['facturacion_ant'] for x in rr])
            for x in rr: R[kind]['items'].append({'r': ri, field: x[field], 'eur_bot': round(r['pvp'] * net, 3)})
            for y in YEARS: R[kind]['fa'].setdefault(str(y), []).extend(sh[str(y)])
    for y in YEARS: R['refs']['fa'].setdefault(str(y), []).extend(fa[str(y)])

# ---------------- INMOBILIARIO ----------------
promos = load('promociones'); viv = load('viviendas')
esc = defaultdict(float)
for p in promos:
    if p['estado'] != 'Entregada' or len(p['entrega']) < 7: continue
    m = p['entrega'][:7]
    if m not in MONTH_DAYS: continue
    for i, v in zip(MONTH_DAYS[m], spread(p['facturacion_escriturada'], MONTH_DAYS[m], WK_TRADE)): esc[i] += v
S['inmo.escriturado'] = [round(esc[i]) for i in range(NDAYS)]
res_n = [0] * NDAYS; res_e = [0] * NDAYS
for v in viv:
    if not v['fecha_reserva']: continue
    d = dt.date.fromisoformat(v['fecha_reserva'])
    if START <= d <= TODAY:
        i = (d - START).days; res_n[i] += 1; res_e[i] += v['precio']
S['inmo.reservas'] = res_n
S['inmo.comprometido'] = res_e
out['meta']['margen_inmo'] = {'2021': 0.20, '2022': 0.205, '2023': 0.21, '2024': 0.21, '2025': 0.215, '2026': 0.23}
out['meta']['coste_habitacion'] = 0.29
out['meta']['margen_directo'] = 0.55

path = os.path.join(D, 'series.json')
json.dump(out, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
print('series.json', os.path.getsize(path), 'bytes ·', NDAYS, 'días ·', len(S), 'series diarias')
