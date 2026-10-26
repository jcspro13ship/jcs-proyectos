import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { llamarAdmin } from '../api'
import { Encabezado, Cargando, Error } from '../components/Marco'
import Tablero from './admin/Tablero'
import DetalleProyecto from './admin/DetalleProyecto'
import { AdminContext } from './admin/contexto'

const CLAVE_SESION = 'jcs-panel-clave'


function leerClave() {
  try { return sessionStorage.getItem(CLAVE_SESION) || '' } catch { return '' }
}
function guardarClave(v) {
  try { v ? sessionStorage.setItem(CLAVE_SESION, v) : sessionStorage.removeItem(CLAVE_SESION) } catch { /* sin almacenamiento */ }
}

export default function Admin() {
  const [clave, setClave] = useState(leerClave)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  const salir = useCallback(() => {
    guardarClave('')
    setClave('')
    setDatos(null)
  }, [])

  const recargar = useCallback(async () => {
    if (!clave) return
    const r = await llamarAdmin(clave, 'admin.todo')
    if (r.ok) {
      setDatos(r)
      setError('')
    } else if (r.claveIncorrecta) {
      salir()
    } else setError(r.error)
  }, [clave, salir])

  useEffect(() => { recargar() }, [recargar])

  // Ejecuta una acción de admin y, si sale bien, vuelve a leer todo del Sheet.
  const accion = useCallback(async (nombre, payload) => {
    const r = await llamarAdmin(clave, nombre, payload)
    if (r.ok) await recargar()
    else if (r.claveIncorrecta) salir()
    return r
  }, [clave, recargar, salir])

  if (!clave) return <Acceso onEntrar={(c) => { guardarClave(c); setClave(c) }} />

  return (
    <AdminContext.Provider value={{ datos, accion, recargar }}>
      <div className="pagina">
        <Encabezado
          enlaceLogo="/admin"
          derecha={
            <>
              <Link to="/admin" className="enlace-nav">Proyectos</Link>
              <button className="boton boton-texto" onClick={salir}>Salir</button>
            </>
          }
        />
        <main className="contenedor">
          {error && <Error texto={error} />}
          {!datos && !error && <Cargando texto="Leyendo el Sheet…" />}
          {datos && (
            <Routes>
              <Route index element={<Tablero />} />
              <Route path="proyecto/:id" element={<DetalleProyecto />} />
            </Routes>
          )}
        </main>
      </div>
    </AdminContext.Provider>
  )
}

function Acceso({ onEntrar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  async function entrar(e) {
    e.preventDefault()
    setEnviando(true)
    const r = await llamarAdmin(clave, 'admin.verificar')
    setEnviando(false)
    if (r.ok) onEntrar(clave)
    else setError(r.error)
  }

  return (
    <div className="pagina pagina-acceso">
      <form className="tarjeta acceso" onSubmit={entrar}>
        <img src={`${import.meta.env.BASE_URL}pentagono.png`} alt="" className="acceso-simbolo" />
        <h1>Panel de proyectos</h1>
        <p className="texto-suave">JCS Consultoría Empresarial</p>
        <label className="campo">
          <span>Clave</span>
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && <Error texto={error} />}
        <button className="boton boton-primario" disabled={!clave || enviando}>
          {enviando ? 'Verificando…' : 'Entrar'}
        </button>
        <button type="button" className="boton boton-texto" onClick={() => navigate('/')}>Ver portafolio</button>
      </form>
    </div>
  )
}
