"""Constructora, banco e incidencias de cada promoción (dashboard/data/obra.json). Todo inventado.

Por promoción: constructora, banco del préstamo promotor (concedido, dispuesto, vivo y tipo de interés),
m² construidos, coste de la obra y coste por m².
Incidencias: posventa en las viviendas de promociones entregadas y repasos de pre-entrega en las que se
entregan este año. Cada incidencia tiene categoría, gravedad, fecha de apertura y cierre, días de
resolución y si se ha resuelto dentro del plazo (SLA) que marca su gravedad.
Los nombres de constructoras y bancos son ficticios. Ejecutar después de generar_datos.py.
"""
import json, os, random, math, datetime as dt
rnd = random.Random(2310)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
promos = json.load(open(os.path.join(D, 'promociones.json')))
viv = json.load(open(os.path.join(D, 'viviendas.json')))
HOY = dt.date(2026, 10, 19)

# constructora: nombre, coste base €/m² (precios de 2026), calidad (multiplica incidencias y días de resolución)
CONS = [('cons-sanjose', 'San José', 1390, 0.85), ('cons-dragados', 'Dragados', 1460, 0.8),
        ('cons-sanmartin', 'San Martín', 1270, 1.1), ('cons-ferrovial', 'Ferrovial', 1480, 0.75),
        ('cons-acciona', 'Acciona', 1450, 0.8), ('cons-avintia', 'Avintia', 1180, 1.3), ('cons-fcc', 'FCC', 1410, 0.95)]
# banco: nombre, diferencial sobre Euribor
BANC = [('banco-bbva', 'BBVA', 1.2), ('banco-santander', 'Santander', 1.25), ('banco-abanca', 'Abanca', 1.35),
        ('banco-cajarural', 'Caja Rural', 1.4), ('banco-bankinter', 'Bankinter', 1.15),
        ('banco-ing', 'ING', 1.1), ('banco-caixa', 'CaixaBank', 1.2)]
EURIBOR = {2017: -0.15, 2018: -0.17, 2019: -0.2, 2020: -0.3, 2021: -0.5, 2022: 1.1, 2023: 3.6, 2024: 3.3, 2025: 2.3, 2026: 2.2, 2027: 2.3, 2028: 2.4, 2029: 2.4}
SLA = {'Urgente': 2, 'Alta': 7, 'Media': 15, 'Baja': 30}
CATS = [('Humedades y filtraciones', 'Alta', 0.16), ('Carpintería y ventanas', 'Media', 0.17), ('Fontanería', 'Alta', 0.13),
        ('Electricidad', 'Media', 0.11), ('Climatización y aerotermia', 'Media', 0.1), ('Acabados y pintura', 'Baja', 0.17),
        ('Fachada y cubierta', 'Alta', 0.05), ('Garaje y zonas comunes', 'Baja', 0.08), ('Ascensor', 'Urgente', 0.03)]

def entrega_fecha(p):
    e = p['entrega']
    return dt.date(int(e[:4]), int(e[5:7]) if len(e) > 4 else 6, 15)

out = {}
incid = []
nid = 0
# reparto garantizando que todas las constructoras y bancos tengan al menos una promoción
def reparte(lista, n, pesos=None):
    base = list(range(len(lista)))                      # una de cada una primero
    extra = rnd.choices(range(len(lista)), weights=pesos, k=max(0, n - len(lista)))
    idx = base + extra
    rnd.shuffle(idx)
    return idx
