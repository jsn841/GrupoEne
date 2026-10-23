"""Datos extra para el panel (se añaden a series.json) y reseñas del hotel (resenas.json). Todo inventado.

Añade a series.json:
  - reparto.canales_hotel: canales de reserva del balneario (directo, OTAs, agencias…), reparto por año y comisión.
  - reparto.stock: existencias de cada referencia de vino en bodega (botellas) y última entrada (vendimia).
  - meta.objetivos: objetivos del año de cada negocio (facturación, margen y algún KPI), para el semáforo del panel general.
Escribe también dashboard/data/resenas.json con reseñas del hotel por fuente, nota y temas.

Ejecutar DESPUÉS de generar_series.py, generar_consumos.py y generar_distribuidores.py (todos modifican series.json).
"""
import json, os, random, datetime as dt
rnd = random.Random(2410)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
S = json.load(open(os.path.join(D, 'series.json')))
HOY = dt.date.fromisoformat(S['hoy'])
YEARS = [str(y) for y in range(2021, HOY.year + 1)]

# ---------------- canales de reserva del hotel ----------------
# canal, tipo, comisión sobre el ingreso, estancia media (noches por reserva)
CAN = [
 ('Directo web', 'Directo', 0.00, 2.4),
 ('Directo teléfono y recepción', 'Directo', 0.00, 2.1),
 ('Booking.com', 'OTA', 0.17, 1.9),
 ('Expedia', 'OTA', 0.18, 1.8),
 ('Agencia de viajes', 'Agencia', 0.10, 2.6),
 ('Turoperador y paquetes', 'Turoperador', 0.20, 3.1),
]
# reparto de las noches por canal, con tendencia a más venta directa con los años
base = [0.24, 0.10, 0.26, 0.11, 0.14, 0.15]
share = {}
for i, y in enumerate(YEARS):
    w = []
    for j, b in enumerate(base):
        drift = (i * 0.012) * (1 if CAN[j][1] == 'Directo' else -0.5 if CAN[j][1] == 'OTA' else -0.2)
        w.append(max(0.02, b + drift) * rnd.uniform(0.95, 1.05))
    t = sum(w); share[y] = [round(x / t, 4) for x in w]
S['reparto']['canales_hotel'] = {
 'items': [{'canal': c, 'tipo': t, 'comision': com, 'estancia': est} for c, t, com, est in CAN],
 'share': share,
 'nota': 'El ingreso se reparte igual que las noches, con un pequeño extra de gasto en los canales directos (clientes de spa y restaurante).',
 'extra_directo': 1.08,  # los clientes directos gastan algo más fuera de la habitación
}

