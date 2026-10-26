/**
 * Panel de Proyectos — JCS Consultoría Empresarial
 *
 * Backend en Google Apps Script. El Google Sheet es privado: la página web
 * (pública, en GitHub Pages) no contiene ningún dato y todo pasa por aquí.
 *
 * Tres tipos de acceso, filtrados en el servidor:
 *   - Portafolio (público): solo proyectos con publicar=TRUE y solo sus campos públicos.
 *   - Invitado (link con token): solo reuniones y tareas de SU proyecto; puede
 *     cambiar el estado de esas tareas y nada más.
 *   - Administrador (clave ADMIN_CLAVE en Propiedades del script): todo.
 *
 * Publicar como Web App: Ejecutar como "Yo", acceso "Cualquier persona".
 */

var HOJAS = {
  PROYECTOS: ['id', 'nombre', 'cliente', 'contacto', 'rubro', 'linea', 'fase', 'estado',
    'valor_total', 'token', 'publicar',
    'nombre_publico', 'resumen_publico', 'url_publica', 'anio'],
  ENLACES: ['id', 'proyecto_id', 'etiqueta', 'url'],
  REUNIONES: ['id', 'proyecto_id', 'fecha', 'titulo', 'asistentes', 'resumen'],
  TAREAS: ['id', 'proyecto_id', 'reunion_id', 'titulo', 'detalle', 'responsable',
    'fecha_limite', 'estado', 'actualizado'],
  // Pagos del cliente: solo los ve el administrador, nunca salen por un link de invitado.
  PAGOS: ['id', 'proyecto_id', 'fecha', 'valor', 'concepto', 'medio', 'nota'],
  REGISTRO: ['fecha', 'quien', 'accion', 'detalle'],
}

// Columnas que el administrador puede escribir (id y token los maneja el servidor).
var EDITABLES = {
  PROYECTOS: ['nombre', 'cliente', 'contacto', 'rubro', 'linea', 'fase', 'estado',
    'valor_total', 'publicar',
    'nombre_publico', 'resumen_publico', 'url_publica', 'anio'],
  ENLACES: ['proyecto_id', 'etiqueta', 'url'],
  REUNIONES: ['proyecto_id', 'fecha', 'titulo', 'asistentes', 'resumen'],
  TAREAS: ['proyecto_id', 'reunion_id', 'titulo', 'detalle', 'responsable', 'fecha_limite', 'estado'],
  PAGOS: ['proyecto_id', 'fecha', 'valor', 'concepto', 'medio', 'nota'],
}

var COLUMNAS_FECHA = ['fecha', 'fecha_limite', 'actualizado']
var COLUMNAS_BOOLEANAS = ['publicar']
var COLUMNAS_NUMERICAS = ['valor_total', 'anio', 'valor']
var ESTADOS_TAREA = ['pendiente', 'en curso', 'hecha']
var ESTADOS_PROYECTO = ['activo', 'pausado', 'entregado', 'archivado']

var MAX_INTENTOS = 5          // claves de admin fallidas antes de bloquear
var BLOQUEO_SEGUNDOS = 600
var MAX_TEXTO = 2000

// ---------------------------------------------------------------- entrada

function doGet() {
  return responder_({ ok: true, servicio: 'Panel de Proyectos JCS' })
}

