import json, random, math, datetime as dt, os
random.seed(42)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
TODAY = dt.date(2026, 10, 19)
def dump(name, rows):
    with open(os.path.join(OUT, name + '.json'), 'w') as f:
        json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
    print(name, len(rows), os.path.getsize(os.path.join(OUT, name + '.json')))
def r0(x): return int(round(x))
def months(a, b):
    y, m = a; out = []
    while (y, m) <= b:
        out.append(f"{y}-{m:02d}"); m += 1
        if m == 13: y, m = y + 1, 1
    return out
MES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
OCT_FRAC = 19 / 31

# ---------------- INMOBILIARIO ----------------
# (id, nombre, zona, ciudad, provincia, lat, lon, estado, viviendas, precio_medio, entrega, inicio_comercial, pct_vendido, fuente_viviendas)
P = [
 ('avda-america','Residencial Avenida de América','Salamanca','Madrid','Madrid',40.447,-3.655,'En curso',78,780000,'2027','2024-09',0.78,'web'),
 ('tabit-4','Edificio Tabit IV','El Cañaveral','Madrid','Madrid',40.428,-3.552,'En curso',89,455000,'2027','2025-02',0.70,'web'),
 ('nautica','Edificio Náutica','Riazor','A Coruña','A Coruña',43.368,-8.411,'En curso',88,520000,'2026','2023-10',0.97,'web'),
 ('nautica-2','Edificio Náutica Fase II','Riazor','A Coruña','A Coruña',43.366,-8.414,'En curso',44,560000,'2028','2025-05',0.55,'web'),
 ('montevideo','Edificio Montevideo','Cuatro Caminos','A Coruña','A Coruña',43.355,-8.402,'En curso',66,335000,'2027','2024-03',0.86,'web'),
 ('entrenucleos-2','Las Terrazas de Entrenúcleos Fase II','Entrenúcleos','Dos Hermanas','Sevilla',37.300,-5.948,'En curso',84,265000,'2027','2025-03',0.62,'estimado'),
 ('hacienda','Las Terrazas de la Hacienda','Hacienda Rosario','Sevilla','Sevilla',37.402,-5.938,'En curso',72,245000,'2027','2024-11',0.74,'estimado'),
 ('rompido','Sol de El Rompido','El Rompido','Cartaya','Huelva',37.218,-7.128,'En curso',50,295000,'2027','2024-06',0.66,'web'),
 ('marina','Residencial Marina','La Flota','Murcia','Murcia',37.995,-1.128,'En curso',54,235000,'2026','2024-01',0.89,'web'),
 ('corina','Residencial Corina Boreal','Centro','Dénia','Alicante',38.842,0.110,'En curso',73,395000,'2026','2023-06',0.96,'prensa'),
 ('malaga','Residencial Puerto de la Torre','Puerto de la Torre','Málaga','Málaga',36.752,-4.490,'En curso',60,320000,'2028','2025-09',0.35,'estimado'),
 ('gijon','Residencial Gijón','La Calzada','Gijón','Asturias',43.540,-5.680,'En curso',48,300000,'2028','2025-06',0.48,'estimado'),
 ('vigo','Edificio Plaza España','Plaza de España','Vigo','Pontevedra',42.231,-8.718,'En curso',64,410000,'2029','2025-04',0.58,'estimado'),
 ('entrenucleos-1','Las Terrazas de Entrenúcleos','Entrenúcleos','Dos Hermanas','Sevilla',37.302,-5.952,'Entregada',96,255000,'2026-03','2023-02',1,'estimado'),
 ('tabit-3','Edificio Tabit III','El Cañaveral','Madrid','Madrid',40.430,-3.556,'Entregada',88,470000,'2026-07','2023-05',1,'web'),
 ('andes','Residencial Avenida de los Andes','Conde de Orgaz','Madrid','Madrid',40.457,-3.641,'Entregada',97,720000,'2026-05','2023-03',1,'web'),
 ('jardines-tabit-2','Jardines de Tabit Fase II','El Cañaveral','Madrid','Madrid',40.426,-3.550,'Entregada',42,850000,'2026-02','2023-01',1,'web'),
 ('aranda','Edificio Conde de Aranda','Casco Antiguo','Zaragoza','Zaragoza',41.655,-0.885,'Entregada',53,290000,'2025-09','2023-03',1,'web'),
 ('vioño','Edificio Vioño','Parque de Vioño','A Coruña','A Coruña',43.354,-8.418,'Entregada',36,320000,'2025-06','2022-10',1,'web'),
 ('valdevivar','Residencial Valdevivar','Valdebebas','Madrid','Madrid',40.483,-3.617,'Entregada',91,500000,'2025-03','2022-05',1,'web'),
 ('parque-grande','Residencial Parque Grande','Parque Oeste','Alcorcón','Madrid',40.338,-3.835,'Entregada',63,360000,'2023-11','2021-06',1,'web'),
 ('la-escala','Edificio La Escala de Valdebebas','Valdebebas','Madrid','Madrid',40.481,-3.620,'Entregada',104,430000,'2022-06','2019-10',1,'web'),
 ('capri','Edificio Capri','Las Rosas','Madrid','Madrid',40.425,-3.602,'Entregada',51,390000,'2021-10','2019-06',1,'web'),
 ('tabit-2','Edificio Tabit II','El Cañaveral','Madrid','Madrid',40.429,-3.548,'Entregada',94,330000,'2021-05','2019-03',1,'web'),
 ('tabit-1','Edificio Tabit I','El Cañaveral','Madrid','Madrid',40.431,-3.546,'Entregada',91,320000,'2020-11','2018-09',1,'web'),
 ('baos','Baos Residencial','Ensanche de Vallecas','Madrid','Madrid',40.369,-3.603,'Entregada',29,330000,'2019-12','2018-02',1,'web'),
 ('ana-austria','Residencial Ana de Austria','Sanchinarro','Madrid','Madrid',40.493,-3.658,'Entregada',96,480000,'2019-09','2017-05',1,'web'),
 ('tres-valles-2','Tres Valles Residencial Fase II','Tres Cantos','Tres Cantos','Madrid',40.600,-3.712,'Entregada',122,360000,'2019-04','2017-03',1,'web'),
 ('alameda-valle','Residencial Alameda del Valle','Ensanche de Vallecas','Madrid','Madrid',40.371,-3.598,'Entregada',28,310000,'2018-10','2016-11',1,'web'),
]

