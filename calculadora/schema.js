/* Datos de entrada de la calculadora. Cada campo dice en qué celda del modelo se escribe.
   revisar: true  → viene relleno con un valor habitual y se marca «Revisar este dato».
   def: null      → dato propio de cada promoción: hay que escribirlo.
   help           → explicación en lenguaje sencillo que se ve debajo del dato.
   hoja           → hoja del Excel original donde está el dato (Resumen, Promoción, Ventas) o «modelo»
                    si es un supuesto que el Excel tenía escrito dentro de las fórmulas o en la hoja de caja. */
(function (root) {
  const G = [
    { id: 'ubicacion', title: 'Ubicación', note: 'Obligatorio. La comunidad autónoma pone los impuestos autonómicos y el municipio, el ICIO de su ayuntamiento.' },
    { id: 'suelo', title: 'Suelo', note: 'Compra del solar y gastos de la compra.' },
    { id: 'superficies', title: 'Superficies', note: 'En metros cuadrados construidos, salvo que se diga otra cosa.' },
    { id: 'producto', title: 'Producto y precios de venta', note: 'Unidades a la venta y a qué precio. Todos los precios, sin IVA.' },
    { id: 'cobros', title: 'Cobros a los compradores y préstamo promotor', note: 'Qué parte del precio se cobra en cada momento y cómo se financia la obra.' },
    { id: 'obra', title: 'Coste de la obra', note: 'Lo que cobra la constructora, por metro cuadrado y en partidas sueltas. Sin IVA.' },
    { id: 'plazos', title: 'Plazos', note: 'Calendario de la promoción, contado en meses desde la compra del suelo (mes 1).' },
    { id: 'ventas', title: 'Calendario de ventas', note: 'Cuántas unidades se venden (se firma el contrato de compraventa) cada mes.' },
    { id: 'tributos', title: 'Impuestos y tasas', fijo: 'comunidad', note: 'Se rellenan con la ubicación: los impuestos autonómicos según la comunidad y el ICIO según el municipio, si lo tenemos. La licencia, la plusvalía y la primera ocupación dependen de cada ayuntamiento.' },
    { id: 'notaria', title: 'Notaría, registro y seguros', fijo: 'estandar', note: 'Porcentajes fijos del modelo, iguales para todas las promociones. Se pueden cambiar si hace falta.' },
    { id: 'proyectos', title: 'Proyectos y estudios', fijo: 'estandar', note: 'Honorarios y estudios con los valores fijos del modelo. Se pueden cambiar si hace falta.' },
    { id: 'financieros', title: 'Préstamos y gastos financieros', note: 'Préstamo del suelo, intereses, comisiones y avales.' },
    { id: 'iva', title: 'IVA y retenciones', fijo: 'estandar', note: 'El IVA no es un coste: se paga y se recupera, pero mueve la caja.' },
    { id: 'comercial', title: 'Comercialización y gastos de gestión', note: 'Comisión de venta y gastos de estructura de la empresa.' },
    { id: 'calendario', title: 'Momento de los pagos', fijo: 'financiero', note: 'Cuándo se paga cada gasto. Es un supuesto para el equipo financiero: viene con los valores estándar del modelo.' },
    { id: 'rentabilidad', title: 'Cálculo de la rentabilidad', fijo: 'estandar', note: 'Criterio de la empresa para todas las promociones: menos del 10 % de margen sobre ventas no lo financian los bancos; del 10 % al 12 % es lo normal; desde el 12 % se hace sin mirar.' },
  ];

  // Impuesto de actos jurídicos documentados (AJD), tipo general en escrituras notariales, por comunidad.
  // Valores orientativos consultados el 20/10/2026. Hay que comprobarlos en la normativa de cada comunidad.
  const CCAA = [
    ['andalucia', 'Andalucía', 0.012], ['aragon', 'Aragón', 0.015], ['asturias', 'Asturias', 0.012], ['baleares', 'Illes Balears', 0.015],
    ['canarias', 'Canarias', 0.01, 'En Canarias se aplica el 1 % cuando la operación lleva IGIC.'], ['cantabria', 'Cantabria', 0.015], ['castilla_mancha', 'Castilla-La Mancha', 0.015],
    ['castilla_leon', 'Castilla y León', 0.015], ['cataluna', 'Cataluña', 0.015], ['valencia', 'Comunitat Valenciana', 0.014, 'La Comunitat Valenciana bajó el tipo del 1,5 % al 1,4 % desde el 1 de junio de 2026.'],
    ['extremadura', 'Extremadura', 0.015], ['galicia', 'Galicia', 0.015], ['madrid', 'Comunidad de Madrid', 0.0075], ['murcia', 'Región de Murcia', 0.015],
    ['rioja', 'La Rioja', 0.01], ['navarra', 'Navarra (régimen foral)', 0.005], ['pais_vasco', 'País Vasco (régimen foral)', 0.005],
    ['ceuta', 'Ceuta', 0.005, 'Ceuta y Melilla tienen además una bonificación del 50 % de la cuota.'], ['melilla', 'Melilla', 0.005, 'Ceuta y Melilla tienen además una bonificación del 50 % de la cuota.'],
  ];

  const F = [];
  const add = (group, hoja, list) => list.forEach((f) => F.push({ group, hoja, ...f }));

  add('ubicacion', 'modelo', [
    { id: 'ccaa', label: 'Comunidad autónoma', type: 'select', cell: null, def: null, preset: true, hoja: 'modelo',
      options: [['', 'Elige una comunidad…'], ...CCAA.map(([id, n]) => [id, n])],
      help: 'Al elegirla se rellenan los impuestos autonómicos: el impuesto de actos jurídicos documentados (AJD) de la compra y de la obra nueva con el tipo de esa comunidad, y el AJD de los préstamos a 0 %. Son valores orientativos consultados en octubre de 2026: compruébalos. Es obligatoria: sin ella no se calculan bien los impuestos.' },
    { id: 'provincia', label: 'Provincia', type: 'select', dyn: 'prov', cell: null, def: null, hoja: 'modelo', options: [['', 'Elige una provincia…']],
      help: 'Solo salen las provincias de la comunidad elegida.' },
    { id: 'municipio', label: 'Municipio', type: 'select', dyn: 'mun', cell: null, def: null, hoja: 'modelo', options: [['', 'Elige un municipio…']],
      help: 'El ayuntamiento fija el ICIO, la tasa de licencia, la plusvalía y la licencia de primera ocupación. Si tenemos su ICIO, se rellena solo; si no, compruébalo en su ordenanza fiscal (máximo legal, 4 %).' },
  ]);

  add('suelo', 'Resumen', [
    { id: 'precio_suelo', label: 'Precio de compra del suelo', type: 'eur', cell: 'Resumen!D20', def: null,
      help: 'Lo que se paga por el solar, sin IVA ni gastos. Es la base de los gastos de la compra, del préstamo del suelo y de varios impuestos.' },
    { id: 'fecha_compra', label: 'Fecha de compra del suelo', type: 'date', cell: 'Resumen!F5', def: null,
      help: 'Fecha de la escritura de compra. Es el mes 1 de la promoción: todos los plazos se cuentan desde aquí.' },
    { id: 'vendedor_suelo', label: 'Quién vende el suelo', type: 'select', sup: 'B14', def: 0, revisar: true, hoja: 'modelo',
      options: [[0, 'Una empresa (con IVA)'], [1, 'Un particular (sin IVA)']],
      help: 'Si vende una empresa, el suelo lleva IVA (se paga y luego se recupera) y además el impuesto de actos jurídicos documentados (AJD). Si vende un particular, no hay IVA y se paga el impuesto de transmisiones patrimoniales (ITP), que es más alto y no se recupera: escríbelo en «Impuesto de la compra del suelo», en el grupo de impuestos.' },
    { id: 'forma_pago_suelo', label: 'Forma de pago del suelo', type: 'select', cell: 'Resumen!G22', def: 'b',
      options: [['b', 'Al contado'], ['d', 'Por hitos'], ['c', 'Lineal hasta la entrega de llaves'], ['a', 'Permuta (se paga con viviendas)']],
      help: 'Al contado: todo en la firma. Por hitos: en porcentajes en cuatro momentos. Lineal: a partes iguales cada mes hasta las llaves. Permuta: el dueño del suelo cobra en viviendas, plazas y trasteros terminados en vez de en dinero.' },
    { id: 'hito_compra', label: 'Hitos: al firmar la compraventa', type: 'pct', cell: 'Resumen!C26', def: 1, when: { forma_pago_suelo: 'd' }, help: 'Parte del precio del suelo que se paga en la firma (mes 1). Los cuatro hitos tienen que sumar el 100 %.' },
    { id: 'hito_inicio', label: 'Hitos: al empezar la obra', type: 'pct', cell: 'Resumen!C27', def: 0, when: { forma_pago_suelo: 'd' }, help: 'Parte del precio que se paga el mes en que empieza la obra.' },
    { id: 'hito_cfo', label: 'Hitos: al terminar la obra', type: 'pct', cell: 'Resumen!C28', def: 0, when: { forma_pago_suelo: 'd' }, help: 'Parte del precio que se paga con el certificado final de obra.' },
    { id: 'hito_llaves', label: 'Hitos: en la entrega de llaves', type: 'pct', cell: 'Resumen!C29', def: 0, when: { forma_pago_suelo: 'd' }, help: 'Parte del precio que se paga cuando se entregan las viviendas.' },
    { id: 'pct_permuta_viviendas', label: 'Permuta: parte de lo construido que se entrega al dueño del suelo', type: 'pct', cell: null, def: null, when: { forma_pago_suelo: 'a' }, calc: true,
      help: 'Se calcula solo: precio del suelo dividido entre los ingresos totales. Se aplica a cada producto (viviendas, plazas, trasteros, locales) y se redondea a unidades enteras. En el calendario de ventas pon solo las unidades que se venden; las de la permuta las descuenta el modelo.' },
    { id: 'pct_precom_permuta', label: 'Permuta: unidades ya vendidas antes de empezar', type: 'pct', cell: 'Resumen!R16', def: 0, when: { forma_pago_suelo: 'a' },
      help: 'Parte de las unidades que ya está vendida en precomercialización cuando se firma la permuta. El modelo las cobra en el mes 1. No las pongas también en el calendario de ventas.' },
    { id: 'pct_notaria_suelo', label: 'Notaría de la compra', type: 'pct', cell: 'Promoción!C6', def: 0.0008, revisar: true, hoja: 'Promoción', help: 'Honorarios del notario por la escritura de compra, como porcentaje del precio del suelo.' },
    { id: 'pct_registro_suelo', label: 'Registro de la compra', type: 'pct', cell: 'Promoción!C7', def: 0.00085, revisar: true, hoja: 'Promoción', help: 'Inscripción de la compra en el Registro de la Propiedad, como porcentaje del precio del suelo.' },
    { id: 'pct_intermediacion', label: 'Comisión de intermediación', type: 'pct', cell: 'Promoción!C8', def: 0, revisar: true, hoja: 'Promoción', help: 'Comisión de la agencia o intermediario que ha conseguido el suelo, sobre su precio. Déjalo a 0 si no hay intermediario.' },
  ]);
  add('superficies', 'Resumen', [
    { id: 'edif_residencial', label: 'Edificabilidad residencial', type: 'm2', sup: 'B2', def: null, hoja: 'modelo', help: 'Metros cuadrados de vivienda que permite construir la normativa urbanística en el solar. Sirve para calcular el precio del suelo por m² edificable (repercusión del suelo).' },
    { id: 'edif_comercial', label: 'Edificabilidad comercial (locales)', type: 'm2', sup: 'B3', def: 0, hoja: 'modelo', help: 'Metros cuadrados de uso comercial que permite construir la normativa. 0 si no hay locales.' },
    { id: 'sup_viviendas', label: 'Superficie construida de viviendas', type: 'm2', sup: 'B4', def: null, hoja: 'modelo', help: 'Metros cuadrados construidos de todas las viviendas juntas. Es la base del coste de obra de las viviendas y de su precio de venta.' },
    { id: 'pct_sup_extra', label: 'Superficie extra sobre la de viviendas', type: 'pct', cell: 'Resumen!G38', def: 0.1, revisar: true, help: 'Zonas comunes (portales, escaleras, pasillos) que se suman a la superficie de viviendas. Con un 10 %, 1.000 m² de viviendas cuentan como 1.100 m² para la obra y para la venta.' },
    { id: 'sup_local', label: 'Superficie construida de locales', type: 'm2', cell: 'Resumen!D39', def: 0, help: 'Metros construidos de los locales, para calcular su coste de obra.' },
    { id: 'sup_sotano1', label: 'Superficie del sótano 1', type: 'm2', cell: 'Resumen!D40', def: 0, help: 'Metros del primer sótano (garajes y trasteros), para su coste de obra.' },
    { id: 'sup_sotano2', label: 'Superficie del sótano 2', type: 'm2', cell: 'Resumen!D41', def: 0, help: 'Metros del segundo sótano, si lo hay.' },
    { id: 'sup_terrazas', label: 'Superficie de terrazas', type: 'm2', cell: 'Resumen!D43', def: 0, help: 'Metros de terrazas, que se construyen a un precio distinto.' },
  ]);
  add('producto', 'Resumen', [
    { id: 'n_viviendas', label: 'Número de viviendas', type: 'int', cell: 'Resumen!K5', def: null, help: 'Total de viviendas de la promoción. Se usa para varios gastos por vivienda (acometidas, imprevistos, cocinas).' },
    { id: 'precio_m2_viv', label: 'Precio de venta de las viviendas', type: 'eur_m2', cell: 'Resumen!M5', def: null, help: 'Precio medio de venta por m² construido, sin IVA. Se multiplica por la superficie de viviendas más la superficie extra.' },
    { id: 'n_garajes1', label: 'Primeras plazas de garaje', type: 'int', cell: 'Resumen!K6', def: null, sync: 'n_viviendas', revisar: true, help: 'Plazas que van con cada vivienda. Si lo dejas vacío, es una por vivienda. Su precio va incluido en el de la vivienda.' },
    { id: 'precio_garaje1', label: 'Precio de las primeras plazas que superen una por vivienda', type: 'eur', cell: 'Resumen!N6', def: 0, revisar: true, help: 'Solo se cobra por las primeras plazas que pasen de una por vivienda. Si hay una por vivienda, este precio no se usa.' },
    { id: 'n_garajes2', label: 'Segundas plazas de garaje', type: 'int', cell: 'Resumen!K7', def: 0, help: 'Plazas que se venden aparte, además de la incluida con la vivienda.' },
    { id: 'precio_garaje2', label: 'Precio de cada segunda plaza', type: 'eur', cell: 'Resumen!M7', def: 0, help: 'Precio de venta de cada segunda plaza, sin IVA.' },
    { id: 'n_trasteros', label: 'Trasteros', type: 'int', cell: 'Resumen!K8', def: null, sync: 'n_viviendas', revisar: true, help: 'Número de trasteros. Si lo dejas vacío, es uno por vivienda.' },
    { id: 'precio_trastero', label: 'Precio de cada trastero', type: 'eur', cell: 'Resumen!N8', def: 0, revisar: true, help: 'Precio de venta de cada trastero, sin IVA. Déjalo a 0 si va incluido en el precio de la vivienda.' },
    { id: 'n_aportacion', label: 'Viviendas en aportación', type: 'int', cell: 'Resumen!K9', def: 0, help: 'Viviendas con un precio fijo por unidad, aparte de las demás (por ejemplo, las comprometidas con quien aporta el suelo). Cuentan como ingresos.' },
    { id: 'precio_aportacion', label: 'Precio de cada vivienda en aportación', type: 'eur', cell: 'Resumen!N9', def: 0, help: 'Precio fijo de cada vivienda en aportación, sin IVA.' },
    { id: 'n_locales', label: 'Número de locales', type: 'int', cell: 'Resumen!K10', def: 0, help: 'Locales comerciales a la venta.' },
    { id: 'sup_locales_venta', label: 'Superficie de los locales a la venta', type: 'm2', cell: 'Resumen!N10', def: 0, help: 'Metros de locales que se venden; se multiplican por el precio por m².' },
    { id: 'precio_m2_local', label: 'Precio de venta de los locales', type: 'eur_m2', cell: 'Resumen!M10', def: 0, help: 'Precio por m² de los locales, sin IVA.' },
  ]);
  add('cobros', 'Resumen', [
    { id: 'cobro_contrato', label: 'Se cobra al firmar el contrato', type: 'pct', cell: 'Resumen!P5', def: 0.1, revisar: true, help: 'Entrega a cuenta que paga el comprador al firmar el contrato privado, en el mes en que compra. Los tres porcentajes de cobro tienen que sumar el 100 %.' },
    { id: 'cobro_obra', label: 'Se cobra en la entrega de llaves (hipoteca del comprador)', type: 'pct', cell: 'Resumen!Q5', def: 0.8, revisar: true, help: 'Parte del precio que el comprador paga al escriturar, normalmente con su hipoteca o subrogándose en el préstamo promotor.' },
    { id: 'cobro_llaves', label: 'Se cobra en mensualidades hasta la entrega', type: 'pct', cell: 'Resumen!R5', def: 0.1, revisar: true, help: 'Parte del precio que el comprador paga en cuotas mensuales iguales desde que compra hasta la entrega de llaves. Si compra después de las llaves, la paga entera en el mes de compra.' },
    { id: 'pct_prestamo_promotor', label: 'Préstamo promotor sobre las ventas', type: 'pct', cell: 'Resumen!T5', def: 0.8, revisar: true, help: 'El banco presta este porcentaje del valor de venta para pagar la obra. Con un 80 % y 10 M€ de ventas, el préstamo es de 8 M€. Lo devuelven los compradores al subrogarse o con lo que pagan en la entrega.' },
    { id: 'interes_promotor', label: 'Interés anual del préstamo promotor', type: 'pct', cell: 'Resumen!U5', def: 0.05, revisar: true, help: 'Tipo de interés anual (euríbor más diferencial). Se paga cada mes sobre lo que ya se ha sacado del préstamo.' },
    { id: 'prestamo_disp_obra', label: 'Préstamo promotor que se dispone durante la obra', type: 'pct', cell: 'Resumen!W4', def: 0.9, revisar: true, help: 'El banco va entregando el préstamo según avanza la obra, hasta este porcentaje. El resto lo entrega al final, con la obra terminada.' },
  ]);
  add('obra', 'Resumen', [
    { id: 'coste_m2_viv', label: 'Coste de obra de las viviendas', type: 'eur_m2', cell: 'Resumen!C38', def: null, help: 'Precio de la constructora por m² construido de vivienda (incluida la superficie extra), con su beneficio y gastos generales, sin IVA.' },
    { id: 'coste_m2_local', label: 'Coste de obra de los locales', type: 'eur_m2', cell: 'Resumen!C39', def: 0, help: 'Precio por m² de los locales (suelen entregarse sin acabar).' },
    { id: 'coste_m2_sot1', label: 'Coste de obra del sótano 1', type: 'eur_m2', cell: 'Resumen!C40', def: 0, help: 'Precio por m² del primer sótano.' },
    { id: 'coste_m2_sot2', label: 'Coste de obra del sótano 2', type: 'eur_m2', cell: 'Resumen!C41', def: 0, help: 'Precio por m² del segundo sótano (suele ser más caro por la excavación).' },
    { id: 'coste_m2_terrazas', label: 'Coste de obra de las terrazas', type: 'eur_m2', cell: 'Resumen!C43', def: 0, help: 'Precio por m² de las terrazas.' },
    { id: 'coste_cocinas', label: 'Cocinas y equipamiento, por unidad', type: 'eur', cell: 'Resumen!C42', def: 0, help: 'Coste de amueblar y equipar cada cocina. Se multiplica por el número de viviendas más las unidades extra. No cuenta para el PEM.' },
    { id: 'n_cocinas_extra', label: 'Unidades de equipamiento además de una por vivienda', type: 'int', sup: 'B7', def: 0, revisar: true, hoja: 'modelo', help: 'Cocinas o equipamientos de zonas comunes (por ejemplo, una gastroteca o un gimnasio). El Excel las tenía escritas dentro de la fórmula.' },
    { id: 'coste_demolicion', label: 'Demolición y tala', type: 'eur', cell: 'Resumen!E44', def: 0, help: 'Importe total para derribar lo que haya en el solar y talar árboles.' },
    { id: 'coste_urbanizacion', label: 'Urbanización exterior y dirección de obra', type: 'eur', cell: 'Resumen!E45', def: 0, help: 'Importe total de aceras, accesos y conexiones fuera de la parcela.' },
    { id: 'pct_otros_obra', label: 'Otros (piscina, pádel, urbanización interior)', type: 'pct', cell: 'Promoción!C78', def: 0.025, revisar: true, hoja: 'Promoción', help: 'Zonas comunes de la urbanización, como porcentaje de todo lo anterior de obra.' },
    { id: 'pct_imprevistos_obra', label: 'Imprevistos de obra', type: 'pct', cell: 'Promoción!C79', def: 0.03, revisar: true, hoja: 'Promoción', help: 'Colchón para cambios y sorpresas en la obra, sobre el total de la obra.' },
    { id: 'pct_bi', label: 'Gastos generales y beneficio de la constructora', type: 'pct', cell: 'Promoción!D48', def: 0.19, revisar: true, hoja: 'Promoción', help: 'Parte del precio de la constructora que es su beneficio y sus gastos generales. Se quita para obtener el presupuesto de ejecución material (PEM), que es la base de la licencia, el ICIO, los seguros y los honorarios. El 19 % habitual es un 13 % de gastos generales más un 6 % de beneficio.' },
  ]);
  add('plazos', 'Resumen', [
    { id: 'meses_inicio', label: 'Meses desde la compra hasta empezar la obra', type: 'select', cell: 'Resumen!B35', def: 2, revisar: true, options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) => [x, x + ' meses']),
      help: 'Tiempo para tener el proyecto y la licencia de obra. Con 2 meses, la obra empieza en el mes 3.' },
    { id: 'meses_obra', label: 'Duración de la obra', type: 'select', cell: 'Resumen!C35', def: 24, revisar: true, options: Array.from({ length: 31 }, (_, i) => [18 + i, 18 + i + ' meses']),
      help: 'Meses desde el inicio de la obra hasta el certificado final de obra. Afecta al reparto del coste de obra y a los intereses.' },
    { id: 'pago_constructora', label: 'Plazo de pago a la constructora', type: 'select', cell: 'Resumen!D35', def: 90, revisar: true, options: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150].map((x) => [x, x + ' días']),
      help: 'Días que pasan desde que la constructora certifica la obra de un mes hasta que se le paga. Con 90 días, la obra de enero se paga en abril. Retrasar los pagos mejora la caja.' },
    { id: 'meses_llaves', label: 'Meses desde el fin de obra hasta las llaves', type: 'select', cell: 'Resumen!E35', def: 3, revisar: true, options: [1, 2, 3, 4, 5].map((x) => [x, x + (x === 1 ? ' mes' : ' meses')]),
      help: 'Tiempo para la licencia de primera ocupación y las escrituras. En la entrega de llaves se cobra la mayor parte del precio.' },
    { id: 'reparto_obra', label: 'Reparto del coste de obra cada mes', type: 'select', sup: 'B8', def: 0, hoja: 'modelo', options: [[0, 'A partes iguales'], [1, 'Según una curva propia']],
      help: 'A partes iguales: el mismo importe cada mes de obra. Curva propia: escribes qué porcentaje de la obra se hace cada mes (normalmente, poco al principio y al final y más en el centro).' },
    { id: 'curva_obra', label: 'Curva de obra: porcentaje de cada mes', type: 'curve', row: 'CF!106', def: null, when: { reparto_obra: 1 }, hoja: 'modelo',
      help: 'Un porcentaje por cada mes de obra; tiene que sumar el 100 %. El botón «Curva en S» rellena una curva típica.' },
  ]);
  add('ventas', 'Ventas', [
    { id: 'plan_ventas', label: 'Unidades vendidas cada mes', type: 'salesplan', def: null,
      help: 'Cuántos contratos de compraventa se firman cada mes de cada producto. El mes de venta marca cuándo se cobra la entrega a cuenta y empiezan las mensualidades. Lo vendido tiene que sumar el total de unidades.',
      rows: [['viviendas', 'Viviendas', 'Ventas!4', 'n_viviendas'], ['garajes1', 'Primeras plazas de garaje', 'Ventas!5', 'n_garajes1'], ['garajes2', 'Segundas plazas de garaje', 'Ventas!6', 'n_garajes2'], ['trasteros', 'Trasteros', 'Ventas!7', 'n_trasteros'], ['aportacion', 'Viviendas en aportación', 'Ventas!8', 'n_aportacion'], ['locales', 'Locales', 'Ventas!9', 'n_locales']] },
  ]);
  add('tributos', 'Promoción', [
    { id: 'pct_tasa_licencia', label: 'Tasa de licencia de obras y demolición', type: 'pct', cell: 'Promoción!C14', def: 0.003, revisar: true, help: 'Tasa municipal por tramitar la licencia de obras, sobre el presupuesto de ejecución material (PEM). La fija cada ayuntamiento. Se paga al pedir la licencia.' },
    { id: 'pct_icio', label: 'Impuesto de construcciones (ICIO)', type: 'pct', cell: 'Promoción!C15', def: 0.0375, revisar: true, help: 'Impuesto municipal sobre el coste de la obra (PEM). Cada ayuntamiento fija su tipo, con un máximo legal del 4 %. Se paga con la licencia.' },
    { id: 'plusvalia', label: 'Plusvalía municipal', type: 'eur', cell: 'Promoción!D16', def: 0, revisar: true, help: 'Impuesto municipal sobre el aumento de valor del suelo (IIVTNU) que paga la promotora como vendedora al vender las viviendas. Importe total en euros; depende del ayuntamiento y del valor catastral del suelo.' },
    { id: 'pct_lpo', label: 'Licencia de primera ocupación', type: 'pct', cell: 'Promoción!C17', def: 0.002, revisar: true, help: 'Tasa municipal para poder entregar las viviendas, sobre el PEM. La fija cada ayuntamiento. Se paga en la entrega de llaves.' },
    { id: 'pct_ajd_agrupacion', label: 'AJD: agrupación de fincas', type: 'pct', cell: 'Promoción!C18', def: 0, revisar: true, help: 'Impuesto autonómico de la escritura que junta varias parcelas en una, sobre el precio del suelo. 0 si el solar es una sola finca.' },
    { id: 'pct_ajd_compra', label: 'Impuesto de la compra del suelo (AJD o ITP)', type: 'pct', cell: 'Promoción!C19', def: 0.0075, revisar: true, help: 'Sobre el precio del suelo. Si vende una empresa: actos jurídicos documentados (AJD), entre el 0,5 % y el 1,5 % según la comunidad. Si vende un particular: transmisiones patrimoniales (ITP), entre el 4 % y el 13 % según la comunidad y el importe; escríbelo a mano.' },
    { id: 'pct_ajd_obra_nueva', label: 'AJD: obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C20', def: 0.0075, revisar: true, help: 'Impuesto autonómico de las escrituras que declaran el edificio y lo dividen en viviendas. Como en el Excel original, se aplica dos veces sobre el PEM (una por cada escritura) y una sobre el precio del suelo. Se paga 4 meses antes del fin de obra.' },
    { id: 'pct_ajd_prestamo_suelo', label: 'AJD: préstamo del suelo', type: 'pct', cell: 'Promoción!C21', def: 0.0075, revisar: true, help: 'Desde el 10 de noviembre de 2018 el AJD de los préstamos con hipoteca lo paga el banco (Real Decreto-ley 17/2018), así que lo normal es 0 %. Pon un porcentaje solo si el banco te lo repercute. Se calcula sobre el préstamo por la responsabilidad hipotecaria.' },
    { id: 'pct_ajd_prestamo_promotor', label: 'AJD: préstamo promotor', type: 'pct', cell: 'Promoción!C22', def: 0.0075, revisar: true, help: 'Igual que el anterior: desde 2018 lo paga el banco y lo normal es 0 %. Si lo pones, se calcula sobre el préstamo promotor por la responsabilidad hipotecaria, quitando lo ya pagado por el préstamo del suelo.' },
    { id: 'factor_resp_hip', label: 'Responsabilidad hipotecaria sobre el préstamo', type: 'pct', sup: 'B6', def: 1.36, min: 1, max: 2, revisar: true, hoja: 'modelo', help: 'No es un tipo de impuesto: es cuántas veces el préstamo garantiza la hipoteca (intereses de demora, costas). Lo normal es el 136 %. El AJD de los préstamos se calcula sobre el préstamo por este porcentaje.' },
    { id: 'pct_ajd_distribucion', label: 'AJD: distribución hipotecaria', type: 'pct', cell: 'Promoción!C23', def: 0, revisar: true, help: 'Impuesto de la escritura que reparte el préstamo promotor entre las viviendas para que los compradores puedan subrogarse. Sobre el préstamo promotor. Se paga 3 meses antes del fin de obra.' },
    { id: 'iae_m2', label: 'IAE por metro cuadrado construido', type: 'eur_m2', cell: 'Promoción!C24', def: 3, revisar: true, help: 'Impuesto de actividades económicas de la promotora, en euros por m² construido (viviendas, locales, sótanos y terrazas). Se paga al terminar la obra.' },
  ]);
  add('notaria', 'Promoción', [
    { id: 'pct_not_varios', label: 'Notaría y registro: varios', type: 'pct', cell: 'Promoción!C30', def: 0.001, revisar: true, help: 'Escrituras y gestiones menores durante la promoción, sobre el PEM. Una parte se paga en la compra y el resto durante la obra (ver «Momento de los pagos»).' },
    { id: 'pct_not_obra_nueva', label: 'Notaría de obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C31', def: 0.001, revisar: true, help: 'Notario de las escrituras del edificio, sobre el PEM. Se paga 4 meses antes del fin de obra.' },
    { id: 'pct_reg_obra_nueva', label: 'Registro de obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C32', def: 0.0005, revisar: true, help: 'Inscripción de esas escrituras, sobre el PEM. Se paga 4 meses antes del fin de obra.' },
    { id: 'pct_not_prest_suelo', label: 'Notaría del préstamo del suelo', type: 'pct', cell: 'Promoción!C33', def: 0.001, revisar: true, help: 'Sobre el préstamo del suelo. Se paga con el primer pago del suelo.' },
    { id: 'pct_not_prest_promotor', label: 'Notaría del préstamo promotor', type: 'pct', cell: 'Promoción!C34', def: 0.0003, revisar: true, help: 'Sobre el préstamo promotor. Se paga en la entrega de llaves.' },
    { id: 'pct_reg_prest_suelo', label: 'Registro del préstamo del suelo', type: 'pct', cell: 'Promoción!C35', def: 0.0003, revisar: true, help: 'Sobre el préstamo del suelo. Se paga con el primer pago del suelo.' },
    { id: 'pct_reg_prest_promotor', label: 'Registro del préstamo promotor', type: 'pct', cell: 'Promoción!C36', def: 0.0003, revisar: true, help: 'Sobre el préstamo promotor. Se paga en la entrega de llaves.' },
    { id: 'pct_not_distribucion', label: 'Notaría de la distribución hipotecaria', type: 'pct', cell: 'Promoción!C37', def: 0.0003, revisar: true, help: 'Sobre el préstamo promotor. Se paga 3 meses antes del fin de obra.' },
    { id: 'pct_reg_distribucion', label: 'Registro de la distribución hipotecaria', type: 'pct', cell: 'Promoción!C38', def: 0.0003, revisar: true, help: 'Sobre el préstamo promotor. Se paga 3 meses antes del fin de obra.' },
    { id: 'pct_tasacion_suelo', label: 'Tasación para el préstamo del suelo', type: 'pct', cell: 'Promoción!C39', def: 0.00025, revisar: true, help: 'Informe de valor que pide el banco, sobre el préstamo del suelo. Se paga cuando se firma ese préstamo.' },
    { id: 'pct_tasacion_promotor', label: 'Tasación para el préstamo promotor', type: 'pct', cell: 'Promoción!C40', def: 0.0001, revisar: true, help: 'Sobre el préstamo promotor. Se paga junto con la notaría del préstamo.' },
    { id: 'pct_seguro_rc', label: 'Seguro de responsabilidad civil', type: 'pct', cell: 'Promoción!C41', def: 0.0005, revisar: true, help: 'Cubre daños a terceros durante la obra. Sobre el PEM más el precio del suelo. Se paga con la licencia de obras.' },
    { id: 'pct_seguro_decenal', label: 'Seguro decenal', type: 'pct', cell: 'Promoción!C42', def: 0.0035, revisar: true, help: 'Seguro obligatorio que cubre durante 10 años los daños en la estructura. Sobre el PEM. Una parte se paga al empezar la obra y el resto con el certificado final.' },
    { id: 'pct_seguro_todo_riesgo', label: 'Seguro a todo riesgo de construcción', type: 'pct', cell: 'Promoción!C43', def: 0, revisar: true, help: 'Cubre daños a la propia obra (incendio, robo, lluvias). Sobre el PEM más el suelo. A veces lo paga la constructora: entonces, 0.' },
    { id: 'pct_seguro_afianzamiento', label: 'Seguro de afianzamiento de cantidades', type: 'pct', cell: 'Promoción!C44', def: 0, revisar: true, help: 'Seguro obligatorio que garantiza a los compradores la devolución de lo que pagan antes de la entrega. Sobre las ventas de viviendas, plazas y trasteros. Si se usan avales del banco en su lugar, déjalo a 0.' },
    { id: 'imprevistos_vivienda', label: 'Imprevistos por vivienda', type: 'eur', cell: 'Promoción!C45', def: 300, revisar: true, help: 'Colchón para gastos de notaría y registro no previstos, en euros por vivienda. Se reparte durante la promoción.' },
  ]);
  add('proyectos', 'Promoción', [
    { id: 'pct_arquitecto', label: 'Arquitecto', type: 'pct', cell: 'Promoción!C53', def: 0.0425, revisar: true, help: 'Honorarios del proyecto y de la dirección de obra, sobre el PEM. Se pagan en varios hitos (ver «Momento de los pagos»).' },
    { id: 'pct_aparejador', label: 'Dirección facultativa (aparejador)', type: 'pct', cell: 'Promoción!C54', def: 0.013, revisar: true, help: 'Honorarios del arquitecto técnico que dirige la ejecución, sobre el PEM. Se pagan en los mismos hitos que el arquitecto.' },
    { id: 'proy_reparcelacion', label: 'Proyecto de reparcelación, urbanización y demolición', type: 'eur', cell: 'Promoción!D55', def: 0, help: 'Importe total de estos proyectos, si hacen falta. Se pagan en los mismos hitos que el arquitecto.' },
    { id: 'estudio_topografico', label: 'Estudio topográfico', type: 'eur', cell: 'Promoción!D56', def: 0, revisar: true, help: 'Medición del terreno. Importe total; se paga al empezar la obra.' },
    { id: 'estudio_geotecnico', label: 'Estudio geotécnico', type: 'eur', cell: 'Promoción!D57', def: 10000, revisar: true, help: 'Estudio del terreno para diseñar la cimentación. Importe total; se paga al empezar la obra.' },
    { id: 'coord_seguridad_mes', label: 'Coordinación de seguridad y salud, al mes', type: 'eur', cell: 'Promoción!C58', def: 600, revisar: true, help: 'Técnico obligatorio que controla la seguridad en la obra, en euros al mes. El total se reparte durante la obra.' },
    { id: 'coord_seguridad_meses', label: 'Meses de coordinación de seguridad y salud', type: 'int', sup: 'B5', def: 36, revisar: true, hoja: 'modelo', help: 'Meses que se cobran de coordinación. El Excel tenía 36 escritos en la fórmula; suele ser la duración de la obra más algún mes.' },
    { id: 'pct_supervision', label: 'Supervisión técnica externa (project monitoring)', type: 'pct', cell: 'Promoción!C59', def: 0.028, revisar: true, help: 'Empresa que controla la obra por cuenta de la promotora, sobre el coste de obra sin imprevistos. Se reparte durante la obra.' },
    { id: 'pct_oct', label: 'Organismo de control técnico (OCT)', type: 'pct', cell: 'Promoción!C60', def: 0.0009, revisar: true, help: 'Revisión técnica que exige la aseguradora del seguro decenal, sobre el PEM. Se reparte durante la obra.' },
    { id: 'pct_tecnico_banco', label: 'Técnico del banco', type: 'pct', cell: 'Promoción!C61', def: 0.0025, revisar: true, help: 'Técnico que revisa la obra para el banco antes de cada entrega del préstamo, sobre el PEM. Se paga al terminar la obra.' },
    { id: 'acometidas_vivienda', label: 'Acometidas y centro de transformación, por vivienda', type: 'eur', cell: 'Promoción!C62', def: 2000, revisar: true, help: 'Conexiones de luz, agua y gas y el centro de transformación eléctrico, en euros por vivienda. Se paga al terminar la obra.' },
    { id: 'pct_imprevistos_proy', label: 'Imprevistos de proyectos', type: 'pct', cell: 'Promoción!C63', def: 0.001, revisar: true, help: 'Colchón para honorarios no previstos, sobre el coste de obra. Se reparte durante la obra.' },
  ]);
  add('financieros', 'Resumen', [
    { id: 'pct_prestamo_suelo', label: 'Préstamo del suelo sobre su precio', type: 'pct', cell: 'Resumen!E20', def: 0.5, revisar: true, help: 'Parte del precio del suelo que presta el banco; el resto se paga con dinero propio. Se cancela cuando se firma el préstamo promotor. Con permuta no hay préstamo del suelo.' },
    { id: 'interes_suelo', label: 'Interés anual del préstamo del suelo', type: 'pct', cell: 'Resumen!F20', def: 0.05, revisar: true, help: 'Tipo de interés anual. Se paga cada mes mientras el préstamo está vivo.' },
    { id: 'pct_com_bancaria', label: 'Comisiones bancarias', type: 'pct', cell: 'Promoción!C88', def: 0.0005, revisar: true, hoja: 'Promoción', help: 'Comisiones de mantenimiento y gestión de las cuentas, sobre el préstamo promotor.' },
    { id: 'pct_com_suelo', label: 'Comisión de apertura del préstamo del suelo', type: 'pct', cell: 'Promoción!C89', def: 0.0015, revisar: true, hoja: 'Promoción', help: 'Comisión que cobra el banco al firmar, sobre el precio del suelo (así estaba en el Excel).' },
    { id: 'pct_com_promotor', label: 'Comisión de apertura del préstamo promotor', type: 'pct', cell: 'Promoción!C90', def: 0.0015, revisar: true, hoja: 'Promoción', help: 'Sobre el préstamo promotor, quitando lo ya pagado por la comisión del préstamo del suelo.' },
    { id: 'pct_com_otros', label: 'Comisiones de otros préstamos', type: 'pct', cell: 'Promoción!C91', def: 0, revisar: true, hoja: 'Promoción', help: 'Por si hay otra financiación (por ejemplo, para los locales).' },
    { id: 'pct_avales', label: 'Coste de los avales de las entregas a cuenta', type: 'pct', cell: 'Promoción!C92', def: 0.0225, revisar: true, hoja: 'Promoción', help: 'El banco avala ante los compradores lo que pagan antes de la entrega (es obligatorio). Cobra este porcentaje sobre las cantidades avaladas.' },
    { id: 'pct_descuento_efectos', label: 'Descuento de efectos y remesas', type: 'pct', cell: 'Promoción!C93', def: 0.005, revisar: true, hoja: 'Promoción', help: 'Coste de cobrar a través del banco las mensualidades de los compradores, sobre lo cobrado. La hoja del Excel enseñaba un 0,05 % pero calculaba con un 0,5 %: compruébalo.' },
    { id: 'pct_imprevistos_fin', label: 'Imprevistos financieros', type: 'pct', cell: 'Promoción!C94', def: 0.001, revisar: true, hoja: 'Promoción', help: 'Colchón para gastos financieros no previstos, sobre el préstamo promotor.' },
  ]);
  add('iva', 'modelo', [
    { id: 'iva_general', label: 'IVA general', type: 'pct', sup: 'B9', def: 0.21, revisar: true, help: 'IVA de los gastos que no son obra (suelo comprado a una empresa, honorarios, notaría, comercialización, gestión). Se paga a los proveedores y Hacienda lo devuelve o lo descuenta después.' },
    { id: 'iva_obra', label: 'IVA de la obra', type: 'pct', cell: 'CF!D215', def: 0.1, revisar: true, help: 'IVA de las facturas de la constructora. En obra nueva de viviendas suele ser el 10 %.' },
    { id: 'iva_ventas', label: 'IVA de las ventas', type: 'pct', sup: 'B11', def: 0.1, revisar: true, help: 'IVA que se cobra a los compradores y se entrega a Hacienda, descontando el que se ha pagado. Vivienda nueva: 10 % (4 % si es protegida). El modelo aplica el mismo tipo a todo, también a los locales, que suelen ir al 21 %.' },
    { id: 'pct_control_calidad', label: 'Control de calidad que se descuenta a la constructora', type: 'pct', cell: 'CF!D216', def: 0.01, revisar: true, help: 'Parte de cada factura de la constructora que se queda la promotora para pagar el control de calidad.' },
    { id: 'pct_retencion', label: 'Retención de garantía a la constructora', type: 'pct', cell: 'CF!D217', def: 0.05, revisar: true, help: 'Parte de cada factura que no se paga hasta el final, como garantía de que la constructora repara los defectos. Mejora la caja durante la obra.' },
  ]);
  add('comercial', 'Resumen', [
    { id: 'pct_comercializacion', label: 'Comisión de comercialización', type: 'pct', cell: 'Resumen!O26', def: 0.03, revisar: true, help: 'Lo que cobra la agencia o el equipo comercial por vender, sobre los ingresos.' },
    { id: 'pct_com_contrato', label: 'Parte de la comisión que se paga al firmar el contrato', type: 'pct', cell: 'Resumen!O28', def: 0.2, revisar: true, help: 'Se paga en el mes de cada venta. Las dos partes tienen que sumar el 100 %.' },
    { id: 'pct_com_escritura', label: 'Parte de la comisión que se paga en la escritura', type: 'pct', cell: 'Resumen!O29', def: 0.8, revisar: true, help: 'Se paga en la entrega de llaves, al escriturar.' },
    { id: 'pct_gastos_central', label: 'Gastos de estructura', type: 'pct', cell: 'Resumen!M33', def: 0.03, revisar: true, help: 'Parte de los gastos de la oficina central de la promotora (personal, oficinas) que se carga a esta promoción, sobre los ingresos.' },
    { id: 'pct_contingencia', label: 'Fondo de contingencia', type: 'pct', cell: 'Resumen!N33', def: 0.01, revisar: true, help: 'Colchón general para imprevistos de la promoción, sobre los ingresos.' },
    { id: 'reparto_gestion', label: 'Reparto de los gastos de gestión', type: 'select', cell: 'Resumen!Q34', def: 'A', options: [['A', 'A partes iguales'], ['b', 'Por hitos']], help: 'A partes iguales: lo mismo cada mes hasta la entrega de llaves. Por hitos: en porcentajes en momentos concretos.' },
    { id: 'gest_hito_compra', label: 'Gestión por hitos: compraventa del suelo', type: 'pct', cell: 'Resumen!M36', def: 0, when: { reparto_gestion: 'b' }, help: 'Parte de los gastos de gestión que se paga en la compra del suelo.' },
    { id: 'gest_hito_licencia', label: 'Gestión por hitos: licencia de obras', type: 'pct', cell: 'Resumen!M37', def: 0, when: { reparto_gestion: 'b' }, help: 'Parte que se paga al conseguir la licencia.' },
    { id: 'gest_hito_obra', label: 'Gestión por hitos: durante la obra', type: 'pct', cell: 'Resumen!M38', def: 0, when: { reparto_gestion: 'b' }, help: 'Parte que se reparte durante la obra.' },
    { id: 'gest_hito_cfo', label: 'Gestión por hitos: fin de obra', type: 'pct', cell: 'Resumen!M39', def: 0, when: { reparto_gestion: 'b' }, help: 'Parte que se paga al terminar la obra. Lo que falte hasta el 100 % se paga en la entrega de llaves.' },
  ]);
  add('calendario', 'modelo', [
    { id: 'pago_plusvalia_licencia', label: 'Plusvalía que se paga con la licencia', type: 'pct', cell: 'CF!B40', def: 0.2, revisar: true, help: 'Parte de la plusvalía municipal que se paga al conseguir la licencia de obras. El resto, en la entrega de llaves.' },
    { id: 'pago_notaria_compra', label: 'Notaría «varios» que se paga en la compra', type: 'pct', cell: 'CF!B55', def: 0.25, revisar: true, help: 'Parte de los gastos de notaría «varios» que se paga en la compra del suelo. El resto, repartido durante la obra.' },
    { id: 'pago_decenal_inicio', label: 'Seguro decenal que se paga al empezar la obra', type: 'pct', cell: 'CF!B73', def: 0.25, revisar: true, help: 'El resto se paga con el certificado final de obra.' },
    { id: 'pago_afianz_ventas', label: 'Afianzamiento que se paga con cada venta', type: 'pct', cell: 'CF!B76', def: 0.15, revisar: true, help: 'Parte del seguro de afianzamiento que se paga al vender. El resto, en cuatro pagos anuales iguales (meses 1, 13, 25 y 37).' },
    { id: 'arq_anteproyecto', label: 'Arquitecto: anteproyecto (en la compra)', type: 'pct', cell: 'CF!D87', def: 0, revisar: true, help: 'Parte de los honorarios del arquitecto (y del aparejador y los proyectos) que se paga en la compra. Los siete hitos del arquitecto tienen que sumar el 100 %.' },
    { id: 'arq_basico', label: 'Arquitecto: proyecto básico y planos', type: 'pct', cell: 'CF!D88', def: 0.1, revisar: true, help: 'Parte que se paga con el proyecto básico.' },
    { id: 'arq_ejecucion', label: 'Arquitecto: proyecto de ejecución', type: 'pct', cell: 'CF!D89', def: 0, revisar: true, help: 'Parte que se paga con el proyecto de ejecución.' },
    { id: 'arq_licencia', label: 'Arquitecto: licencia de obra', type: 'pct', cell: 'CF!D90', def: 0.2, revisar: true, help: 'Parte que se paga al conseguir la licencia.' },
    { id: 'arq_obra', label: 'Arquitecto: durante la obra', type: 'pct', cell: 'CF!D91', def: 0.2, revisar: true, help: 'Parte que se reparte durante la obra.' },
    { id: 'arq_cfo', label: 'Arquitecto: certificado final de obra', type: 'pct', cell: 'CF!D92', def: 0.25, revisar: true, help: 'Parte que se paga con el certificado final de obra.' },
    { id: 'arq_cedula', label: 'Arquitecto: cédula de habitabilidad', type: 'pct', cell: 'CF!D93', def: 0.25, revisar: true, help: 'Parte que se paga con la licencia de primera ocupación.' },
  ]);
  add('rentabilidad', 'modelo', [
    { id: 'margen_minimo', label: 'Margen mínimo: por debajo no financian los bancos', type: 'pct', cell: null, def: 0.10, revisar: true,
      help: 'Margen sobre ventas (beneficio antes de impuestos entre ingresos). Con menos del 10 % los bancos no dan el préstamo promotor, así que la operación no se hace. No cambia ningún cálculo: el resumen dice en qué tramo cae la promoción.' },
    { id: 'margen_holgado', label: 'Margen a partir del cual se hace sin mirar', type: 'pct', cell: null, def: 0.12, revisar: true,
      help: 'Entre el mínimo (10 %) y este margen (12 %) es lo normal: se estudia como cualquier operación. A partir del 12 %, la operación se hace sin más vueltas.' },
    { id: 'tasa_van', label: 'Tasa de descuento para la VAN', type: 'pct', sup: 'B12', def: 0.05, revisar: true,
      help: 'Rentabilidad mínima que se pide al dinero, al año. La VAN (valor actual neto) dice cuánto vale hoy el beneficio futuro descontado a esta tasa: si sale positiva, la promoción rinde más que esa tasa. El Excel usaba un 5 % fijo.' },
  ]);

  // Los grupos fijos (estándar del modelo o según la comunidad) no piden revisión: vienen ya bien
  const FIJOS = new Set(G.filter((g) => g.fijo).map((g) => g.id));
  for (const f of F) if (FIJOS.has(f.group)) f.revisar = false;
  const SCHEMA = { groups: G, fields: F, months: 84, version: 4, CCAA };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCHEMA; else root.SCHEMA = SCHEMA;
})(typeof window !== 'undefined' ? window : globalThis);
