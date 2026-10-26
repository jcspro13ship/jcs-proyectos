const pad = (n) => String(n).padStart(2, '0')

export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fechaCorta(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso || ''
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}`
}

export const vencida = (t) => t.estado !== 'hecha' && t.fecha_limite && t.fecha_limite < hoyISO()

export function pesos(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return '$ ' + Number(v).toLocaleString('es-CO')
}

export function linkCompartir(token) {
  return `${location.origin}${location.pathname}#/p/${token}`
}

export function mensajeWhatsApp(proyecto) {
  return (
    `Hola. Este es el link con las tareas y pendientes del proyecto *${proyecto.nombre}*. ` +
    `Ahí puedes ver lo acordado en cada reunión y marcar el avance de tus tareas:\n\n${linkCompartir(proyecto.token)}\n\n` +
    `JCS Consultoría Empresarial`
  )
}

// Ordena: primero las reuniones más recientes.
export const porFechaDesc = (a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))

export function avance(tareas) {
  const hechas = tareas.filter((t) => t.estado === 'hecha').length
  return { hechas, total: tareas.length, pct: tareas.length ? Math.round((hechas / tareas.length) * 100) : 0 }
}

// Total pagado y pendiente de un proyecto a partir de sus pagos parciales.
export function resumenPagos(proyecto, pagos = []) {
  const suyos = pagos.filter((p) => p.proyecto_id === proyecto.id)
  const pagado = suyos.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const total = Number(proyecto.valor_total) || 0
  return {
    pagos: suyos,
    pagado,
    total,
    pendiente: total - pagado,
    pct: total ? Math.min(100, Math.round((pagado / total) * 100)) : 0,
  }
}
