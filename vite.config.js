import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en github.io/jcs-proyectos/, por eso el base
// coincide con el nombre del repo. Si algún día se conecta un dominio propio,
// este valor vuelve a '/'.
export default defineConfig({
  plugins: [react()],
  base: '/jcs-proyectos/',
})