def rand_date(a, b):
    d = (b - a).days
    return a + dt.timedelta(days=int(d * random.random()))

viviendas = []; promos = []
for (pid, nombre, zona, ciudad, prov, lat, lon, estado, n, pm, entrega, inicio, pct, fuente) in P:
    portales = 1 if n <= 60 else 2 if n <= 100 else 3
    per_portal = math.ceil(n / portales)
    letters = 'ABCD'
    floors = math.ceil(per_portal / 4)
    units = []
    k = 0
    for p in range(1, portales + 1):
        for fl in range(0, floors + 1):
            for L in letters:
                if k >= n or len([u for u in units if u['portal'] == p]) >= per_portal: break
                if fl == floors and L in 'CD': continue
                tip = 'Bajo con jardín' if fl == 0 else ('Ático' if fl == floors else 'Piso')
                dorm = random.choices([1, 2, 3, 4], weights=[1, 4, 4, 1.5])[0]
                if tip == 'Ático': dorm = max(dorm, 3)
                m2 = r0(42 + 24 * dorm + random.uniform(-6, 8) + (25 if tip == 'Ático' else 0))
                f = (1.25 if tip == 'Ático' else 1.07 if tip == 'Bajo con jardín' else 1) * (1 + 0.015 * fl)
                units.append(dict(portal=p, planta=fl, letra=L, tip=tip, dorm=dorm, m2=m2, w=m2 * f))
                k += 1
    while len(units) < n:  # fill remaining
        u = dict(units[-1]); u['letra'] = 'E'; units.append(u)
    units = units[:n]
    avgw = sum(u['w'] for u in units) / n
    i0 = dt.date(int(inicio[:4]), int(inicio[5:]), 1)
    sold = round(n * pct)
    order = list(range(n)); random.shuffle(order)
    sold_set = set(order[:sold])
    if estado == 'Entregada':
        ey, em = int(entrega[:4]), int(entrega[5:7])
        end_sale = dt.date(ey, em, 1) - dt.timedelta(days=60)
    else:
        end_sale = TODAY
    # reservation dates: skewed early (launch effect)
    for idx, u in enumerate(units):
        precio = round(pm * u['w'] / avgw / 500) * 500
        planta_txt = 'Bajo' if u['planta'] == 0 else f"{u['planta']}º"
        code = (f"P{u['portal']} · " if portales > 1 else '') + f"{planta_txt}{u['letra']}"
        if idx in sold_set:
            span = (end_sale - i0).days
            x = random.random() ** 1.6
            fres = i0 + dt.timedelta(days=int(span * x))
            if estado == 'Entregada':
                est = 'Escriturada'
            else:
                est = 'Reservada' if (TODAY - fres).days < 110 else 'Vendida'
        else:
            fres = None; est = 'Disponible'
        viviendas.append(dict(id=f"{pid}-{idx+1:03d}", promo_id=pid, promocion=nombre, vivienda=code,
            tipologia=u['tip'], dormitorios=u['dorm'], m2=u['m2'], precio=precio, estado=est,
            fecha_reserva=fres.isoformat() if fres else None))
    vs = [v for v in viviendas if v['promo_id'] == pid]
    cnt = lambda s: sum(1 for v in vs if v['estado'] == s)
    fact = lambda s: sum(v['precio'] for v in vs if v['estado'] in s)
    promos.append(dict(id=pid, promocion=nombre, zona=zona, ciudad=ciudad, provincia=prov, lat=lat, lon=lon,
        estado=estado, entrega=entrega, viviendas=n,
        escrituradas=cnt('Escriturada'), vendidas=cnt('Vendida'), reservadas=cnt('Reservada'), disponibles=cnt('Disponible'),
        pct_comercializado=round((n - cnt('Disponible')) / n, 3),
        facturacion=fact(['Escriturada', 'Vendida', 'Reservada']),
        facturacion_escriturada=fact(['Escriturada']),
        cartera_pendiente=fact(['Vendida', 'Reservada']),
        valor_disponible=fact(['Disponible']),
        precio_medio=r0(sum(v['precio'] for v in vs) / n),
        fuente_viviendas={'web':'nº de viviendas según nozar.es','prensa':'nº de viviendas según prensa','estimado':'nº de viviendas estimado'}[fuente]))
