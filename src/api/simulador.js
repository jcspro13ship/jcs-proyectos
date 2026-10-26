// Ejecuta el Code.gs real con un Google Sheet simulado en memoria.
// Sirve para dos cosas: el modo prueba de la app (sin Sheet conectado) y las
// pruebas automáticas de scripts/probar-servidor.mjs. Así lo que se prueba es
// exactamente el código que corre en Apps Script, no una copia.

const pad = (n) => String(n).padStart(2, '0')
const fechaISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Igual que Sheets: un texto con forma de fecha se guarda como fecha, y el
// apóstrofo inicial solo sirve para forzar texto.
function comoCelda(v) {
  if (typeof v === 'string') {
    if (v.startsWith("'")) return v.slice(1)
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return v
}

function crearHoja(filas) {
  const datos = filas.map((f) => f.map(comoCelda))
  const ancho = () => Math.max(0, ...datos.map((f) => f.length))
  const rango = (r, c, nr, nc) => ({
    getValues: () =>
      Array.from({ length: nr }, (_, i) =>
        Array.from({ length: nc }, (_, j) => (datos[r - 1 + i] || [])[c - 1 + j] ?? ''),
      ),
    setValues: (vals) => {
      vals.forEach((fila, i) => {
        datos[r - 1 + i] = datos[r - 1 + i] || []
        fila.forEach((v, j) => { datos[r - 1 + i][c - 1 + j] = comoCelda(v) })
      })
      return rango(r, c, nr, nc)
    },
    setFontWeight: () => rango(r, c, nr, nc),
  })
  return {
    datos,
    getDataRange: () => rango(1, 1, datos.length, ancho()),
    getRange: rango,
    getLastColumn: ancho,
    appendRow: (fila) => { datos.push(fila.map(comoCelda)) },
    deleteRow: (n) => { datos.splice(n - 1, 1) },
    setFrozenRows: () => {},
  }
}

/**
 * @param {string} codigo  Contenido de apps-script/Code.gs
 * @param {Record<string, any[][]>} pestanas  { PROYECTOS: [[encabezados], [fila], ...], ... }
 * @param {Record<string, string>} propiedades  Propiedades del script (ADMIN_CLAVE)
 */
export function crearServidor(codigo, pestanas, propiedades = {}) {
  const hojas = {}
  for (const [nombre, filas] of Object.entries(pestanas)) hojas[nombre] = crearHoja(filas)

  const cache = new Map()
  const globales = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => hojas[n] || null,
        insertSheet: (n) => (hojas[n] = crearHoja([])),
      }),
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ setMimeType: () => t }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => cache.set(k, v),
        remove: (k) => cache.delete(k),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => propiedades[k] ?? null }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d) => fechaISO(d),
    },
    Session: { getScriptTimeZone: () => 'America/Bogota' },
  }

  const nombres = Object.keys(globales)
  // eslint-disable-next-line no-new-func
  const fabrica = new Function(
    ...nombres,
    `${codigo}\nreturn { manejar_: manejar_, doPost: doPost, configurarHojas: configurarHojas }`,
  )
  const gs = fabrica(...nombres.map((n) => globales[n]))

  return {
    hojas,
    configurarHojas: () => gs.configurarHojas(),
    limpiarCache: () => cache.clear(),
    // Pasa por doPost y JSON igual que una llamada real por HTTP.
    llamar: (req) => JSON.parse(gs.doPost({ postData: { contents: JSON.stringify(req) } })),
  }
}
