/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  TABLERO EN VIVO — origen de datos del Dashboard
 *  Oficina General de Planificación · Oficina de Racionalización (UNMSM)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Lee el libro «4_REVISIÓN_INTERNA DE_AVANCES_ACTIVIDADES» y devuelve, en la
 *  forma exacta que el Dashboard espera, lo que las auditorías de los anexos
 *  dejaron escrito en él.
 *
 *  ─────────────────────────────────────────────────────────────────────────────
 *  PARCHE ANEXO 3 (aplicado): las hojas RESUMEN_FICHAS_A3, DETALLE_REVISION_A3
 *  y REGISTRO_MAESTRO_CODIGOS_A3 ya traen su columna ESTADO calculada
 *  directamente (CONFORME/OBSERVADO/SIN REGISTRAR/CRITICO). El código anterior
 *  traducía desde "Correcto/Observación/Incompleto" (formato viejo) y apuntaba
 *  a columnas que ya no existen en esa posición, así que todo caía en 0 o en
 *  Observado por defecto. Ver normalizarEstado_() y los tres forEach dentro de
 *  recopilarRegistros_.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const TABLERO = {

  LIBRO_ID: '1oYBAHp-Bd0V8un5hUAWdK1jKbcbdsROH4IOyM0MAmFk',

  HOJAS: {
    GENERAL:    'RESUMEN_GENERAL',
    RESUMEN_A1: 'RESUMEN_EJECUTIVO_A1',
    PRODUCTOS:  'DETALLADO_PRODUCTOS_A1',
    PROCESOS:   'OBSERVACIONES_DE_PROCESO_A1',
    RESUMEN_A3: 'RESUMEN_EJECUTIVO_A3',
    FICHAS:     'RESUMEN_FICHAS_A3',
    DETALLE_A3: 'DETALLE_REVISION_A3',
    MAESTRO_A3: 'REGISTRO_MAESTRO_CODIGOS_A3',
    A4:         'RESUMEN_EJECUTIVO_A4',
    HISTORIAL:  'HISTORIAL_REVISIONES',
    CATALOGO:   'CODIFICACION_ DE_LAS_FACULTADES'
  },

  MAX_REGISTROS: 25000,

  // Tope por hoja al servirla entera a la pestaña «Base de datos».
  MAX_FILAS_HOJA: 5000,

  CELDA_PCT_A4: 'F36',

  CELDA_PCT_FASE1: 'C14',

  CACHE_SEG: 60,

  FACULTADES: [
    ['FM',     'F01', 'FACULTAD DE MEDICINA'],
    ['FDCP',   'F02', 'FACULTAD DE DERECHO Y CIENCIA POLÍTICA'],
    ['FLCH',   'F03', 'FACULTAD DE LETRAS Y CIENCIAS HUMANAS'],
    ['FFB',    'F04', 'FACULTAD DE FARMACIA Y BIOQUÍMICA'],
    ['FO',     'F05', 'FACULTAD DE ODONTOLOGÍA'],
    ['FE',     'F06', 'FACULTAD DE EDUCACIÓN'],
    ['FQIQ',   'F07', 'FACULTAD DE QUÍMICA E INGENIERÍA QUÍMICA'],
    ['FMV',    'F08', 'FACULTAD DE MEDICINA VETERINARIA'],
    ['FCA',    'F09', 'FACULTAD DE CIENCIAS ADMINISTRATIVAS'],
    ['FCB',    'F10', 'FACULTAD DE CIENCIAS BIOLÓGICAS'],
    ['FCC',    'F11', 'FACULTAD DE CIENCIAS CONTABLES'],
    ['FCE',    'F12', 'FACULTAD DE CIENCIAS ECONÓMICAS'],
    ['FCF',    'F13', 'FACULTAD DE CIENCIAS FÍSICAS'],
    ['FCM',    'F14', 'FACULTAD DE CIENCIAS MATEMÁTICAS'],
    ['FCCSS',  'F15', 'FACULTAD DE CIENCIAS SOCIALES'],
    ['FIGMMG', 'F16', 'FACULTAD DE INGENIERÍA GEOLÓGICA, MINERA, METALÚRGICA Y GEOGRÁFICA'],
    ['FII',    'F17', 'FACULTAD DE INGENIERÍA INDUSTRIAL'],
    ['FPSIC',  'F18', 'FACULTAD DE PSICOLOGÍA'],
    ['FIEE',   'F19', 'FACULTAD DE INGENIERÍA ELECTRÓNICA Y ELÉCTRICA'],
    ['FISI',   'F20', 'FACULTAD DE INGENIERÍA DE SISTEMAS E INFORMÁTICA']
  ]
};

/* ══════════════════════ ACCIÓN PÚBLICA ══════════════════════ */

function tablero(opciones) {
  const sinCache = opciones && opciones.sinCache;
  const conDetalle = !opciones || opciones.detalle !== false;

  /* PAGINACIÓN DEL DETALLE
   *
   * El detalle completo son ~17.000 filas (unos 6 MB). Apps Script no logra
   * entregar una respuesta de ese tamaño: llega un 404 en la redirección de
   * script.googleusercontent.com aunque la ejecución figure «Completada».
   *
   * Con `desde` y `limite` la web lo pide por tandas y las junta en el
   * navegador. Sin esos parámetros el comportamiento es EXACTAMENTE el de
   * antes, así que una versión anterior de la web sigue funcionando igual.
   */
  const desde  = (opciones && opciones.desde  != null)
    ? Math.max(0, Number(opciones.desde) || 0) : null;
  const limite = (opciones && opciones.limite != null)
    ? Math.max(1, Number(opciones.limite) || 1) : null;
  const paginado = conDetalle && desde !== null && limite !== null;

  const clave = conDetalle ? 'tablero_v1' : 'tablero_agregados_v1';
  const cache = CacheService.getScriptCache();

  // Con detalle completo la respuesta no cabe en la caché (tope de 100 KB por
  // clave), y cada tanda es distinta: no hay nada que reutilizar.
  if (!sinCache && !paginado) {
    const guardado = cache.get(clave);
    if (guardado) {
      const previo = JSON.parse(guardado);
      previo.deCache = true;
      return previo;
    }
  }

  const datos = construirTablero_();

  if (!conDetalle) {
    datos.registros = [];
    datos.soloAgregados = true;
  }

  if (paginado) {
    const todas = datos.registros || [];
    datos.totalRegistros = todas.length;
    datos.desde = desde;
    datos.registros = todas.slice(desde, desde + limite);
    datos.hayMas = (desde + limite) < todas.length;
    datos.paginado = true;
    return datos;
  }

  try {
    cache.put(clave, JSON.stringify(datos), TABLERO.CACHE_SEG);
    datos.enCache = true;
  } catch (e) {
    datos.enCache = false;
  }
  return datos;
}

/**
 * Una hoja del libro, tal como se ve, para que el tablero la pinte con sus
 * propias tablas en vez de incrustar el libro en un iframe.
 *
 * Se sirven los valores MOSTRADOS (getDisplayValues) y no los tipados: es lo
 * que hace que un «8/8» siga siendo «8/8» y no la fecha en que Sheets lo
 * convirtió, y que los porcentajes lleguen ya con su formato.
 *
 * Solo se atienden hojas VISIBLES del libro y comparando por nombre exacto,
 * para que la acción no sirva de puerta a nada que el libro tenga oculto.
 */