dump('promociones', promos)
dump('viviendas', viviendas)

# monthly reservations
MS = months((2025, 1), (2026, 10))
active_ids = [p['id'] for p in promos if p['estado'] == 'En curso']
res_mes = []; tot = []
acum = sum(1 for v in viviendas if v['promo_id'] in active_ids and v['fecha_reserva'] and v['fecha_reserva'] < '2025-01')
for m in MS:
    rsum = 0; csum = 0
    for pid in active_ids:
        rr = sum(1 for v in viviendas if v['promo_id'] == pid and v['fecha_reserva'] and v['fecha_reserva'][:7] == m)
        res_mes.append(dict(mes=m, promo_id=pid, promocion=next(p['promocion'] for p in promos if p['id'] == pid), reservas=rr))
        rsum += rr
    # contratos: reservations from ~3 months earlier converting
    acum += rsum
    tot.append(dict(mes=m, reservas=rsum, acumulado=acum))
dump('reservas_mes', res_mes)
dump('reservas_mes_total', tot)

# ---------------- HOTEL ----------------
HOT = {'Gran Hotel': dict(hab=90, adr=235, occ_add=0.04), 'Hotel Continental': dict(hab=160, adr=128, occ_add=0.0)}
OCC = [0.55, 0.58, 0.50, 0.52, 0.35, 0.62, 0.86, 0.93, 0.70, 0.50, 0.25, 0.55]
ADRF = [1.00, 1.00, 0.95, 0.98, 0.85, 1.05, 1.30, 1.38, 1.08, 0.95, 0.80, 1.10]
DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
HMS = months((2024, 1), (2026, 10))
hotel_mes = []
for m in HMS:
    y, mm = int(m[:4]), int(m[5:])
    days = DIM[mm - 1] + (1 if (mm == 2 and y == 2024) else 0)
    if m == '2026-10': days = 19
    for h, c in HOT.items():
        g = {2024: 0, 2025: 1, 2026: 2}[y]
        occ = min(0.97, OCC[mm - 1] + c['occ_add'] + 0.018 * g + random.uniform(-0.03, 0.03))
        adr = c['adr'] * ADRF[mm - 1] * (1.045 ** g) * random.uniform(0.97, 1.03)
        disp = c['hab'] * days
        noches = r0(disp * occ)
        huesp = r0(noches * 1.85 / 2.3)
        hotel_mes.append(dict(mes=m, hotel=h, habitaciones_disponibles=disp, noches_vendidas=noches,
            ocupacion=round(noches / disp, 3), adr=round(adr, 1), revpar=round(noches * adr / disp, 1),
            ingresos_alojamiento=r0(noches * adr), huespedes=huesp, parcial=(m == '2026-10')))
dump('hotel_mes', hotel_mes)

OUTLETS = [  # punto, tipo, hotel, gasto por huesped base, coste ratio, estacionalidad
 ('La Brasserie', 'Restaurante', 'Gran Hotel', 19, 0.62, None),
 ('Bar Lobby', 'Bar', 'Gran Hotel', 7, 0.42, None),
 ('Cafetería Gran Hotel', 'Cafetería', 'Gran Hotel', 5, 0.45, None),
 ('Restaurante del Lago', 'Restaurante', 'Resort', 9, 0.60, 'verano'),
 ('Restaurante La Fontana', 'Restaurante', 'Hotel Continental', 11, 0.61, None),
 ('Bar Qbo', 'Bar', 'Hotel Continental', 6, 0.44, None),
 ('Buffet Continental', 'Buffet', 'Hotel Continental', 15, 0.58, None),
 ('Bar El Embarcadero', 'Bar', 'Resort', 4, 0.43, 'verano'),
 ('Spa Gran Hotel', 'Spa', 'Gran Hotel', 21, 0.47, None),
 ('Termas de Tiberio', 'Spa', 'Resort', 24, 0.50, None),
]
SUMMER = [0.2, 0.2, 0.3, 0.5, 0.8, 1.6, 2.6, 2.8, 1.5, 0.7, 0.1, 0.2]
puntos_mes = []
for m in HMS:
    hm = [r for r in hotel_mes if r['mes'] == m]
    g_tot = sum(r['huespedes'] for r in hm)
    g_gh = next(r['huespedes'] for r in hm if r['hotel'] == 'Gran Hotel')
    g_co = g_tot - g_gh
    mm = int(m[5:])
    for (pt, tipo, hot, spend, cr, est) in OUTLETS:
        base = g_gh if hot == 'Gran Hotel' else g_co if hot == 'Hotel Continental' else g_tot
        if hot == 'Gran Hotel' and pt != 'Spa Gran Hotel': base = base * 1.6  # GH guests split per capita
        f = SUMMER[mm - 1] if est == 'verano' else 1
        ext = 1.35 if tipo == 'Spa' and pt == 'Termas de Tiberio' else 1
        ing = base * spend * f * ext * random.uniform(0.92, 1.08) * (1.04 ** (int(m[:4]) - 2024))
        coste = ing * cr * random.uniform(0.97, 1.03)
        puntos_mes.append(dict(mes=m, punto=pt, tipo=tipo, ubicacion=hot, ingresos=r0(ing), coste_directo=r0(coste), beneficio_bruto=r0(ing - coste)))
