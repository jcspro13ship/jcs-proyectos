import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { llamar } from '../api'
import { Encabezado, Pie, Cargando, Error } from '../components/Marco'
import { avance, fechaCorta, porFechaDesc } from '../utils'
import Tarea from '../components/Tarea'

// Vista para los invitados de una reunión. El servidor solo devuelve el nombre
// del proyecto del link, sus reuniones y sus tareas.
export default function Compartido() {
  const { token } = useParams()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [quien, setQuien] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    setDatos(null)
    setError('')
    llamar({ accion: 'verProyecto', token }).then((r) => {
      if (r.ok) setDatos(r)
      else setError(r.error)
    })
  }, [token])

  const responsables = useMemo(() => {
    if (!datos) return []
    const set = new Set()
    datos.tareas.forEach((t) =>
      String(t.responsable || '').split(/,| y /).map((s) => s.trim()).filter(Boolean).forEach((n) => set.add(n)),
    )
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [datos])

  async function cambiarEstado(tarea, estado) {
    const anterior = tarea.estado
    actualizarTarea(tarea.id, { estado })
    const r = await llamar({ accion: 'cambiarEstado', token, tarea_id: tarea.id, estado })
    if (!r.ok) {
      actualizarTarea(tarea.id, { estado: anterior })
      setAviso(r.error || 'No se pudo guardar el cambio.')
    } else setAviso('')
  }

  function actualizarTarea(id, cambios) {
    setDatos((d) => ({ ...d, tareas: d.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)) }))
  }

  if (error) {
    return (
      <div className="pagina">
        <Encabezado enlaceLogo={`/p/${token}`} />
        <main className="contenedor"><Error texto={error} /></main>
        <Pie />
      </div>
    )
  }
  if (!datos) {
    return (
      <div className="pagina">
        <Encabezado enlaceLogo={`/p/${token}`} />
        <main className="contenedor"><Cargando texto="Cargando el proyecto…" /></main>
      </div>
    )
  }

  const visibles = quien
    ? datos.tareas.filter((t) => String(t.responsable || '').toLowerCase().includes(quien.toLowerCase()))
    : datos.tareas
  const progreso = avance(datos.tareas)
  const reuniones = [...datos.reuniones].sort(porFechaDesc)
  const sinReunion = visibles.filter((t) => !datos.reuniones.some((r) => r.id === t.reunion_id))

  return (
    <div className="pagina">
      <Encabezado enlaceLogo={`/p/${token}`} />
      <main className="contenedor contenedor-angosto">
        <section className="cabecera-proyecto">
          <p className="eslogan">Tareas y pendientes</p>
          <h1>{datos.proyecto.nombre}</h1>
          <div className="avance" aria-label={`${progreso.hechas} de ${progreso.total} tareas hechas`}>
            <div className="avance-barra"><span style={{ width: `${progreso.pct}%` }} /></div>
            <span className="texto-suave">{progreso.hechas} de {progreso.total} tareas hechas</span>
          </div>
        </section>

        {responsables.length > 1 && (
          <div className="filtro-quien" role="group" aria-label="Filtrar por responsable">
            <span className="texto-suave">Ver tareas de:</span>
            <button className={'chip' + (quien === '' ? ' activo' : '')} onClick={() => setQuien('')}>Todos</button>
            {responsables.map((n) => (
              <button key={n} className={'chip' + (quien === n ? ' activo' : '')} onClick={() => setQuien(n)}>{n}</button>
            ))}
          </div>
        )}

        {aviso && <Error texto={aviso} />}

        {datos.tareas.length === 0 && <p className="vacio">Todavía no hay tareas registradas en este proyecto.</p>}

        {reuniones.map((r) => {
          const tareas = visibles.filter((t) => t.reunion_id === r.id)
          if (quien && tareas.length === 0) return null
          return (
            <section key={r.id} className="bloque-reunion">
              <header>
                <h2>{r.titulo || 'Reunión'}</h2>
                <p className="texto-suave">
                  {fechaCorta(r.fecha)}{r.asistentes ? ` · ${r.asistentes}` : ''}
                </p>
                {r.resumen && <p className="resumen">{r.resumen}</p>}
              </header>
              {tareas.length === 0
                ? <p className="texto-suave">Sin tareas en esta reunión.</p>
                : tareas.map((t) => <Tarea key={t.id} tarea={t} onEstado={(e) => cambiarEstado(t, e)} />)}
            </section>
          )
        })}

        {sinReunion.length > 0 && (
          <section className="bloque-reunion">
            <header><h2>Otras tareas</h2></header>
            {sinReunion.map((t) => <Tarea key={t.id} tarea={t} onEstado={(e) => cambiarEstado(t, e)} />)}
          </section>
        )}
      </main>
      <Pie>
        <p className="confidencial">Información confidencial del proyecto {datos.proyecto.nombre}. No reenvíes este link a personas ajenas al proyecto.</p>
      </Pie>
    </div>
  )
}
