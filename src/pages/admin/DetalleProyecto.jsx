import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdmin } from './contexto'
import { Error } from '../../components/Marco'
import Modal from '../../components/Modal'
import Tarea from '../../components/Tarea'
import FormProyecto from './FormProyecto'
import { FormReunion, FormTarea } from './FormReunion'
import Enlaces from './Enlaces'
import Pagos from './Pagos'
import { avance, fechaCorta, linkCompartir, mensajeWhatsApp, porFechaDesc } from '../../utils'

const PESTANAS = [
  ['reuniones', 'Reuniones y tareas'],
  ['enlaces', 'Enlaces'],
  ['fase', 'Fase y pagos'],
  ['datos', 'Datos del proyecto'],
]

export default function DetalleProyecto() {
  const { id } = useParams()
  const { datos } = useAdmin()
  const [pestana, setPestana] = useState('reuniones')
  const proyecto = datos.proyectos.find((p) => p.id === id)

  if (!proyecto) {
    return <Error texto="Ese proyecto no existe o fue eliminado del Sheet." />
  }

  const tareas = datos.tareas.filter((t) => t.proyecto_id === id)
  const progreso = avance(tareas)

  return (
    <>
      <Link to="/admin" className="volver">← Todos los proyectos</Link>
      <div className="titulo-seccion">
        <div>
          <h1>{proyecto.nombre}</h1>
          <p className="texto-suave">
            {[proyecto.cliente, proyecto.fase, proyecto.estado].filter(Boolean).join(' · ')}
          </p>
          <div className="avance">
            <div className="avance-barra"><span style={{ width: `${progreso.pct}%` }} /></div>
            <span className="texto-suave">{progreso.hechas} de {progreso.total} tareas hechas</span>
          </div>
        </div>
      </div>

      <Compartir proyecto={proyecto} />

      <nav className="pestanas" role="tablist">
        {PESTANAS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} className={pestana === k ? 'activa' : ''} onClick={() => setPestana(k)}>
            {t}
          </button>
        ))}
      </nav>

      {pestana === 'reuniones' && <Reuniones proyecto={proyecto} />}
      {pestana === 'enlaces' && <Enlaces proyecto={proyecto} />}
      {pestana === 'fase' && (
        <>
          <Pagos proyecto={proyecto} />
          <div className="tarjeta"><FormProyecto key={`f-${proyecto.id}`} proyecto={proyecto} grupos={['fase']} /></div>
        </>
      )}
      {pestana === 'datos' && <div className="tarjeta"><FormProyecto key={`d-${proyecto.id}`} proyecto={proyecto} grupos={['datos', 'portafolio']} /></div>}
    </>
  )
}