dump('hotel_puntos_mes', puntos_mes)

def ytd(rows, y, field, filt=lambda r: True):
    return sum(r[field] for r in rows if r['mes'][:4] == str(y) and int(r['mes'][5:]) <= 10 and filt(r) and (y == 2026 or r['mes'][5:] != '10')) + \
           (sum(r[field] for r in rows if r['mes'] == f'{y}-10' and filt(r)) * OCT_FRAC if y != 2026 else 0)

ROOM_COST = 0.29
hres = []
for h in list(HOT) + ['Total']:
    flt = (lambda r, h=h: True) if h == 'Total' else (lambda r, h=h: r['hotel'] == h)
    d = {}
    for y in (2026, 2025):
        noches = ytd(hotel_mes, y, 'noches_vendidas', flt); disp = ytd(hotel_mes, y, 'habitaciones_disponibles', flt)
        ing = ytd(hotel_mes, y, 'ingresos_alojamiento', flt); hu = ytd(hotel_mes, y, 'huespedes', flt)
        if h == 'Total': pf = lambda r: True
        elif h == 'Gran Hotel': pf = lambda r: r['ubicacion'] == 'Gran Hotel' or (r['ubicacion'] == 'Resort' and False)
        else: pf = lambda r: r['ubicacion'] == 'Hotel Continental'
        fb = ytd(puntos_mes, y, 'ingresos', pf); fbbb = ytd(puntos_mes, y, 'beneficio_bruto', pf)
        d[y] = dict(noches=noches, disp=disp, ing=ing, hu=hu, fb=fb, total=ing + fb, bb=ing * (1 - ROOM_COST) + fbbb)
    hres.append(dict(hotel=h, habitaciones=sum(c['hab'] for c in HOT.values()) if h == 'Total' else HOT[h]['hab'],
        ocupacion=round(d[2026]['noches'] / d[2026]['disp'], 3), ocupacion_ant=round(d[2025]['noches'] / d[2025]['disp'], 3),
        adr=round(d[2026]['ing'] / d[2026]['noches'], 1), adr_ant=round(d[2025]['ing'] / d[2025]['noches'], 1),
        revpar=round(d[2026]['ing'] / d[2026]['disp'], 1), revpar_ant=round(d[2025]['ing'] / d[2025]['disp'], 1),
        noches_vendidas=r0(d[2026]['noches']), huespedes=r0(d[2026]['hu']), huespedes_ant=r0(d[2025]['hu']),
        ingresos_alojamiento=r0(d[2026]['ing']), ingresos_puntos_venta=r0(d[2026]['fb']),
        facturacion=r0(d[2026]['total']), facturacion_ant=r0(d[2025]['total']),
        beneficio_bruto=r0(d[2026]['bb']), beneficio_bruto_ant=r0(d[2025]['bb'])))
dump('hotel_resumen', hres)

pres = []
for (pt, tipo, hot, *_r) in OUTLETS:
    f = lambda r, pt=pt: r['punto'] == pt
    i6, i5 = ytd(puntos_mes, 2026, 'ingresos', f), ytd(puntos_mes, 2025, 'ingresos', f)
    c6 = ytd(puntos_mes, 2026, 'coste_directo', f); b6 = i6 - c6; b5 = ytd(puntos_mes, 2025, 'beneficio_bruto', f)
    pres.append(dict(punto=pt, tipo=tipo, ubicacion=hot, ingresos=r0(i6), ingresos_ant=r0(i5), variacion=round(i6 / i5 - 1, 3),
        coste_directo=r0(c6), beneficio_bruto=r0(b6), beneficio_bruto_ant=r0(b5), margen=round(b6 / i6, 3)))
dump('hotel_puntos_resumen', pres)

# on the books: future stay months
otb = []
for m, frac_ly in [('2026-11', 0.8), ('2026-12', 0.62), ('2027-01', 0.45), ('2027-02', 0.33), ('2027-03', 0.22), ('2027-04', 0.12), ('2027-05', 0.07)]:
    mm = int(m[5:])
    cap = 250 * DIM[mm - 1]
    final_ly = cap * (OCC[mm - 1] + 0.03)
    ly = r0(final_ly * frac_ly)
    ty = r0(ly * random.uniform(1.02, 1.16))
    otb.append(dict(mes=m, noches_reservadas=ty, noches_mismo_dia_ant=ly, capacidad=cap, ocupacion_reservada=round(ty / cap, 3)))
dump('hotel_reservas_futuras', otb)

# weekly pickup, last 16 weeks
pick = []
start = TODAY - dt.timedelta(days=TODAY.weekday()) - dt.timedelta(weeks=15)
for w in range(16):
    d = start + dt.timedelta(weeks=w)
    base = 520 + 180 * math.sin((d.timetuple().tm_yday - 120) / 365 * 2 * math.pi)
    ly = r0(base * random.uniform(0.9, 1.1))
    ty = r0(ly * random.uniform(0.95, 1.18))
    if w == 15: ty = r0(ty * (TODAY.weekday() + 1) / 7); ly = r0(ly * (TODAY.weekday() + 1) / 7)
    pick.append(dict(semana=d.isoformat(), reservas_creadas=ty, reservas_creadas_ant=ly, parcial=(w == 15)))