function doPost(e) {
  var req
  try {
    req = JSON.parse(e.postData.contents)
  } catch (err) {
    return responder_({ ok: false, error: 'Solicitud inválida.' })
  }
  return responder_(manejar_(req))
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function manejar_(req) {
  if (!req || typeof req !== 'object') return { ok: false, error: 'Solicitud inválida.' }
  var lock = LockService.getScriptLock()
  lock.waitLock(15000)
  try {
    switch (req.accion) {
      case 'portafolio': return portafolio_()
      case 'verProyecto': return verProyecto_(req)
      case 'cambiarEstado': return cambiarEstado_(req)
      default: return manejarAdmin_(req)
    }
  } catch (err) {
    return { ok: false, error: 'Error en el servidor: ' + (err && err.message ? err.message : err) }
  } finally {
    lock.releaseLock()
  }
}

// ---------------------------------------------------------------- público

function portafolio_() {
  var proyectos = leer_('PROYECTOS').filter(function (p) {
    return p.publicar === true && p.estado !== 'archivado'
  }).map(function (p) {
    return {
      nombre: p.nombre_publico || p.nombre,
      rubro: p.rubro,
      resumen: p.resumen_publico,
      url: p.url_publica,
      anio: p.anio,
    }
  })
  return { ok: true, proyectos: proyectos }
}

// Busca el proyecto del token. No hay bloqueo por intentos: con 32 caracteres
// aleatorios es imposible adivinar un link, y un bloqueo global le permitiría a
// cualquiera dejar sin acceso a todos los invitados.
function proyectoPorToken_(token) {
  if (typeof token === 'string' && token.length >= 24) {
    var proyectos = leer_('PROYECTOS')
    for (var i = 0; i < proyectos.length; i++) {
      if (proyectos[i].token && proyectos[i].token === token) return { proyecto: proyectos[i] }
    }
  }
  return { error: 'Este link no es válido o ya no está activo. Pídele uno nuevo a JCS Consultoría Empresarial.' }
}

function verProyecto_(req) {
  var r = proyectoPorToken_(req.token)
  if (r.error) return { ok: false, error: r.error }
  var id = r.proyecto.id

  var reuniones = leer_('REUNIONES').filter(function (x) { return x.proyecto_id === id }).map(function (x) {
    return { id: x.id, fecha: x.fecha, titulo: x.titulo, asistentes: x.asistentes, resumen: x.resumen }
  })
  var tareas = leer_('TAREAS').filter(function (x) { return x.proyecto_id === id }).map(tareaPublica_)

  return { ok: true, proyecto: { nombre: r.proyecto.nombre }, reuniones: reuniones, tareas: tareas }
}

function tareaPublica_(t) {
  return {
    id: t.id, reunion_id: t.reunion_id, titulo: t.titulo, detalle: t.detalle,
    responsable: t.responsable, fecha_limite: t.fecha_limite, estado: t.estado,
  }
}

function cambiarEstado_(req) {
  var r = proyectoPorToken_(req.token)
  if (r.error) return { ok: false, error: r.error }
  if (ESTADOS_TAREA.indexOf(req.estado) < 0) return { ok: false, error: 'Estado no válido.' }

  var tarea = buscar_('TAREAS', req.tarea_id)
  // La tarea tiene que ser del proyecto del link: un invitado nunca toca otro proyecto.
  if (!tarea || tarea.proyecto_id !== r.proyecto.id) return { ok: false, error: 'Tarea no encontrada.' }

  var cambios = { estado: req.estado, actualizado: hoy_() }
  actualizar_('TAREAS', tarea.id, cambios)
  registrar_('invitado:' + req.token.slice(0, 6), 'cambiarEstado', tarea.id + ' → ' + req.estado)
  tarea.estado = cambios.estado
  return { ok: true, tarea: tareaPublica_(tarea) }
}

// ---------------------------------------------------------------- administrador

function manejarAdmin_(req) {
  var cache = CacheService.getScriptCache()
  var fallos = Number(cache.get('admin_fallos')) || 0
  if (fallos >= MAX_INTENTOS) {
    return { ok: false, error: 'Demasiados intentos fallidos. Espera 10 minutos.' }
  }
  var clave = PropertiesService.getScriptProperties().getProperty('ADMIN_CLAVE')
  if (!clave) return { ok: false, error: 'Falta configurar la clave (ADMIN_CLAVE) en las Propiedades del script.' }
  if (typeof req.clave !== 'string' || req.clave !== clave) {
    cache.put('admin_fallos', String(fallos + 1), BLOQUEO_SEGUNDOS)
    return { ok: false, claveIncorrecta: true, error: 'Clave incorrecta.' }
  }
  cache.remove('admin_fallos')

  switch (req.accion) {
    case 'admin.verificar': return { ok: true }
    case 'admin.todo': return todo_()
    case 'admin.guardarProyecto': return guardarProyecto_(req.proyecto)
    case 'admin.regenerarToken': return regenerarToken_(req.id)
    case 'admin.guardarReunion': return guardarReunion_(req.reunion, req.tareas)
    case 'admin.eliminarReunion': return eliminarReunion_(req.id)
    case 'admin.guardarTarea': return guardarRegistro_('TAREAS', req.tarea)
    case 'admin.eliminarTarea': return eliminarRegistro_('TAREAS', req.id)
    case 'admin.guardarEnlace': return guardarRegistro_('ENLACES', req.enlace)
    case 'admin.eliminarEnlace': return eliminarRegistro_('ENLACES', req.id)
    case 'admin.guardarPago': return guardarRegistro_('PAGOS', req.pago)
    case 'admin.eliminarPago': return eliminarRegistro_('PAGOS', req.id)
    default: return { ok: false, error: 'Acción desconocida.' }
  }
}

function todo_() {
  return {
    ok: true,
    proyectos: leer_('PROYECTOS'),
    enlaces: leer_('ENLACES'),
    reuniones: leer_('REUNIONES'),
    tareas: leer_('TAREAS'),
    pagos: leer_('PAGOS'),
  }
}

function guardarProyecto_(datos) {
  if (!datos || !texto_(datos.nombre)) return { ok: false, error: 'El proyecto necesita un nombre.' }
  var limpio = limpiar_('PROYECTOS', datos)
  if (limpio.estado && ESTADOS_PROYECTO.indexOf(limpio.estado) < 0) return { ok: false, error: 'Estado de proyecto no válido.' }

  if (datos.id) {
    if (!buscar_('PROYECTOS', datos.id)) return { ok: false, error: 'Proyecto no encontrado.' }
    actualizar_('PROYECTOS', datos.id, limpio)
    registrar_('admin', 'editarProyecto', datos.id)
    return { ok: true, proyecto: buscar_('PROYECTOS', datos.id) }
  }
  limpio.id = nuevoId_('pry')
  limpio.token = nuevoToken_()
  if (!limpio.estado) limpio.estado = 'activo'
  agregar_('PROYECTOS', limpio)
  registrar_('admin', 'crearProyecto', limpio.id)
  return { ok: true, proyecto: buscar_('PROYECTOS', limpio.id) }
}

function regenerarToken_(id) {
  if (!buscar_('PROYECTOS', id)) return { ok: false, error: 'Proyecto no encontrado.' }
  var token = nuevoToken_()
  actualizar_('PROYECTOS', id, { token: token })
  registrar_('admin', 'regenerarToken', id)
  return { ok: true, token: token }
}

// Crea o edita una reunión. Al crearla puede traer varias tareas de una vez.
function guardarReunion_(reunion, tareas) {
  var r = guardarRegistro_('REUNIONES', reunion)
  if (!r.ok) return r
  var creadas = []
  ;(tareas || []).forEach(function (t) {
    if (!t || !texto_(t.titulo)) return
    t.proyecto_id = r.registro.proyecto_id
    t.reunion_id = r.registro.id
    delete t.id
    var rt = guardarRegistro_('TAREAS', t)
    if (rt.ok) creadas.push(rt.registro)
  })
  return { ok: true, registro: r.registro, tareas: creadas }
}

function eliminarReunion_(id) {
  if (!buscar_('REUNIONES', id)) return { ok: false, error: 'Reunión no encontrada.' }
  leer_('TAREAS').filter(function (t) { return t.reunion_id === id }).forEach(function (t) {
    eliminar_('TAREAS', t.id)
  })
  eliminar_('REUNIONES', id)
  registrar_('admin', 'eliminarReunion', id)
  return { ok: true }
}

var PREFIJOS = { ENLACES: 'enl', REUNIONES: 'reu', TAREAS: 'tar', PAGOS: 'pag' }

function guardarRegistro_(hoja, datos) {
  if (!datos) return { ok: false, error: 'Faltan datos.' }
  var limpio = limpiar_(hoja, datos)

  if (hoja === 'TAREAS') {
    if (!datos.id && !texto_(limpio.titulo)) return { ok: false, error: 'La tarea necesita un título.' }
    if (limpio.estado !== undefined && ESTADOS_TAREA.indexOf(limpio.estado) < 0) return { ok: false, error: 'Estado no válido.' }
    if (!datos.id && !limpio.estado) limpio.estado = 'pendiente'
    limpio.actualizado = hoy_()
  }
  if (hoja === 'PAGOS') {
    if (!datos.id && !limpio.fecha) return { ok: false, error: 'El pago necesita una fecha.' }
    if ((!datos.id || limpio.valor !== undefined) && !(limpio.valor > 0)) return { ok: false, error: 'El valor del pago debe ser mayor que cero.' }
    if (limpio.fecha !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(limpio.fecha)) return { ok: false, error: 'Fecha no válida (AAAA-MM-DD).' }
  }
  if (hoja === 'ENLACES' && limpio.url !== undefined && !/^https?:\/\//i.test(limpio.url)) {
    return { ok: false, error: 'El enlace debe empezar por http:// o https://' }
  }

  var existente = datos.id ? buscar_(hoja, datos.id) : null
  if (datos.id && !existente) return { ok: false, error: 'Registro no encontrado.' }

  var proyectoId = limpio.proyecto_id !== undefined ? limpio.proyecto_id : existente && existente.proyecto_id
  if (!buscar_('PROYECTOS', proyectoId)) return { ok: false, error: 'Proyecto no encontrado.' }
  if (hoja === 'TAREAS' && limpio.reunion_id) {
    var reu = buscar_('REUNIONES', limpio.reunion_id)
    if (!reu || reu.proyecto_id !== proyectoId) return { ok: false, error: 'La reunión no pertenece a ese proyecto.' }
  }

  if (existente) {
    actualizar_(hoja, datos.id, limpio)
    registrar_('admin', 'editar' + hoja, datos.id)
    return { ok: true, registro: buscar_(hoja, datos.id) }
  }
  limpio.id = nuevoId_(PREFIJOS[hoja])
  agregar_(hoja, limpio)
  registrar_('admin', 'crear' + hoja, limpio.id)
  return { ok: true, registro: buscar_(hoja, limpio.id) }
}

function eliminarRegistro_(hoja, id) {
  if (!buscar_(hoja, id)) return { ok: false, error: 'Registro no encontrado.' }
  eliminar_(hoja, id)
  registrar_('admin', 'eliminar' + hoja, id)
  return { ok: true }
}

// Deja solo las columnas editables, recorta textos y normaliza booleanos.
function limpiar_(hoja, datos) {
  var limpio = {}
  EDITABLES[hoja].forEach(function (col) {
    if (datos[col] === undefined) return
    var v = datos[col]
    if (COLUMNAS_BOOLEANAS.indexOf(col) >= 0) v = esVerdadero_(v)
    else if (COLUMNAS_NUMERICAS.indexOf(col) >= 0) v = numero_(v)
    else v = texto_(v).slice(0, MAX_TEXTO)
    limpio[col] = v
  })
  return limpio
}

// ---------------------------------------------------------------- acceso al Sheet

// Si falta una pestaña conocida (por ejemplo PAGOS en un Sheet creado antes de
// que existiera), la crea con sus encabezados en vez de fallar.
function hoja_(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var h = ss.getSheetByName(nombre)
  if (h) return h
  if (!HOJAS[nombre]) throw new Error('Falta la pestaña ' + nombre + ' en el Sheet.')
  h = ss.insertSheet(nombre)
  h.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]).setFontWeight('bold')
  h.setFrozenRows(1)
  return h
}

