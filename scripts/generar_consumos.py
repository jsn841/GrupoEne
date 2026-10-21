"""Consumos del balneario por tipo: spa, comida, bebida y punto de venta (tienda).

Rehace en data/series.json el reparto de los ingresos de cada restaurante, bar y spa entre sus
productos (cartas con bebidas, cosmética y recuerdos), con el coste aproximado de cada producto y
cuándo se consume: un perfil por día de la semana y hora para cada tipo de local y tipo de consumo.
No cambia los ingresos ni los costes de cada local: solo cómo se reparten. Ejecutar después de
generar_series.py. Todo es simulado.
"""
import json, os, random
rnd = random.Random(2610)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
P = os.path.join(D, 'series.json')
S = json.load(open(P))
YEARS = [str(y) for y in range(2021, 2027)]
C26, C25, EST, WEB, PM = 'Carta 2026', 'Carta 2025', 'Precio estimado', 'Plato de la web, precio estimado', 'Precio medio estimado'
CO, BE, SP, TI = 'Comida', 'Bebida', 'Spa', 'Punto de venta'

# (familia, sección, producto, precio, popularidad, coste sobre precio, origen del precio)
M = {
 'La Brasserie': [
  (CO, 'Entrantes', 'Patatas bravas', 8.5, 9, .22, WEB), (CO, 'Entrantes', 'Nachos', 11.0, 6, .25, WEB), (CO, 'Entrantes', 'Tabla de embutidos ibéricos', 18.0, 5, .48, WEB),
  (CO, 'Brasa', 'Chuletón de vaca', 52.0, 6, .46, WEB), (CO, 'Brasa', 'Paletilla de cordero', 28.0, 7, .42, WEB), (CO, 'Brasa', 'Solomillo de ternera', 26.0, 6, .44, WEB),
  (CO, 'Brasa', 'Magret de pato', 22.0, 4, .38, WEB), (CO, 'Postres', 'Postre de la casa', 7.0, 5, .25, EST), (CO, 'Otros', 'Resto de la carta', 14.0, 4, .34, PM),
  (BE, 'Vinos', 'Copa de Enate Crianza', 5.5, 8, .30, EST), (BE, 'Vinos', 'Botella de Enate 234', 24.0, 4, .28, EST), (BE, 'Cervezas', 'Cerveza de barril', 3.8, 8, .24, EST),
  (BE, 'Aguas y refrescos', 'Agua mineral', 2.5, 9, .14, EST), (BE, 'Aguas y refrescos', 'Refresco', 3.0, 5, .26, EST), (BE, 'Cafés', 'Café', 2.2, 7, .12, EST),
  (BE, 'Combinados', 'Gin tonic', 11.0, 3, .20, EST)],
 'Restaurante del Lago': [
  (CO, 'Menú', 'Menú degustación de autor', 95.0, 10, .34, EST), (CO, 'Menú', 'Café y petit fours', 6.0, 6, .22, EST),
  (BE, 'Vinos', 'Maridaje de vinos', 45.0, 5, .33, EST), (BE, 'Vinos', 'Botella de vino de la carta', 38.0, 3, .36, EST), (BE, 'Aguas', 'Agua Panticosa 75 cl', 4.0, 9, .12, EST)],
 'Cafetería Gran Hotel': [
  (CO, 'Para compartir', 'Croquetas artesanas de jamón ibérico (8 u.)', 12.0, 10, .30, C26), (CO, 'Para compartir', 'Baby bravas', 13.0, 8, .22, C26),
  (CO, 'Para compartir', 'Jamón ibérico de bellota Cinco Jotas', 27.0, 4, .55, C26), (CO, 'Para compartir', 'Ensaladilla con esturión ahumado', 16.0, 6, .36, C26),
  (CO, 'Para compartir', 'César con cogollos y queso Mallata', 14.0, 5, .30, C26), (CO, 'Para compartir', 'Carpaccio de carabineros', 20.0, 2.5, .48, C26),
  (CO, 'Individuales', 'Rústico de cachopo', 20.0, 5, .36, C26), (CO, 'Individuales', 'Brioche roll de marisco', 18.0, 4, .42, C26),
  (CO, 'Individuales', 'Brioche de pastrami ibérico', 18.0, 3.5, .38, C26), (CO, 'Individuales', 'Tortita con guacamole y trucha', 16.0, 3, .34, C26),
  (CO, 'Individuales', 'Taco de rabo de vaca al mole', 16.0, 2.5, .36, C26), (CO, 'Dulces', 'El mejor flan del mundo… posiblemente', 8.0, 7, .18, C26),
  (CO, 'Dulces', 'Torrija brioche caramelizada', 8.0, 5, .20, C26), (CO, 'Dulces', 'Helados artesanos (3 bolas)', 7.0, 3, .28, C26), (CO, 'Dulces', 'Crema de piña colada', 7.0, 2, .24, C26),
  (BE, 'Cafés e infusiones', 'Café', 2.5, 12, .11, EST), (BE, 'Cafés e infusiones', 'Café con leche', 3.0, 10, .13, EST), (BE, 'Cafés e infusiones', 'Infusión', 2.5, 4, .09, EST),
  (BE, 'Zumos', 'Zumo de naranja natural', 4.5, 5, .32, EST), (BE, 'Vinos', 'Copa de Laus', 4.5, 5, .30, EST), (BE, 'Cervezas', 'Cerveza', 3.8, 6, .24, EST),
  (BE, 'Aguas y refrescos', 'Refresco', 3.2, 5, .26, EST), (BE, 'Aguas y refrescos', 'Agua Panticosa 50 cl', 2.2, 7, .12, EST), (BE, 'Combinados', 'Gin tonic', 11.0, 2, .20, EST),
  (TI, 'Tienda', 'Agua Panticosa (pack de 6)', 6.0, 4, .40, EST), (TI, 'Tienda', 'Vino de las bodegas del grupo para llevar', 14.0, 3, .52, EST), (TI, 'Tienda', 'Recuerdos del balneario', 12.0, 2, .48, EST)],
 'Bar Lobby': [
  (BE, 'Coctelería', 'Gin tonic premium', 14.0, 10, .19, EST), (BE, 'Coctelería', 'Spritz', 11.0, 6, .18, EST), (BE, 'Coctelería', 'Mojito', 12.0, 5, .17, EST),
  (BE, 'Coctelería', 'Old fashioned', 14.0, 2, .22, EST), (BE, 'Vinos', 'Copa de Enate 234', 6.0, 6, .30, EST), (BE, 'Cervezas', 'Cerveza de barril', 4.5, 7, .24, EST),
  (BE, 'Aguas y refrescos', 'Refresco', 3.5, 4, .25, EST), (BE, 'Otros', 'Resto de bebidas', 7.0, 3, .25, PM),
  (CO, 'Picoteo', 'Tabla de quesos del Pirineo', 14.0, 3, .40, EST), (CO, 'Picoteo', 'Frutos secos y aceitunas', 4.0, 5, .30, EST)],
 'Restaurante La Fontana': [
  (CO, 'Antipasti', 'Provoletta con champiñones', 17.5, 4, .30, EST), (CO, 'Antipasti', 'Ensalada de burrata', 18.5, 7, .34, EST), (CO, 'Antipasti', 'Carpaccio de ternera', 18.5, 5, .38, EST),
  (CO, 'Pizze', 'Margherita', 16.5, 8, .18, EST), (CO, 'Pizze', 'Tonno', 17.5, 3, .22, EST), (CO, 'Pizze', 'Pancetta', 18.5, 4, .22, EST), (CO, 'Pizze', '4 Formaggi', 18.5, 6, .24, EST),
  (CO, 'Pizze', 'Vegetale', 18.5, 3, .20, EST), (CO, 'Pizze', 'Prosciutto Cotto', 18.5, 4, .22, EST), (CO, 'Pizze', 'Diavola', 18.5, 5, .22, EST), (CO, 'Pizze', 'Carbonara', 19.5, 4, .24, EST),
  (CO, 'Pasta', 'Fettuccine (salsa a elegir)', 17.5, 6, .22, EST), (CO, 'Pasta', 'Rigatoni (salsa a elegir)', 16.5, 4, .21, EST), (CO, 'Pasta', 'Ravioli de carne', 17.5, 4, .28, EST),
  (CO, 'Dolci', 'Tiramisú', 8.0, 7, .22, EST), (CO, 'Dolci', 'Coulant di cioccolato', 8.0, 4, .24, EST), (CO, 'Dolci', 'Panna cotta', 7.5, 3, .18, EST),
  (BE, 'Vinos', 'Copa de vino', 5.0, 8, .30, EST), (BE, 'Vinos', 'Botella de Chianti', 24.0, 3, .38, EST), (BE, 'Cervezas', 'Cerveza Moretti', 3.8, 7, .26, EST),
  (BE, 'Aguas y refrescos', 'Agua mineral', 2.5, 8, .14, EST), (BE, 'Aguas y refrescos', 'Refresco', 3.0, 5, .26, EST), (BE, 'Cafés y licores', 'Café', 2.0, 6, .12, EST),
  (BE, 'Cafés y licores', 'Limoncello', 4.0, 3, .20, EST)],
 'Bar Qbo': [
  (BE, 'Cervezas', 'Caña de cerveza', 3.5, 10, .24, EST), (BE, 'Vermut', 'Vermut de grifo', 4.5, 5, .22, EST), (BE, 'Vinos', 'Copa de Laus', 4.5, 5, .30, EST),
  (BE, 'Refrescos', 'Refresco', 3.5, 6, .25, EST), (BE, 'Combinados', 'Gin tonic', 12.0, 4, .20, EST), (BE, 'Cafés', 'Café', 2.5, 7, .11, EST),
  (CO, 'Tapas', 'Tapa del día', 3.5, 5, .34, EST), (CO, 'Tapas', 'Ración de patatas fritas', 4.0, 3, .20, EST)],
 'Buffet Continental': [
  (CO, 'Buffet', 'Buffet de desayuno', 18.0, 10, .30, EST), (CO, 'Buffet', 'Buffet de cena', 32.0, 6, .36, EST), (CO, 'Buffet', 'Buffet de comida', 28.0, 4, .35, EST),
  (BE, 'Bebidas', 'Vino de la casa (botella)', 16.0, 3, .30, EST), (BE, 'Bebidas', 'Agua mineral', 2.5, 6, .14, EST), (BE, 'Bebidas', 'Refresco', 3.0, 3, .26, EST),
  (BE, 'Bebidas', 'Cerveza', 3.5, 3, .25, EST)],
 'Bar El Embarcadero': [
  (CO, 'Bocadillos', 'Panini de pollo, bacon y gouda', 9.5, 6, .30, C26), (CO, 'Bocadillos', 'Panini de ternera y cheddar', 9.0, 5, .32, C26), (CO, 'Bocadillos', 'Rústico de jamón y queso', 8.0, 6, .34, C26),
  (CO, 'Bocadillos', 'Chapata de tortilla y queso', 8.0, 5, .26, C26), (CO, 'Bocadillos', 'Hot dog', 6.5, 5, .28, C26), (CO, 'Bocadillos', 'Sándwich de jamón y queso', 6.5, 4, .30, C26),
  (CO, 'Snacks', 'Helados y snacks', 2.5, 6, .40, C26),
  (BE, 'Cervezas', 'Estrella Galicia', 4.0, 10, .25, C26), (BE, 'Aguas', 'Agua Panticosa 33 cl', 2.0, 9, .12, C26), (BE, 'Refrescos', 'Coca-Cola', 3.5, 7, .27, C26),
  (BE, 'Vinos por copa', 'Copa de Laus blanco', 4.5, 3, .30, C26), (BE, 'Cafés', 'Café con leche', 3.0, 4, .13, C26)],
 'Spa Gran Hotel': [
  (SP, 'Circuito', 'Circuito Espacio Termal (1 h)', 54.0, 10, .14, 'Web 2026 (desde)'), (SP, 'Masajes', 'Masaje relajante 50 min', 85.0, 3, .36, EST),
  (SP, 'Masajes', 'Masaje con piedras calientes', 95.0, 1.6, .38, EST), (SP, 'Faciales', 'Tratamiento facial', 79.0, 1.2, .40, EST), (SP, 'Rituales', 'Ritual en pareja', 170.0, 0.8, .36, EST),
  (TI, 'Tienda del spa', 'Cosmética termal (cremas y sales)', 32.0, 2.0, .50, EST), (TI, 'Tienda del spa', 'Gorro y chanclas', 6.0, 3.0, .45, EST), (TI, 'Tienda del spa', 'Bono regalo', 90.0, 0.6, .10, EST),
  (BE, 'Zona de relax', 'Infusión o zumo', 3.0, 3.0, .20, EST)],
 'Termas de Tiberio': [
  (SP, 'Circuito', 'Circuito termal (75 min)', 39.0, 10, .14, C25), (SP, 'Masajes', 'Masaje «Back to Relax» 25 min', 55.0, 2.6, .36, C25),
  (SP, 'Masajes', 'Masaje Love Me Panticosa 50 min', 79.0, 1.4, .36, C25), (SP, 'Masajes', 'Masaje terapéutico deportivo 50 min', 84.0, 1.0, .38, C25),
  (SP, 'Masajes', 'Experiencia con chocolate 75 min', 95.0, 0.7, .40, C25), (SP, 'Masajes', 'Piedras del Pirineo 75 min', 95.0, 0.8, .38, C25),
  (SP, 'Masajes', 'Natural Wood (maderoterapia) 50 min', 84.0, 0.5, .37, C25), (SP, 'Faciales', 'Gym Face Termal 50 min', 79.0, 0.6, .40, C25),
  (SP, 'Corporales', 'Envoltura termal 20 min', 55.0, 0.6, .34, C25), (SP, 'Corporales', 'Peeling de basilisco 20 min', 55.0, 0.5, .34, C25),
  (SP, 'Holísticos', 'Udvartana (ayurvédico) 50 min', 79.0, 0.3, .38, C25), (SP, 'Holísticos', 'Tratamiento holístico Yantra 50 min', 79.0, 0.3, .38, C25),
  (TI, 'Tienda', 'Cosmética Panticosa', 29.0, 2.2, .50, EST), (TI, 'Tienda', 'Chanclas y gorro', 6.0, 3.5, .45, EST), (TI, 'Tienda', 'Albornoz de recuerdo', 45.0, 0.5, .52, EST),
  (BE, 'Zona de relax', 'Agua y zumos', 3.0, 3.5, .18, EST)],
}
# parte de los ingresos de cada tipo de local que es de cada tipo de consumo
MIX = {
 'La Brasserie': {CO: .66, BE: .34}, 'Restaurante del Lago': {CO: .64, BE: .36}, 'Cafetería Gran Hotel': {CO: .46, BE: .44, TI: .10},
 'Bar Lobby': {BE: .84, CO: .16}, 'Restaurante La Fontana': {CO: .70, BE: .30}, 'Bar Qbo': {BE: .82, CO: .18}, 'Buffet Continental': {CO: .87, BE: .13},
 'Bar El Embarcadero': {CO: .44, BE: .56}, 'Spa Gran Hotel': {SP: .88, TI: .09, BE: .03}, 'Termas de Tiberio': {SP: .86, TI: .11, BE: .03},
}
orden = S['meta']['puntos_orden']
assert set(orden) == set(M), (set(orden) ^ set(M))
items, ing, precio = [], {y: [] for y in YEARS}, {y: [] for y in YEARS}
for p in orden:
    rows = M[p]; tipo = next(x['tipo'] for x in S['meta']['puntos'] if x['punto'] == p)
    for y in YEARS:
        drift = 1 + (int(y) - 2026) * 0.0  # el reparto entre tipos se mantiene
        mix = {f: v * rnd.uniform(0.96, 1.04) for f, v in MIX[p].items()}
        sm = sum(mix.values()); mix = {f: v / sm for f, v in mix.items()}
        w = [r[4] * r[3] * rnd.uniform(0.85, 1.15) for r in rows]
        fam_tot = {}
        for r, x in zip(rows, w): fam_tot[r[0]] = fam_tot.get(r[0], 0) + x
        sh = [mix[r[0]] * x / fam_tot[r[0]] for r, x in zip(rows, w)]
        s = sum(sh)
        ing[y].extend(round(x / s, 6) for x in sh)
        precio[y].extend(round(r[3] / (1.03 ** (2026 - int(y))), 2) for r in rows)
    for fam, cat, prod, pr, pop, coste, src in rows:
        items.append({'id': f'{p}|{prod}', 'punto': p, 'tipo': tipo, 'familia': fam, 'categoria': cat, 'producto': prod, 'precio': pr, 'coste': coste, 'precio_fuente': src, 'p': orden.index(p)})