dump('hotel_pickup', pick)

# ---------------- BODEGAS ----------------
REFS = {
 'Enate': [('Enate 234 Chardonnay','Blanco',9.5,420000),('Enate Chardonnay Fermentado en Barrica','Blanco',14.9,110000),
           ('Enate Gewürztraminer','Blanco',13.5,160000),('Enate Gewürztraminer Dulce','Dulce',22.0,8000),
           ('Enate Rosado','Rosado',8.5,260000),('Enate Tapas','Tinto',6.9,180000),('Enate Cabernet Sauvignon-Merlot','Tinto',8.9,500000),
           ('Enate Crianza','Tinto',11.5,300000),('Enate Reserva','Tinto',17.5,90000),('Enate Varietales','Tinto',19.9,45000),
           ('Enate Merlot-Merlot','Tinto',29.0,22000),('Enate Syrah-Shiraz','Tinto',29.0,20000),('Enate Cabernet-Cabernet','Tinto',29.0,15000),
           ('Enate Uno Chardonnay','Blanco',59.0,4000),('Enate Uno Tinto','Tinto',89.0,3000)],
 'Laus': [('Laus Flor de Chardonnay','Blanco',7.5,130000),('Laus Flor de Gewürztraminer','Blanco',8.9,70000),
          ('Laus Flor de Merlot','Rosado',7.2,90000),('Laus Roble','Tinto',7.0,140000),('Laus Crianza','Tinto',9.5,110000),
          ('Laus Reserva','Tinto',14.0,25000),('Blum by Laus','Frizzante',11.0,30000)],
 'Las Moradas de San Martín': [('Las Moradas Senda','Tinto',11.0,20000),('Las Moradas Albillo Real','Blanco',16.0,8000),
          ('Las Moradas Initio','Tinto',18.0,6500),('Las Luces · Libro Veinte','Tinto',45.0,1500)],
}
EXP_SHARE = {'Enate': 0.35, 'Laus': 0.25, 'Las Moradas de San Martín': 0.55}
PROV = {
 'Enate': {'Madrid':20,'Zaragoza':16,'Barcelona':10,'Huesca':9,'Valencia':6,'Bizkaia':5,'Navarra':4,'Sevilla':4,'Málaga':4,'Gipuzkoa':3,'Asturias':3,'A Coruña':3,'Alicante':3,'Illes Balears':3,'Lleida':2,'La Rioja':1.5,'Teruel':1.5,'Toledo':1,'Resto de España':6},
 'Laus': {'Zaragoza':26,'Huesca':18,'Madrid':12,'Barcelona':8,'Navarra':5,'Lleida':4,'Teruel':4,'Valencia':4,'Bizkaia':3,'La Rioja':2,'Gipuzkoa':2,'Asturias':2,'Alicante':2,'Resto de España':8},
 'Las Moradas de San Martín': {'Madrid':60,'Ávila':6,'Toledo':5,'Barcelona':6,'Valencia':3,'Sevilla':3,'Málaga':3,'Bizkaia':3,'Zaragoza':2,'Illes Balears':2,'Resto de España':7},
}
EXPC = {
 'Enate': {'Alemania':18,'EE. UU.':15,'Reino Unido':10,'México':9,'Japón':7,'China':6,'Bélgica':6,'Países Bajos':6,'Suiza':5,'Francia':5,'Canadá':5,'Dinamarca':4,'Polonia':4},
 'Laus': {'Alemania':20,'Bélgica':15,'Países Bajos':12,'Polonia':12,'Reino Unido':10,'EE. UU.':10,'Dinamarca':8,'Suecia':7,'México':6},
 'Las Moradas de San Martín': {'Dinamarca':20,'Reino Unido':16,'EE. UU.':15,'Suiza':10,'Alemania':9,'Países Bajos':6,'Suecia':5,'Bélgica':5,'Canadá':5,'México':5,'Taiwán':4},
}
SEAS = [0.065, 0.065, 0.075, 0.08, 0.085, 0.09, 0.09, 0.07, 0.08, 0.09, 0.1, 0.11]
YTD_SHARE = sum(SEAS[:9]) + SEAS[9] * OCT_FRAC
NET_NAC, NET_EXP = 0.56, 0.46
COST = {'Enate': 0.24, 'Laus': 0.27, 'Las Moradas de San Martín': 0.26}  # coste por botella / pvp

