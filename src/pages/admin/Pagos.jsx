import { useState } from 'react'
import { useAdmin } from './contexto'
import { Error } from '../../components/Marco'
import { Campo } from './FormProyecto'
import { fechaCorta, hoyISO, pesos, resumenPagos } from '../../utils'

const CONCEPTOS = ['Anticipo 50%', 'Abono', 'Saldo final', 'Soporte', 'Otro']
const MEDIOS = ['Transferencia', 'Link de pago', 'Tarjeta', 'Efectivo']

// Pagos parciales del cliente con su fecha. Solo los ve el administrador.
export default function Pagos({ proyecto }) {
  const { datos, accion } = useAdmin()
  const r = resumenPagos(proyecto, datos.pagos)
  const pagos = [...r.pagos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
  const [editando, setEditando] = useState(null) // id del pago o 'nuevo'
  const [error, setError] = useState('')

  let acumulado = 0
  const filas = pagos.map((p) => {
    acumulado += Number(p.valor) || 0
    return { ...p, acumulado }
  })

  async function guardar(pago) {
    const res = await accion('admin.guardarPago', { pago: { ...pago, proyecto_id: proyecto.id } })
    if (!res.ok) return setError(res.error)
    setError('')
    setEditando(null)
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar el pago de ${pesos(p.valor)} del ${fechaCorta(p.fecha)}? No se puede deshacer.`)) return
    const res = await accion('admin.eliminarPago', { id: p.id })
    setError(res.ok ? '' : res.error)
  }

  return (
    <div className="tarjeta pagos">
      <div className="pagos-resumen">
        <div><span className="texto-suave">Valor del proyecto</span><strong>{r.total ? pesos(r.total) : 'Sin definir'}</strong></div>
        <div><span className="texto-suave">Pagado</span><strong className="pago-ok">{pesos(r.pagado)}</strong></div>
        <div>
          <span className="texto-suave">{r.pendiente < 0 ? 'Pagado de más' : 'Pendiente'}</span>
          <strong className={r.pendiente > 0 ? 'vencida' : ''}>{r.total ? pesos(Math.abs(r.pendiente)) : '—'}</strong>
        </div>
      </div>
      {r.total > 0 && (
        <div className="avance">
          <div className="avance-barra avance-ancha"><span style={{ width: `${r.pct}%` }} /></div>
          <span className="texto-suave">{r.pct}% pagado</span>
        </div>
      )}
      {!r.total && <p className="ayuda">Define el valor del proyecto abajo para ver cuánto falta por cobrar.</p>}

      {error && <Error texto={error} />}

      <div className="tabla-pagos" role="table" aria-label="Pagos registrados">
        {filas.length > 0 && (
          <div className="fila-pago encabezado-pagos" role="row">
            <span>Fecha</span><span>Concepto</span><span>Medio</span><span className="num">Valor</span><span className="num">Acumulado</span><span />
          </div>
        )}
        {filas.map((p) =>
          editando === p.id ? (
            <FormPago key={p.id} inicial={p} onGuardar={guardar} onCancelar={() => setEditando(null)} />
          ) : (
            <div key={p.id} className="fila-pago" role="row">
              <span>{fechaCorta(p.fecha)}</span>
              <span>{p.concepto || '—'}{p.nota && <small className="texto-suave nota-pago">{p.nota}</small>}</span>
              <span className="texto-suave">{p.medio}</span>
              <span className="num"><strong>{pesos(p.valor)}</strong></span>
              <span className="num texto-suave">{pesos(p.acumulado)}</span>
              <span className="acciones-tarea">
                <button className="boton-icono" aria-label={`Editar pago del ${fechaCorta(p.fecha)}`} onClick={() => setEditando(p.id)}>✎</button>
                <button className="boton-icono peligro" aria-label={`Eliminar pago del ${fechaCorta(p.fecha)}`} onClick={() => eliminar(p)}>🗑</button>
              </span>
            </div>
          ),
        )}
        {filas.length === 0 && editando !== 'nuevo' && <p className="texto-suave">Todavía no hay pagos registrados.</p>}
        {editando === 'nuevo' && (
          <FormPago
            inicial={{ fecha: hoyISO(), valor: '', concepto: pagos.length ? 'Abono' : 'Anticipo 50%', medio: 'Transferencia', nota: '' }}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        )}
      </div>

      {editando !== 'nuevo' && (
        <button className="boton boton-primario" onClick={() => setEditando('nuevo')}>+ Registrar pago</button>
      )}
    </div>
  )
}

function FormPago({ inicial, onGuardar, onCancelar }) {
  const [p, setP] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = (c) => (e) => setP((x) => ({ ...x, [c]: e.target.value }))

  return (
    <form
      className="form-pago"
      onSubmit={async (e) => {
        e.preventDefault()
        setGuardando(true)
        await onGuardar(p)
        setGuardando(false)
      }}
    >
      <div className="form-pago-campos">
        <Campo etiqueta="Fecha *"><input type="date" value={p.fecha} onChange={set('fecha')} required /></Campo>
        <Campo etiqueta="Valor (COP) *"><input value={p.valor} onChange={set('valor')} inputMode="numeric" placeholder="500000" required autoFocus /></Campo>
        <Campo etiqueta="Concepto">
          <input value={p.concepto} onChange={set('concepto')} list="conceptos-pago" maxLength={80} />
          <datalist id="conceptos-pago">{CONCEPTOS.map((c) => <option key={c} value={c} />)}</datalist>
        </Campo>
        <Campo etiqueta="Medio">
          <input value={p.medio} onChange={set('medio')} list="medios-pago" maxLength={60} />
          <datalist id="medios-pago">{MEDIOS.map((c) => <option key={c} value={c} />)}</datalist>
        </Campo>
      </div>
      <Campo etiqueta="Nota"><input value={p.nota} onChange={set('nota')} placeholder="Ej. número de comprobante" maxLength={300} /></Campo>
      <div className="acciones-form">
        <button type="button" className="boton boton-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="boton boton-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar pago'}</button>
      </div>
    </form>
  )
}
