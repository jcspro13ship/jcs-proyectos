// Service worker mínimo: permite instalar la app. No guarda nada en caché a
// propósito, así cada apertura trae la última versión publicada y los datos
// siempre salen frescos del Sheet.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
