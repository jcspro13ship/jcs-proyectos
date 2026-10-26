import { useEffect, useState } from 'react'
import { llamar } from '../api'
import { MARCA } from '../config'
import { Encabezado, Pie, Cargando, Error } from '../components/Marco'

// Portafolio público: solo lo que el servidor deja salir (nombre público, rubro,
// resumen, año y link) de los proyectos marcados para publicar.
export default function Portafolio() {
  const [estado, setEstado] = useState({ cargando: true })

  useEffect(() => {
    llamar({ accion: 'portafolio' }).then((r) =>
      setEstado(r.ok ? { proyectos: r.proyectos } : { error: r.error }),
    )
  }, [])

  return (
    <div className="pagina">
      <Encabezado />
      <main className="contenedor">
        <section className="portada">
          <p className="eslogan">{MARCA.eslogan}</p>
          <h1>Proyectos realizados</h1>
          <p className="texto-suave">
            Catálogos digitales y sistemas de gestión hechos a la medida de pequeñas empresas.
          </p>
        </section>

        {estado.cargando && <Cargando />}
        {estado.error && <Error texto={estado.error} />}
        {estado.proyectos && estado.proyectos.length === 0 && (
          <p className="vacio">Muy pronto encontrarás aquí los proyectos publicados.</p>
        )}
        {estado.proyectos && estado.proyectos.length > 0 && (
          <div className="rejilla">
            {estado.proyectos.map((p, i) => (
              <article key={i} className="tarjeta tarjeta-portafolio">
                {p.rubro && <span className="etiqueta">{p.rubro}</span>}
                <h2>{p.nombre}</h2>
                {p.resumen && <p>{p.resumen}</p>}
                <div className="tarjeta-pie">
                  {p.anio ? <span className="texto-suave">{p.anio}</span> : <span />}
                  {p.url && /^https?:\/\//.test(p.url) && (
                    <a className="boton boton-secundario" href={p.url} target="_blank" rel="noopener noreferrer">
                      Ver sitio
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Pie />
    </div>
  )
}
