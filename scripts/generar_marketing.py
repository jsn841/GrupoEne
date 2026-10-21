"""Datos simulados de marketing inmobiliario (dashboard/data/marketing.json).

Imita lo que exporta una herramienta estándar de marketing (email + redes + anuncios + web):
  - el calendario de lanzamiento de cada promoción: tareas, fecha prevista y fecha real;
  - campañas por mes y canal (Instagram, Facebook, LinkedIn, Google Ads, portales, web) con inversión,
    impresiones, clics, interacciones, publicaciones y contactos (leads);
  - envíos de email con enviados, aperturas, clics, bajas y contactos.
Las promociones salen de promociones.json y la fecha de lanzamiento de la primera reserva de viviendas.json;
se añaden tres próximos lanzamientos con nombre provisional. Las reservas no van aquí: el panel las lee
del sistema de ventas (viviendas.json). Todo es inventado.
"""
import json, os, random, datetime as dt, math
rnd = random.Random(1021)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dashboard', 'data')
load = lambda n: json.load(open(os.path.join(D, n + '.json')))
HOY = dt.date(2026, 10, 19)
promos = load('promociones'); viv = load('viviendas')
iso = lambda d: d.isoformat()
def month_start(d): return dt.date(d.year, d.month, 1)
def add_months(d, k):
    m = d.month - 1 + k; y = d.year + m // 12; m = m % 12 + 1
    return dt.date(y, m, 1)

CANALES = ['Instagram', 'Facebook', 'LinkedIn', 'Google Ads', 'Portales inmobiliarios', 'Web y SEO']
# coste por contacto, coste por mil impresiones, % de clics sobre impresiones, % de interacciones, publicaciones al mes
CFG = {
 'Instagram': dict(cpl=27, cpm=7.0, ctr=.011, inter=.032, posts=6, share=.17),
 'Facebook': dict(cpl=23, cpm=5.5, ctr=.013, inter=.018, posts=5, share=.14),
 'LinkedIn': dict(cpl=62, cpm=26, ctr=.006, inter=.012, posts=2, share=.03),
 'Google Ads': dict(cpl=34, cpm=None, ctr=.045, inter=0, posts=0, share=.25, cpc=1.35),
 'Portales inmobiliarios': dict(cpl=21, cpm=None, ctr=.06, inter=0, posts=0, share=.27, fee=650),
 'Web y SEO': dict(cpl=0, cpm=None, ctr=None, inter=0, posts=0, share=.10),
}
TAREAS = [
 ('render', 'Renders, planos y memoria de calidades', 'Diseño', -35),
 ('web', 'Ficha de la promoción publicada en la web', 'Web', -21),
 ('landing', 'Landing page con formulario de contacto', 'Web', -21),
 ('dossier', 'Dossier comercial y lista de precios', 'Comercial', -14),
 ('portales', 'Alta en portales inmobiliarios', 'Marketing', -7),
 ('rrss', 'Publicación de lanzamiento en redes sociales', 'Redes sociales', 0),
 ('meta', 'Campaña de anuncios en Instagram y Facebook', 'Redes sociales', 0),
 ('google', 'Campaña de Google Ads', 'Marketing', 0),
 ('email', 'Email de lanzamiento a la base de datos', 'Marketing', 0),
 ('video', 'Vídeo o visita virtual', 'Diseño', 14),
 ('valla', 'Lona o valla publicitaria en la parcela', 'Marketing', 30),
 ('evento', 'Jornada de puertas abiertas', 'Comercial', 45),
]
ASUNTOS = ['Ya a la venta: {n}', 'Últimas viviendas de {n}', 'Visita el piso piloto de {n}', 'Así avanza la obra de {n}', 'Viviendas con terraza en {n}',
           'Jornada de puertas abiertas en {n}', 'Nuevos precios en {n}', 'Te contamos las calidades de {n}', '{n}: plazas de garaje y trasteros', 'Reserva tu vivienda en {n}']