def norm(d): s = sum(d.values()); return {k: v / s for k, v in d.items()}
refs_rows = []; prov_rows = []; exp_rows = []
growth = {}
for b, refs in REFS.items():
    pw = norm(PROV[b]); ew = norm(EXPC[b])
    for (ref, tipo, pvp, bot25) in refs:
        gr = random.uniform(-0.07, 0.16) if b != 'Las Moradas de San Martín' else random.uniform(0.04, 0.25)
        growth[ref] = gr
        ytd25 = bot25 * YTD_SHARE; ytd26 = ytd25 * (1 + gr)
        exs = EXP_SHARE[b] * random.uniform(0.8, 1.2)
        nac26, exp26 = ytd26 * (1 - exs), ytd26 * exs
        nac25, exp25 = ytd25 * (1 - exs * random.uniform(0.92, 1.05)), None
        exp25 = ytd25 - nac25
        f26 = nac26 * pvp * NET_NAC + exp26 * pvp * NET_EXP
        f25 = nac25 * pvp * NET_NAC + exp25 * pvp * NET_EXP
        cu = pvp * COST[b]
        refs_rows.append(dict(bodega=b, referencia=ref, tipo=tipo, pvp=pvp, botellas=r0(ytd26), botellas_ant=r0(ytd25),
            facturacion=r0(f26), facturacion_ant=r0(f25), variacion=round(f26 / f25 - 1, 3),
            beneficio_bruto=r0(f26 - cu * ytd26), margen=round((f26 - cu * ytd26) / f26, 3),
            facturacion_nacional=r0(nac26 * pvp * NET_NAC), facturacion_export=r0(exp26 * pvp * NET_EXP)))
        # provinces
        for pv, w in pw.items():
            ww = w * random.uniform(0.6, 1.4)
            prov_rows.append(dict(bodega=b, provincia=pv, referencia=ref, _w=ww, _nac26=nac26, _nac25=nac25, _pvp=pvp))
        for c, w in ew.items():
            if random.random() < 0.18 and pvp > 25: continue
            ww = w * random.uniform(0.5, 1.5)
            exp_rows.append(dict(bodega=b, pais=c, referencia=ref, _w=ww, _e26=exp26, _e25=exp25, _pvp=pvp))
# normalize province & export rows per ref
def finalize(rows, k26, k25, net, keys):
    out = []
    for ref in set(r['referencia'] for r in rows):
        rr = [r for r in rows if r['referencia'] == ref]
        s = sum(r['_w'] for r in rr)
        for r in rr:
            b26 = r[k26] * r['_w'] / s; b25 = r[k25] * r['_w'] / s * random.uniform(0.85, 1.12)
            o = {k: r[k] for k in keys}
            o.update(botellas=r0(b26), botellas_ant=r0(b25), facturacion=r0(b26 * r['_pvp'] * net), facturacion_ant=r0(b25 * r['_pvp'] * net))
            if o['botellas'] > 0: out.append(o)
    return out
prov = finalize(prov_rows, '_nac26', '_nac25', NET_NAC, ['bodega', 'provincia', 'referencia'])
exp = finalize(exp_rows, '_e26', '_e25', NET_EXP, ['bodega', 'pais', 'referencia'])
for o in prov: o['id'] = f"{o['referencia']}|{o['provincia']}"
for o in exp: o['id'] = f"{o['referencia']}|{o['pais']}"
dump('vino_referencias', refs_rows)
dump('vino_provincia_referencia', prov)
dump('vino_export_referencia', exp)

def agg(rows, key):
    d = {}
    for r in rows:
        k = (r['bodega'], r[key]); e = d.setdefault(k, dict(bodega=r['bodega'], **{key: r[key]}, botellas=0, botellas_ant=0, facturacion=0, facturacion_ant=0))
        for f in ('botellas', 'botellas_ant', 'facturacion', 'facturacion_ant'): e[f] += r[f]
    out = list(d.values())
    for e in out:
        e['variacion'] = round(e['facturacion'] / e['facturacion_ant'] - 1, 3) if e['facturacion_ant'] else None
        e['id'] = f"{e['bodega']}|{e[key]}"
    return sorted(out, key=lambda e: -e['facturacion'])
dump('vino_provincias', agg(prov, 'provincia'))
dump('vino_paises', agg(exp, 'pais'))

# direct channels (monthly)
CH = {'Enate': dict(op=450, ot=68, vi=1800, vt=24, tt=900, tk=46), 'Laus': dict(op=120, ot=55, vi=700, vt=19, tt=400, tk=34),
      'Las Moradas de San Martín': dict(op=35, ot=62, vi=160, vt=22, tt=90, tk=38)}
ONS = [0.8, 0.7, 0.8, 0.85, 0.9, 0.85, 0.8, 0.7, 0.9, 1.05, 1.35, 2.3]
VIS = [0.5, 0.6, 0.9, 1.3, 1.3, 1.1, 1.2, 1.4, 1.3, 1.3, 0.8, 0.6]
canal = []
for b, c in CH.items():
    for m in months((2024, 1), (2026, 10)):
        mm = int(m[5:]); g = 1.09 ** (int(m[:4]) - 2024); f = OCT_FRAC if m == '2026-10' else 1
        op = c['op'] * ONS[mm - 1] * g * f * random.uniform(0.9, 1.1)
        vi = c['vi'] * VIS[mm - 1] * g * f * random.uniform(0.9, 1.1)
        tt = vi * c['tt'] / c['vi'] * random.uniform(0.9, 1.1)
        canal.append(dict(bodega=b, mes=m, pedidos_online=r0(op), facturacion_online=r0(op * c['ot'] * random.uniform(0.95, 1.05)),
            visitantes=r0(vi), facturacion_visitas=r0(vi * c['vt'] * random.uniform(0.95, 1.05)),
            tickets_tienda=r0(tt), facturacion_tienda=r0(tt * c['tk'] * random.uniform(0.95, 1.05)), parcial=(m == '2026-10')))
