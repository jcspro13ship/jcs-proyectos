// En el link de un invitado, la app instalada debe abrir SU proyecto, no el
// panel de administración. Mientras esa página está abierta se reemplaza el
// manifest por uno que arranca en el link del proyecto.
export function usarManifestDeProyecto(nombre) {
  const link = document.querySelector('link[rel="manifest"]')
  const titulo = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (!link) return () => {}
  const original = { href: link.getAttribute('href'), titulo: titulo?.getAttribute('content') }

  const base = new URL(import.meta.env.BASE_URL, location.origin).href
  const manifest = {
    name: `${nombre} · JCS`,
    short_name: nombre.length > 18 ? nombre.slice(0, 17) + '…' : nombre,
    lang: 'es',
    start_url: location.href,
    scope: base,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: `${base}icono-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icono-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${base}icono-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  link.setAttribute('href', 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest)))
  titulo?.setAttribute('content', manifest.short_name)

  return () => {
    link.setAttribute('href', original.href)
    if (titulo && original.titulo) titulo.setAttribute('content', original.titulo)
  }
}
