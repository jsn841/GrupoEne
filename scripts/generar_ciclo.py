"""Ciclo de vida de cada promoción (dashboard/data/ciclo.json): hitos y reservas y contactos (leads) por mes.

Hitos: compra del suelo, comienzo de la comercialización (el lanzamiento de marketing.json), comienzo de la
obra y entrega. La compra del suelo y el comienzo de la obra son inventados con plazos habituales; la entrega
sale de promociones.json (en las promociones en curso, el año previsto). Reservas: viviendas.json.
Leads: campañas y emails de marketing.json. Ejecutar después de generar_marketing.py.
"""
import json, os, random, datetime as dt
rnd = random.Random(2310)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
load = lambda n: json.load(open(os.path.join(D, n + '.json')))
promos = {p['id']: p for p in load('promociones')}
viv = load('viviendas'); mk = load('marketing')
HOY = dt.date.fromisoformat(mk['hoy'])
CCAA = {'Madrid': 'Comunidad de Madrid', 'A Coruña': 'Galicia', 'Pontevedra': 'Galicia', 'Sevilla': 'Andalucía', 'Huelva': 'Andalucía',
        'Málaga': 'Andalucía', 'Murcia': 'Región de Murcia', 'Alicante': 'Comunitat Valenciana', 'Asturias': 'Principado de Asturias', 'Zaragoza': 'Aragón'}
ym = lambda d: f'{d.year}-{d.month:02d}'
def add_m(d, k):
    m = d.month - 1 + k; return dt.date(d.year + m // 12, m % 12 + 1, min(d.day, 28))

fc, fe = mk['campos_campanas'], mk['campos_emails']
out = []
for pi, mp in enumerate(mk['promociones']):
    if mp['simulada'] or mp['id'] not in promos: continue
    p = promos[mp['id']]
    com = dt.date.fromisoformat(mp['lanzamiento'])
    suelo = add_m(com, -rnd.randint(9, 20)) - dt.timedelta(days=rnd.randint(0, 20))
    if p['estado'] == 'Entregada':
        ent = dt.date(int(p['entrega'][:4]), int(p['entrega'][5:7]), rnd.randint(5, 25)); prevista = False
    else:
        ent = dt.date(int(p['entrega']), rnd.choice([3, 5, 6, 9, 11]), 15); prevista = True
        if ent <= HOY: ent = add_m(HOY, rnd.randint(2, 6))
    obra = max(add_m(com, rnd.randint(3, 8)), add_m(ent, -rnd.randint(22, 30)))
    if obra >= ent: obra = add_m(ent, -18)
    # licencia de obra: concedida entre la comercialización y el comienzo de obra (la obra no puede empezar sin ella)
    lic = add_m(obra, -rnd.randint(1, 3)) - dt.timedelta(days=rnd.randint(0, 20))
    if not (com < lic < obra): lic = com + (obra - com) // 2
    meses = {}
    def put(k, i, v):
        meses.setdefault(k, [0, 0])[i] += v
    for v in viv:
        if v['promo_id'] == p['id'] and v['fecha_reserva']: put(ym(dt.date.fromisoformat(v['fecha_reserva'])), 0, 1)
    for r in mk['campanas']:
        if r[0] != pi: continue
        o = dict(zip(fc, r)); a, b = dt.date.fromisoformat(o['desde']), dt.date.fromisoformat(o['hasta'])
        n = (b - a).days + 1; d = a
        while d <= b:  # repartir por meses
            e = min(b, add_m(dt.date(d.year, d.month, 1), 1) - dt.timedelta(days=1))
            put(ym(d), 1, o['contactos'] * ((e - d).days + 1) / n); d = e + dt.timedelta(days=1)
    for r in mk['emails']:
        if r[0] == pi: o = dict(zip(fe, r)); put(o['fecha'][:7], 1, o['contactos'])
    meses = {k: [v[0], round(v[1], 1)] for k, v in sorted(meses.items())}
    out.append(dict(id=p['id'], promocion=p['promocion'], ciudad=p['ciudad'], provincia=p['provincia'], ccaa=CCAA[p['provincia']],
                    viviendas=p['viviendas'], estado=p['estado'], hitos=dict(suelo=suelo.isoformat(), comercial=com.isoformat(), licencia=lic.isoformat(), obra=obra.isoformat(), entrega=ent.isoformat()),
                    entrega_prevista=prevista, obra_prevista=obra > HOY, licencia_prevista=lic > HOY, meses=meses))
json.dump(dict(hoy=HOY.isoformat(), nota='Compra del suelo, licencia y comienzo de obra simulados; reservas del sistema de ventas; leads de la herramienta de marketing.', promociones=out),
          open(os.path.join(D, 'ciclo.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'promociones', os.path.getsize(os.path.join(D, 'ciclo.json')) // 1024, 'KB')