asig_c = reparte(CONS, len(promos), [3, 2, 3, 2, 2, 3, 2])
asig_b = reparte(BANC, len(promos))
for i, p in enumerate(promos):
    c = CONS[asig_c[i]]
    b = BANC[asig_b[i]]
    vs = [v for v in viv if v['promo_id'] == p['id']]
    m2_util = sum(v['m2'] for v in vs) or p['viviendas'] * 100
    m2 = round(m2_util * rnd.uniform(1.32, 1.48))  # con zonas comunes, garajes y trasteros
    ent = entrega_fecha(p)
    anio_obra = ent.year - 1
    coste_m2 = round(c[2] * (1.035 ** (anio_obra - 2026)) * rnd.uniform(0.93, 1.08))
    coste = m2 * coste_m2
    concedido = round(coste * rnd.uniform(0.62, 0.78) / 1e5) * 1e5
    en_curso = p['estado'] == 'En curso'
    if en_curso:
        avance = {2026: rnd.uniform(0.85, 0.97), 2027: rnd.uniform(0.45, 0.7), 2028: rnd.uniform(0.15, 0.35), 2029: rnd.uniform(0.03, 0.12)}.get(ent.year, 0.5)
        dispuesto = round(concedido * avance / 1e4) * 1e4
        vivo = dispuesto
    else:
        avance, dispuesto, vivo = 1.0, concedido, 0  # cancelado o subrogado por los compradores al escriturar
    tipo = round(max(1.4, EURIBOR.get(anio_obra, 2.3) + b[2]) * 100) / 100
    out[p['id']] = {'constructora': c[0], 'banco': b[0], 'm2_construidos': m2, 'coste_obra': coste, 'coste_m2': coste_m2,
                    'prestamo_concedido': concedido, 'prestamo_dispuesto': dispuesto, 'prestamo_vivo': vivo,
                    'avance_obra': round(avance, 3), 'tipo_interes': tipo, 'anio_firma': anio_obra}
    # ---- incidencias
    if en_curso and ent.year > HOY.year: continue  # todavía en obra: sin viviendas que revisar
    for v in vs:
        if en_curso:  # repasos de pre-entrega de las que se entregan este año
            n = sum(1 for _ in range(3) if rnd.random() < 0.28 * c[3])
            ini, fin = HOY - dt.timedelta(days=75), HOY
        else:  # posventa: la mayoría en los dos primeros años tras la entrega
            n = sum(1 for _ in range(4) if rnd.random() < 0.3 * c[3])
            ini, fin = ent, min(HOY, ent + dt.timedelta(days=365 * 3))
        for _ in range(n):
            if fin <= ini: break
            span = (fin - ini).days
            ab = ini + dt.timedelta(days=int(span * (rnd.random() ** 1.8)))  # más al principio
            cat = rnd.choices(CATS, weights=[x[2] for x in CATS])[0]
            grav = cat[1] if rnd.random() < 0.7 else rnd.choice(list(SLA))
            sla = SLA[grav]
            dias = max(0, round(rnd.lognormvariate(math.log(sla * 0.75 * c[3]), 0.65)))
            cierre = ab + dt.timedelta(days=dias)
            abierta = cierre > HOY
            nid += 1
            incid.append({'id': 'inc-%05d' % nid, 'promo_id': p['id'], 'vivienda_id': v['id'], 'vivienda': v['vivienda'], 'constructora': c[0],
                          'tipo': 'Pre-entrega' if en_curso else 'Posventa', 'categoria': cat[0], 'gravedad': grav, 'sla_dias': sla,
                          'apertura': ab.isoformat(), 'cierre': None if abierta else cierre.isoformat(),
                          'estado': 'Abierta' if abierta else 'Cerrada', 'dias': (HOY - ab).days if abierta else dias,
                          'dentro_sla': (HOY - ab).days <= sla if abierta else dias <= sla})
json.dump({'hoy': HOY.isoformat(), 'sla': SLA, 'constructoras': [{'id': c[0], 'nombre': c[1]} for c in CONS],
           'bancos': [{'id': b[0], 'nombre': b[1]} for b in BANC], 'promos': out, 'incidencias': incid,
           'nota': 'Datos simulados. Los bancos y constructoras son empresas reales pero su relación con el grupo, la financiación, el coste por m2 y las incidencias son INVENTADOS (maqueta).'},
          open(os.path.join(D, 'obra.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
ab = sum(1 for x in incid if x['estado'] == 'Abierta')
print(len(out), 'promociones ·', len(incid), 'incidencias (', ab, 'abiertas) ·', os.path.getsize(os.path.join(D, 'obra.json')) // 1024, 'KB')
