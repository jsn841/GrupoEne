"""Simplifica el GeoJSON de provincias de España para el mapa de distribuidores (dashboard/data/provincias.json).

Fuente: spain-provinces.geojson del proyecto click_that_hood (Code for Germany, licencia MIT),
que a su vez parte de los límites provinciales del IGN. Uso:
    python3 scripts/preparar_mapa_provincias.py ruta/spain-provinces.geojson
Canarias se desplaza junto a la península (recuadro abajo a la izquierda), como en los mapas habituales.
"""
import json, os, sys, math

src = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data', 'provincias.json')
NOMBRES = {'Alacant/Alicante': 'Alicante', 'Araba/Álava': 'Álava', 'Bizkaia/Vizcaya': 'Bizkaia', 'Castelló/Castellón': 'Castellón',
           'Gipuzkoa/Guipúzcoa': 'Gipuzkoa', 'València/Valencia': 'Valencia', 'Santa Cruz De Tenerife': 'Santa Cruz de Tenerife'}
CANARIAS = {'Las Palmas', 'Santa Cruz de Tenerife'}
SHIFT = (5.6, 6.6)  # grados de longitud y latitud para acercar Canarias
TOL = 0.012         # tolerancia de simplificación (grados, ~1 km)


def dp(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 4: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1e-12
    imax, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / n if (dx or dy) else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > dmax: imax, dmax = i, d
    if dmax <= tol: return [a, b]
    return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)


def ring_area(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2


feats = []
for f in json.load(open(src))['features']:
    name = NOMBRES.get(f['properties']['name'], f['properties']['name'])
    if name in ('Ceuta', 'Melilla'): continue
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    out = []
    for poly in polys:
        ring = poly[0]
        if name in CANARIAS: ring = [[x + SHIFT[0], y + SHIFT[1]] for x, y in ring]
        r = dp([[round(x, 3), round(y, 3)] for x, y in ring], TOL)
        if len(r) < 4 or ring_area(r) < 0.0006: continue  # islotes muy pequeños
        out.append([[round(x, 3), round(y, 3)] for x, y in r])
    feats.append({'p': name, 'r': out})
feats.sort(key=lambda x: x['p'])
json.dump({'fuente': 'Límites provinciales IGN vía click_that_hood (MIT), simplificados. Canarias desplazada.', 'canarias_desplazada': SHIFT, 'provincias': feats},
          open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(feats), 'provincias', os.path.getsize(OUT) // 1024, 'KB')