// Lee una pestaña como lista de objetos. Usa los encabezados reales del Sheet,
// así que el orden de las columnas puede cambiar sin romper nada.
function leer_(nombre) {
  var valores = hoja_(nombre).getDataRange().getValues()
  if (valores.length < 2) return []
  var encabezados = valores[0].map(function (h) { return String(h).trim() })
  var tz = Session.getScriptTimeZone()
  return valores.slice(1).filter(function (fila) {
    return fila.some(function (c) { return c !== '' && c !== null })
  }).map(function (fila) {
    var obj = {}
    encabezados.forEach(function (h, i) {
      if (!h) return
      var v = fila[i]
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd')
      if (COLUMNAS_BOOLEANAS.indexOf(h) >= 0) v = esVerdadero_(v)
      else if (typeof v === 'string') v = v.trim()
      obj[h] = v
    })
    if (obj.id !== undefined) obj.id = String(obj.id)
    return obj
  })
}

function buscar_(nombre, id) {
  if (id === undefined || id === null || id === '') return null
  var filas = leer_(nombre)
  for (var i = 0; i < filas.length; i++) if (filas[i].id === String(id)) return filas[i]
  return null
}

function encabezados_(h) {
  return h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim() })
}

function numeroDeFila_(h, id) {
  var enc = encabezados_(h)
  var col = enc.indexOf('id')
  var valores = h.getDataRange().getValues()
  for (var i = 1; i < valores.length; i++) if (String(valores[i][col]) === String(id)) return i + 1
  return -1
}

