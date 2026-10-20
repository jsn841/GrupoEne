/* Datos de entrada de la calculadora. Cada campo dice en qué celda del modelo se escribe.
   revisar: true  → viene relleno con un valor habitual y se marca «Revisar este dato».
   def: null      → dato propio de cada promoción: hay que escribirlo. */
(function (root) {
  const G = [
    { id: 'suelo', title: 'Suelo', note: 'Compra del solar y gastos de la compra.' },
    { id: 'superficies', title: 'Superficies', note: 'En metros cuadrados.' },
    { id: 'producto', title: 'Producto y precios de venta', note: 'Unidades a la venta y a qué precio.' },
    { id: 'cobros', title: 'Cobros a los compradores y préstamo promotor', note: 'Qué parte del precio se cobra en cada momento y cómo se financia la obra.' },
    { id: 'obra', title: 'Coste de la obra', note: 'Precio de construcción por metro cuadrado y partidas sueltas.' },
    { id: 'plazos', title: 'Plazos', note: 'Calendario de la promoción, contado en meses desde la compra del suelo.' },
    { id: 'ventas', title: 'Calendario de ventas', note: 'Cuántas unidades se venden cada mes.' },
    { id: 'tributos', title: 'Impuestos y tasas', note: 'Porcentajes sobre el presupuesto de obra (PEM), el suelo o los préstamos.' },
    { id: 'notaria', title: 'Notaría, registro y seguros', note: 'Porcentajes sobre el presupuesto de obra, el suelo o los préstamos.' },
    { id: 'proyectos', title: 'Proyectos y estudios', note: 'Honorarios técnicos y estudios previos.' },
    { id: 'financieros', title: 'Préstamos y gastos financieros', note: 'Préstamo del suelo, intereses, comisiones y avales.' },
    { id: 'iva', title: 'IVA y retenciones', note: 'Tipos de IVA y retenciones a la constructora.' },
    { id: 'comercial', title: 'Comercialización y gastos de gestión', note: 'Comisión de venta y gastos de estructura.' },
    { id: 'calendario', title: 'Momento de los pagos', note: 'En qué momento de la promoción se paga cada gasto.' },
  ];
  const F = [];
  const add = (group, list) => list.forEach((f) => F.push({ group, ...f }));

  add('suelo', [
    { id: 'precio_suelo', label: 'Precio de compra del suelo', type: 'eur', cell: 'Resumen!D20', def: null },
    { id: 'fecha_compra', label: 'Fecha de compra del suelo', type: 'date', cell: 'Resumen!F5', def: null, help: 'Es el mes 1 de la promoción.' },
    { id: 'forma_pago_suelo', label: 'Forma de pago del suelo', type: 'select', cell: 'Resumen!G22', def: 'b',
      options: [['b', 'Al contado'], ['d', 'Por hitos'], ['c', 'Lineal hasta la entrega de llaves'], ['a', 'Permuta (se paga con viviendas)']] },
    { id: 'hito_compra', label: 'Hitos: al firmar la compraventa', type: 'pct', cell: 'Resumen!C26', def: 1, when: { forma_pago_suelo: 'd' } },
    { id: 'hito_inicio', label: 'Hitos: al empezar la obra', type: 'pct', cell: 'Resumen!C27', def: 0, when: { forma_pago_suelo: 'd' } },
    { id: 'hito_cfo', label: 'Hitos: al terminar la obra', type: 'pct', cell: 'Resumen!C28', def: 0, when: { forma_pago_suelo: 'd' } },
    { id: 'hito_llaves', label: 'Hitos: en la entrega de llaves', type: 'pct', cell: 'Resumen!C29', def: 0, when: { forma_pago_suelo: 'd' } },
    { id: 'pct_permuta_viviendas', label: 'Permuta: viviendas a entregar al dueño del suelo', type: 'pct', cell: null, def: null, when: { forma_pago_suelo: 'a' }, calc: true,
      help: 'Se calcula solo: precio del suelo dividido entre los ingresos totales. En el calendario de ventas pon solo las unidades que se venden; las de la permuta las descuenta el modelo.' },
    { id: 'pct_notaria_suelo', label: 'Notaría de la compra', type: 'pct', cell: 'Promoción!C6', def: 0.0008, revisar: true, help: 'Sobre el precio del suelo.' },
    { id: 'pct_registro_suelo', label: 'Registro de la compra', type: 'pct', cell: 'Promoción!C7', def: 0.00085, revisar: true, help: 'Sobre el precio del suelo.' },
    { id: 'pct_intermediacion', label: 'Comisión de intermediación', type: 'pct', cell: 'Promoción!C8', def: 0, revisar: true, help: 'Sobre el precio del suelo. Déjalo a 0 si no hay intermediario.' },
  ]);
  add('superficies', [
    { id: 'edif_residencial', label: 'Edificabilidad residencial', type: 'm2', sup: 'B2', def: null },
    { id: 'edif_comercial', label: 'Edificabilidad comercial (locales)', type: 'm2', sup: 'B3', def: 0 },
    { id: 'sup_viviendas', label: 'Superficie construida de viviendas', type: 'm2', sup: 'B4', def: null, help: 'Base para el coste de obra y para el precio de venta por m².' },
    { id: 'pct_sup_extra', label: 'Superficie construida extra sobre la anterior', type: 'pct', cell: 'Resumen!G38', def: 0.1, revisar: true, help: 'Zonas comunes y elementos que se suman a la superficie de las viviendas.' },
    { id: 'sup_local', label: 'Superficie construida de locales', type: 'm2', cell: 'Resumen!D39', def: 0 },
    { id: 'sup_sotano1', label: 'Superficie del sótano 1', type: 'm2', cell: 'Resumen!D40', def: 0 },
    { id: 'sup_sotano2', label: 'Superficie del sótano 2', type: 'm2', cell: 'Resumen!D41', def: 0 },
    { id: 'sup_terrazas', label: 'Superficie de terrazas', type: 'm2', cell: 'Resumen!D43', def: 0 },
  ]);
  add('producto', [
    { id: 'n_viviendas', label: 'Número de viviendas', type: 'int', cell: 'Resumen!K5', def: null },
    { id: 'precio_m2_viv', label: 'Precio de venta de las viviendas', type: 'eur_m2', cell: 'Resumen!M5', def: null, help: 'Se aplica a la superficie construida de viviendas más la extra.' },
    { id: 'n_garajes1', label: 'Primeras plazas de garaje', type: 'int', cell: 'Resumen!K6', def: null, sync: 'n_viviendas', revisar: true, help: 'Una por vivienda, incluidas en su precio.' },
    { id: 'precio_garaje1', label: 'Precio de las primeras plazas que superen una por vivienda', type: 'eur', cell: 'Resumen!N6', def: 0, revisar: true },
    { id: 'n_garajes2', label: 'Segundas plazas de garaje', type: 'int', cell: 'Resumen!K7', def: 0 },
    { id: 'precio_garaje2', label: 'Precio de cada segunda plaza', type: 'eur', cell: 'Resumen!M7', def: 0 },
    { id: 'n_trasteros', label: 'Trasteros', type: 'int', cell: 'Resumen!K8', def: null, sync: 'n_viviendas', revisar: true },
    { id: 'precio_trastero', label: 'Precio de cada trastero', type: 'eur', cell: 'Resumen!N8', def: 0, revisar: true, help: 'Déjalo a 0 si va incluido en el precio de la vivienda.' },
    { id: 'n_aportacion', label: 'Viviendas en aportación', type: 'int', cell: 'Resumen!K9', def: 0, help: 'Viviendas con un precio fijo por unidad, aparte de las demás. Cuentan como ingresos.' },
    { id: 'precio_aportacion', label: 'Precio de cada vivienda en aportación', type: 'eur', cell: 'Resumen!N9', def: 0 },
    { id: 'n_locales', label: 'Número de locales', type: 'int', cell: 'Resumen!K10', def: 0 },
    { id: 'sup_locales_venta', label: 'Superficie de los locales a la venta', type: 'm2', cell: 'Resumen!N10', def: 0 },
    { id: 'precio_m2_local', label: 'Precio de venta de los locales', type: 'eur_m2', cell: 'Resumen!M10', def: 0 },
  ]);
  add('cobros', [
    { id: 'cobro_contrato', label: 'Se cobra al firmar el contrato', type: 'pct', cell: 'Resumen!P5', def: 0.1, revisar: true },
    { id: 'cobro_obra', label: 'Se cobra durante la obra (mensualidades)', type: 'pct', cell: 'Resumen!Q5', def: 0.8, revisar: true, help: 'En el modelo, esta parte la cubre la hipoteca del comprador en la entrega.' },
    { id: 'cobro_llaves', label: 'Se cobra en la entrega de llaves', type: 'pct', cell: 'Resumen!R5', def: 0.1, revisar: true },
    { id: 'pct_prestamo_promotor', label: 'Préstamo promotor sobre las ventas', type: 'pct', cell: 'Resumen!T5', def: 0.8, revisar: true },
    { id: 'interes_promotor', label: 'Interés anual del préstamo promotor', type: 'pct', cell: 'Resumen!U5', def: 0.05, revisar: true },
    { id: 'prestamo_disp_obra', label: 'Préstamo promotor que se dispone durante la obra', type: 'pct', cell: 'Resumen!W4', def: 0.9, revisar: true, help: 'El resto se dispone al final.' },
  ]);
  add('obra', [
    { id: 'coste_m2_viv', label: 'Coste de obra de las viviendas', type: 'eur_m2', cell: 'Resumen!C38', def: null },
    { id: 'coste_m2_local', label: 'Coste de obra de los locales', type: 'eur_m2', cell: 'Resumen!C39', def: 0 },
    { id: 'coste_m2_sot1', label: 'Coste de obra del sótano 1', type: 'eur_m2', cell: 'Resumen!C40', def: 0 },
    { id: 'coste_m2_sot2', label: 'Coste de obra del sótano 2', type: 'eur_m2', cell: 'Resumen!C41', def: 0 },
    { id: 'coste_m2_terrazas', label: 'Coste de obra de las terrazas', type: 'eur_m2', cell: 'Resumen!C43', def: 0 },
    { id: 'coste_cocinas', label: 'Cocinas y equipamiento, por unidad', type: 'eur', cell: 'Resumen!C42', def: 0 },
    { id: 'n_cocinas_extra', label: 'Unidades de equipamiento además de una por vivienda', type: 'int', sup: 'B7', def: 0, revisar: true, help: 'Por ejemplo, la cocina de una gastroteca o un gimnasio.' },
    { id: 'coste_demolicion', label: 'Demolición y tala', type: 'eur', cell: 'Resumen!E44', def: 0 },
    { id: 'coste_urbanizacion', label: 'Urbanización exterior y dirección de obra', type: 'eur', cell: 'Resumen!E45', def: 0 },
    { id: 'pct_otros_obra', label: 'Otros (piscina, pádel, urbanización interior)', type: 'pct', cell: 'Promoción!C78', def: 0.025, revisar: true, help: 'Sobre el resto de la obra.' },
    { id: 'pct_imprevistos_obra', label: 'Imprevistos de obra', type: 'pct', cell: 'Promoción!C79', def: 0.03, revisar: true },
    { id: 'pct_bi', label: 'Gastos generales y beneficio de la constructora', type: 'pct', cell: 'Promoción!D48', def: 0.19, revisar: true, help: 'Se descuenta para obtener el presupuesto de ejecución material (PEM), base de tasas y honorarios.' },
  ]);
  add('plazos', [
    { id: 'meses_inicio', label: 'Meses desde la compra hasta empezar la obra', type: 'select', cell: 'Resumen!B35', def: 2, revisar: true, options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) => [x, x + ' meses']) },
    { id: 'meses_obra', label: 'Duración de la obra', type: 'select', cell: 'Resumen!C35', def: 24, revisar: true, options: Array.from({ length: 31 }, (_, i) => [18 + i, 18 + i + ' meses']) },
    { id: 'pago_constructora', label: 'Plazo de pago a la constructora', type: 'select', cell: 'Resumen!D35', def: 90, revisar: true, options: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150].map((x) => [x, x + ' días']) },
    { id: 'meses_llaves', label: 'Meses desde el fin de obra hasta las llaves', type: 'select', cell: 'Resumen!E35', def: 3, revisar: true, options: [1, 2, 3, 4, 5].map((x) => [x, x + (x === 1 ? ' mes' : ' meses')]) },
    { id: 'reparto_obra', label: 'Reparto del coste de obra cada mes', type: 'select', sup: 'B8', def: 0, options: [[0, 'A partes iguales'], [1, 'Según una curva propia']] },
    { id: 'curva_obra', label: 'Curva de obra: porcentaje de cada mes', type: 'curve', row: 'CF!106', def: null, when: { reparto_obra: 1 }, help: 'Un porcentaje por mes de obra; tiene que sumar el 100 %.' },
  ]);
  add('ventas', [
    { id: 'plan_ventas', label: 'Unidades vendidas cada mes', type: 'salesplan', def: null,
      rows: [['viviendas', 'Viviendas', 'Ventas!4', 'n_viviendas'], ['garajes1', 'Primeras plazas de garaje', 'Ventas!5', 'n_garajes1'], ['garajes2', 'Segundas plazas de garaje', 'Ventas!6', 'n_garajes2'], ['trasteros', 'Trasteros', 'Ventas!7', 'n_trasteros'], ['aportacion', 'Viviendas en aportación', 'Ventas!8', 'n_aportacion'], ['locales', 'Locales', 'Ventas!9', 'n_locales']] },
  ]);
  add('tributos', [
    { id: 'pct_tasa_licencia', label: 'Tasa de licencia de obras y demolición', type: 'pct', cell: 'Promoción!C14', def: 0.003, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_icio', label: 'Impuesto de construcciones (ICIO)', type: 'pct', cell: 'Promoción!C15', def: 0.0375, revisar: true, help: 'Sobre el PEM. Depende del municipio.' },
    { id: 'plusvalia', label: 'Otras tasas e impuestos (plusvalía municipal)', type: 'eur', cell: 'Promoción!D16', def: 0, revisar: true },
    { id: 'pct_lpo', label: 'Licencia de primera ocupación', type: 'pct', cell: 'Promoción!C17', def: 0.002, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_ajd_agrupacion', label: 'Actos jurídicos documentados (AJD): agrupación', type: 'pct', cell: 'Promoción!C18', def: 0, revisar: true, help: 'Sobre el precio del suelo.' },
    { id: 'pct_ajd_compra', label: 'AJD: compraventa del suelo', type: 'pct', cell: 'Promoción!C19', def: 0.0075, revisar: true, help: 'Sobre el precio del suelo. Depende de la comunidad autónoma.' },
    { id: 'pct_ajd_obra_nueva', label: 'AJD: obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C20', def: 0.0075, revisar: true, help: 'Se aplica dos veces sobre el PEM y una sobre el suelo, como en el modelo original.' },
    { id: 'pct_ajd_prestamo_suelo', label: 'AJD: préstamo del suelo', type: 'pct', cell: 'Promoción!C21', def: 0.0075, revisar: true },
    { id: 'pct_ajd_prestamo_promotor', label: 'AJD: préstamo promotor', type: 'pct', cell: 'Promoción!C22', def: 0.0075, revisar: true },
    { id: 'factor_resp_hip', label: 'Responsabilidad hipotecaria sobre el préstamo', type: 'pct', sup: 'B6', def: 1.36, revisar: true, help: 'El AJD de los préstamos se calcula sobre el préstamo por este porcentaje.' },
    { id: 'pct_ajd_distribucion', label: 'AJD: distribución hipotecaria', type: 'pct', cell: 'Promoción!C23', def: 0, revisar: true },
    { id: 'iae_m2', label: 'IAE por metro cuadrado construido', type: 'eur_m2', cell: 'Promoción!C24', def: 3, revisar: true },
  ]);
  add('notaria', [
    { id: 'pct_not_varios', label: 'Notaría y registro: varios', type: 'pct', cell: 'Promoción!C30', def: 0.001, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_not_obra_nueva', label: 'Notaría de obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C31', def: 0.001, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_reg_obra_nueva', label: 'Registro de obra nueva y división horizontal', type: 'pct', cell: 'Promoción!C32', def: 0.0005, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_not_prest_suelo', label: 'Notaría del préstamo del suelo', type: 'pct', cell: 'Promoción!C33', def: 0.001, revisar: true },
    { id: 'pct_not_prest_promotor', label: 'Notaría del préstamo promotor', type: 'pct', cell: 'Promoción!C34', def: 0.0003, revisar: true },
    { id: 'pct_reg_prest_suelo', label: 'Registro del préstamo del suelo', type: 'pct', cell: 'Promoción!C35', def: 0.0003, revisar: true },
    { id: 'pct_reg_prest_promotor', label: 'Registro del préstamo promotor', type: 'pct', cell: 'Promoción!C36', def: 0.0003, revisar: true },
    { id: 'pct_not_distribucion', label: 'Notaría de la distribución hipotecaria', type: 'pct', cell: 'Promoción!C37', def: 0.0003, revisar: true },
    { id: 'pct_reg_distribucion', label: 'Registro de la distribución hipotecaria', type: 'pct', cell: 'Promoción!C38', def: 0.0003, revisar: true },
    { id: 'pct_tasacion_suelo', label: 'Tasación para el préstamo del suelo', type: 'pct', cell: 'Promoción!C39', def: 0.00025, revisar: true },
    { id: 'pct_tasacion_promotor', label: 'Tasación para el préstamo promotor', type: 'pct', cell: 'Promoción!C40', def: 0.0001, revisar: true },
    { id: 'pct_seguro_rc', label: 'Seguro de responsabilidad civil', type: 'pct', cell: 'Promoción!C41', def: 0.0005, revisar: true, help: 'Sobre el PEM más el suelo.' },
    { id: 'pct_seguro_decenal', label: 'Seguro decenal', type: 'pct', cell: 'Promoción!C42', def: 0.0035, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_seguro_todo_riesgo', label: 'Seguro a todo riesgo', type: 'pct', cell: 'Promoción!C43', def: 0, revisar: true },
    { id: 'pct_seguro_afianzamiento', label: 'Seguro de afianzamiento de cantidades', type: 'pct', cell: 'Promoción!C44', def: 0, revisar: true },
    { id: 'imprevistos_vivienda', label: 'Imprevistos por vivienda', type: 'eur', cell: 'Promoción!C45', def: 300, revisar: true },
  ]);
  add('proyectos', [
    { id: 'pct_arquitecto', label: 'Arquitecto', type: 'pct', cell: 'Promoción!C53', def: 0.0425, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_aparejador', label: 'Dirección facultativa (aparejador)', type: 'pct', cell: 'Promoción!C54', def: 0.013, revisar: true, help: 'Sobre el PEM.' },
    { id: 'proy_reparcelacion', label: 'Proyecto de reparcelación, urbanización y demolición', type: 'eur', cell: 'Promoción!D55', def: 0 },
    { id: 'estudio_topografico', label: 'Estudio topográfico', type: 'eur', cell: 'Promoción!D56', def: 0, revisar: true },
    { id: 'estudio_geotecnico', label: 'Estudio geotécnico', type: 'eur', cell: 'Promoción!D57', def: 10000, revisar: true },
    { id: 'coord_seguridad_mes', label: 'Coordinación de seguridad y salud, al mes', type: 'eur', cell: 'Promoción!C58', def: 600, revisar: true },
    { id: 'coord_seguridad_meses', label: 'Meses de coordinación de seguridad y salud', type: 'int', sup: 'B5', def: 36, revisar: true },
    { id: 'pct_supervision', label: 'Supervisión técnica externa', type: 'pct', cell: 'Promoción!C59', def: 0.028, revisar: true, help: 'Sobre el coste de obra sin imprevistos.' },
    { id: 'pct_oct', label: 'Organismo de control técnico (OCT)', type: 'pct', cell: 'Promoción!C60', def: 0.0009, revisar: true, help: 'Sobre el PEM.' },
    { id: 'pct_tecnico_banco', label: 'Técnico del banco (seguimiento del préstamo)', type: 'pct', cell: 'Promoción!C61', def: 0.0025, revisar: true, help: 'Sobre el PEM.' },
    { id: 'acometidas_vivienda', label: 'Acometidas y centro de transformación, por vivienda', type: 'eur', cell: 'Promoción!C62', def: 2000, revisar: true },
    { id: 'pct_imprevistos_proy', label: 'Imprevistos de proyectos', type: 'pct', cell: 'Promoción!C63', def: 0.001, revisar: true, help: 'Sobre el coste de obra.' },
  ]);
  add('financieros', [
    { id: 'pct_prestamo_suelo', label: 'Préstamo del suelo sobre su precio', type: 'pct', cell: 'Resumen!E20', def: 0.5, revisar: true, help: 'Con permuta no hay préstamo del suelo.' },
    { id: 'interes_suelo', label: 'Interés anual del préstamo del suelo', type: 'pct', cell: 'Resumen!F20', def: 0.05, revisar: true },
    { id: 'pct_com_bancaria', label: 'Comisiones bancarias', type: 'pct', cell: 'Promoción!C88', def: 0.0005, revisar: true, help: 'Sobre el préstamo promotor.' },
    { id: 'pct_com_suelo', label: 'Comisión del préstamo del suelo', type: 'pct', cell: 'Promoción!C89', def: 0.0015, revisar: true, help: 'Sobre el precio del suelo.' },
    { id: 'pct_com_promotor', label: 'Comisión del préstamo promotor', type: 'pct', cell: 'Promoción!C90', def: 0.0015, revisar: true, help: 'Sobre el préstamo promotor, menos la comisión del suelo.' },
    { id: 'pct_com_otros', label: 'Comisiones de otros préstamos', type: 'pct', cell: 'Promoción!C91', def: 0, revisar: true },
    { id: 'pct_avales', label: 'Coste de los avales de las entregas a cuenta', type: 'pct', cell: 'Promoción!C92', def: 0.0225, revisar: true },
    { id: 'pct_descuento_efectos', label: 'Descuento de efectos y remesas', type: 'pct', cell: 'Promoción!C93', def: 0.005, revisar: true, help: 'Sobre las mensualidades cobradas.' },
    { id: 'pct_imprevistos_fin', label: 'Imprevistos financieros', type: 'pct', cell: 'Promoción!C94', def: 0.001, revisar: true, help: 'Sobre el préstamo promotor.' },
  ]);
  add('iva', [
    { id: 'iva_general', label: 'IVA general (gastos que no son obra)', type: 'pct', sup: 'B9', def: 0.21, revisar: true },
    { id: 'iva_obra', label: 'IVA de la obra', type: 'pct', cell: 'CF!D215', def: 0.1, revisar: true },
    { id: 'iva_ventas', label: 'IVA de las ventas', type: 'pct', sup: 'B11', def: 0.1, revisar: true, help: 'El modelo aplica el mismo tipo a todo lo que se vende.' },
    { id: 'pct_control_calidad', label: 'Control de calidad que se descuenta a la constructora', type: 'pct', cell: 'CF!D216', def: 0.01, revisar: true },
    { id: 'pct_retencion', label: 'Retención de garantía a la constructora', type: 'pct', cell: 'CF!D217', def: 0.05, revisar: true },
  ]);
  add('comercial', [
    { id: 'pct_comercializacion', label: 'Comisión de comercialización', type: 'pct', cell: 'Resumen!O26', def: 0.03, revisar: true, help: 'Sobre los ingresos.' },
    { id: 'pct_com_contrato', label: 'Parte de la comisión que se paga al firmar el contrato', type: 'pct', cell: 'Resumen!O28', def: 0.2, revisar: true },
    { id: 'pct_com_escritura', label: 'Parte de la comisión que se paga en la escritura', type: 'pct', cell: 'Resumen!O29', def: 0.8, revisar: true },
    { id: 'pct_gastos_central', label: 'Gastos de estructura', type: 'pct', cell: 'Resumen!M33', def: 0.03, revisar: true, help: 'Sobre los ingresos.' },
    { id: 'pct_contingencia', label: 'Fondo de contingencia', type: 'pct', cell: 'Resumen!N33', def: 0.01, revisar: true, help: 'Sobre los ingresos.' },
    { id: 'reparto_gestion', label: 'Reparto de los gastos de gestión', type: 'select', cell: 'Resumen!Q34', def: 'A', options: [['A', 'A partes iguales durante la promoción'], ['b', 'Por hitos']] },
    { id: 'gest_hito_compra', label: 'Gestión por hitos: compraventa del suelo', type: 'pct', cell: 'Resumen!M36', def: 0, when: { reparto_gestion: 'b' } },
    { id: 'gest_hito_licencia', label: 'Gestión por hitos: licencia de obras', type: 'pct', cell: 'Resumen!M37', def: 0, when: { reparto_gestion: 'b' } },
    { id: 'gest_hito_obra', label: 'Gestión por hitos: durante la obra', type: 'pct', cell: 'Resumen!M38', def: 0, when: { reparto_gestion: 'b' } },
    { id: 'gest_hito_cfo', label: 'Gestión por hitos: fin de obra', type: 'pct', cell: 'Resumen!M39', def: 0, when: { reparto_gestion: 'b' }, help: 'Lo que falte hasta el 100 % se paga en la entrega de llaves.' },
  ]);
  add('calendario', [
    { id: 'pago_plusvalia_licencia', label: 'Plusvalía que se paga con la licencia', type: 'pct', cell: 'CF!B40', def: 0.2, revisar: true, help: 'El resto se paga en la entrega de llaves.' },
    { id: 'pago_notaria_compra', label: 'Notaría «varios» que se paga en la compra', type: 'pct', cell: 'CF!B55', def: 0.25, revisar: true, help: 'El resto se reparte durante la obra.' },
    { id: 'pago_decenal_inicio', label: 'Seguro decenal que se paga al empezar la obra', type: 'pct', cell: 'CF!B73', def: 0.25, revisar: true, help: 'El resto, con el certificado final de obra.' },
    { id: 'pago_afianz_ventas', label: 'Afianzamiento que se paga con cada venta', type: 'pct', cell: 'CF!B76', def: 0.15, revisar: true, help: 'El resto, en cuatro pagos anuales.' },
    { id: 'arq_anteproyecto', label: 'Arquitecto: anteproyecto (en la compra)', type: 'pct', cell: 'CF!D87', def: 0, revisar: true },
    { id: 'arq_basico', label: 'Arquitecto: proyecto básico y planos', type: 'pct', cell: 'CF!D88', def: 0.1, revisar: true },
    { id: 'arq_ejecucion', label: 'Arquitecto: proyecto de ejecución', type: 'pct', cell: 'CF!D89', def: 0, revisar: true },
    { id: 'arq_licencia', label: 'Arquitecto: licencia de obra', type: 'pct', cell: 'CF!D90', def: 0.2, revisar: true },
    { id: 'arq_obra', label: 'Arquitecto: durante la obra', type: 'pct', cell: 'CF!D91', def: 0.2, revisar: true },
    { id: 'arq_cfo', label: 'Arquitecto: certificado final de obra', type: 'pct', cell: 'CF!D92', def: 0.25, revisar: true },
    { id: 'arq_cedula', label: 'Arquitecto: cédula de habitabilidad', type: 'pct', cell: 'CF!D93', def: 0.25, revisar: true },
  ]);

  const SCHEMA = { groups: G, fields: F, months: 84, version: 1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCHEMA; else root.SCHEMA = SCHEMA;
})(typeof window !== 'undefined' ? window : globalThis);
