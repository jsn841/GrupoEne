"""Datos inmobiliarios extra para los informes (dashboard/data/): desglose por producto y suelos ofrecidos.

  - promo_detalle.json: por cada promoción EN CURSO, el desglose en viviendas, garajes y locales
    comerciales, con total, vendidos, reservados, disponibles y precio medio de cada uno.
  - suelos.json: suelos que han ofrecido a la promotora (particulares, agencias…), con su estado,
    coste de suelo, viviendas planteadas, coste de obra estimado, ingresos y rentabilidad estimada.
    Algunos están analizados en el trimestre en curso.
Todo inventado. Ejecutar cuando quieras (solo lee promociones.json).
"""
import json, os, random, datetime as dt
rnd = random.Random(2610)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
promos = [p for p in json.load(open(os.path.join(D, 'promociones.json'))) if p['estado'] == 'En curso']
HOY = dt.date(2026, 10, 19)
CCAA = {'Madrid': 'Comunidad de Madrid', 'A Coruña': 'Galicia', 'Pontevedra': 'Galicia', 'Sevilla': 'Andalucía', 'Huelva': 'Andalucía',
        'Málaga': 'Andalucía', 'Murcia': 'Región de Murcia', 'Alicante': 'Comunitat Valenciana', 'Asturias': 'Principado de Asturias',
        'Zaragoza': 'Aragón', 'Valencia': 'Comunitat Valenciana', 'Toledo': 'Castilla-La Mancha', 'Cádiz': 'Andalucía'}

# ---------------- desglose por producto ----------------
det = []
for p in promos:
    nv, pm, pct = p['viviendas'], p['precio_medio'], p['pct_comercializado']
    def reparto(total, tasa):
        vend = round(total * tasa * rnd.uniform(0.82, 0.97))
        res = round(total * tasa * rnd.uniform(0.04, 0.12))
        vend = min(vend, total); res = min(res, total - vend)
        return {'total': total, 'vendidos': vend, 'reservados': res, 'disponibles': total - vend - res}
    viv = {'total': nv, 'vendidos': p['vendidas'], 'reservados': p['reservadas'], 'disponibles': p['disponibles'], 'precio_medio': pm}
    ngar = round(nv * rnd.uniform(1.0, 1.35))
    gar = reparto(ngar, pct * rnd.uniform(0.75, 0.95)); gar['precio_medio'] = rnd.choice([16000, 18000, 20000, 22000, 25000])
    tiene_local = rnd.random() < 0.55
    if tiene_local:
        nloc = rnd.randint(1, 5)
        loc = reparto(nloc, pct * rnd.uniform(0.4, 0.85)); loc['precio_medio'] = round(rnd.uniform(140000, 460000) / 1000) * 1000
    else:
        loc = {'total': 0, 'vendidos': 0, 'reservados': 0, 'disponibles': 0, 'precio_medio': 0}
    cats = {'viviendas': viv, 'garajes': gar, 'locales': loc}
    for c in cats.values():
        c['ingresos'] = c['total'] * c['precio_medio']
        c['comprometido'] = (c['vendidos'] + c['reservados']) * c['precio_medio']
        c['por_vender'] = c['disponibles'] * c['precio_medio']
        c['pct_com'] = (c['vendidos'] + c['reservados']) / c['total'] if c['total'] else 0
    det.append({'id': p['id'], 'promocion': p['promocion'], 'ciudad': p['ciudad'], 'provincia': p['provincia'],
                'entrega': p['entrega'], 'productos': cats})