out_promos, camp, emails = [], [], []
def reserves(pid): return sorted(dt.date.fromisoformat(v['fecha_reserva']) for v in viv if v['promo_id'] == pid and v['fecha_reserva'])

lista = []
for p in promos:
    rs = reserves(p['id'])
    if not rs: continue
    lanz = rs[0] - dt.timedelta(days=rnd.randint(10, 25))
    cerrada = p['estado'] == 'Entregada'
    fin = rs[-1] if cerrada else HOY
    lista.append(dict(id=p['id'], promocion=p['promocion'], ciudad=p['ciudad'], provincia=p['provincia'], viviendas=p['viviendas'], entrega=p['entrega'],
                      estado='Cerrada' if cerrada else 'En comercialización', lanzamiento=lanz, fin=fin, reservas=rs, simulada=False))
# próximos lanzamientos (nombre provisional)
for k, (ciudad, prov, n, dias) in enumerate([('Zaragoza', 'Zaragoza', 70, 12), ('Valencia', 'Valencia', 96, 34), ('Madrid', 'Madrid', 58, 75)]):
    lanz = HOY + dt.timedelta(days=dias)
    lista.append(dict(id=f'proxima-{k + 1}', promocion=f'Próxima promoción en {ciudad} (nombre provisional)', ciudad=ciudad, provincia=prov, viviendas=n, entrega=str(lanz.year + 2),
                      estado='Próximo lanzamiento', lanzamiento=lanz, fin=HOY, reservas=[], simulada=True))