function hojaDelLibro(opciones) {
  const pedida = String((opciones && opciones.hoja) || '').trim();
  if (!pedida) return { ok: false, error: 'Falta el nombre de la hoja.' };

  const libro = SpreadsheetApp.openById(TABLERO.LIBRO_ID);
  const visibles = libro.getSheets().filter(function (h) { return !h.isSheetHidden(); });
  const hoja = visibles.filter(function (h) { return h.getName() === pedida; })[0];

  if (!hoja) {
    return { ok: false, error: 'La hoja «' + pedida + '» no existe o está oculta.' };
  }

  const clave = 'hoja_v1_' + pedida;
  const cache = CacheService.getScriptCache();
  if (!(opciones && opciones.sinCache)) {
    const guardado = cache.get(clave);
    if (guardado) {
      const previo = JSON.parse(guardado);
      previo.deCache = true;
      return previo;
    }
  }

  const rango = hoja.getDataRange();
  const datos = rango.getDisplayValues();
  const cabecera = datos.length ? datos[0] : [];
  const cuerpo = datos.slice(1);

  // Una hoja entera puede no caber en una respuesta. Se recorta y se dice
  // cuánto, en vez de devolver algo incompleto sin avisar.
  const recorte = Math.max(0, cuerpo.length - TABLERO.MAX_FILAS_HOJA);

  // La semaforización: el color de fondo con que la hoja marca cada celda.
  // Sin esto el tablero pinta los datos correctos pero pierde la lectura de
  // un vistazo que da el libro.
  const fondos = comprimirFondos_(rango.getBackgrounds(), TABLERO.MAX_FILAS_HOJA);

  const salida = {
    ok: true,
    nombre: hoja.getName(),
    gid: String(hoja.getSheetId()),
    cabecera: cabecera,
    filas: cuerpo.slice(0, TABLERO.MAX_FILAS_HOJA),
    total: cuerpo.length,
    recorte: recorte,
    paleta: fondos.paleta,
    coloresCabecera: fondos.cabecera,
    colores: fondos.cuerpo,
    generado: new Date().toISOString()
  };

  try { cache.put(clave, JSON.stringify(salida), TABLERO.CACHE_SEG); } catch (e) { /* no cabe */ }
  return salida;
}

/**
 * Empaqueta la rejilla de colores de fondo para que quepa en la respuesta.
 *
 * Mandarla tal cual —una cadena «#ffffff» por celda— multiplicaría el tamaño
 * de la respuesta por celdas que además, en su inmensa mayoría, no están
 * pintadas. Así que se hacen dos cosas:
 *
 *   1. Los colores se guardan UNA vez en una paleta, y cada celda referencia
 *      su posición. Una hoja usa cuatro o cinco tonos, no mil.
 *   2. Solo viajan las celdas pintadas. El blanco y el «sin color» se omiten,
 *      y las filas enteras sin color no aparecen.
 *
 * Devuelve { paleta: ['#d9ead3', …], cabecera: {col: idx}, cuerpo: {fila: {col: idx}} }
 */
function comprimirFondos_(rejilla, tope) {
  const paleta = [];
  const posicion = {};                       // color -> su índice en la paleta

  const indiceDe = function (color) {
    const c = String(color || '').toLowerCase();
    // Sin color, blanco y transparente son el fondo por defecto: no se mandan.
    if (!c || c === '#ffffff' || c === '#fff' || c === 'white') return -1;
    if (posicion[c] === undefined) { posicion[c] = paleta.length; paleta.push(c); }
    return posicion[c];
  };

  const fila = function (celdas) {
    const salida = {};
    let hay = false;
    (celdas || []).forEach(function (color, c) {
      const i = indiceDe(color);
      if (i !== -1) { salida[c] = i; hay = true; }
    });
    return hay ? salida : null;
  };

  const cabecera = rejilla && rejilla.length ? (fila(rejilla[0]) || {}) : {};

  const cuerpo = {};
  const filas = (rejilla || []).slice(1, tope + 1);
  filas.forEach(function (celdas, f) {
    const pintada = fila(celdas);
    if (pintada) cuerpo[f] = pintada;
  });

  return { paleta: paleta, cabecera: cabecera, cuerpo: cuerpo };
}

/* ══════════════════════ LECTURA DEL LIBRO ══════════════════════ */

function construirTablero_() {
  const libro = SpreadsheetApp.openById(TABLERO.LIBRO_ID);

  const general  = leerHoja_(libro, TABLERO.HOJAS.GENERAL);
  const resA1    = leerHoja_(libro, TABLERO.HOJAS.RESUMEN_A1);
  const resA3    = leerHoja_(libro, TABLERO.HOJAS.RESUMEN_A3);
  const productos= leerHojaTexto_(libro, TABLERO.HOJAS.PRODUCTOS);
  const procesos = leerHojaTexto_(libro, TABLERO.HOJAS.PROCESOS);
  const fichas   = leerHoja_(libro, TABLERO.HOJAS.FICHAS);
  const campos   = leerHoja_(libro, TABLERO.HOJAS.DETALLE_A3);
  const codigos  = leerHoja_(libro, TABLERO.HOJAS.MAESTRO_A3);
  const indic    = leerHoja_(libro, TABLERO.HOJAS.A4);
  const pctA4Hoja= leerCeldaPct_(libro, TABLERO.HOJAS.A4, TABLERO.CELDA_PCT_A4);
  const histor   = leerHoja_(libro, TABLERO.HOJAS.HISTORIAL);

  // Las cabeceras de las tres hojas que traen el % de avance. Sirven para
  // localizar esa columna por su nombre cuando no esta donde se espera.
  const cabeceras = {
    general: cabeceraHoja_(libro, TABLERO.HOJAS.GENERAL),
    resA1:   cabeceraHoja_(libro, TABLERO.HOJAS.RESUMEN_A1),
    resA3:   cabeceraHoja_(libro, TABLERO.HOJAS.RESUMEN_A3)
  };

  const catalogo = leerCatalogo_(libro);
  const porSigla = indexarPorSigla_(general, resA1, resA3, catalogo, cabeceras);
  const facultades = catalogo.map(function (f, i) {
    return facultadDe_(f[0], f[1] + '_' + f[0], f[2], i + 1, porSigla[f[0]] || {});
  });

  const registros = recopilarRegistros_(productos, procesos, fichas, campos, codigos);

  facultades.forEach(function (f) {
    const extra = registros.porFacultad[f.codigo] || {};
    const vacio = { conformes: 0, observados: 0, sinRegistrar: 0, critico: 0, total: 0 };
    f.fichasEstado = extra.fichas  || vacio;
    f.campos       = extra.campos  || vacio;
    f.codigos      = extra.codigos || { conformes: 0, observados: 0, total: 0 };
  });
  const totales   = sumarTotales_(facultades);
  const anexo4    = leerAnexo4_(indic, pctA4Hoja);
  const revisiones= leerHistorial_(histor, anexo4);
  const historial = historialPorAnexo_(histor);
  const pctFase1Celda = leerCeldaPct_(libro, TABLERO.HOJAS.HISTORIAL,
                                      TABLERO.CELDA_PCT_FASE1);

  return {
    ok: true,
    generado: new Date().toISOString(),
    origen: libro.getName(),
    facultades: facultades,
    totales: totales,
    kpi: calcularKpi_(facultades, totales, anexo4, historial, pctFase1Celda),
    anexo4: anexo4,
    revisiones: revisiones,
    historial: historial,
    registros: registros.filas,
    cobertura: registros.cobertura,
    recorte: registros.recorte,
    // Nombre y gid de cada hoja visible del libro. El tablero pinta con esto
    // su propia barra de pestanas sobre el visor incrustado: la de Google no
    // aparece de forma fiable dentro de un iframe, y sin ella el libro se
    // quedaba en una sola hoja.
    hojas: hojasDelLibro_(libro)
  };
}

