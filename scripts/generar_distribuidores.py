"""Distribuidores de las bodegas (simulado) → se añade a dashboard/data/series.json en reparto.dist.

Las bodegas venden a restaurantes, tiendas y supermercados a través de distribuidores por zonas.
Los nombres son distribuidores de vino reales de cada zona (encontrados en sus webs); la relación
con las bodegas, las zonas asignadas y todas las cifras son inventadas para la maqueta.

Cómo se reparte: las ventas nacionales de cada referencia por provincia (reparto.prov) se asignan
al distribuidor (o distribuidores) de esa provincia. «Resto de España» se reparte entre las
provincias que no aparecen por separado según su población. Así los totales cuadran con el resto
del panel. Ejecutar después de generar_series.py (y de generar_consumos.py, que también escribe ahí).
"""
import json, os, random
rnd = random.Random(2110)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
S = json.load(open(os.path.join(D, 'series.json')))
YEARS = sorted(S['reparto']['prov']['fa'].keys())

# habitantes (millones, aprox. INE 2024): solo sirve para repartir «Resto de España»
POB = {'Madrid': 7.0, 'Barcelona': 5.9, 'Valencia': 2.7, 'Alicante': 2.0, 'Sevilla': 1.95, 'Málaga': 1.8, 'Murcia': 1.55, 'Cádiz': 1.25,
       'Illes Balears': 1.23, 'Bizkaia': 1.15, 'Las Palmas': 1.15, 'A Coruña': 1.13, 'Santa Cruz de Tenerife': 1.06, 'Asturias': 1.0,
       'Zaragoza': 0.98, 'Pontevedra': 0.95, 'Granada': 0.93, 'Tarragona': 0.84, 'Girona': 0.8, 'Córdoba': 0.77, 'Almería': 0.75,
       'Gipuzkoa': 0.73, 'Toledo': 0.72, 'Badajoz': 0.67, 'Navarra': 0.67, 'Jaén': 0.62, 'Castellón': 0.6, 'Cantabria': 0.59,
       'Huelva': 0.53, 'Valladolid': 0.52, 'Ciudad Real': 0.49, 'León': 0.45, 'Lleida': 0.45, 'Cáceres': 0.39, 'Albacete': 0.39,
       'Burgos': 0.36, 'Álava': 0.34, 'Salamanca': 0.33, 'Lugo': 0.33, 'La Rioja': 0.32, 'Ourense': 0.3, 'Guadalajara': 0.27,
       'Huesca': 0.23, 'Cuenca': 0.2, 'Zamora': 0.17, 'Ávila': 0.16, 'Palencia': 0.16, 'Segovia': 0.155, 'Teruel': 0.135, 'Soria': 0.09}
# más vino por habitante en zonas turísticas y de hostelería fuerte
TUR = {'Illes Balears': 1.5, 'Málaga': 1.3, 'Las Palmas': 1.3, 'Santa Cruz de Tenerife': 1.3, 'Gipuzkoa': 1.3, 'Cádiz': 1.15, 'Girona': 1.2, 'Tarragona': 1.15, 'Cantabria': 1.15}

