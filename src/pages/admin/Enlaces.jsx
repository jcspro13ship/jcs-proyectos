import { useState } from 'react'
import { useAdmin } from './contexto'
import { Error } from '../../components/Marco'

const SUGERENCIAS = ['Sitio publicado', 'Google Sheet', 'Repositorio', 'Apps Script', 'WhatsApp del contacto', 'Carpeta de Drive', 'Cotización']

// Enlaces internos del proyecto. Solo los ve el administrador.
export default function Enlaces({ proyecto }) {
  const { datos, accion } = useAdmin()
  const enlaces = datos.enlaces.filter((e) => e.proyecto_id === proyecto.id)
  const [editando, setEditando] = useState(null) // id del enlace o 'nuevo'
  const [error, setError] = useState('')

  async function guardar(enlace) {
    const r = await accion('admin.guardarEnlace', { enlace: { ...enlace, proyecto_id: proyecto.id } })
    if (!r.ok) return setError(r.error)
    setError('')
    setEditando(null)
  }

  async function eliminar(e) {
    if (!confirm(`¿Eliminar el enlace "${e.etiqueta}"?`)) return
    const r = await accion('admin.eliminarEnlace', { id: e.id })
    setError(r.ok ? '' : r.error)
  }

  return (
    <div className="tarjeta">
      <p className="ayuda">Solo tú ves estos enlaces. Los participantes del link compartido no tienen acceso a ellos.</p>
      {error && <Error texto={error} />}
      <ul className="lista-enlaces">
        {enlaces.map((e) =>
          editando === e.id ? (
            <li key={e.id}><FilaEnlace inicial={e} onGuardar={guardar} onCancelar={() => setEditando(null)} /></li>
          ) : (
            <li key={e.id} className="enlace-fila">
              <a href={e.url} target="_blank" rel="noopener noreferrer"><strong>{e.etiqueta || 'Enlace'}</strong> ↗</a>
              <span className="texto-suave enlace-url">{e.url}</span>
              <span className="acciones-tarea">
                <button className="boton-icono" aria-label={`Editar ${e.etiqueta}`} onClick={() => setEditando(e.id)}>✎</button>
                <button className="boton-icono peligro" aria-label={`Eliminar ${e.etiqueta}`} onClick={() => eliminar(e)}>🗑</button>
              </span>
            </li>
          ),
        )}
        {enlaces.length === 0 && editando !== 'nuevo' && <li className="texto-suave">Sin enlaces todavía.</li>}
        {editando === 'nuevo' && <li><FilaEnlace inicial={{ etiqueta: '', url: '' }} onGuardar={guardar} onCancelar={() => setEditando(null)} /></li>}
      </ul>
      {editando !== 'nuevo' && <button className="boton boton-secundario" onClick={() => setEditando('nuevo')}>+ Agregar enlace</button>}
    </div>
  )
}

function FilaEnlace({ inicial, onGuardar, onCancelar }) {
  const [e, setE] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  return (
    <form
      className="fila-enlace-form"
      onSubmit={async (ev) => {
        ev.preventDefault()
        setGuardando(true)
        await onGuardar(e)
        setGuardando(false)
      }}
    >
      <input value={e.etiqueta} onChange={(x) => setE({ ...e, etiqueta: x.target.value })} placeholder="Nombre" list="sugerencias-enlace" required maxLength={80} aria-label="Nombre del enlace" />
      <datalist id="sugerencias-enlace">{SUGERENCIAS.map((s) => <option key={s} value={s} />)}</datalist>
      <input value={e.url} onChange={(x) => setE({ ...e, url: x.target.value })} placeholder="https://" type="url" required aria-label="URL" />
      <button className="boton boton-primario" disabled={guardando}>Guardar</button>
      <button type="button" className="boton boton-texto" onClick={onCancelar}>Cancelar</button>
    </form>
  )
}
