import json, random, os
random.seed(7)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
puntos = {r['punto']: r for r in json.load(open(os.path.join(D, 'hotel_puntos_resumen.json')))}
C26, C25, TT, EST, WEB = 'Carta 2026', 'Carta 2025', 'Carta 2025', 'Precio estimado', 'Plato de la web, precio estimado'
# (punto, categoria, producto, precio, popularidad, fuente)
M = {
 'La Brasserie': [
  ('Entrantes', 'Patatas bravas', 8.5, 9, WEB), ('Entrantes', 'Nachos', 11.0, 6, WEB), ('Entrantes', 'Tabla de embutidos ibéricos', 18.0, 5, WEB),
  ('Brasa', 'Chuletón de vaca', 52.0, 6, WEB), ('Brasa', 'Paletilla de cordero', 28.0, 7, WEB), ('Brasa', 'Solomillo de ternera', 26.0, 6, WEB),
  ('Brasa', 'Magret de pato', 22.0, 4, WEB)],
 'Restaurante del Lago': [
  ('Menú', 'Menú degustación de autor', 95.0, 10, EST), ('Menú', 'Maridaje de vinos', 45.0, 5, EST)],
 'Cafetería Gran Hotel': [
  ('Para compartir', 'Croquetas artesanas de jamón ibérico (8 u.)', 12.0, 10, C26), ('Para compartir', 'Baby bravas', 13.0, 8, C26),
  ('Para compartir', 'Jamón ibérico de bellota Cinco Jotas', 27.0, 4, C26), ('Para compartir', 'Ensaladilla con esturión ahumado', 16.0, 6, C26),
  ('Para compartir', 'César con cogollos y queso Mallata', 14.0, 5, C26), ('Para compartir', 'Carpaccio de carabineros', 20.0, 2.5, C26),
  ('Individuales', 'Rústico de cachopo', 20.0, 5, C26), ('Individuales', 'Brioche roll de marisco', 18.0, 4, C26),
  ('Individuales', 'Brioche de pastrami ibérico', 18.0, 3.5, C26), ('Individuales', 'Tortita con guacamole y trucha', 16.0, 3, C26),
  ('Individuales', 'Taco de rabo de vaca al mole', 16.0, 2.5, C26), ('Dulces', 'El mejor flan del mundo… posiblemente', 8.0, 7, C26),
  ('Dulces', 'Torrija brioche caramelizada', 8.0, 5, C26), ('Dulces', 'Helados artesanos (3 bolas)', 7.0, 3, C26), ('Dulces', 'Crema de piña colada', 7.0, 2, C26)],
 'Bar Lobby': [
  ('Coctelería', 'Gin tonic premium', 14.0, 10, EST), ('Coctelería', 'Spritz', 11.0, 6, EST), ('Coctelería', 'Mojito', 12.0, 5, EST),
  ('Coctelería', 'Old fashioned', 14.0, 2, EST), ('Vinos', 'Copa de Enate 234', 6.0, 6, EST), ('Cervezas', 'Cerveza de barril', 4.5, 7, EST)],
 'Restaurante La Fontana': [
  ('Antipasti', 'Provoletta con champiñones', 17.5, 4, EST), ('Antipasti', 'Ensalada de burrata', 18.5, 7, EST), ('Antipasti', 'Carpaccio de ternera', 18.5, 5, EST),
  ('Pizze', 'Margherita', 16.5, 8, EST), ('Pizze', 'Tonno', 17.5, 3, EST), ('Pizze', 'Pancetta', 18.5, 4, EST), ('Pizze', '4 Formaggi', 18.5, 6, EST),
  ('Pizze', 'Vegetale', 18.5, 3, EST), ('Pizze', 'Prosciutto Cotto', 18.5, 4, EST), ('Pizze', 'Diavola', 18.5, 5, EST), ('Pizze', 'Carbonara', 19.5, 4, EST),
  ('Pasta', 'Fettuccine (salsa a elegir)', 17.5, 6, EST), ('Pasta', 'Rigatoni (salsa a elegir)', 16.5, 4, EST), ('Pasta', 'Ravioli de carne', 17.5, 4, EST),
  ('Dolci', 'Tiramisú', 8.0, 7, EST), ('Dolci', 'Coulant di cioccolato', 8.0, 4, EST), ('Dolci', 'Panna cotta', 7.5, 3, EST)],
 'Bar Qbo': [
  ('Cervezas', 'Caña de cerveza', 3.5, 10, EST), ('Vermut', 'Vermut de grifo', 4.5, 5, EST), ('Vinos', 'Copa de Laus', 4.5, 5, EST),
  ('Refrescos', 'Refresco', 3.5, 6, EST), ('Combinados', 'Gin tonic', 12.0, 4, EST), ('Cafés', 'Café', 2.5, 7, EST)],
 'Buffet Continental': [
  ('Buffet', 'Buffet de desayuno', 18.0, 10, EST), ('Buffet', 'Buffet de cena', 32.0, 6, EST), ('Buffet', 'Buffet de comida', 28.0, 4, EST),
  ('Bebidas', 'Vino de la casa (botella)', 16.0, 3, EST)],
 'Bar El Embarcadero': [
  ('Bocadillos', 'Panini de pollo, bacon y gouda', 9.5, 6, C26), ('Bocadillos', 'Panini de ternera y cheddar', 9.0, 5, C26), ('Bocadillos', 'Rústico de jamón y queso', 8.0, 6, C26),
  ('Bocadillos', 'Chapata de tortilla y queso', 8.0, 5, C26), ('Bocadillos', 'Hot dog', 6.5, 5, C26), ('Bocadillos', 'Sándwich de jamón y queso', 6.5, 4, C26),
  ('Cervezas', 'Estrella Galicia', 4.0, 10, C26), ('Aguas', 'Agua Panticosa 33 cl', 2.0, 9, C26), ('Refrescos', 'Coca-Cola', 3.5, 7, C26),
  ('Vinos por copa', 'Copa de Laus blanco', 4.5, 3, C26), ('Cafés', 'Café con leche', 3.0, 4, C26), ('Snacks', 'Helados y snacks', 2.5, 6, C26)],
 'Spa Gran Hotel': [
  ('Circuito', 'Circuito Espacio Termal (1 h)', 54.0, 10, 'Web 2026 (desde)'), ('Masajes', 'Masaje relajante 50 min', 85.0, 3, EST),
  ('Masajes', 'Masaje con piedras calientes', 95.0, 1.6, EST), ('Faciales', 'Tratamiento facial', 79.0, 1.2, EST), ('Rituales', 'Ritual en pareja', 170.0, 0.8, EST)],
 'Termas de Tiberio': [
  ('Circuito', 'Circuito termal (75 min)', 39.0, 10, TT), ('Masajes', 'Masaje «Back to Relax» 25 min', 55.0, 2.6, TT),
  ('Masajes', 'Masaje Love Me Panticosa 50 min', 79.0, 1.4, TT), ('Masajes', 'Masaje terapéutico deportivo 50 min', 84.0, 1.0, TT),
  ('Masajes', 'Experiencia con chocolate 75 min', 95.0, 0.7, TT), ('Masajes', 'Piedras del Pirineo 75 min', 95.0, 0.8, TT),
  ('Masajes', 'Natural Wood (maderoterapia) 50 min', 84.0, 0.5, TT), ('Faciales', 'Gym Face Termal 50 min', 79.0, 0.6, TT),
  ('Corporales', 'Envoltura termal 20 min', 55.0, 0.6, TT), ('Corporales', 'Peeling de basilisco 20 min', 55.0, 0.5, TT),
  ('Holísticos', 'Udvartana (ayurvédico) 50 min', 79.0, 0.3, TT), ('Holísticos', 'Tratamiento holístico Yantra 50 min', 79.0, 0.3, TT)],
}
COVER = {'Restaurante del Lago': 0.93, 'Buffet Continental': 0.9, 'Spa Gran Hotel': 0.95, 'Termas de Tiberio': 0.95}
rows = []
for p, items in M.items():
    P = puntos[p]
    target = P['ingresos'] * COVER.get(p, 0.86)
    raw = [w * pr * random.uniform(0.85, 1.15) for (_, _, pr, w, _) in items]
    k = target / sum(raw)
    tot = 0
    for (cat, prod, pr, w, src), rw in zip(items, raw):
        u = max(1, round(rw * k / pr))
        ing = round(u * pr)
        g = random.uniform(-0.12, 0.18)
        u_ant = max(1, round(u / (1 + g)))
        tot += ing
        rows.append(dict(id=f'{p}|{prod}', punto=p, tipo=P['tipo'], categoria=cat, producto=prod, precio=pr, unidades=u, unidades_ant=u_ant,
                         variacion=round(u / u_ant - 1, 3), ingresos=ing, precio_fuente=src))
    rest = P['ingresos'] - tot
    rows.append(dict(id=f'{p}|Resto', punto=p, tipo=P['tipo'], categoria='Resto', producto='Resto de la carta y bebidas' if P['tipo'] != 'Spa' else 'Resto (accesorios, bonos, cosmética)',
                     precio=None, unidades=None, unidades_ant=None, variacion=None, ingresos=round(rest), precio_fuente='—'))
# rank within punto
for p in M:
    rr = sorted([r for r in rows if r['punto'] == p and r['categoria'] != 'Resto'], key=lambda r: -r['ingresos'])
    for i, r in enumerate(rr, 1): r['ranking'] = i
for r in rows:
    r.setdefault('ranking', None)
json.dump(rows, open(os.path.join(D, 'hotel_productos.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(rows))
for p in M:
    print(p, puntos[p]['ingresos'], sum(r['ingresos'] for r in rows if r['punto'] == p), [ (r['producto'], r['unidades']) for r in rows if r['punto']==p and r['ranking'] in (1,2)])
