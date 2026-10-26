import { useState } from 'react'
import { useAdmin } from './contexto'
import { Error } from '../../components/Marco'
import { Campo } from './FormProyecto'
import { ESTADOS_TAREA } from '../../config'
import { hoyISO } from '../../utils'

const tareaVacia = () => ({ clave: crypto.randomUUID(), titulo: '', responsable: '', fecha_limite: '', detalle: '' })

// Pensado para llenarlo al salir de la reunión: datos de la reunión y todas
// sus tareas en un solo formulario.
export function FormReunion({ proyecto, reunion, onListo, onCancelar }) {
  const { accion } = useAdmin()
  const editando = !!reunion
  const [r, setR] = useState(() => ({
    fecha: hoyISO(), titulo: '', asistentes: '', resumen: '', ...(reunion || {}),
  }))
  const [tareas, setTareas] = useState(() => (editando ? [] : [tareaVacia()]))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const setCampo = (c) => (e) => setR((x) => ({ ...x, [c]: e.target.value }))
  const setTarea = (clave, c) => (e) =>
    setTareas((ts) => ts.map((t) => (t.clave === clave ? { ...t, [c]: e.target.value } : t)))

  // Los asistentes sirven de sugerencia para el responsable.
  const personas = String(r.asistentes).split(',').map((s) => s.trim()).filter(Boolean)

  async function guardar(e) {
    e.preventDefault()
    if (!r.fecha) return setError('Indica la fecha de la reunión.')
    setGuardando(true)
    const res = await accion('admin.guardarReunion', {
      reunion: { ...r, proyecto_id: proyecto.id },
      tareas: tareas.filter((t) => t.titulo.trim()).map(({ clave, ...t }) => t),
    })
    setGuardando(false)
    if (!res.ok) return setError(res.error)
    onListo()
  }

  return (
    <form className="formulario" onSubmit={guardar}>
      <div className="campos-2">
        <Campo etiqueta="Fecha *"><input type="date" value={r.fecha} onChange={setCampo('fecha')} required /></Campo>
        <Campo etiqueta="Título"><input value={r.titulo} onChange={setCampo('titulo')} placeholder="Ej. Revisión de avance" maxLength={120} /></Campo>
      </div>
      <Campo etiqueta="Asistentes (separados por coma)">
        <input value={r.asistentes} onChange={setCampo('asistentes')} placeholder="Nombre del cliente, Juan Carlos Santos" maxLength={300} />
      </Campo>
      <Campo etiqueta="Resumen o acuerdos">
        <textarea value={r.resumen} onChange={setCampo('resumen')} rows={3} maxLength={2000} />
      </Campo>

      {!editando && (
        <fieldset>
          <legend>Tareas de la reunión</legend>
          <datalist id="lista-personas">{personas.map((p) => <option key={p} value={p} />)}</datalist>
          {tareas.map((t, i) => (
            <div key={t.clave} className="tarea-nueva">
              <div className="tarea-nueva-cabecera">
                <strong>Tarea {i + 1}</strong>
                {tareas.length > 1 && (
                  <button type="button" className="boton-icono" aria-label={`Quitar tarea ${i + 1}`} onClick={() => setTareas((ts) => ts.filter((x) => x.clave !== t.clave))}>✕</button>
                )}
              </div>
              <Campo etiqueta="Qué hay que hacer"><input value={t.titulo} onChange={setTarea(t.clave, 'titulo')} maxLength={200} /></Campo>
              <div className="campos-2">
                <Campo etiqueta="Responsable"><input value={t.responsable} onChange={setTarea(t.clave, 'responsable')} list="lista-personas" maxLength={120} /></Campo>
                <Campo etiqueta="Fecha límite"><input type="date" value={t.fecha_limite} onChange={setTarea(t.clave, 'fecha_limite')} /></Campo>
              </div>
              <Campo etiqueta="Detalle"><textarea value={t.detalle} onChange={setTarea(t.clave, 'detalle')} rows={2} maxLength={2000} /></Campo>
            </div>
          ))}
          <button type="button" className="boton boton-secundario" onClick={() => setTareas((ts) => [...ts, tareaVacia()])}>+ Agregar tarea</button>
        </fieldset>
      )}

      {error && <Error texto={error} />}
      <div className="acciones-form">
        <button type="button" className="boton boton-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="boton boton-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar' : `Guardar reunión${tareas.some((t) => t.titulo.trim()) ? ' y tareas' : ''}`}
        </button>
      </div>
    </form>
  )
}

export function FormTarea({ proyecto, tarea, reuniones, onListo, onCancelar }) {
  const { accion } = useAdmin()
  const [t, setT] = useState(() => ({
    titulo: '', detalle: '', responsable: '', fecha_limite: '', estado: 'pendiente', reunion_id: '', ...tarea,
  }))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (c) => (e) => setT((x) => ({ ...x, [c]: e.target.value }))

  async function guardar(e) {
    e.preventDefault()
    if (!t.titulo.trim()) return setError('La tarea necesita un título.')
    setGuardando(true)
    const r = await accion('admin.guardarTarea', { tarea: { ...t, proyecto_id: proyecto.id } })
    setGuardando(false)
    if (!r.ok) return setError(r.error)
    onListo()
  }

  return (
    <form className="formulario" onSubmit={guardar}>
      <Campo etiqueta="Qué hay que hacer *"><input value={t.titulo} onChange={set('titulo')} required maxLength={200} autoFocus /></Campo>
      <Campo etiqueta="Detalle"><textarea value={t.detalle} onChange={set('detalle')} rows={3} maxLength={2000} /></Campo>
      <div className="campos-2">
        <Campo etiqueta="Responsable"><input value={t.responsable} onChange={set('responsable')} maxLength={120} /></Campo>
        <Campo etiqueta="Fecha límite"><input type="date" value={t.fecha_limite} onChange={set('fecha_limite')} /></Campo>
        <Campo etiqueta="Estado">
          <select value={t.estado} onChange={set('estado')}>
            {ESTADOS_TAREA.map((e) => <option key={e} value={e}>{e[0].toUpperCase() + e.slice(1)}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Reunión">
          <select value={t.reunion_id} onChange={set('reunion_id')}>
            <option value="">Sin reunión</option>
            {reuniones.map((r) => <option key={r.id} value={r.id}>{r.fecha} · {r.titulo || 'Reunión'}</option>)}
          </select>
        </Campo>
      </div>
      {error && <Error texto={error} />}
      <div className="acciones-form">
        <button type="button" className="boton boton-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="boton boton-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}
