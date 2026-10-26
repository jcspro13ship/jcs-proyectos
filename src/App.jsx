import { Routes, Route, Navigate } from 'react-router-dom'
import Portafolio from './pages/Portafolio'
import Compartido from './pages/Compartido'
import Admin from './pages/Admin'
import { MODO_PRUEBA } from './config'

export default function App() {
  return (
    <>
      {MODO_PRUEBA && (
        <div className="aviso-prueba">
          Modo prueba: datos ficticios, sin Sheet conectado. Clave del panel: <b>demo</b>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Portafolio />} />
        <Route path="/p/:token" element={<Compartido />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
