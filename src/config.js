// URL del Apps Script publicado (va en .env.local, que no se sube al repo).
// Si está vacía, la app arranca en modo prueba con datos ficticios.
export const API_URL = import.meta.env.VITE_API_URL || ''
export const MODO_PRUEBA = !API_URL

export const MARCA = {
  nombre: 'JCS Consultoría Empresarial',
  eslogan: 'Cree, Emprende, Inspira',
  correo: 'juan.k.santos13@gmail.com',
}

export const FASES = ['Levantamiento', 'Montaje de datos', 'Desarrollo', 'Publicación', 'Capacitación y soporte', 'Entregado']
export const LINEAS = ['Catálogo', 'ERP', 'Periodismo', 'Otro']
export const ESTADOS_PROYECTO = ['activo', 'pausado', 'entregado', 'archivado']
export const ESTADOS_TAREA = ['pendiente', 'en curso', 'hecha']
