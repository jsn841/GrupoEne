"""Lista de provincias y municipios para la calculadora (calculadora/municipios.js), con el ICIO de los que lo tenemos.

Municipios: códigos del INE vía github.com/frontid/ComunidadesProvinciasPoblaciones (8.131 municipios).
Uso: python3 scripts/generar_municipios.py ruta/a/ComunidadesProvinciasPoblaciones

ICIO (tipo sobre el coste de la obra), valores orientativos consultados el 23/10/2026:
  - municipios de Madrid: ASPRIMA, «Ordenanzas fiscales 2026 · Municipios de la Comunidad de Madrid»;
  - capitales de provincia: Ministerio de Hacienda, consulta de tipos de tributos locales (ICIO, régimen común, 2021).
Hay que comprobarlos en la ordenanza fiscal del ayuntamiento. Navarra y País Vasco tienen régimen foral.
"""
import json, os, sys, unicodedata
src = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'calculadora', 'municipios.js')
CC = {'01': 'andalucia', '02': 'aragon', '03': 'asturias', '04': 'baleares', '05': 'canarias', '06': 'cantabria', '07': 'castilla_leon',
      '08': 'castilla_mancha', '09': 'cataluna', '10': 'valencia', '11': 'extremadura', '12': 'galicia', '13': 'madrid', '14': 'murcia',
      '15': 'navarra', '16': 'pais_vasco', '17': 'rioja', '18': 'ceuta', '19': 'melilla'}
ART = {'A', 'O', 'As', 'Os', 'La', 'Las', 'El', 'Los', 'Les', 'Els', 'Es', 'Sa', 'Ses', 'Lo', 'Los', 'Sant', 'San'}


def nice(s):
    """«Coruña, A» → «A Coruña»; «Rozas de Madrid, Las» → «Las Rozas de Madrid»; «Hospitalet de Llobregat, L'» → «L'Hospitalet…»."""
    if ', ' in s:
        a, b = s.rsplit(', ', 1)
        if b in ART: return f'{b} {a}'
        if b in ("L'", "l'"): return f"{b}{a}"
    return s


def key(s):
    s = nice(s).split('/')[0].strip().lower()
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


prov = json.load(open(os.path.join(src, 'provincias.json')))
mun = json.load(open(os.path.join(src, 'poblaciones.json')))
P = {p['code']: [nice(p['label']), CC[p['parent_code']]] for p in prov}
M = {}
for m in mun: M.setdefault(m['parent_code'], []).append(nice(m['label']))
for k in M: M[k] = sorted(set(M[k]), key=lambda s: key(s))

MAD = '2026 · ASPRIMA, ordenanzas fiscales de la Comunidad de Madrid'
HAC = '2021 · Ministerio de Hacienda, tipos de los tributos locales (capitales de provincia)'
ICIO = [  # provincia, municipio, tipo, fuente
 ('28', 'Madrid', .0375, MAD), ('28', 'Móstoles', .037, MAD), ('28', 'Fuenlabrada', .04, MAD), ('28', 'Alcalá de Henares', .04, MAD),
 ('28', 'Alcobendas', .04, MAD), ('28', 'Torrejón de Ardoz', .04, MAD), ('28', 'Las Rozas de Madrid', .04, MAD), ('28', 'Coslada', .04, MAD),
 ('08', 'Barcelona', .04, HAC), ('46', 'Valencia', .03, HAC), ('41', 'Sevilla', .0325, HAC), ('29', 'Málaga', .038, HAC), ('50', 'Zaragoza', .04, HAC),
 ('15', 'A Coruña', .04, HAC), ('30', 'Murcia', .04, HAC), ('03', 'Alicante', .04, HAC), ('33', 'Oviedo', .04, HAC), ('07', 'Palma', .04, HAC),
 ('47', 'Valladolid', .04, HAC), ('14', 'Córdoba', .0344, HAC), ('18', 'Granada', .04, HAC), ('35', 'Las Palmas de Gran Canaria', .04, HAC),
 ('38', 'Santa Cruz de Tenerife', .018, HAC), ('39', 'Santander', .04, HAC), ('26', 'Logroño', .0307, HAC), ('12', 'Castellón de la Plana', .0325, HAC),
 ('04', 'Almería', .035, HAC), ('21', 'Huelva', .04, HAC), ('11', 'Cádiz', .04, HAC), ('06', 'Badajoz', .04, HAC), ('10', 'Cáceres', .036, HAC),
 ('45', 'Toledo', .0398, HAC), ('19', 'Guadalajara', .034, HAC), ('02', 'Albacete', .0384, HAC), ('37', 'Salamanca', .0375, HAC), ('09', 'Burgos', .033, HAC),
 ('24', 'León', .04, HAC), ('27', 'Lugo', .03, HAC), ('32', 'Ourense', .026, HAC), ('36', 'Pontevedra', .032, HAC), ('43', 'Tarragona', .0307, HAC),
 ('17', 'Girona', .04, HAC), ('25', 'Lleida', .0328, HAC), ('22', 'Huesca', .039, HAC), ('44', 'Teruel', .04, HAC), ('23', 'Jaén', .03, HAC),
]
T = {}
for pc, name, rate, fuente in ICIO:
    hit = [m for m in M[pc] if key(m) == key(name) or key(m).startswith(key(name) + ' ')]
    hit = [m for m in hit if key(m) == key(name)] or hit
    if len(hit) != 1: print('sin coincidencia exacta:', pc, name, hit[:3]); continue
    T[pc + '|' + hit[0]] = [rate, fuente]
data = dict(fuente='Municipios: INE (vía github.com/frontid/ComunidadesProvinciasPoblaciones). ICIO: valores orientativos consultados el 23/10/2026.', prov=P, mun=M, icio=T)
with open(OUT, 'w') as f:
    f.write('// Generado por scripts/generar_municipios.py. Provincias y municipios de España (INE) y ICIO de los que tenemos dato.\n')
    f.write('window.MUNI = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(P), 'provincias ·', sum(len(v) for v in M.values()), 'municipios ·', len(T), 'con ICIO ·', os.path.getsize(OUT) // 1024, 'KB')