dump('vino_canales_mes', canal)

def cytd(b, y, f):
    rr = [r for r in canal if r['bodega'] == b and r['mes'][:4] == str(y) and int(r['mes'][5:]) <= 10]
    return sum(r[f] * (OCT_FRAC if (r['mes'][5:] == '10' and y != 2026) else 1) for r in rr)
cres = []
for b in CH:
    for canal_name, kq, kf, unidad in [('Tienda online', 'pedidos_online', 'facturacion_online', 'pedidos'),
                                       ('Visitas a la bodega', 'visitantes', 'facturacion_visitas', 'visitantes'),
                                       ('Tienda de la bodega', 'tickets_tienda', 'facturacion_tienda', 'tickets')]:
        q6, q5, f6, f5 = cytd(b, 2026, kq), cytd(b, 2025, kq), cytd(b, 2026, kf), cytd(b, 2025, kf)
        cres.append(dict(id=f"{b}|{canal_name}", bodega=b, canal=canal_name, unidad=unidad, cantidad=r0(q6), cantidad_ant=r0(q5),
            facturacion=r0(f6), facturacion_ant=r0(f5), variacion=round(f6 / f5 - 1, 3), ticket_medio=round(f6 / q6, 1)))
dump('vino_canales_resumen', cres)

# bodega summary + annual history
vres = []; anual = []
for b in REFS:
    rr = [r for r in refs_rows if r['bodega'] == b]
    f6 = sum(r['facturacion'] for r in rr); f5 = sum(r['facturacion_ant'] for r in rr)
    d6 = sum(c['facturacion'] for c in cres if c['bodega'] == b); d5 = sum(c['facturacion_ant'] for c in cres if c['bodega'] == b)
    bb6 = sum(r['beneficio_bruto'] for r in rr) + d6 * 0.55
    bb5 = bb6 / (f6 + d6) * (f5 + d5) * random.uniform(0.95, 1.0)
    vres.append(dict(bodega=b, facturacion=r0(f6 + d6), facturacion_ant=r0(f5 + d5), variacion=round((f6 + d6) / (f5 + d5) - 1, 3),
        beneficio_bruto=r0(bb6), beneficio_bruto_ant=r0(bb5), margen=round(bb6 / (f6 + d6), 3),
        botellas=sum(r['botellas'] for r in rr), botellas_ant=sum(r['botellas_ant'] for r in rr),
        facturacion_nacional=sum(r['facturacion_nacional'] for r in rr), facturacion_export=sum(r['facturacion_export'] for r in rr),
        facturacion_directa=r0(d6), pct_export=round(sum(r['facturacion_export'] for r in rr) / (f6 + d6), 3), referencias=len(rr)))
    full25 = (f5 + d5) / YTD_SHARE
    for y, fac in [(2021, 0.80), (2022, 0.87), (2023, 0.92), (2024, 0.95), (2025, 1.0)]:
        F = full25 * fac * random.uniform(0.98, 1.02)
        anual.append(dict(id=f"{b}|{y}", bodega=b, anio=str(y), facturacion=r0(F), beneficio_bruto=r0(F * (bb6 / (f6 + d6)) * random.uniform(0.94, 1.02)),
            botellas=r0(sum(r['botellas_ant'] for r in rr) / YTD_SHARE * fac / (1.01 ** (2025 - y))), parcial=False))
    anual.append(dict(id=f"{b}|2026", bodega=b, anio='2026 (hasta 19 oct)', facturacion=r0(f6 + d6), beneficio_bruto=r0(bb6), botellas=sum(r['botellas'] for r in rr), parcial=True))
dump('vino_resumen', vres)
dump('vino_anual', anual)

# monthly by bodega, 3 years
vmes = []
for v in vres:
    b = v['bodega']; tot25 = v['facturacion_ant'] / YTD_SHARE; tot26 = v['facturacion'] / YTD_SHARE
    for mm in range(1, 13):
        def val(T): return r0(T * SEAS[mm - 1] * random.uniform(0.92, 1.08))
        f26 = val(tot26) if mm <= 9 else (r0(tot26 * SEAS[9] * OCT_FRAC) if mm == 10 else None)
        vmes.append(dict(id=f"{b}|{mm}", bodega=b, mes=mm, mes_nombre=MES_ES[mm - 1], facturacion_2026=f26, facturacion_2025=val(tot25), facturacion_2024=val(tot25 / 1.05)))
dump('vino_mes', vmes)

