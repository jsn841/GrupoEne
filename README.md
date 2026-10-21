# GrupoEne

## Panel de ventas en directo del Grupo Nozar (maqueta)

Maqueta de un panel de ventas para los tres negocios del grupo. Un menú lateral lleva a cada panel (Dashboard General, Inmobiliario, Marketing Inmobiliario, Hoteles y Bodegas) y a la herramienta de Análisis Promociones:

- **Inicio**: facturación y beneficio bruto del grupo y de cada negocio frente al periodo de comparación, progresión por años, facturación del periodo y últimos movimientos del día.
- **Inmobiliario**: promociones entregadas y en curso, mapa de España, reservas por mes y detalle de cada vivienda (precio y estado).
- **Marketing Inmobiliario**: calendario de lanzamiento de cada promoción (renders, ficha en la web, landing page, portales, redes sociales, anuncios, email…) con fecha prevista y real y avisos de lo retrasado; próximos lanzamientos; todas las promociones en el tiempo; inversión, contactos, coste por contacto y reservas del periodo; rendimiento por canal; emails; redes sociales; e histórico de las promociones cerradas. Los datos vendrían de la herramienta de marketing y las reservas del sistema de ventas, así que marketing no necesita licencia de Salesforce.
- **Balneario de Panticosa**: Gran Hotel y Hotel Continental (ocupación, precio medio, ingresos, personas alojadas, reservas futuras), resultados por local, y consumos separados en spa, comida, bebida y punto de venta (tienda): lo más y lo menos vendido, por margen, cuándo se consume por día de la semana y hora, y recomendaciones de stock, turnos y ofertas.
- **Análisis Promociones**: la calculadora de promociones (ver abajo), dentro del panel.
- **Bodegas**: Enate, Laus y Las Moradas de San Martín por separado, con ventas por referencia, por provincia, exportación por país y producto, comparación con años anteriores y venta online, visitas y tienda.

**Filtro de fechas** (arriba de todos los paneles): año en curso (por defecto), trimestre, mes o fechas a elegir; comparado con el mismo periodo del año pasado, el año pasado entero, los mismos días del mes pasado o el mes pasado entero (estas dos, para periodos de un mes o menos); y de 1 a 5 años anteriores en los gráficos y en la progresión por años para ver la progresión. El filtro queda en el enlace, así que se puede compartir. Las cifras salen de series diarias desde enero de 2021 (`dashboard/data/series.json`, creadas con `scripts/generar_series.py` a partir de los datos de `scripts/generar_datos.py`); el panel suma los días del periodo elegido.

> **Todas las cifras son simuladas.** Los nombres de promociones, ubicaciones, nº de viviendas, referencias de vino y cartas del balneario salen de las webs públicas; algunos precios y promociones son aproximados (lo indica el propio panel).

### Cómo verlo

**Publicado:** https://jsn841.github.io/GrupoEne/ (GitHub Pages desde la rama `main`, carpeta raíz; la portada redirige a `dashboard/`).

Todas las páginas llevan `noindex`, para pedir a los buscadores que no las indexen. Ojo: el repositorio es público, así que su código y datos sí se pueden ver en GitHub.

**En local** hace falta servir la carpeta `dashboard/` (el navegador no deja leer los datos abriendo el archivo con doble clic):

```bash
cd dashboard
python3 -m http.server 8000
# abrir http://localhost:8000
```

La cabecera tiene un interruptor de modo día / noche que recuerda la elección en cada navegador; sin elección, sigue el ajuste del dispositivo.

## Calculadora de promociones (versión de prueba)

**Publicada:** https://jsn841.github.io/GrupoEne/calculadora/

Calculadora anónima del estudio económico de una promoción inmobiliaria: se rellenan los datos de la promoción y calcula costes, ingresos, resultado, TIR, VAN y flujo de caja mensual y anual, con descarga en Excel y PDF.

- Repite las fórmulas de un modelo en Excel (`template.json`), sin textos ni datos de ninguna promoción real.
- Cada dato lleva una explicación en lenguaje sencillo y la hoja del Excel de la que sale. Los datos con valores habituales vienen rellenos y marcados con **«Revisar este dato»**.
- Al elegir la comunidad autónoma se rellenan los tipos de AJD (valores orientativos de octubre de 2026).
- También se abre dentro del panel, en «Análisis Promociones» (`calculadora/?embed=1`, que toma el modo día/noche del panel).
- «Mis promociones» enseña cada promoción en una tarjeta (resultado, margen, TIR, evolución de la caja) o en una tabla para compararlas; «Nueva promoción» abre un asistente de tres pasos con una primera estimación.
- Las promociones se guardan **solo en el navegador** de cada usuario (`localStorage`). No hay servidor ni base de datos.
- Trae una promoción de ejemplo con datos inventados.
- Calcula en segundo plano (`worker.js`); `export.js` crea el Excel (sin librerías) y el PDF (con [pdf-lib](https://github.com/Hopding/pdf-lib), licencia MIT, en `vendor/`).

### Estructura

```
index.html          portada: redirige al panel
calculadora/        calculadora de promociones (página estática)
.nojekyll           publica los archivos tal cual en GitHub Pages
dashboard/
  index.html        página del panel
  app.js            lógica de cada pestaña
  lib.js            gráficos, tablas, mapa, selectores y formatos
  dash-shim.js      carga los datos de data/ y gestiona filtros
  theme.js          interruptor de modo día / noche
  logo-nozar.png    logo de la cabecera
  vendor/d3.min.js  librería de gráficos (d3 v7, licencia ISC)
  data/*.json       datos simulados
scripts/
  generar_datos.py           genera todos los datos de data/
  generar_productos_hotel.py genera las ventas de las cartas del balneario
  generar_series.py          series diarias para el filtro de fechas
  generar_consumos.py        tipo de consumo, coste y horario de cada producto del balneario
  generar_marketing.py       datos simulados de la herramienta de marketing
```

Para regenerar los datos: `python3 scripts/generar_datos.py && python3 scripts/generar_productos_hotel.py && python3 scripts/generar_series.py && python3 scripts/generar_consumos.py && python3 scripts/generar_marketing.py` (en ese orden; salen siempre las mismas cifras). Si cambias los datos, sube el número de versión (`VERSION` en `dash-shim.js` y los `?v=` de los `index.html`) para que los navegadores no usen copias antiguas.

### Pasar a datos reales

Cada archivo de `data/` corresponde a una fuente que en producción vendría de su sistema: el CRM de ventas de viviendas, el programa de reservas y TPV del hotel (con la hora de cada ticket), la herramienta de marketing (email, redes y anuncios) y el ERP de las bodegas. Basta con que cada sistema exporte un JSON con las mismas columnas.
