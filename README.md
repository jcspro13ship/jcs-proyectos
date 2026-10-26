# Panel de Proyectos — JCS Consultoría Empresarial

Seguimiento de proyectos de clientes: tareas por reunión con responsable y fecha, enlaces, fase y pagos, y un portafolio público básico.

- `#/` portafolio público (solo proyectos marcados para publicar, con datos mínimos)
- `#/p/<token>` link para los participantes de un proyecto: ven solo ese proyecto y marcan el avance de sus tareas
- `#/admin` panel completo, con clave

Stack: React + Vite en GitHub Pages, Google Sheets privado como base de datos, Apps Script como única puerta de acceso (`apps-script/Code.gs`). El filtrado por proyecto ocurre en el servidor.

```bash
npm install
npm run dev     # sin VITE_API_URL arranca en modo prueba (datos ficticios, clave "demo")
npm test        # pruebas del Code.gs real contra un Sheet simulado
```

Instalación del Sheet y del script: [docs/INSTRUCTIVO.md](docs/INSTRUCTIVO.md). Los datos reales de clientes viven solo en el Sheet; `privado/` no se sube al repo.
