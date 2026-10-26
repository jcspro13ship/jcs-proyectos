import { ESTADOS_TAREA } from '../config'
import { fechaCorta, vencida } from '../utils'

const ETIQUETAS = { pendiente: 'Pendiente', 'en curso': 'En curso', hecha: 'Hecha' }

// Una tarea con su selector de estado. Se usa en la vista compartida y en el panel.
export default function Tarea({ tarea, onEstado, acciones }) {
  const atrasada = vencida(tarea)
  return (
    <article className={`tarea estado-${tarea.estado.replace(' ', '-')}${atrasada ? ' atrasada' : ''}`}>
      <div className="tarea-cuerpo">
        <h3>{tarea.titulo}</h3>
        {tarea.detalle && <p className="tarea-detalle">{tarea.detalle}</p>}
        <p className="tarea-meta">
          {tarea.responsable && <span>👤 {tarea.responsable}</span>}
          {tarea.fecha_limite && (
            <span className={atrasada ? 'vencida' : ''}>
              📅 {fechaCorta(tarea.fecha_limite)}{atrasada ? ' · vencida' : ''}
            </span>
          )}
        </p>
      </div>
      <div className="tarea-lado">
        <select
          value={tarea.estado}
          onChange={(e) => onEstado(e.target.value)}
          aria-label={`Estado de ${tarea.titulo}`}
          className="selector-estado"
        >
          {ESTADOS_TAREA.map((e) => <option key={e} value={e}>{ETIQUETAS[e]}</option>)}
        </select>
        {acciones}
      </div>
    </article>
  )
}