function leerHoja_(libro, nombre) {
  const hoja = buscarHoja_(libro, nombre);
  if (!hoja || hoja.getLastRow() < 2) return [];
  return hoja.getDataRange().getValues().slice(1);
}

// Igual que leerHoja_, pero pide los valores TAL COMO SE VEN en la hoja
// (getDisplayValues) en vez de los valores tipados (getValues). Evita que
// Sheets convierta solo, silenciosamente, algo como «8/8» —un puntaje— en
// una fecha real, que luego llega al tablero como un Date de JavaScript y
// se imprime entero («Sat Aug 08 2026 00:00:00 GMT…») en vez del puntaje.
// Solo debe usarse con hojas que no tengan columnas de fecha genuinas que
// el resto del codigo necesite como objeto Date (p.ej. HISTORIAL).
function leerHojaTexto_(libro, nombre) {
  const hoja = buscarHoja_(libro, nombre);
  if (!hoja || hoja.getLastRow() < 2) return [];
  return hoja.getDataRange().getDisplayValues().slice(1);
}

/**
 * Las hojas visibles del libro, en su orden, con el gid que las direcciona.
 *
 * El gid es lo que va en «#gid=…» de la URL del visor, asi que con esta lista
 * el tablero puede ofrecer el cambio de hoja sin depender de que Google pinte
 * su barra de pestanas dentro del iframe.
 */
function hojasDelLibro_(libro) {
  return libro.getSheets()
    .filter(function (h) { return !h.isSheetHidden(); })
    .map(function (h) {
      return { nombre: h.getName(), gid: String(h.getSheetId()) };
    });
}

/** La fila de titulos de una hoja, o [] si la hoja no esta. */
function cabeceraHoja_(libro, nombre) {
  const hoja = buscarHoja_(libro, nombre);
  if (!hoja || hoja.getLastRow() < 1 || hoja.getLastColumn() < 1) return [];
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
}

/**
 * Primera columna cuyo titulo case con `prueba`, o -1.
 *
 * El titulo se compara sin tildes ni signos, porque en el libro conviven
 * «% AVANCE», «%AVANCE» y «% de avance».
 */
function indicePorCabecera_(cabecera, prueba) {
  for (let i = 0; i < (cabecera || []).length; i++) {
    if (prueba(normalizarTitulo_(cabecera[i]))) return i;
  }
  return -1;
}

