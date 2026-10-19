# GrupoEne

## Panel de ventas en directo del Grupo Nozar (maqueta)

Maqueta de un panel de ventas para los tres negocios del grupo:

- **Inicio**: facturación y beneficio bruto del grupo y de cada negocio frente al mismo periodo de 2025, facturación mensual y últimos movimientos del día.
- **Inmobiliario**: promociones entregadas y en curso, mapa de España, reservas por mes y detalle de cada vivienda (precio y estado).
- **Balneario de Panticosa**: Gran Hotel y Hotel Continental (ocupación, precio medio, ingresos, personas alojadas, reservas futuras), resultados por restaurante, bar y spa, y lo más vendido de cada carta.
- **Bodegas**: Enate, Laus y Las Moradas de San Martín por separado, con ventas por referencia, por provincia, exportación por país y producto, comparación con años anteriores y venta online, visitas y tienda.

> **Todas las cifras son simuladas.** Los nombres de promociones, ubicaciones, nº de viviendas, referencias de vino y cartas del balneario salen de las webs públicas; algunos precios y promociones son aproximados (lo indica el propio panel).

### Cómo verlo

Hace falta servir la carpeta `dashboard/` (el navegador no deja leer los datos abriendo el archivo directamente):

```bash
cd dashboard
python3 -m http.server 8000
# abrir http://localhost:8000
```

También funciona con GitHub Pages apuntando a la carpeta `dashboard/`.

### Estructura

```
dashboard/
  index.html        página del panel
  app.js            lógica de cada pestaña
  lib.js            gráficos, tablas, mapa y formatos
  dash-shim.js      carga los datos de data/ y gestiona filtros
  vendor/d3.min.js  librería de gráficos (d3 v7, licencia ISC)
  data/*.json       datos simulados
scripts/
  generar_datos.py           genera todos los datos de data/
  generar_productos_hotel.py genera las ventas de las cartas del balneario
```

Para regenerar los datos: `python3 scripts/generar_datos.py && python3 scripts/generar_productos_hotel.py`.

### Pasar a datos reales

Cada archivo de `data/` corresponde a una fuente que en producción vendría de su sistema: el CRM de ventas de viviendas, el programa de reservas y TPV del hotel y el ERP de las bodegas. Basta con que cada sistema exporte un JSON con las mismas columnas.