for pi, P in enumerate(lista):
    lanz = P['lanzamiento']; nombre = P['promocion'].replace('Residencial ', '')
    # ---- tareas del lanzamiento
    tareas = []
    for (tid, tn, resp, off) in TAREAS:
        prev = lanz + dt.timedelta(days=off)
        if P['estado'] == 'Próximo lanzamiento':
            # cuanto más cerca del lanzamiento, más tareas hechas; alguna se retrasa
            if prev < HOY:
                hecha = rnd.random() < 0.8
                real = prev + dt.timedelta(days=rnd.randint(-5, 3)) if hecha else None
                if real and real > HOY: real = HOY
            else:
                real = prev - dt.timedelta(days=rnd.randint(2, 12)) if rnd.random() < 0.18 and (prev - HOY).days < 25 else None
                if real and real > HOY: real = None
        else:
            real = prev + dt.timedelta(days=rnd.choice([-6, -3, -2, -1, 0, 0, 0, 1, 2, 4, 7, 12, 20]))
            if real > HOY: real = None
        tareas.append(dict(t=tid, prevista=iso(prev), real=iso(real) if real else None))
    # ---- campañas por mes y canal
    rs = P['reservas']; total_leads = P['viviendas'] * rnd.uniform(28, 42)
    start = month_start(lanz - dt.timedelta(days=40)); end = month_start(P['fin'])
    months = []
    m = start
    while m <= end: months.append(m); m = add_months(m, 1)
    if P['estado'] == 'Próximo lanzamiento': months = [m for m in months if m <= month_start(HOY)]
    def pace(m):  # peso de cada mes: arranque fuerte y luego al ritmo de las reservas
        nres = sum(1 for d in rs if month_start(d) == m)
        k = (m.year - lanz.year) * 12 + m.month - lanz.month
        burst = 2.6 if 0 <= k <= 2 else 1.4 if k < 0 else 1.0
        return (0.6 + nres) * burst * rnd.uniform(0.8, 1.2)
    w = [pace(m) for m in months]; sw = sum(w) or 1
    if P['estado'] == 'Próximo lanzamiento': total_leads = P['viviendas'] * rnd.uniform(4, 7) * len(months) / 2
    for m, wm in zip(months, w):
        d0 = max(m, lanz - dt.timedelta(days=40)); d1 = min(add_months(m, 1) - dt.timedelta(days=1), P['fin'] if P['estado'] != 'Próximo lanzamiento' else HOY)
        if d1 < d0: continue
        frac_mes = ((d1 - d0).days + 1) / ((add_months(m, 1) - m).days)
        leads_m = total_leads * wm / sw
        for ci, c in enumerate(CANALES):
            g = CFG[c]
            if c == 'LinkedIn' and rnd.random() < 0.55: continue
            if c == 'Portales inmobiliarios' and d0 < lanz - dt.timedelta(days=7): continue
            ld = leads_m * g['share'] * rnd.uniform(0.75, 1.25)
            inv = 0.0
            if c == 'Portales inmobiliarios': inv = g['fee'] * frac_mes * rnd.uniform(0.9, 1.1) + ld * 4
            elif g['cpl']: inv = ld * g['cpl'] * rnd.uniform(0.8, 1.25)
            if c in ('Instagram', 'Facebook', 'LinkedIn'): imp = inv / g['cpm'] * 1000; cli = imp * g['ctr'] * rnd.uniform(0.85, 1.15)
            elif c == 'Google Ads': cli = inv / g['cpc']; imp = cli / g['ctr']
            elif c == 'Portales inmobiliarios': cli = ld / 0.035 * rnd.uniform(0.8, 1.2); imp = cli / g['ctr']
            else: cli = ld / 0.028 * rnd.uniform(0.8, 1.2); imp = 0
            inter = imp * g['inter'] * rnd.uniform(0.8, 1.2)
            posts = round(g['posts'] * frac_mes * rnd.uniform(0.6, 1.3)) if g['posts'] else 0
            camp.append([pi, ci, iso(d0), iso(d1), round(inv), round(imp), round(cli), round(inter), posts, round(ld)])
    # ---- emails
    base = rnd.randint(2500, 6000)
    d = lanz - dt.timedelta(days=rnd.randint(18, 30))
    k = 0
    lastd = P['fin'] if P['estado'] != 'Próximo lanzamiento' else HOY
    while d <= lastd:
        if P['estado'] != 'Próximo lanzamiento' and abs((d - lanz).days) <= 3: d = lanz  # email de lanzamiento el mismo día
        env = round(base * (1 + 0.012 * k) * rnd.uniform(0.95, 1.05))
        op = env * rnd.uniform(0.29, 0.43); cl = op * rnd.uniform(0.07, 0.13)
        asunto = ('Muy pronto: {n}. Apúntate y recibe la información antes que nadie' if d < lanz else ('Ya a la venta: {n}' if d == lanz else rnd.choice(ASUNTOS[1:]))).format(n=nombre)
        emails.append([pi, iso(d), asunto, env, round(op), round(cl), round(env * rnd.uniform(0.001, 0.004)), round(cl * rnd.uniform(0.05, 0.09))])
        k += 1
        d = d + dt.timedelta(days=rnd.randint(16, 28))
    out_promos.append(dict(id=P['id'], promocion=P['promocion'], ciudad=P['ciudad'], provincia=P['provincia'], viviendas=P['viviendas'], entrega=P['entrega'],
                           estado=P['estado'], lanzamiento=iso(lanz), fin=iso(P['fin']), simulada=P['simulada'], tareas=tareas,
                           base_email=base, seguidores_inicio=rnd.randint(300, 900)))

res = dict(hoy=iso(HOY), fuente='Herramienta de marketing (email, redes sociales, anuncios y web). Reservas: sistema de ventas, una vez al día.',
           canales=CANALES, tareas=[dict(t=t, nombre=n, responsable=r, offset=o) for t, n, r, o in TAREAS],
           promociones=out_promos,
           campos_campanas=['promo', 'canal', 'desde', 'hasta', 'inversion', 'impresiones', 'clics', 'interacciones', 'publicaciones', 'contactos'], campanas=camp,
           campos_emails=['promo', 'fecha', 'asunto', 'enviados', 'aperturas', 'clics', 'bajas', 'contactos'], emails=emails)
json.dump(res, open(os.path.join(D, 'marketing.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out_promos), 'promociones', len(camp), 'registros de campaña', len(emails), 'emails', os.path.getsize(os.path.join(D, 'marketing.json')) // 1024, 'KB')