# ---------------- existencias de vino en bodega ----------------
# botellas en bodega hoy y última entrada (embotellado tras la vendimia). Las ventas salen de reparto.refs.
refs = S['reparto']['refs']['items']
# ventas del último año (botellas) por referencia, para dimensionar un stock realista
import collections
ventas_year = collections.defaultdict(float)
fa = S['reparto']['refs']['fa']
# aproximación: usamos el último año completo de reparto y el total mayorista de ese año no está aquí,
# así que dimensionamos el stock por el PVP/coste y un volumen típico por tipo.
VOL = {'Tinto': 42000, 'Blanco': 30000, 'Rosado': 18000, 'Dulce': 6000, 'Frizzante': 12000}
stock = []
for j, r in enumerate(refs):
    anual = VOL.get(r['tipo'], 20000) * rnd.uniform(0.5, 1.5)
    meses_cobertura = rnd.uniform(1.2, 26)         # cuánto stock hay, en meses de venta
    bot = int(anual / 12 * meses_cobertura)
    crianza = r['tipo'] in ('Tinto',) and 'Crianza' in r['referencia'] or 'Reserva' in r['referencia']
    # última entrada: embotellado reciente (blancos/rosados del año; tintos con crianza, más antiguo)
    if r['tipo'] in ('Blanco', 'Rosado', 'Frizzante'):
        ent = dt.date(HOY.year if HOY.month >= 3 else HOY.year - 1, rnd.choice([2, 3, 4]), rnd.randint(1, 28))
    else:
        ent = dt.date(HOY.year - (2 if 'Reserva' in r['referencia'] else 1), rnd.choice([3, 4, 5, 9, 10]), rnd.randint(1, 28))
    # añadas anteriores aún en bodega (vino viejo que no se ha vendido o se guarda como reserva).
    # Los tintos (sobre todo crianza/reserva) guardan más años; blancos, rosados y frizzante, poco o nada.
    anada_actual = ent.year
    if r['tipo'] == 'Tinto':
        n_ant = rnd.choices([1, 2, 3, 4], weights=[3, 4, 3, 2])[0]
    elif r['tipo'] == 'Dulce':
        n_ant = rnd.choices([1, 2, 3], weights=[2, 3, 3])[0]
    else:  # Blanco, Rosado, Frizzante: casi todo es del año
        n_ant = rnd.choices([0, 1, 2], weights=[5, 3, 1])[0]
    anteriores, resto = [], anual / 12  # base mensual de venta
    for k in range(1, n_ant + 1):
        # cada añada más vieja suele tener menos botellas; algo de reserva en las muy viejas de tinto
        frac = rnd.uniform(0.04, 0.22) * (0.8 ** (k - 1))
        if r['tipo'] == 'Tinto' and 'Reserva' in r['referencia'] and k >= 2:
            frac *= rnd.uniform(1.4, 2.2)  # reserva: se guarda vino viejo a propósito
        b = int(anual * frac)
        if b > 0:
            anteriores.append({'anada': anada_actual - k, 'botellas': b})
    total_ant = sum(a['botellas'] for a in anteriores)
    stock.append({'r': j, 'botellas': bot, 'venta_anual': int(anual), 'entrada': ent.isoformat(), 'lote': f"L{ent.year}{ent.month:02d}",
                  'anada_actual': anada_actual, 'anteriores': anteriores, 'botellas_anteriores': total_ant})
S['reparto']['stock'] = {'items': stock, 'hoy': HOY.isoformat(),
 'nota': 'Botellas en bodega hoy y última entrada (embotellado). La cobertura es el stock dividido entre la venta media mensual.'}