function agregar_(nombre, obj) {
  var h = hoja_(nombre)
  var fila = encabezados_(h).map(function (col) { return obj[col] === undefined ? '' : celda_(obj[col]) })
  h.appendRow(fila)
}

function actualizar_(nombre, id, cambios) {
  var h = hoja_(nombre)
  var n = numeroDeFila_(h, id)
  if (n < 0) return
  var enc = encabezados_(h)
  var fila = h.getRange(n, 1, 1, enc.length).getValues()[0]
  enc.forEach(function (col, i) {
    if (cambios[col] !== undefined) fila[i] = celda_(cambios[col])
  })
  h.getRange(n, 1, 1, enc.length).setValues([fila])
}

function eliminar_(nombre, id) {
  var h = hoja_(nombre)
  var n = numeroDeFila_(h, id)
  if (n > 0) h.deleteRow(n)
}

// Un texto que empieza por "=" Sheets lo trataría como fórmula.
function celda_(v) {
  if (typeof v === 'string' && /^[=+@]/.test(v)) return "'" + v
  return v
}

function registrar_(quien, accion, detalle) {
  try {
    hoja_('REGISTRO').appendRow([new Date(), quien, accion, String(detalle || '').slice(0, 500)])
  } catch (err) { /* el registro nunca debe tumbar la acción principal */ }
}