# cuándo se consume: perfil de cada hora (0-23) para cada día de la semana (0 = lunes)
def hours(spec):
    v = [0.0] * 24
    for a, b, w in spec:
        for h in range(a, b): v[h % 24] += w
    return v
BASE = {
 ('Restaurante', CO): [(13, 16, 10), (20, 23, 9), (16, 17, 1.5), (23, 24, 1)],
 ('Restaurante', BE): [(13, 16, 8), (20, 24, 10), (16, 18, 2), (12, 13, 1.5)],
 ('Cafetería', CO): [(8, 11, 4), (12, 16, 9), (17, 20, 6), (20, 22, 3)],
 ('Cafetería', BE): [(8, 12, 10), (12, 16, 6), (16, 20, 8), (20, 23, 4)],
 ('Cafetería', TI): [(10, 21, 3), (17, 20, 2)],
 ('Bar', BE): [(12, 15, 4), (15, 18, 3), (18, 21, 7), (21, 24, 10), (0, 1, 4)],
 ('Bar', CO): [(12, 15, 6), (19, 23, 8)],
 ('Buffet', CO): [(7, 11, 12), (13, 16, 6), (20, 23, 8)],
 ('Buffet', BE): [(7, 11, 3), (13, 16, 6), (20, 23, 9)],
 ('Spa', SP): [(10, 13, 6), (13, 16, 5), (16, 20, 10), (20, 22, 4)],
 ('Spa', TI): [(11, 14, 3), (14, 21, 6)],
 ('Spa', BE): [(10, 13, 3), (13, 21, 6)],
 ('Embarcadero', CO): [(11, 13, 4), (13, 17, 10), (17, 20, 6)],
 ('Embarcadero', BE): [(11, 13, 5), (13, 17, 10), (17, 20, 8)],
}
WD = {  # cómo cambia cada día: (multiplicador de la noche 20-24 h, retraso en horas del fin de semana)
 'Restaurante': [0.8, 0.8, 0.85, 0.95, 1.25, 1.35, 0.9], 'Bar': [0.7, 0.75, 0.8, 0.95, 1.4, 1.55, 0.85], 'Cafetería': [1, 1, 1, 1, 1.05, 1.1, 1.1],
 'Buffet': [1, 1, 1, 1, 1.05, 1.1, 1.05], 'Spa': [0.9, 0.9, 0.95, 1, 1.1, 1.15, 1.05], 'Embarcadero': [1, 1, 1, 1, 1.05, 1.15, 1.15],
}
perfiles = {}
for p in orden:
    tipo = next(x['tipo'] for x in S['meta']['puntos'] if x['punto'] == p)
    t = 'Embarcadero' if p == 'Bar El Embarcadero' else tipo
    for fam in MIX[p]:
        base = hours(BASE[(t, fam)])
        rows = []
        for wd in range(7):
            v = base[:]
            night = WD[t][wd]
            for h in range(24):
                if h >= 20 or h < 2: v[h] *= night
                if wd in (5, 6) and t in ('Cafetería', 'Buffet') and 8 <= h < 10: v[h] *= 0.75  # desayuno más tarde el fin de semana
                if wd in (5, 6) and t in ('Cafetería', 'Buffet') and 10 <= h < 12: v[h] *= 1.35
                if wd == 6 and h >= 21: v[h] *= 0.7  # domingo noche floja
                v[h] *= rnd.uniform(0.92, 1.08) if v[h] else 1
            s = sum(v) or 1
            rows.append([round(x / s, 5) for x in v])
        perfiles[f'{p}|{fam}'] = rows
# peso de cada día de la semana sobre la semana (lo que se vende cada día, sin contar la estacionalidad)
dias = {}
for p in orden:
    tipo = next(x['tipo'] for x in S['meta']['puntos'] if x['punto'] == p)
    t = 'Embarcadero' if p == 'Bar El Embarcadero' else tipo
    w = {'Restaurante': [.11, .11, .12, .13, .17, .21, .15], 'Bar': [.10, .10, .11, .13, .18, .23, .15], 'Cafetería': [.13, .12, .13, .13, .15, .18, .16],
         'Buffet': [.13, .13, .13, .14, .15, .17, .15], 'Spa': [.11, .11, .12, .13, .16, .21, .16], 'Embarcadero': [.10, .10, .11, .12, .15, .23, .19]}[t]
    dias[p] = [round(x * rnd.uniform(0.97, 1.03), 4) for x in w]
S['reparto']['productos'] = {'items': items, 'ing': ing, 'precio': precio}
S['meta']['perfiles'] = perfiles
S['meta']['peso_dia'] = dias
S['meta']['familias'] = [SP, CO, BE, TI]
json.dump(S, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(items), 'productos', Counter(i['familia'] for i in items), 'perfiles', len(perfiles))
