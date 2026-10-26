import { Link } from 'react-router-dom'
import { MARCA } from '../config'

// Encabezado blanco con el logo a color y filete ámbar (el logo a color no va
// sobre fondo oscuro), y pie institucional.
export function Encabezado({ derecha, enlaceLogo = '/' }) {
  return (
    <header className="encabezado">
      <div className="contenedor encabezado-fila">
        <Link to={enlaceLogo} className="logo-link" aria-label={MARCA.nombre}>
          <img src={`${import.meta.env.BASE_URL}logo-jcs.png`} alt={MARCA.nombre} className="logo" />
        </Link>
        {derecha && <div className="encabezado-derecha">{derecha}</div>}
      </div>
    </header>
  )
}

export function Pie({ children }) {
  return (
    <footer className="pie">
      <div className="contenedor">
        {children}
        <p>{MARCA.nombre} · {MARCA.correo}</p>
      </div>
    </footer>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return <p className="cargando">{texto}</p>
}

export function Error({ texto }) {
  return <div className="alerta-error" role="alert">{texto}</div>
}