# ---------------- GRUPO ----------------
gm = []
bod_m = {}
for m in months((2025, 1), (2026, 10)):
    y, mm = int(m[:4]), int(m[5:])
    inm = sum(p['facturacion_escriturada'] for p in promos if p['estado'] == 'Entregada' and p['entrega'][:7] == m)
    hot = sum(r['ingresos_alojamiento'] for r in hotel_mes if r['mes'] == m) + sum(r['ingresos'] for r in puntos_mes if r['mes'] == m)
    bod = sum(r[f'facturacion_{y}'] or 0 for r in vmes if r['mes'] == mm) + sum(r['facturacion_online'] + r['facturacion_visitas'] + r['facturacion_tienda'] for r in canal if r['mes'] == m) * 0  # vmes already includes directo
    for neg, val in [('Inmobiliario', inm), ('Hotelero', hot), ('Bodegas', bod)]:
        gm.append(dict(id=f"{m}|{neg}", mes=m, negocio=neg, facturacion=r0(val), parcial=(m == '2026-10')))
dump('grupo_mes', gm)

def gytd(neg, y):
    return sum(r['facturacion'] for r in gm if r['negocio'] == neg and r['mes'][:4] == str(y) and int(r['mes'][5:]) < 10) + \
        sum(r['facturacion'] for r in gm if r['negocio'] == neg and r['mes'] == f'{y}-10') * (1 if y == 2026 else OCT_FRAC)
INM_MARGIN = 0.23
inm6, inm5 = gytd('Inmobiliario', 2026), gytd('Inmobiliario', 2025)
hT = next(h for h in hres if h['hotel'] == 'Total')
b6 = sum(v['facturacion'] for v in vres); b5 = sum(v['facturacion_ant'] for v in vres)
bb6 = sum(v['beneficio_bruto'] for v in vres); bb5 = sum(v['beneficio_bruto_ant'] for v in vres)
gk = [
 dict(negocio='Inmobiliario', facturacion=r0(inm6), facturacion_ant=r0(inm5), beneficio_bruto=r0(inm6 * INM_MARGIN), beneficio_bruto_ant=r0(inm5 * 0.215),
      detalle='Escrituras de viviendas entregadas'),
 dict(negocio='Hotelero', facturacion=hT['facturacion'], facturacion_ant=hT['facturacion_ant'], beneficio_bruto=hT['beneficio_bruto'], beneficio_bruto_ant=hT['beneficio_bruto_ant'],
      detalle='Balneario de Panticosa: alojamiento, restauración y spa'),
 dict(negocio='Bodegas', facturacion=b6, facturacion_ant=b5, beneficio_bruto=bb6, beneficio_bruto_ant=bb5, detalle='Enate, Laus y Las Moradas de San Martín'),
]
gk.append(dict(negocio='Grupo', facturacion=sum(g['facturacion'] for g in gk), facturacion_ant=sum(g['facturacion_ant'] for g in gk),
               beneficio_bruto=sum(g['beneficio_bruto'] for g in gk), beneficio_bruto_ant=sum(g['beneficio_bruto_ant'] for g in gk), detalle='Total de los tres negocios'))
for g in gk:
    g['variacion'] = round(g['facturacion'] / g['facturacion_ant'] - 1, 3); g['margen'] = round(g['beneficio_bruto'] / g['facturacion'], 3)
dump('grupo_resumen', gk)

# live feed today
feed = []
avail_today = [v for v in viviendas if v['estado'] == 'Reservada']
random.shuffle(avail_today)
events = []
for v in avail_today[:3]:
    events.append(('Inmobiliario', f"Reserva · {v['promocion']} · {v['vivienda']}", v['precio']))
for i in range(4):
    h = random.choice(['Gran Hotel', 'Hotel Continental']); n = random.choice([1, 2, 2, 3, 4])
    events.append(('Hotelero', f"Reserva {h} · {n} noche{'s' if n > 1 else ''}", r0(n * (210 if h == 'Gran Hotel' else 118) * random.uniform(1.6, 2.1))))
events += [('Hotelero', 'Termas de Tiberio · 4 circuitos termales', 168), ('Hotelero', 'La Brasserie · mesa de 6', 412), ('Hotelero', 'Bar Qbo · cierre de caja', 1385)]
for b, items in [('Enate', ['Pedido online · caja 6 Enate Crianza', 'Tienda bodega · ticket', 'Visita «El vino del arte» · 8 personas', 'Pedido distribuidor Zaragoza · 120 botellas']),
                 ('Laus', ['Pedido online · 12 Laus Flor de Chardonnay', 'Visita y cata · 5 personas']),
                 ('Las Moradas de San Martín', ['Exportación Dinamarca · 600 botellas Senda', 'Tienda bodega · ticket'])]:
    for it in items:
        amt = {'Pedido online · caja 6 Enate Crianza': 69, 'Tienda bodega · ticket': random.choice([38, 54, 87]), 'Visita «El vino del arte» · 8 personas': 200,
               'Pedido distribuidor Zaragoza · 120 botellas': 650, 'Pedido online · 12 Laus Flor de Chardonnay': 90, 'Visita y cata · 5 personas': 95,
               'Exportación Dinamarca · 600 botellas Senda': 3036}.get(it, 50)
        events.append(('Bodegas', f"{b} · {it}", amt))
random.shuffle(events)
times = sorted(random.sample(range(8 * 60, 22 * 60 + 9), len(events)), reverse=True)
for (neg, det, imp), t in zip(events, times):
    feed.append(dict(id=f"ev{t}", hora=f"{t // 60:02d}:{t % 60:02d}", negocio=neg, detalle=det, importe=imp))
dump('actividad_hoy', feed)
print('ytd grupo', gk)
