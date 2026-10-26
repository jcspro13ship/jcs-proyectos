import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from './contexto'
import { pesos, vencida, resumenPagos } from '../../utils'
import Modal from '../../components/Modal'
import FormProyecto from './FormProyecto'

export default function Tablero() {
  const { datos } = useAdmin()
  const navigate = useNavigate()
  const [verArchivados, setVerArchivados] = useState(false)
  const [editando, setEditando] = useState(null) // proyecto | 'nuevo' | null

  const proyectos = datos.proyectos.filter((p) => verArchivados || p.estado !== 'archivado')
  const archivados = datos.proyectos.filter((p) => p.estado === 'archivado').length

  const totales = datos.proyectos.reduce((acc, p) => {
    if (p.estado === 'archivado') return acc
    const tareas = datos.tareas.filter((t) => t.proyecto_id === p.id)
    acc.pendientes += tareas.filter((t) => t.estado !== 'hecha').length
    acc.vencidas += tareas.filter(vencida).length
    acc.porCobrar += Math.max(0, resumenPagos(p, datos.pagos).pendiente)
    return acc
  }, { pendientes: 0, vencidas: 0, porCobrar: 0 })

  return (
    <>
      <div className="titulo-seccion">
        <div>
          <h1>Proyectos</h1>
          <p className="texto-suave">
            {proyectos.length} proyectos · {totales.pendientes} tareas abiertas
            {totales.vencidas > 0 && <> · <span className="vencida">{totales.vencidas} vencidas</span></>}
            {totales.porCobrar > 0 && <> · {pesos(totales.porCobrar)} por cobrar</>}
          </p>
        </div>
        <button className="boton boton-primario" onClick={() => setEditando('nuevo')}>+ Nuevo proyecto</button>
      </div>

      <div className="rejilla">
        {proyectos.map((p) => {
          const tareas = datos.tareas.filter((t) => t.proyecto_id === p.id)
          const abiertas = tareas.filter((t) => t.estado !== 'hecha').length
          const vencidas = tareas.filter(vencida).length
          const enlaces = datos.enlaces.filter((e) => e.proyecto_id === p.id)
          return (
            <article key={p.id} className={`tarjeta tarjeta-proyecto${p.estado === 'archivado' ? ' archivado' : ''}`}>
              <div className="tarjeta-tope">
                <span className="etiqueta">{p.linea || 'Proyecto'}</span>
                <span className={`estado-proyecto ep-${p.estado}`}>{p.estado}</span>
              </div>
              <h2><Link to={`/admin/proyecto/${p.id}`}>{p.nombre}</Link></h2>
              <p className="texto-suave">{p.cliente}</p>

              <dl className="datos-proyecto">
                <div><dt>Fase</dt><dd>{p.fase || '—'}</dd></div>
                <div><dt>Valor</dt><dd>{pesos(p.valor_total)}</dd></div>
                <div>
                  <dt>Pagos</dt>
                  <dd>
                    <PagosCorto resumen={resumenPagos(p, datos.pagos)} />
                  </dd>
                </div>
                <div>
                  <dt>Tareas</dt>
                  <dd>
                    {abiertas} abiertas{vencidas > 0 && <span className="vencida"> · {vencidas} vencidas</span>}
                  </dd>
                </div>
              </dl>

              {enlaces.length > 0 && (
                <div className="enlaces-rapidos">
                  {enlaces.slice(0, 4).map((e) => (
                    <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer">{e.etiqueta || 'Enlace'} ↗</a>
                  ))}
                </div>
              )}

              <div className="tarjeta-pie">
                <button className="boton boton-texto" onClick={() => setEditando(p)}>Editar</button>
                <Link className="boton boton-secundario" to={`/admin/proyecto/${p.id}`}>Abrir</Link>
              </div>
            </article>
          )
        })}
      </div>

      {archivados > 0 && (
        <button className="boton boton-texto ver-archivados" onClick={() => setVerArchivados((v) => !v)}>
          {verArchivados ? 'Ocultar archivados' : `Ver archivados (${archivados})`}
        </button>
      )}

      {editando && (
        <Modal titulo={editando === 'nuevo' ? 'Nuevo proyecto' : `Editar · ${editando.nombre}`} onCerrar={() => setEditando(null)} ancho={720}>
          <FormProyecto
            proyecto={editando === 'nuevo' ? null : editando}
            onCancelar={() => setEditando(null)}
            onListo={(p) => {
              const eraNuevo = editando === 'nuevo'
              setEditando(null)
              if (eraNuevo) navigate(`/admin/proyecto/${p.id}`)
            }}
          />
        </Modal>
      )}
    </>
  )
}

function PagosCorto({ resumen }) {
  if (!resumen.total && !resumen.pagado) return <span className="pago-no">Sin valor ni pagos</span>
  if (!resumen.total) return <span>{pesos(resumen.pagado)} pagado</span>
  return (
    <span className={resumen.pendiente <= 0 ? 'pago-ok' : ''}>
      {resumen.pendiente <= 0 ? 'Pagado completo ✓' : <>{pesos(resumen.pagado)} · <span className="pago-no">falta {pesos(resumen.pendiente)}</span></>}
    </span>
  )
}