// ---------------------------------------------------------------- utilidades

function texto_(v) {
  return v === undefined || v === null ? '' : String(v).trim()
}

// "$ 3.450.000" → 3450000. Vacío o sin dígitos → '' (celda en blanco).
function numero_(v) {
  if (typeof v === 'number') return v
  var digitos = texto_(v).replace(/[^\d]/g, '')
  return digitos ? Number(digitos) : ''
}

function esVerdadero_(v) {
  if (v === true) return true
  var s = String(v).trim().toLowerCase()
  return s === 'true' || s === 'verdadero' || s === 'sí' || s === 'si' || s === '1' || s === 'x'
}

function hoy_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
}

function nuevoId_(prefijo) {
  return prefijo + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8)
}

// 32 caracteres aleatorios: imposible de adivinar probando links.
function nuevoToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32)
}

// ---------------------------------------------------------------- instalación

/**
 * Ejecutar una vez desde el editor (menú ▶ Ejecutar → configurarHojas):
 * crea las pestañas que falten con sus encabezados y le pone un link (token)
 * a cada proyecto que no lo tenga.
 */
function configurarHojas() {
  Object.keys(HOJAS).forEach(function (nombre) { hoja_(nombre) })
  leer_('PROYECTOS').forEach(function (p) {
    if (!p.token) actualizar_('PROYECTOS', p.id, { token: nuevoToken_() })
  })
}