# id, nombre, sede, provincia de la sede, lat, lon, web, canales [hostelería, tienda especializada, supermercados], bodegas que lleva
DIST = [
 ('dispedisa', 'Dispedisa', 'Comunidad de Madrid', 'Madrid', 40.46, -3.62, 'dispedisa.com', [.70, .15, .15], None),
 ('mundela', 'Mundela Ditema', 'Madrid', 'Madrid', 40.36, -3.78, 'mundeladitema.com', [.55, .35, .10], None),
 ('vilaviniteca', 'Vila Viniteca', 'Barcelona', 'Barcelona', 41.38, 2.18, 'vilaviniteca.es', [.45, .50, .05], None),
 ('divil', 'Divil', 'Barcelona', 'Barcelona', 41.50, 2.05, 'divil.com', [.75, .15, .10], None),
 ('palmavi', 'Palmavi', 'Palma (Mallorca)', 'Illes Balears', 39.57, 2.65, 'palmavi.com', [.80, .15, .05], None),
 ('divins', 'Divins', 'Valencia', 'Valencia', 39.47, -0.38, 'divinsvalencia.es', [.60, .30, .10], None),
 ('tabarca', 'Grupo Tabarca', 'Alicante', 'Alicante', 38.35, -0.48, 'comercialtabarca.com', [.55, .10, .35], None),
 ('vendimias', 'Vendimias Exclusivas', 'Sevilla', 'Sevilla', 37.39, -5.98, 'vendimiasexclusivas.com', [.55, .35, .10], None),
 ('costadelsol', 'Vinos Costa del Sol', 'Málaga', 'Málaga', 36.72, -4.42, 'vinoscostadelsol.com', [.70, .20, .10], None),
 ('luar', 'Luar Distribuciones', 'Bilbao', 'Bizkaia', 43.26, -2.93, 'luardistribuciones.com', [.80, .12, .08], None),
 ('sarasti', 'Sarasti Edariak', 'Donostia - San Sebastián', 'Gipuzkoa', 43.31, -1.98, 'sarastiedariak.com', [.75, .15, .10], None),
 ('lagarteiras', 'Distribuciones Lagarteiras', 'A Coruña', 'A Coruña', 43.36, -8.41, 'distribucioneslagarteiras.com', [.55, .25, .20], None),
 ('lapajera', 'Vinos La Pajera', 'Asturias', 'Asturias', 43.36, -5.85, 'vinoslapajera.com', [.55, .35, .10], None),
 ('disduero', 'Disduero', 'Valladolid', 'Valladolid', 41.65, -4.72, 'disduero.es', [.55, .10, .35], None),
 ('puesan', 'Puesan Distribuciones', 'Zaragoza', 'Zaragoza', 41.68, -0.84, 'puesandistribuciones.es', [.60, .15, .25], None),
 ('dahsa', 'DAHSA', 'Zaragoza', 'Zaragoza', 41.60, -0.96, 'infovinos.es (ficha)', [.45, .10, .45], None),
 ('docemeses', '12 Meses Distribución', 'Canarias', 'Las Palmas', 28.10, -15.43, '12mesesdistribucion.com', [.75, .15, .10], None),
]
IDX = {d[0]: i for i, d in enumerate(DIST)}
# zona de cada distribuidor; en provincias compartidas, la parte de cada uno (va cambiando con los años)
ZONA = {
 'Madrid': [('dispedisa', [.62, .60, .58, .60, .57, .55]), ('mundela', [.38, .40, .42, .40, .43, .45])],
 'Barcelona': [('vilaviniteca', [1, 1, .74, .66, .62, .60]), ('divil', [0, 0, .26, .34, .38, .40])],
 'Zaragoza': [('puesan', [.50, .52, .55, .55, .58, .60]), ('dahsa', [.50, .48, .45, .45, .42, .40])],
}
SOLO = {
 'mundela': ['Toledo', 'Ciudad Real', 'Cuenca', 'Guadalajara'],
 'vilaviniteca': ['Girona', 'Tarragona', 'Lleida'],
 'palmavi': ['Illes Balears'], 'divins': ['Valencia', 'Castellón'], 'tabarca': ['Alicante', 'Murcia', 'Albacete'],
 'vendimias': ['Sevilla', 'Cádiz', 'Huelva', 'Córdoba', 'Badajoz', 'Cáceres'], 'costadelsol': ['Málaga', 'Granada', 'Almería', 'Jaén'],
 'luar': ['Bizkaia', 'Álava', 'Cantabria', 'La Rioja'], 'sarasti': ['Gipuzkoa', 'Navarra'],
 'lagarteiras': ['A Coruña', 'Lugo', 'Pontevedra', 'Ourense'], 'lapajera': ['Asturias', 'León'],
 'disduero': ['Valladolid', 'Burgos', 'Palencia', 'Salamanca', 'Zamora', 'Segovia', 'Ávila', 'Soria'],
 'puesan': ['Teruel'], 'dahsa': ['Huesca'], 'docemeses': ['Las Palmas', 'Santa Cruz de Tenerife'],
}
for d, ps in SOLO.items():
    for p in ps: ZONA[p] = [(d, [1] * len(YEARS))]
assert set(ZONA) == set(POB), set(POB) ^ set(ZONA)

# «Resto de España» de cada bodega → provincias que no tiene por separado, por población (con algo de ruido por año)
prov_items = S['reparto']['prov']['items']; refs = S['reparto']['refs']['items']
listed = {}
for it in prov_items: listed.setdefault(refs[it['r']]['b'], set()).add(it['provincia'])
walk = {p: 1.0 for p in POB}
resto = {}
for y in YEARS:
    for p in walk: walk[p] *= rnd.uniform(0.93, 1.08)
    resto[y] = {}
    for b, L in listed.items():
        w = {p: POB[p] * TUR.get(p, 1) * walk[p] for p in POB if p not in L}
        t = sum(w.values())
        resto[y][str(b)] = {p: round(v / t, 5) for p, v in w.items()}

cob = {p: [[IDX[d], {y: s for y, s in zip(YEARS, ss)}] for d, ss in lst] for p, lst in ZONA.items()}
items = []
for (i, n, sede, ps, lat, lon, web, can, _b) in DIST:
    zona = sorted([p for p, lst in ZONA.items() if any(d == i for d, _ in lst)], key=lambda p: -POB[p])
    canales = {}
    c = list(can)
    for y in YEARS:
        c = [max(.02, v * rnd.uniform(.94, 1.06)) for v in c]
        t = sum(c); canales[y] = [round(v / t, 4) for v in c]
    desde = 2023 if i == 'divil' else rnd.choice([2012, 2014, 2015, 2016, 2017, 2018, 2019])
    items.append(dict(id=i, nombre=n, sede=sede, provincia=ps, lat=lat, lon=lon, web=web, zona=zona, desde=desde, canales=canales))
S['reparto']['dist'] = dict(items=items, cobertura=cob, resto=resto, canales=['Hostelería', 'Tiendas especializadas', 'Supermercados'],
                            ajuste_canal=[[1, 1, 1], [.85, .8, 1.6], [1.1, 1.4, .3]],  # por bodega: Laus más en súper, Las Moradas más en tiendas
                            gasto_cliente=[2400, 3800, 9000],  # compra media al año de un punto de venta, por canal (para estimar clientes)
                            nota='Distribuidores reales de cada zona; su relación con las bodegas, las zonas y las cifras son simuladas.')
json.dump(S, open(os.path.join(D, 'series.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(items), 'distribuidores ·', len(cob), 'provincias cubiertas')