function Compartir({ proyecto }) {
  const { accion } = useAdmin()
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const link = proyecto.token ? linkCompartir(proyecto.token) : ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar. Selecciona el link y cópialo a mano.')
    }
  }

  async function regenerar() {
    if (link && !confirm('El link actual dejará de funcionar y tendrás que enviar el nuevo a los participantes. ¿Continuar?')) return
    const r = await accion('admin.regenerarToken', { id: proyecto.id })
    setError(r.ok ? '' : r.error)
  }

  return (
    <section className="compartir">
      <div>
        <h2>Link para los participantes</h2>
        <p className="ayuda">Muestra solo las reuniones y tareas de este proyecto. Quien lo abra puede marcar el avance de las tareas.</p>
      </div>
      {link ? (
        <>
          <input className="link-compartir" value={link} readOnly onFocus={(e) => e.target.select()} aria-label="Link para compartir" />
          <div className="compartir-botones">
            <button className="boton boton-primario" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar link'}</button>
            <a className="boton boton-secundario" href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(proyecto))}`} target="_blank" rel="noopener noreferrer">
              Enviar por WhatsApp
            </a>
            <a className="boton boton-texto" href={link} target="_blank" rel="noopener noreferrer">Ver como invitado ↗</a>
            <button className="boton boton-texto" onClick={regenerar}>Regenerar link</button>
          </div>
        </>
      ) : (
        <button className="boton boton-primario" onClick={regenerar}>Crear link</button>
      )}
      {error && <Error texto={error} />}
    </section>
  )
}

function Reuniones({ proyecto }) {
  const { datos, accion } = useAdmin()
  const [modal, setModal] = useState(null) // { tipo: 'reunion' | 'tarea', ... }
  const [error, setError] = useState('')

  const reuniones = datos.reuniones.filter((r) => r.proyecto_id === proyecto.id).sort(porFechaDesc)
  const tareas = datos.tareas.filter((t) => t.proyecto_id === proyecto.id)
  const sueltas = tareas.filter((t) => !reuniones.some((r) => r.id === t.reunion_id))

  async function ejecutar(nombre, payload) {
    const r = await accion(nombre, payload)
    setError(r.ok ? '' : r.error)
  }

  const eliminarReunion = (r) => {
    const n = tareas.filter((t) => t.reunion_id === r.id).length
    if (confirm(`¿Eliminar la reunión "${r.titulo || fechaCorta(r.fecha)}"${n ? ` y sus ${n} tareas` : ''}? No se puede deshacer.`)) {
      ejecutar('admin.eliminarReunion', { id: r.id })
    }
  }
  const eliminarTarea = (t) => {
    if (confirm(`¿Eliminar la tarea "${t.titulo}"? No se puede deshacer.`)) ejecutar('admin.eliminarTarea', { id: t.id })
  }

  const filaTarea = (t) => (
    <Tarea
      key={t.id}
      tarea={t}
      onEstado={(estado) => ejecutar('admin.guardarTarea', { tarea: { id: t.id, estado } })}
      acciones={
        <div className="acciones-tarea">
          <button className="boton-icono" title="Editar tarea" aria-label={`Editar ${t.titulo}`} onClick={() => setModal({ tipo: 'tarea', tarea: t })}>✎</button>
          <button className="boton-icono peligro" title="Eliminar tarea" aria-label={`Eliminar ${t.titulo}`} onClick={() => eliminarTarea(t)}>🗑</button>
        </div>
      }
    />
  )

  return (
    <>
      <div className="barra-acciones">
        <button className="boton boton-primario" onClick={() => setModal({ tipo: 'reunion' })}>+ Nueva reunión</button>
        <button className="boton boton-secundario" onClick={() => setModal({ tipo: 'tarea', tarea: { reunion_id: '' } })}>+ Tarea suelta</button>
      </div>
      {error && <Error texto={error} />}

      {reuniones.length === 0 && sueltas.length === 0 && (
        <p className="vacio">Aún no hay reuniones. Después de la próxima reunión usa “+ Nueva reunión” y carga ahí todas las tareas.</p>
      )}

      {reuniones.map((r) => {
        const suyas = tareas.filter((t) => t.reunion_id === r.id)
        return (
          <section key={r.id} className="bloque-reunion">
            <header className="reunion-cabecera">
              <div>
                <h2>{r.titulo || 'Reunión'}</h2>
                <p className="texto-suave">{fechaCorta(r.fecha)}{r.asistentes ? ` · ${r.asistentes}` : ''}</p>
                {r.resumen && <p className="resumen">{r.resumen}</p>}
              </div>
              <div className="acciones-tarea">
                <button className="boton boton-texto" onClick={() => setModal({ tipo: 'tarea', tarea: { reunion_id: r.id } })}>+ Tarea</button>
                <button className="boton-icono" title="Editar reunión" aria-label="Editar reunión" onClick={() => setModal({ tipo: 'reunion', reunion: r })}>✎</button>
                <button className="boton-icono peligro" title="Eliminar reunión" aria-label="Eliminar reunión" onClick={() => eliminarReunion(r)}>🗑</button>
              </div>
            </header>
            {suyas.length === 0 ? <p className="texto-suave">Sin tareas.</p> : suyas.map(filaTarea)}
          </section>
        )
      })}

      {sueltas.length > 0 && (
        <section className="bloque-reunion">
          <header><h2>Otras tareas</h2></header>
          {sueltas.map(filaTarea)}
        </section>
      )}

      {modal?.tipo === 'reunion' && (
        <Modal titulo={modal.reunion ? 'Editar reunión' : 'Nueva reunión'} onCerrar={() => setModal(null)} ancho={760}>
          <FormReunion proyecto={proyecto} reunion={modal.reunion} onListo={() => setModal(null)} onCancelar={() => setModal(null)} />
        </Modal>
      )}
      {modal?.tipo === 'tarea' && (
        <Modal titulo={modal.tarea.id ? 'Editar tarea' : 'Nueva tarea'} onCerrar={() => setModal(null)}>
          <FormTarea proyecto={proyecto} tarea={modal.tarea} reuniones={reuniones} onListo={() => setModal(null)} onCancelar={() => setModal(null)} />
        </Modal>
      )}
    </>
  )
}
