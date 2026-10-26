import { useState } from 'react'
import { FASES, LINEAS, ESTADOS_PROYECTO } from '../../config'
import { useAdmin } from './contexto'
import { Error } from '../../components/Marco'

const VACIO = {
  nombre: '', cliente: '', contacto: '', rubro: '', linea: 'Catálogo', fase: 'Levantamiento', estado: 'activo',
  valor_total: '',
  publicar: false, nombre_publico: '', resumen_publico: '', url_publica: '', anio: new Date().getFullYear(),
}

// Formulario completo del proyecto. `campos` permite mostrar solo un grupo
// (por ejemplo la pestaña "Fase y pagos"; los pagos en sí van en Pagos.jsx).
export default function FormProyecto({ proyecto, onListo, onCancelar, grupos = ['datos', 'fase', 'portafolio'] }) {
  const { accion } = useAdmin()
  const [f, setF] = useState(() => ({ ...VACIO, ...(proyecto || {}) }))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const set = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((x) => ({ ...x, [campo]: v }))
    setGuardado(false)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!String(f.nombre).trim()) return setError('El proyecto necesita un nombre.')
    setGuardando(true)
    const { token, ...sinToken } = f
    const r = await accion('admin.guardarProyecto', { proyecto: sinToken })
    setGuardando(false)
    if (!r.ok) return setError(r.error)
    setError('')
    setGuardado(true)
    onListo?.(r.proyecto)
  }

  return (
    <form className="formulario" onSubmit={guardar}>
      {grupos.includes('datos') && (
        <fieldset>
          <legend>Datos del proyecto</legend>
          <div className="campos-2">
            <Campo etiqueta="Nombre del proyecto *"><input value={f.nombre} onChange={set('nombre')} required maxLength={120} /></Campo>
            <Campo etiqueta="Cliente"><input value={f.cliente} onChange={set('cliente')} maxLength={120} /></Campo>
            <Campo etiqueta="Contacto(s)"><input value={f.contacto} onChange={set('contacto')} maxLength={200} /></Campo>
            <Campo etiqueta="Rubro"><input value={f.rubro} onChange={set('rubro')} maxLength={120} /></Campo>
            <Campo etiqueta="Línea">
              <select value={f.linea} onChange={set('linea')}>
                {LINEAS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Estado">
              <select value={f.estado} onChange={set('estado')}>
                {ESTADOS_PROYECTO.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
              </select>
            </Campo>
          </div>
        </fieldset>
      )}

      {grupos.includes('fase') && (
        <fieldset>
          <legend>Fase y valor del proyecto</legend>
          <div className="campos-2">
            <Campo etiqueta="Fase actual">
              <input value={f.fase} onChange={set('fase')} list="lista-fases" maxLength={80} />
              <datalist id="lista-fases">{FASES.map((x) => <option key={x} value={x} />)}</datalist>
            </Campo>
            <Campo etiqueta="Valor total (COP)">
              <input value={f.valor_total} onChange={set('valor_total')} inputMode="numeric" placeholder="3450000" />
            </Campo>
          </div>
        </fieldset>
      )}

      {grupos.includes('portafolio') && (
        <fieldset>
          <legend>Portafolio público</legend>
          <label className="casilla-destacada">
            <input type="checkbox" checked={!!f.publicar} onChange={set('publicar')} />
            Mostrar este proyecto en el portafolio público
          </label>
          <p className="ayuda">Solo se publican estos campos. Nada más del proyecto sale del Sheet.</p>
          <div className="campos-2">
            <Campo etiqueta="Nombre público"><input value={f.nombre_publico} onChange={set('nombre_publico')} placeholder={f.nombre} maxLength={120} /></Campo>
            <Campo etiqueta="Año"><input value={f.anio} onChange={set('anio')} inputMode="numeric" maxLength={4} /></Campo>
          </div>
          <Campo etiqueta="Resumen público (1 o 2 líneas)">
            <textarea value={f.resumen_publico} onChange={set('resumen_publico')} rows={2} maxLength={240} />
          </Campo>
          <Campo etiqueta="Link al sitio"><input value={f.url_publica} onChange={set('url_publica')} type="url" placeholder="https://" /></Campo>
        </fieldset>
      )}

      {error && <Error texto={error} />}
      <div className="acciones-form">
        {guardado && !onCancelar && <span className="ok-texto">✓ Guardado</span>}
        {onCancelar && <button type="button" className="boton boton-secundario" onClick={onCancelar}>Cancelar</button>}
        <button className="boton boton-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}

export function Campo({ etiqueta, children }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
    </label>
  )
}