# ---------------- objetivos del año por negocio ----------------
S['meta']['objetivos'] = {
 'anio': HOY.year,
 'nota': 'Objetivos fijados por el grupo para el año en curso. El avance se compara con lo real del 1 de enero a hoy y se proyecta a cierre.',
 'negocios': {
   'Inmobiliario': {'facturacion': 200000000, 'margen': 0.22, 'kpi': {'nombre': 'Viviendas comercializadas', 'objetivo': 210}},
   'Hotelero': {'facturacion': 17000000, 'margen': 0.60, 'kpi': {'nombre': 'Ocupación media', 'objetivo': 0.72, 'pct': True}},
   'Bodegas': {'facturacion': 16500000, 'margen': 0.55, 'kpi': {'nombre': 'Botellas vendidas', 'objetivo': 2600000}},
 },
}
json.dump(S, open(os.path.join(D, 'series.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------- reseñas del hotel ----------------
HOTELES = ['Gran Hotel', 'Hotel Continental']
FUENTES = [('Booking.com', 0.42, 8.6), ('Google', 0.30, 4.3), ('Tripadvisor', 0.16, 4.1), ('Expedia', 0.12, 8.4)]  # fuente, peso, nota media (escala propia)
TEMAS = ['Spa y aguas termales', 'Restaurante', 'Habitaciones', 'Limpieza', 'Trato del personal', 'Ubicación y entorno', 'Relación calidad-precio', 'Descanso y tranquilidad']
# cada tema: probabilidad de aparición y sesgo (positivo>0)
TTEMA = {'Spa y aguas termales': 0.7, 'Restaurante': -0.1, 'Habitaciones': 0.2, 'Limpieza': 0.5, 'Trato del personal': 0.6,
         'Ubicación y entorno': 0.8, 'Relación calidad-precio': -0.3, 'Descanso y tranquilidad': 0.7}
POS = {
 'Spa y aguas termales': ['El circuito termal es espectacular, nos pasamos horas.', 'Las aguas y el spa, lo mejor del hotel.', 'Spa increíble, muy relajante.'],
 'Restaurante': ['La cena estuvo muy buena.', 'Desayuno completo y con producto local.', 'Buena carta en el restaurante.'],
 'Habitaciones': ['Habitación amplia y con buenas vistas.', 'La habitación muy cómoda y silenciosa.', 'Cama comodísima.'],
 'Limpieza': ['Todo impecable de limpieza.', 'Limpieza perfecta en habitación y zonas comunes.'],
 'Trato del personal': ['El personal, atentísimo.', 'Trato excelente, muy amables.', 'Nos trataron de maravilla.'],
 'Ubicación y entorno': ['El entorno de Panticosa es precioso.', 'Ubicación ideal para desconectar en la montaña.', 'Vistas y naturaleza espectaculares.'],
 'Relación calidad-precio': ['Repetiremos, merece la pena.', 'Bien de precio para lo que ofrece.'],
 'Descanso y tranquilidad': ['Silencio total, descansamos muchísimo.', 'Perfecto para descansar.'],
}
NEG = {
 'Spa y aguas termales': ['El spa muy lleno por la tarde, cuesta disfrutarlo.', 'Había que reservar el circuito con mucha antelación.'],
 'Restaurante': ['La cena cara para lo que era.', 'El restaurante tardó mucho en servir.', 'Poca variedad en el menú.'],
 'Habitaciones': ['La habitación se quedaba algo fría.', 'La ducha perdía presión.', 'Habitación más pequeña de lo que esperaba.'],
 'Limpieza': ['La habitación no estaba bien limpia al llegar.'],
 'Trato del personal': ['En recepción tardaron en atendernos.'],
 'Ubicación y entorno': ['Se llega un poco justo en coche con nieve.'],
 'Relación calidad-precio': ['Caro para lo que ofrece.', 'Los extras se pagan todos aparte, se nota.'],
 'Descanso y tranquilidad': ['Se oía ruido del pasillo por la noche.'],
}
res = []
d = HOY - dt.timedelta(days=730)
n = 0
while d <= HOY:
    # ~2-5 reseñas por día de media alta en temporada
    k = rnd.choices([0, 1, 2, 3], weights=[3, 4, 2, 1])[0]
    for _ in range(k):
        fuente = rnd.choices([f[0] for f in FUENTES], weights=[f[1] for f in FUENTES])[0]
        hotel = rnd.choices(HOTELES, weights=[0.58, 0.42])[0]
        base_nota = 8.4 if hotel == 'Gran Hotel' else 8.1
        nota10 = max(2, min(10, rnd.gauss(base_nota, 1.3)))
        temas = [t for t in TEMAS if rnd.random() < (0.45 if TTEMA[t] > 0 else 0.3)][:3] or [rnd.choice(TEMAS)]
        positivo = nota10 >= 7.5
        frases = []
        for t in temas:
            pool = POS[t] if (positivo if rnd.random() < 0.8 else not positivo) else NEG[t]
            frases.append(rnd.choice(pool))
        res.append({'id': n, 'fecha': d.isoformat(), 'fuente': fuente, 'hotel': hotel,
                    'nota': round(nota10, 1), 'nota5': round(nota10 / 2, 1),
                    'temas': temas, 'sentimiento': 'positivo' if positivo else ('neutro' if nota10 >= 6 else 'negativo'),
                    'texto': ' '.join(frases)})
        n += 1
    d += dt.timedelta(days=1)
json.dump({'hoy': HOY.isoformat(), 'fuentes': [f[0] for f in FUENTES], 'temas': TEMAS,
           'nota': 'Reseñas simuladas de las fuentes habituales (OTAs y Google). En producción se leerían de cada plataforma.',
           'resenas': res}, open(os.path.join(D, 'resenas.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('canales:', len(CAN), '· stock refs:', len(stock), '· objetivos:', len(S['meta']['objetivos']['negocios']), '· reseñas:', len(res),
      '·', os.path.getsize(os.path.join(D, 'resenas.json')) // 1024, 'KB resenas')