function normalizarTitulo_(s) {
  return String(s === null || s === undefined ? '' : s)
    .toUpperCase()
    .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * El % de avance de una fila, buscandolo primero donde toca y, si ahi no hay
 * nada, en la columna que lo diga en su cabecera.
 *
 * El respaldo por cabecera SOLO entra cuando la posicion fija no da un numero,
 * de modo que no puede estropear una lectura que ya funcionaba: como mucho
 * rescata una que devolvia null y acababa pintando la barra a cero.
 */
function pctDeFila_(fila, indiceFijo, cabecera, prueba) {
  const directo = pct_(fila[indiceFijo]);
  if (directo !== null) return directo;

  const i = indicePorCabecera_(cabecera, prueba);
  return i === -1 ? null : pct_(fila[i]);
}

function buscarHoja_(libro, nombre) {
  const exacta = libro.getSheetByName(nombre);
  if (exacta) return exacta;

  const buscada = esqueleto_(nombre);
  const hojas = libro.getSheets();
  for (let i = 0; i < hojas.length; i++) {
    if (esqueleto_(hojas[i].getName()) === buscada) return hojas[i];
  }
  return null;
}

function esqueleto_(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Como reconocer, por su cabecera, la columna que trae cada porcentaje.
// Se exige que hable de avance o porcentaje Y que nombre a su anexo, para no
// confundir el avance del Anexo 1 con el del 3 en una hoja que traiga los dos.
const CABECERA_PCT = {
  avance:  function (t) { return /%|AVANCE|PORCENTAJE/.test(t); },
  anexo1:  function (t) { return /(%|AVANCE|PORCENTAJE)/.test(t) && /ANEXO\s*1|\bA1\b/.test(t); },
  anexo3:  function (t) { return /(%|AVANCE|PORCENTAJE)/.test(t) && /ANEXO\s*3|\bA3\b/.test(t); },
  general: function (t) { return /(%|AVANCE|PORCENTAJE)/.test(t) && /GENERAL|TOTAL|GLOBAL/.test(t); }
};

function indexarPorSigla_(general, resA1, resA3, catalogo, cabeceras) {
  const cab = cabeceras || {};
  const validas = {};
  catalogo.forEach(function (f) { validas[f[0]] = true; });

  const mapa = {};
  const cajon = function (sigla) {
    const s = String(sigla || '').trim().toUpperCase();
    if (!validas[s]) return null;
    if (!mapa[s]) mapa[s] = {};
    return mapa[s];
  };

  general.forEach(function (f) {
    const c = cajon(f[0]); if (!c) return;
    c.pctAnexo1  = pctDeFila_(f, 2, cab.general, CABECERA_PCT.anexo1);
    c.pctAnexo3  = pctDeFila_(f, 3, cab.general, CABECERA_PCT.anexo3);
    c.pctGeneral = pctDeFila_(f, 4, cab.general, CABECERA_PCT.general);
    c.estado     = String(f[5] || '').trim();
    c.notas      = String(f[6] || '').trim();
  });

  resA1.forEach(function (f) {
    const c = cajon(f[0]); if (!c) return;
    c.productos = {
      total:        num_(f[2]),
      conformes:    num_(f[3]),
      observados:   num_(f[4]),
      sinRegistrar: num_(f[5])
    };
    c.procesos = num_(f[9]);
    c.procesosN0 = {
      conformes:    num_(f[10]),
      observados:   num_(f[11]),
      sinRegistrar: num_(f[12])
    };
    c.subprocesos = {
      conformes:    num_(f[13]),
      observados:   num_(f[14]),
      sinRegistrar: num_(f[15])
    };
    if (c.pctAnexo1 === null || c.pctAnexo1 === undefined) {
      c.pctAnexo1 = pctDeFila_(f, 6, cab.resA1, CABECERA_PCT.avance);
    }
  });

  resA3.forEach(function (f) {
    const c = cajon(f[0]); if (!c) return;
    c.fichas = {
      total:       num_(f[2]),
      esperadas:   num_(f[3]),
      completas:   num_(f[4]),
      incompletas: num_(f[5]),
      sinProducto: num_(f[6])
    };
    if (c.pctAnexo3 === null || c.pctAnexo3 === undefined) {
      c.pctAnexo3 = pctDeFila_(f, 11, cab.resA3, CABECERA_PCT.avance);
    }
  });

  return mapa;
}

function facultadDe_(sigla, codigo, nombre, orden, d) {
  const productos = d.productos || { total: 0, conformes: 0, observados: 0, sinRegistrar: 0 };
  const cero = function () { return { conformes: 0, observados: 0, sinRegistrar: 0, total: 0 }; };
  const conTotal = function (b) {
    if (!b) return cero();
    b.total = b.conformes + b.observados + b.sinRegistrar;
    return b;
  };
  const fichas    = d.fichas    || { total: 0, esperadas: 16, completas: 0, incompletas: 0, sinProducto: 0 };
  const pctA1 = d.pctAnexo1 === null || d.pctAnexo1 === undefined ? 0 : d.pctAnexo1;
  const pctA3 = d.pctAnexo3 === null || d.pctAnexo3 === undefined ? 0 : d.pctAnexo3;
  const pctG  = d.pctGeneral === null || d.pctGeneral === undefined
                  ? redondear_((pctA1 + pctA3) / 2) : d.pctGeneral;

  return {
    codigo: codigo, sigla: sigla, nombre: nombre, orden: orden,
    procesos: d.procesos || 0,
    pctAnexo1: pctA1, pctAnexo3: pctA3, pctGeneral: pctG,
    estado: d.estado || 'Sin revisar',
    clasificacion: clasificar_(d.estado, pctG),
    productos: productos,
    procesosN0: conTotal(d.procesosN0),
    subprocesos: conTotal(d.subprocesos),
    fichas: fichas
  };
}

function clasificar_(estado, pct) {
  const e = String(estado || '').toLowerCase();
  if (e.indexOf('crítico') !== -1 || e.indexOf('critico') !== -1) return 'Crítico';
  if (e.indexOf('conforme') !== -1)  return 'Conforme';
  if (e.indexOf('proceso') !== -1)   return 'Observación';
  if (!e || e.indexOf('sin revisar') !== -1) return 'Sin revisar';
  return pct >= 90 ? 'Conforme' : (pct >= 50 ? 'Observación' : 'Crítico');
}

/**
 * ── PARCHE ──────────────────────────────────────────────────────────────
 * Lee la columna ESTADO de cualquiera de las tres hojas del Anexo 3 y la
 * normaliza a uno de los cuatro estados que usan las tarjetas. Usa
 * coincidencia parcial (indexOf), no comparación exacta: así no importa si
 * la hoja escribe "Observado", "Observada" u "OBSERVACIÓN". Devuelve null
 * solo cuando el valor no encaja con nada reconocible (celda vacía,
 * "Opcional", "N/A"...).
 */
function normalizarEstado_(valor) {
  const c = String(valor || '').trim().toUpperCase()
              .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E')
              .replace(/[ÍÌÏÎ]/g, 'I').replace(/[ÓÒÖÔ]/g, 'O')
              .replace(/[ÚÙÜÛ]/g, 'U');
  if (!c) return null;
  if (c.indexOf('CRITIC') !== -1)                        return 'CRITICO';
  if (c.indexOf('CONFORME') !== -1)                       return 'CONFORME';
  if (c.indexOf('SIN REGIS') !== -1)                      return 'SIN REGISTRAR';
  if (c.indexOf('OBSERVAD') !== -1 ||
      c.indexOf('OBSERVACION') !== -1)                    return 'OBSERVADO';
  return null;
}

/**
 * ── PARCHE ──────────────────────────────────────────────────────────────
 * Códigos solo distingue Conforme/Observado en los totales (codConf/codObs).
 */
function estadoDeCodigo_(estadoCelda) {
  const c = normalizarEstado_(estadoCelda);
  if (!c) return null;
  return c === 'CONFORME' ? 'CONFORME' : 'OBSERVADO';
}

function sumarTotales_(facultades) {
  const t = { prodConf: 0, prodObs: 0, prodSin: 0,
              procConf: 0, procObs: 0, procSin: 0,
              subConf: 0, subObs: 0, subSin: 0,
              fichComp: 0, fichIncomp: 0, fichSin: 0,
              fichConf: 0, fichObs: 0, fichSinReg: 0, fichCrit: 0,
              campConf: 0, campObs: 0, campSin: 0, campCrit: 0,
              codConf: 0, codObs: 0 };
  facultades.forEach(function (f) {
    t.prodConf   += f.productos.conformes;
    t.prodObs    += f.productos.observados;
    t.prodSin    += f.productos.sinRegistrar;
    t.procConf   += f.procesosN0.conformes;
    t.procObs    += f.procesosN0.observados;
    t.procSin    += f.procesosN0.sinRegistrar;
    t.subConf    += f.subprocesos.conformes;
    t.subObs     += f.subprocesos.observados;
    t.subSin     += f.subprocesos.sinRegistrar;
    t.fichComp   += f.fichas.completas;
    t.fichIncomp += f.fichas.incompletas;
    t.fichSin    += f.fichas.sinProducto;
    const h = f.fichasEstado || {};
    t.fichConf   += h.conformes    || 0;
    t.fichObs    += h.observados   || 0;
    t.fichSinReg += h.sinRegistrar || 0;
    t.fichCrit   += h.critico      || 0;
    const c = f.campos  || {}, k = f.codigos || {};
    t.campConf   += c.conformes    || 0;
    t.campObs    += c.observados   || 0;
    t.campSin    += c.sinRegistrar || 0;
    t.campCrit   += c.critico      || 0;
    t.codConf    += k.conformes    || 0;
    t.codObs     += k.observados   || 0;
  });
  return t;
}

function calcularKpi_(facultades, t, anexo4, historial, pctFase1Celda) {
  const totalProd = t.prodConf + t.prodObs + t.prodSin;
  const totalFich = t.fichComp + t.fichIncomp + t.fichSin;

  const a1 = totalProd ? redondear_(((t.prodConf + t.prodObs / 2) / totalProd) * 100) : 0;
  const a3 = totalFich ? redondear_(((t.fichComp + t.fichIncomp / 2) / totalFich) * 100) : 0;

  const conAvance = facultades.filter(function (f) { return f.pctGeneral > 0; });
  const general = conAvance.length
    ? redondear_(conAvance.reduce(function (a, f) { return a + f.pctGeneral; }, 0) / conAvance.length)
    : 0;

  const delHistorial = function (clave, calculado) {
    const h = historial && historial[clave];
    return h && h.actual ? h.actual.valor : calculado;
  };

  const fase1 = (historial && historial.fase1 && historial.fase1.actual)
    ? historial.fase1.actual.valor
    : (pctFase1Celda === null || pctFase1Celda === undefined ? general : pctFase1Celda);

  return {
    general: fase1,
    anexo1: delHistorial('anexo1', a1),
    anexo3: delHistorial('anexo3', a3),
    anexo4: delHistorial('anexo4', anexo4.pct),
    hojas: { general: general, anexo1: a1, anexo3: a3, anexo4: anexo4.pctContado },
    origenFase1: (historial && historial.fase1 && historial.fase1.actual)
      ? 'la fila «Fase 1» más reciente de ' + TABLERO.HOJAS.HISTORIAL
      : (pctFase1Celda === null || pctFase1Celda === undefined
          ? 'el promedio de las facultades (ni fila «Fase 1» ni celda ' +
            TABLERO.CELDA_PCT_FASE1 + ')'
          : 'la celda ' + TABLERO.CELDA_PCT_FASE1 + ' (no se encontró la fila «Fase 1»)')
  };
}

function historialPorAnexo_(filas) {
  const porAnexo = { fase1: [], anexo1: [], anexo3: [], anexo4: [] };

  filas.forEach(function (f, i) {
    const fecha = fechaDeCelda_(f[0]);
    const texto = String(f[1] || '');
    const clave = /fase\s*1/i.test(texto) ? 'fase1'
                : /4/.test(texto) ? 'anexo4'
                : /3/.test(texto) ? 'anexo3'
                : /1/.test(texto) ? 'anexo1' : null;
    if (!clave) return;

    const valor = pct_(f[2]);
    if (valor === null) return;

    porAnexo[clave].push({
      fecha: fecha ? fecha.toISOString() : null,
      valor: valor,
      orden: i
    });
  });

  const salida = {};
  Object.keys(porAnexo).forEach(function (clave) {
    const lista = porAnexo[clave].sort(function (a, b) {
      if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return a.orden - b.orden;
    });
    const actual   = lista.length ? lista[lista.length - 1] : null;
    const anterior = lista.length > 1 ? lista[lista.length - 2] : null;

    const serie = lista.map(function (p, i) {
      return {
        fecha: p.fecha,
        valor: p.valor,
        variacion: i === 0 ? null : redondear_(p.valor - lista[i - 1].valor)
      };
    });

    salida[clave] = {
      actual: actual,
      anterior: anterior,
      variacion: (actual && anterior) ? redondear_(actual.valor - anterior.valor) : null,
      registros: lista.length,
      serie: serie
    };
  });
  return salida;
}

/* ── Detalle de la revisión ─────────────────────────────────────────────── */

/**
 * ── PARCHE ──────────────────────────────────────────────────────────────
 * Los tres bloques fichas/campos/codigos ahora leen la columna ESTADO real
 * de cada hoja en vez de columnas que ya no existían en esa posición.
 */
function recopilarRegistros_(productos, procesos, fichas, campos, codigos) {
  const filas = [];
  const cobertura = { Producto: {}, Proceso: {}, SubProceso: {}, Ficha: {},
                      Campo: {}, Codigo: {} };
  const porFacultad = {};
  const anota = function (sigla, grupo, estado) {
    const f = codigoFacultad_(sigla);
    if (!f) return;
    if (!porFacultad[f]) porFacultad[f] = {
      fichas:  { conformes: 0, observados: 0, sinRegistrar: 0, critico: 0, total: 0 },
      campos:  { conformes: 0, observados: 0, sinRegistrar: 0, critico: 0, total: 0 },
      codigos: { conformes: 0, observados: 0, total: 0 }
    };
    const caja = porFacultad[f][grupo];
    caja.total++;
    if (estado === 'CONFORME')           caja.conformes++;
    else if (estado === 'OBSERVADO')     caja.observados++;
    else if (estado === 'SIN REGISTRAR') caja.sinRegistrar++;
    else if (estado === 'CRITICO')       caja.critico++;
  };
  let id = 0, recortadas = 0;

  const meter = function (entidad, fila) {
    if (!fila.faculty) return;
    cobertura[entidad][fila.faculty] = true;
    if (filas.length >= TABLERO.MAX_REGISTROS) { recortadas++; return; }
    fila.id = ++id;
    fila.entity = entidad;
    filas.push(fila);
  };

  // DETALLADO_PRODUCTOS_A1
  productos.forEach(function (f) {
    meter('Producto', {
      anexo: 'Anexo 1', faculty: codigoFacultad_(f[0]), row: texto_(f[1]),
      process: texto_(f[2]), code: texto_(f[3]), name: texto_(f[4]),
      type: texto_(f[5]), status: texto_(f[6]), compliance: texto_(f[7]),
      criteria: texto_(f[8]), observations: texto_(f[9])
    });
  });

  // OBSERVACIONES_DE_PROCESO_A1
  procesos.forEach(function (f) {
    const nivel = texto_(f[3]);
    meter(/sub/i.test(nivel) ? 'SubProceso' : 'Proceso', {
      anexo: 'Anexo 1', faculty: codigoFacultad_(f[0]), row: texto_(f[5]),
      process: texto_(f[2]), code: texto_(f[1]), name: texto_(f[2]),
      type: nivel, status: texto_(f[6]), compliance: texto_(f[7]),
      criteria: texto_(f[8]), observations: texto_(f[9])
    });
  });

  // RESUMEN_FICHAS_A3 — la tarjeta «Fichas»
  // Columnas reales: 0 FACULTAD, 1 N°FICHA/PROCESO, 2 CÓDIGO, 3 %AVANCE,
  // 4 PRODUCTOS FINALES, 5 CAMPOS/CELDAS FALTANTES, 6 ERRORES DE
  // CODIFICACIÓN, 7 ESTADO, 8 OBSERVACIONES Y CORRECCIONES
  fichas.forEach(function (f) {
    const estado = normalizarEstado_(f[7]);      // columna H · ESTADO
    if (!estado) return;
    anota(f[0], 'fichas', estado);
    meter('Ficha', {
      anexo: 'Anexo 3', faculty: codigoFacultad_(f[0]), row: '',
      process: texto_(f[1]), code: texto_(f[2]), name: texto_(f[1]),
      type: '', status: estado,
      compliance: porcentajeTexto_(f[3]), criteria: texto_(f[5]),
      observations: texto_(f[8])
    });
  });

  // DETALLE_REVISION_A3 — la tarjeta «Fichas / Campos»
  // Columnas reales: 0 FACULTAD, 1 N°FICHA/PROCESO, 2 SECCIÓN,
  // 3 CAMPO REVISADO, 4 CELDA, 5 INFORMACIÓN, 6 ESTADO, 7 OBSERVACIÓN
  // ESPECÍFICA
  campos.forEach(function (f) {
    const estado = normalizarEstado_(f[6]);      // columna G · ESTADO
    if (!estado) return;
    anota(f[0], 'campos', estado);
    meter('Campo', {
      anexo: 'Anexo 3', faculty: codigoFacultad_(f[0]), row: '',
      process: texto_(f[1]), code: texto_(f[1]), name: texto_(f[3]),
      type: texto_(f[2]), status: estado, compliance: '',
      criteria: texto_(f[4]), observations: texto_(f[7])
    });
  });

  // REGISTRO_MAESTRO_CODIGOS_A3 — la tarjeta «Códigos»
  // Columnas reales: 0 FACULTAD, 1 TIPO, 2 CÓDIGO, 3 DENOMINACIÓN,
  // 4 FICHAS EN QUE APARECE, 5 ESTADO, 6 OBSERVACIÓN
  codigos.forEach(function (f) {
    const estado = estadoDeCodigo_(f[5]);        // columna F · ESTADO
    if (!estado) return;
    anota(f[0], 'codigos', estado);
    meter('Codigo', {
      anexo: 'Anexo 3', faculty: codigoFacultad_(f[0]), row: '',
      process: texto_(f[1]), code: texto_(f[2]), name: texto_(f[3]),
      type: texto_(f[1]), status: estado, compliance: '',
      criteria: '', observations: texto_(f[6])
    });
  });

  const cuenta = {};
  Object.keys(cobertura).forEach(function (k) {
    cuenta[k] = Object.keys(cobertura[k]).length;
  });

  return { filas: filas, cobertura: cuenta, recorte: recortadas,
           porFacultad: porFacultad };
}

function codigoFacultad_(valor) {
  const s = String(valor || '').trim().toUpperCase();
  if (/^F\d\d_/.test(s)) return s;
  const f = CATALOGO_VIGENTE.filter(function (x) { return x[0] === s; })[0];
  return f ? f[1] + '_' + f[0] : '';
}

let CATALOGO_VIGENTE = TABLERO.FACULTADES;
let CATALOGO_ORIGEN = 'el catálogo escrito en Tablero.gs';

function leerCatalogo_(libro) {
  CATALOGO_ORIGEN = 'el catálogo escrito en Tablero.gs';
  CATALOGO_VIGENTE = TABLERO.FACULTADES;

  const hoja = buscarHoja_(libro, TABLERO.HOJAS.CATALOGO);
  if (!hoja || hoja.getLastRow() < 2) {
    CATALOGO_ORIGEN += ' (la hoja de codificación no aparece)';
    return TABLERO.FACULTADES;
  }

  const datos = hoja.getDataRange().getValues();
  const cab = datos[0].map(esqueleto_);
  const col = function (varias) {
    for (let i = 0; i < cab.length; i++) {
      for (let j = 0; j < varias.length; j++) {
        if (cab[i].indexOf(varias[j]) !== -1) return i;
      }
    }
    return -1;
  };

  const iSigla  = col(['SIGLA']);
  const iNombre = col(['FACULTAD', 'NOMBRE', 'DENOMINACION']);
  const iCodigo = col(['CODIGO', 'FORMULARIO']);
  if (iSigla === -1 || iCodigo === -1) {
    CATALOGO_ORIGEN += ' (la hoja no trae columnas de SIGLA y CÓDIGO)';
    return TABLERO.FACULTADES;
  }

  const filas = [];
  const vistas = {};
  for (let f = 1; f < datos.length; f++) {
    const sigla = String(datos[f][iSigla] || '').trim().toUpperCase();
    const bruto = String(datos[f][iCodigo] || '').trim().toUpperCase();
    const m = bruto.match(/F\s*0*(\d{1,2})/);
    if (!sigla || !m || esTotal_(sigla) || vistas[sigla]) continue;
    vistas[sigla] = true;
    filas.push([sigla,
                'F' + ('0' + m[1]).slice(-2),
                iNombre === -1 ? sigla : String(datos[f][iNombre] || sigla).trim()]);
  }

  if (filas.length < TABLERO.FACULTADES.length) {
    CATALOGO_ORIGEN += ' (la hoja solo dio ' + filas.length + ' facultades de ' +
                       TABLERO.FACULTADES.length + ')';
    return TABLERO.FACULTADES;
  }

  filas.sort(function (a, b) { return a[1] < b[1] ? -1 : (a[1] > b[1] ? 1 : 0); });
  CATALOGO_VIGENTE = filas;
  CATALOGO_ORIGEN = 'la hoja ' + hoja.getName() + ' (' + filas.length + ' facultades)';
  return filas;
}

/* ── Anexo 4 e histórico ────────────────────────────────────────────────── */

function leerAnexo4_(filas, pctDeLaHoja) {
  let aprobados = 0, total = 0;

  filas.forEach(function (f) {
    if (esTotal_(primeraCelda_(f)) || f.join('').trim() === '') return;
    total++;
    const linea = f.join(' ').toLowerCase();
    if (/aprobado|conforme|cumple|validado/.test(linea)) aprobados++;
  });

  const contado = total ? redondear_((aprobados / total) * 100) : 0;

  return {
    aprobados: aprobados,
    indicadores: total,
    pct: pctDeLaHoja === null ? contado : pctDeLaHoja,
    pctContado: contado,
    origenPct: pctDeLaHoja === null
      ? 'recuento de aprobados (la celda ' + TABLERO.CELDA_PCT_A4 + ' está vacía)'
      : 'la celda ' + TABLERO.CELDA_PCT_A4 + ' de ' + TABLERO.HOJAS.A4
  };
}

function leerCeldaPct_(libro, nombreHoja, celda) {
  try {
    const hoja = buscarHoja_(libro, nombreHoja);
    if (!hoja) return null;
    return pct_(hoja.getRange(celda).getValue());
  } catch (e) {
    return null;
  }
}

function primeraCelda_(fila) {
  for (let i = 0; i < fila.length; i++) {
    const v = String(fila[i] === null || fila[i] === undefined ? '' : fila[i]).trim();
    if (v) return v;
  }
  return '';
}

function fechaDeCelda_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
                       Number(m[4] || 0), Number(m[5] || 0));
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function esTotal_(valor) {
  return /^(TOTAL|TOTALES|PROMEDIO|GENERAL|RESUMEN|SUMA|LEYENDA)\b/i
           .test(String(valor || '').trim());
}

function leerHistorial_(filas, anexo4) {
  const porFecha = {};
  filas.forEach(function (f) {
    const fecha = f[0] instanceof Date ? f[0] : new Date(f[0]);
    if (isNaN(fecha.getTime())) return;
    const clave = fecha.toISOString();
    if (!porFecha[clave]) porFecha[clave] = { fecha: clave };
    const anexo = String(f[1] || '').toLowerCase();
    const valor = num_(f[2]);
    if (anexo.indexOf('1') !== -1) porFecha[clave].anexo1 = valor;
    if (anexo.indexOf('3') !== -1) porFecha[clave].anexo3 = valor;
    if (anexo.indexOf('4') !== -1) porFecha[clave].anexo4 = valor;
  });

  const claves = Object.keys(porFecha).sort();
  const dos = claves.slice(-2).map(function (k, i, arr) {
    const r = porFecha[k];
    r.etiqueta = (i === arr.length - 1) ? 'Revisión actual' : 'Revisión anterior';
    return r;
  });

  if (!dos.length) {
    return [{ etiqueta: 'Revisión anterior', fecha: null, anexo4: anexo4.pct }];
  }
  if (dos.length === 1) {
    return [{ etiqueta: 'Revisión anterior', fecha: null }, dos[0]];
  }
  return dos;
}

/* ── Conversiones ───────────────────────────────────────────────────────── */

function texto_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function num_(v) {
  const n = Number(String(v === null || v === undefined ? '' : v).replace('%', '').trim());
  return isNaN(n) ? 0 : n;
}

function pct_(v) {
  if (v === null || v === undefined || v === '' || v === '—') return null;
  if (typeof v === 'number') return redondear_(v <= 1 ? v * 100 : v);
  const s = String(v).trim();
  if (!s || s === '—') return null;
  const n = Number(s.replace('%', '').replace(',', '.').trim());
  if (isNaN(n)) return null;
  return redondear_(s.indexOf('%') !== -1 ? n : (n <= 1 ? n * 100 : n));
}

function porcentajeTexto_(v) {
  const p = pct_(v);
  return p === null ? '' : p + '%';
}

function redondear_(n) { return Math.round(n * 10) / 10; }

/* ══════════════════════ COMPROBACIÓN DESDE EL EDITOR ══════════════════════ */

function probarTablero() {
  const libro = SpreadsheetApp.openById(TABLERO.LIBRO_ID);
  const lineas = ['════════ TABLERO EN VIVO ════════',
                  'Libro: ' + libro.getName(), ''];

  const usadas = {};
  lineas.push('Hojas que el tablero NECESITA:');
  Object.keys(TABLERO.HOJAS).forEach(function (k) {
    const nombre = TABLERO.HOJAS[k];
    const hoja = buscarHoja_(libro, nombre);
    if (hoja) usadas[hoja.getName()] = true;
    lineas.push('  ' + (hoja ? '✓' : '✗') + '  ' + nombre +
                (hoja ? '  (' + Math.max(0, hoja.getLastRow() - 1) + ' filas)'
                      : '  — NO EXISTE: ejecute la auditoría que la genera'));
  });

  const sobrantes = libro.getSheets()
    .map(function (h) { return h.getName(); })
    .filter(function (n) { return !usadas[n]; });
  lineas.push('');
  lineas.push('Otras hojas del libro, que el tablero NO usa: ' +
              (sobrantes.length ? '' : '(ninguna)'));
  sobrantes.forEach(function (n) { lineas.push('  ·  ' + n); });
  lineas.push('  Es normal que existan. Ninguna cifra del tablero sale de ellas.');

  const d = tablero({ sinCache: true });
  lineas.push('');
  lineas.push('KPI · general ' + d.kpi.general + '%  ·  Anexo 1 ' + d.kpi.anexo1 +
              '%  ·  Anexo 3 ' + d.kpi.anexo3 + '%  ·  Anexo 4 ' + d.kpi.anexo4 + '%');
  lineas.push('    (las hojas por su cuenta dan: Anexo 1 ' + d.kpi.hojas.anexo1 +
              '%  ·  Anexo 3 ' + d.kpi.hojas.anexo3 +
              '%  ·  Anexo 4 ' + d.kpi.hojas.anexo4 + '%)');
  lineas.push('    Orden de preferencia: HISTORIAL_REVISIONES › celda ' +
              TABLERO.CELDA_PCT_A4 + ' (solo A4) › cálculo de las hojas.');
  lineas.push('');
  lineas.push('Catálogo tomado de: ' + CATALOGO_ORIGEN);
  lineas.push('Facultades: ' + d.facultades.length +
              '  ·  con avance: ' + d.facultades.filter(function (f) {
                return f.pctGeneral > 0; }).length);
  lineas.push('Anexo 4: ' + d.kpi.anexo4 + '%  ·  tomado de ' + d.anexo4.origenPct);
  lineas.push('   (' + d.anexo4.aprobados + ' aprobados de ' + d.anexo4.indicadores +
              ' indicadores da ' + d.anexo4.pctContado + '%, que es el respaldo)');
  lineas.push('Registros de detalle: ' + d.registros.length +
              (d.recorte ? '  ¡+' + d.recorte + ' RECORTADOS! Suba TABLERO.MAX_REGISTROS'
                         : '  (ninguno recortado: viaja el libro entero)'));
  const kb = function (obj) { return Math.round(JSON.stringify(obj).length / 1024); };
  const pesoTotal = kb(d);
  const pesoAgregados = pesoTotal - kb(d.registros);
  lineas.push('');
  lineas.push('TAMAÑO DE LA RESPUESTA');
  lineas.push('  Agregados (tarjetas, rankings, gráficos): ' + pesoAgregados + ' KB');
  lineas.push('  Detalle (las tres tablas): ' + kb(d.registros) + ' KB  ·  ' +
              d.registros.length + ' filas');
  lineas.push('  TOTAL: ' + pesoTotal + ' KB');
  if (pesoTotal > 8000) {
    lineas.push('  ⚠ MUY GRANDE. La web pide los agregados aparte, así que las');
    lineas.push('    tarjetas se llenarán igual, pero el detalle puede no llegar.');
    lineas.push('    Baje TABLERO.MAX_REGISTROS si las tablas salen vacías.');
  } else {
    lineas.push('  Tamaño razonable: debería llegar entero.');
  }
  lineas.push('');
  lineas.push('Caché: ' + (d.enCache === false
    ? 'no cabe (>100 KB), cada consulta relee el libro — es lo esperado con el detalle completo'
    : 'guardada ' + TABLERO.CACHE_SEG + ' s'));
  lineas.push('Cobertura: ' + JSON.stringify(d.cobertura));
  // Las tres hojas del Anexo 3, volcadas: cuando una tarjeta sale en cero lo
  // que hace falta es ver que pone la hoja y como se ha interpretado, no
  // adivinarlo. Es lo mismo que resolvio lo de Fase 1 en el historial.
  lineas.push('');
  lineas.push('════════ ANEXO 3, HOJA POR HOJA ════════');
  [
    // Las columnas ESTADO reales de cada hoja.
    { hoja: TABLERO.HOJAS.FICHAS,     rotulo: 'Fichas',       colEstado: 7, colFac: 0 },
    { hoja: TABLERO.HOJAS.DETALLE_A3, rotulo: 'Campos',       colEstado: 6, colFac: 0 },
    { hoja: TABLERO.HOJAS.MAESTRO_A3, rotulo: 'Denominación', colEstado: 5, colFac: 0 }
  ].forEach(function (cfg) {
    const hoja = buscarHoja_(libro, cfg.hoja);
    lineas.push('');
    lineas.push('── ' + cfg.rotulo + '  ←  ' + cfg.hoja);
    if (!hoja) { lineas.push('   ✗ LA HOJA NO APARECE'); return; }

    const filas = hoja.getDataRange().getValues();
    lineas.push('   filas de datos: ' + (filas.length - 1));
    lineas.push('   cabecera: ' + filas[0].slice(0, 12).join(' | '));

    // Cuantas se clasifican y cuantas se caen, y por que.
    let ok = 0, sinEstado = 0, sinFacultad = 0;
    const estadosVistos = {}, siglasNoReconocidas = {};
    for (let i = 1; i < filas.length; i++) {
      const bruto = String(filas[i][cfg.colEstado] || '').trim();
      const est = (cfg.rotulo === 'Denominación')
        ? estadoDeCodigo_(filas[i][cfg.colEstado])
        : normalizarEstado_(bruto);
      const fac = codigoFacultad_(filas[i][cfg.colFac]);
      estadosVistos[bruto || '(vacío)'] = (estadosVistos[bruto || '(vacío)'] || 0) + 1;
      if (!est) { sinEstado++; continue; }
      if (!fac) {
        sinFacultad++;
        siglasNoReconocidas[String(filas[i][cfg.colFac])] = true;
        continue;
      }
      ok++;
    }
    lineas.push('   CLASIFICADAS: ' + ok +
                '   ·  sin estado reconocible: ' + sinEstado +
                '   ·  facultad no reconocida: ' + sinFacultad);
    lineas.push('   Lo que pone la columna de estado, y cuantas veces:');
    Object.keys(estadosVistos).slice(0, 12).forEach(function (k) {
      lineas.push('      «' + k + '» × ' + estadosVistos[k]);
    });
    const malas = Object.keys(siglasNoReconocidas).slice(0, 6);
    if (malas.length) {
      lineas.push('   Siglas que no cuadran con el catálogo: ' +
                  malas.map(function (m) { return '«' + m + '»'; }).join(', '));
    }
    if (filas.length > 1) {
      lineas.push('   primera fila: ' + filas[1].slice(0, 12).join(' | '));
    }
  });

  lineas.push('');
  lineas.push('Recuento que llega al tablero:');
  lineas.push('   Fichas       ' + d.totales.fichConf + ' / ' + d.totales.fichObs + ' / ' +
              d.totales.fichSinReg + ' / ' + d.totales.fichCrit + '  (conf/obs/sin/crít)');
  lineas.push('   Campos       ' + d.totales.campConf + ' / ' + d.totales.campObs + ' / ' +
              d.totales.campSin + ' / ' + d.totales.campCrit);
  lineas.push('   Denominación ' + d.totales.codConf + ' / ' + d.totales.codObs);
  lineas.push('════════════════════════════════════════');

  lineas.push('');
  lineas.push('HISTORIAL_REVISIONES, fila por fila (columnas A, B y C):');
  const hojaHist = buscarHoja_(libro, TABLERO.HOJAS.HISTORIAL);
  if (!hojaHist) {
    lineas.push('  (la hoja no aparece)');
  } else {
    const crudo = hojaHist.getDataRange().getValues();
    crudo.forEach(function (f, i) {
      if (i === 0) { lineas.push('  fila 1 (cabecera): ' + f.slice(0, 3).join(' | ')); return; }
      const fecha = fechaDeCelda_(f[0]);
      const texto = String(f[1] || '');
      const clave = /fase\s*1/i.test(texto) ? 'Fase 1'
                  : /4/.test(texto) ? 'Anexo 4'
                  : /3/.test(texto) ? 'Anexo 3'
                  : /1/.test(texto) ? 'Anexo 1' : null;
      const valor = pct_(f[2]);
      lineas.push('  fila ' + (i + 1) + ': A=«' + f[0] + '»  B=«' + texto +
                  '»  C=«' + f[2] + '»' +
                  '   →  ' + (clave ? clave : 'NO CLASIFICADA (la columna B no dice fase 1 ni 1/3/4)') +
                  ', ' + (valor === null ? 'SIN VALOR (la columna C no da un número)' : valor + '%') +
                  ', ' + (fecha ? 'fecha ok' : 'sin fecha legible → ordena por su posición'));
    });
  }

  lineas.push('');
  lineas.push('% Avance Fase 1: ' + d.kpi.general + '%  ·  tomado de ' + d.kpi.origenFase1);

  lineas.push('');
  lineas.push('HISTORIAL_REVISIONES, anexo por anexo:');
  ['fase1', 'anexo1', 'anexo3', 'anexo4'].forEach(function (k) {
    const h = d.historial[k];
    if (!h || !h.actual) {
      lineas.push('  ' + k + ': sin registros — la tarjeta usará el cálculo de las hojas');
      return;
    }
    lineas.push('  ' + k + ': ' + h.actual.valor + '%  (' + h.actual.fecha + ')' +
      (h.anterior
        ? '   anterior ' + h.anterior.valor + '%  (' + h.anterior.fecha + ')' +
          '   variación ' + (h.variacion >= 0 ? '+' : '') + h.variacion + ' pp'
        : '   sin revisión anterior') +
      '   ·  ' + h.registros + ' registro(s)');
  });
  lineas.push('═════════════════════════════════');

  const texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Por qué las barras de «% Avance por Facultad» salen en cero.
 *
 * El porcentaje de cada facultad se busca en tres sitios, por este orden:
 * RESUMEN_GENERAL (columnas C y D), y si ahí no hay nada, RESUMEN_EJECUTIVO_A1
 * columna G para el Anexo 1 y RESUMEN_EJECUTIVO_A3 columna L para el Anexo 3.
 * Cuando ninguno de los tres da un número, el tablero pone 0 y la barra
 * desaparece —queda a ras del eje— mientras el recuento de la derecha mete a
 * las veinte facultades en «avance menor al 50%».
 *
 * Esto vuelca la cabecera de las tres hojas con el NÚMERO DE COLUMNA de cada
 * una y lo que trae la primera facultad, para ver de un vistazo si el
 * porcentaje está en otra columna de la que el código busca.
 */
function diagnosticoAvance() {
  const libro = SpreadsheetApp.openById(TABLERO.LIBRO_ID);
  const lineas = ['════════ DE DÓNDE SALE EL % DE AVANCE ════════',
                  'Libro: ' + libro.getName(), ''];

  [
    { hoja: TABLERO.HOJAS.GENERAL,    rotulo: 'RESUMEN_GENERAL',
      busca: [[2, 'pctAnexo1', 'anexo1'], [3, 'pctAnexo3', 'anexo3'],
              [4, 'pctGeneral', 'general']] },
    { hoja: TABLERO.HOJAS.RESUMEN_A1, rotulo: 'RESUMEN_EJECUTIVO_A1 (respaldo Anexo 1)',
      busca: [[6, 'pctAnexo1', 'avance']] },
    { hoja: TABLERO.HOJAS.RESUMEN_A3, rotulo: 'RESUMEN_EJECUTIVO_A3 (respaldo Anexo 3)',
      busca: [[11, 'pctAnexo3', 'avance']] }
  ].forEach(function (cfg) {
    const hoja = buscarHoja_(libro, cfg.hoja);
    lineas.push('── ' + cfg.rotulo);
    if (!hoja) {
      lineas.push('   ✗ LA HOJA NO APARECE EN EL LIBRO.');
      lineas.push('');
      return;
    }

    const filas = hoja.getDataRange().getValues();
    lineas.push('   filas de datos: ' + Math.max(0, filas.length - 1));
    if (!filas.length) { lineas.push(''); return; }

    lineas.push('   COLUMNAS (número · letra · cabecera · valor de la 1ª fila):');
    filas[0].forEach(function (cab, i) {
      const muestra = filas.length > 1 ? filas[1][i] : '';
      lineas.push('      [' + i + '] ' + columnaLetra_(i) + '  «' + String(cab).trim() +
                  '»   →   ' + JSON.stringify(muestra) +
                  '   ·  pct_() lo lee como: ' + pct_(muestra));
    });

    lineas.push('   LO QUE EL CÓDIGO BUSCA HOY:');
    cfg.busca.forEach(function (par) {
      const i = par[0];
      const muestra = filas.length > 1 ? filas[1][i] : '';
      const leido = pct_(muestra);
      lineas.push('      ' + par[1] + '  ←  columna fija [' + i + '] ' + columnaLetra_(i) +
                  '  «' + String(filas[0][i] || '').trim() + '»' +
                  '   →   ' + (leido === null
                    ? '✗ NO da un porcentaje'
                    : '✓ ' + leido + '%'));

      // El respaldo por cabecera, que entra justo cuando la fija falla.
      const prueba = CABECERA_PCT[par[2]];
      const j = indicePorCabecera_(filas[0], prueba);
      if (leido !== null) {
        lineas.push('         (la posición fija ya sirve; el respaldo por cabecera no hace falta)');
      } else if (j === -1) {
        lineas.push('         respaldo por cabecera: ✗ ninguna columna se llama como un % de avance');
        lineas.push('         →  AQUÍ HACE FALTA CORREGIR EL ÍNDICE A MANO');
      } else {
        const valorJ = filas.length > 1 ? filas[1][j] : '';
        lineas.push('         respaldo por cabecera: columna [' + j + '] ' + columnaLetra_(j) +
                    '  «' + String(filas[0][j] || '').trim() + '»   →   ' +
                    (pct_(valorJ) === null ? '✗ tampoco da un número' : '✓ ' + pct_(valorJ) + '%'));
      }
    });
    lineas.push('');
  });

  lineas.push('QUÉ HACER CON ESTO: busque arriba, en la lista de COLUMNAS, cuál');
  lineas.push('trae de verdad el porcentaje —la que pct_() lee como un número—');
  lineas.push('y dígame su número entre corchetes. Con eso se corrige el índice');
  lineas.push('en indexarPorSigla_() y las barras vuelven a dibujarse.');
  lineas.push('══════════════════════════════════════════════');

  const texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/** 0 → «A», 1 → «B», … Solo para que el volcado se lea igual que la hoja. */
function columnaLetra_(i) {
  let n = i, letra = '';
  do { letra = String.fromCharCode(65 + (n % 26)) + letra; n = Math.floor(n / 26) - 1; }
  while (n >= 0);
  return letra;
}
