import { API_URL, MODO_PRUEBA } from '../config'

// En modo prueba se ejecuta el Code.gs real contra un Sheet simulado en memoria
// (se carga solo en ese caso, así no viaja en la versión publicada).
let simulado = null
async function servidorSimulado() {
  if (!simulado) {
    simulado = (async () => {
      const [{ crearServidor }, { pestanasDemo, CLAVE_DEMO }, codigo] = await Promise.all([
        import('./simulador.js'),
        import('./demo.js'),
        import('../../apps-script/Code.gs?raw').then((m) => m.default),
      ])
      return crearServidor(codigo, pestanasDemo(), { ADMIN_CLAVE: CLAVE_DEMO })
    })()
  }
  return simulado
}

export async function llamar(req) {
  if (MODO_PRUEBA) {
    const s = await servidorSimulado()
    await new Promise((r) => setTimeout(r, 150))
    return s.llamar(req)
  }

  let res
  try {
    // "text/plain" evita la solicitud previa (preflight) que Apps Script no admite.
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' }
  }
  try {
    return await res.json()
  } catch {
    return { ok: false, error: 'El servidor respondió algo inesperado. Intenta de nuevo en un momento.' }
  }
}

export const llamarAdmin = (clave, accion, datos = {}) => llamar({ clave, accion, ...datos })