json.dump({'promociones': det, 'nota': 'Desglose simulado por producto de cada promoción en curso.'},
          open(os.path.join(D, 'promo_detalle.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------- suelos ofrecidos ----------------
ZONAS = [
 ('Parcela en Valdebebas (UE-1)', 'Madrid', 'Madrid'), ('Suelo en El Cañaveral', 'Madrid', 'Madrid'),
 ('Solar en Montecarmelo', 'Madrid', 'Madrid'), ('Parcela en Entrenúcleos', 'Dos Hermanas', 'Sevilla'),
 ('Suelo en Nuevo Tres Cantos', 'Tres Cantos', 'Madrid'), ('Parcela frente al mar en Dénia', 'Dénia', 'Alicante'),
 ('Solar en Teatinos', 'Málaga', 'Málaga'), ('Suelo en Villa de Vallecas', 'Madrid', 'Madrid'),
 ('Parcela en Arcosur', 'Zaragoza', 'Zaragoza'), ('Solar en Bouzas', 'Vigo', 'Pontevedra'),
 ('Suelo en La Marina de Valencia', 'Valencia', 'Valencia'), ('Parcela en Carabanchel', 'Madrid', 'Madrid'),
 ('Solar en Rosario (Hacienda)', 'Sevilla', 'Sevilla'), ('Suelo en Palmas Altas', 'Sevilla', 'Sevilla'),
 ('Parcela en Toledo (Vega Baja)', 'Toledo', 'Toledo'),
]
ESTADOS = ['Ofrecido', 'En análisis', 'Analizado', 'En negociación', 'Descartado']
ORIGEN = ['Particular', 'Agencia', 'Otra promotora', 'Fondo', 'Ayuntamiento (concurso)']
suelos = []
for i, (nombre, ciu, prov) in enumerate(ZONAS):
    # fecha de oferta en los últimos ~5 meses; algunas analizadas este trimestre (oct-dic 2026)
    foferta = HOY - dt.timedelta(days=rnd.randint(5, 150))
    estado = rnd.choices(ESTADOS, weights=[3, 3, 4, 2, 3])[0]
    fanalisis = None
    if estado in ('Analizado', 'En negociación', 'Descartado'):
        fanalisis = foferta + dt.timedelta(days=rnd.randint(5, 30))
        if fanalisis > HOY: fanalisis = HOY - dt.timedelta(days=rnd.randint(0, 10))
    viv = rnd.randint(28, 140)
    m2_viv = viv * rnd.uniform(95, 135)
    precio_m2 = rnd.uniform(2600, 5200)
    ingresos = m2_viv * precio_m2 * rnd.uniform(0.95, 1.05)
    coste_suelo = ingresos * rnd.uniform(0.14, 0.28)
    coste_obra = m2_viv * rnd.uniform(1150, 1500) * 1.4  # obra + sótanos/zonas
    otros = ingresos * rnd.uniform(0.17, 0.23)           # impuestos, financieros, comercial, gestión
    beneficio = ingresos - coste_suelo - coste_obra - otros
    margen = beneficio / ingresos if ingresos else 0
    suelos.append({'id': 'suelo-%02d' % (i + 1), 'nombre': nombre, 'municipio': ciu, 'provincia': prov, 'ccaa': CCAA.get(prov, '—'),
                   'fecha_oferta': foferta.isoformat(), 'fecha_analisis': fanalisis.isoformat() if fanalisis else None,
                   'estado': estado, 'origen': rnd.choice(ORIGEN),
                   'm2_suelo': round(m2_viv / rnd.uniform(1.8, 3.2)), 'edificabilidad': round(m2_viv),
                   'viviendas': viv, 'coste_suelo': round(coste_suelo), 'coste_obra': round(coste_obra),
                   'ingresos': round(ingresos), 'beneficio': round(beneficio), 'margen': round(margen, 4),
                   'precio_m2': round(precio_m2)})
# trimestre en curso
q = (HOY.month - 1) // 3
q_ini = dt.date(HOY.year, q * 3 + 1, 1)
json.dump({'hoy': HOY.isoformat(), 'trimestre_inicio': q_ini.isoformat(), 'trimestre': f'T{q + 1} {HOY.year}',
           'nota': 'Suelos ofrecidos a la promotora (simulado). La rentabilidad es una estimación previa, no un análisis cerrado.',
           'estados': ESTADOS, 'suelos': suelos}, open(os.path.join(D, 'suelos.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
ana_q = [s for s in suelos if s['fecha_analisis'] and s['fecha_analisis'] >= q_ini.isoformat()]
print(len(det), 'promos con desglose ·', len(suelos), 'suelos ·', len(ana_q), 'analizados en', f'T{q + 1}')
