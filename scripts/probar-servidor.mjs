// Pruebas del Code.gs real contra un Sheet simulado: node scripts/probar-servidor.mjs
// Lo más importante que verifican: un link de proyecto nunca deja ver ni tocar
// otro proyecto, y lo público no trae campos internos.
import { readFileSync } from 'node:fs'
import { crearServidor } from '../src/api/simulador.js'
import { pestanasDemo, CLAVE_DEMO, TOKEN_DEMO_A, TOKEN_DEMO_B } from '../src/api/demo.js'

const codigo = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const nuevo = () => crearServidor(codigo, pestanasDemo(), { ADMIN_CLAVE: CLAVE_DEMO })

let fallas = 0
let total = 0
function ok(condicion, nombre) {
  total++
  if (condicion) console.log('  ✓', nombre)
  else { fallas++; console.log('  ✗', nombre) }
}
const admin = (s, accion, datos = {}) => s.llamar({ clave: CLAVE_DEMO, accion, ...datos })

console.log('Portafolio')
{
  const s = nuevo()
  const r = s.llamar({ accion: 'portafolio' })
  ok(r.ok && r.proyectos.length === 2, 'solo los proyectos con publicar=TRUE')
  const campos = new Set(r.proyectos.flatMap(Object.keys))
  ok([...campos].every((c) => ['nombre', 'rubro', 'resumen', 'url', 'anio'].includes(c)), 'solo campos públicos')
  const crudo = JSON.stringify(r)
  ok(!crudo.includes(TOKEN_DEMO_A) && !crudo.includes('3000000') && !crudo.includes('Ana Pérez'), 'sin tokens, valores ni contactos')
  ok(!crudo.includes('ERP Demo B'), 'no aparece el proyecto no publicado')
}

console.log('Link de invitado')
{
  const s = nuevo()
  const r = s.llamar({ accion: 'verProyecto', token: TOKEN_DEMO_A })
  ok(r.ok && r.proyecto.nombre === 'Catálogo Demo A', 'abre su proyecto')
  ok(Object.keys(r.proyecto).join() === 'nombre', 'del proyecto solo recibe el nombre')
  ok(r.tareas.length === 3 && r.reuniones.length === 2, 'recibe sus 3 tareas y 2 reuniones')
  const crudo = JSON.stringify(r)
  ok(!crudo.includes('PRIVADO DE B') && !crudo.includes('pry-b') && !crudo.includes(TOKEN_DEMO_B), 'nada del proyecto B')
  ok(!crudo.includes('3000000') && !crudo.includes('docs.google') && !crudo.includes(TOKEN_DEMO_A), 'sin valores, enlaces ni token')
  ok(r.reuniones[0].fecha === '2026-10-10', 'fechas como texto yyyy-mm-dd')

  const malo = s.llamar({ accion: 'verProyecto', token: 'x'.repeat(32) })
  ok(!malo.ok && !JSON.stringify(malo).includes('Demo'), 'token inválido: error genérico')
  ok(!s.llamar({ accion: 'verProyecto', token: '' }).ok, 'token vacío rechazado')
  ok(!s.llamar({ accion: 'verProyecto' }).ok, 'sin token rechazado')
  const sinToken = s.llamar({ accion: 'verProyecto', token: '' })
  ok(!sinToken.ok, 'proyecto sin token (Demo C) no se abre con token vacío')
}

console.log('Cambiar estado como invitado')
{
  const s = nuevo()
  const r = s.llamar({ accion: 'cambiarEstado', token: TOKEN_DEMO_A, tarea_id: 'tar-a3', estado: 'hecha' })
  ok(r.ok && r.tarea.estado === 'hecha', 'marca una tarea de su proyecto')
  const otra = s.llamar({ accion: 'cambiarEstado', token: TOKEN_DEMO_A, tarea_id: 'tar-b1', estado: 'hecha' })
  ok(!otra.ok, 'NO puede marcar una tarea de otro proyecto')
  const b = s.llamar({ accion: 'verProyecto', token: TOKEN_DEMO_B })
  ok(b.tareas[0].estado === 'pendiente', 'la tarea de B sigue intacta')
  ok(!s.llamar({ accion: 'cambiarEstado', token: TOKEN_DEMO_A, tarea_id: 'tar-a1', estado: 'borrada' }).ok, 'estado inventado rechazado')
  const intento = s.llamar({ accion: 'cambiarEstado', token: TOKEN_DEMO_A, tarea_id: 'tar-a1', estado: 'pendiente', titulo: 'hackeado', proyecto_id: 'pry-b' })
  const a = s.llamar({ accion: 'verProyecto', token: TOKEN_DEMO_A })
  ok(intento.ok && a.tareas.find((t) => t.id === 'tar-a1').titulo === 'Enviar fotos en alta', 'solo cambia el estado, ignora otros campos')
  ok(s.hojas.REGISTRO.datos.length === 3, 'los cambios quedan en REGISTRO')
  const sinClave = s.llamar({ accion: 'admin.todo', token: TOKEN_DEMO_A })
  ok(!sinClave.ok, 'un token no sirve como clave de admin')
}

console.log('Administrador')
{
  const s = nuevo()
  ok(!s.llamar({ accion: 'admin.todo', clave: 'mala' }).ok, 'clave incorrecta rechazada')
  for (let i = 0; i < 5; i++) s.llamar({ accion: 'admin.todo', clave: 'mala' })
  ok(!admin(s, 'admin.todo').ok, 'bloqueo tras 5 intentos fallidos (aun con la clave buena)')
  s.limpiarCache()
  const todo = admin(s, 'admin.todo')
  ok(todo.ok && todo.proyectos.length === 3 && todo.tareas.length === 4, 'con clave ve todo')
  ok(todo.proyectos[0].publicar === true && todo.proyectos[1].publicar === false && todo.proyectos[0].valor_total === 3000000, 'booleanos y números bien leídos')

  const nuevoP = admin(s, 'admin.guardarProyecto', { proyecto: { nombre: 'Nuevo', valor_total: '$ 2.500.000', publicar: 'TRUE', token: 'intento' } })
  ok(nuevoP.ok && nuevoP.proyecto.token.length === 32 && nuevoP.proyecto.token !== 'intento', 'crear proyecto genera su propio token')
  ok(nuevoP.proyecto.valor_total === 2500000 && nuevoP.proyecto.estado === 'activo', 'valor limpio y estado por defecto')

  const ed = admin(s, 'admin.guardarProyecto', { proyecto: { id: 'pry-a', nombre: 'Catálogo A editado', fase: 'Publicación' } })
  ok(ed.ok && ed.proyecto.fase === 'Publicación' && ed.proyecto.cliente === 'Empresa Demo A SAS', 'editar proyecto no borra los demás campos')

  const reu = admin(s, 'admin.guardarReunion', {
    reunion: { proyecto_id: 'pry-a', fecha: '2026-10-17', titulo: 'Seguimiento', asistentes: 'Ana' },
    tareas: [{ titulo: 'Uno', responsable: 'Ana' }, { titulo: 'Dos' }, { titulo: '' }, { titulo: 'Tres', proyecto_id: 'pry-b' }],
  })
  ok(reu.ok && reu.tareas.length === 3, 'reunión con 3 tareas (ignora la vacía)')
  ok(reu.tareas.every((t) => t.proyecto_id === 'pry-a' && t.reunion_id === reu.registro.id && t.estado === 'pendiente'), 'las tareas quedan en el proyecto de la reunión')

  const cruzada = admin(s, 'admin.guardarTarea', { tarea: { proyecto_id: 'pry-b', reunion_id: 'reu-a1', titulo: 'x' } })
  ok(!cruzada.ok, 'no se puede colgar una tarea de B en una reunión de A')

  const formula = admin(s, 'admin.guardarTarea', { tarea: { proyecto_id: 'pry-a', titulo: '=IMPORTXML("x")' } })
  ok(formula.ok && formula.registro.titulo === '=IMPORTXML("x")', 'un texto con "=" se guarda como texto, no como fórmula')

  ok(!admin(s, 'admin.guardarEnlace', { enlace: { proyecto_id: 'pry-a', etiqueta: 'x', url: 'javascript:alert(1)' } }).ok, 'enlace sin http(s) rechazado')
  ok(admin(s, 'admin.guardarEnlace', { enlace: { id: 'enl-1', etiqueta: 'Sitio' } }).ok, 'editar enlace')

  const antes = TOKEN_DEMO_A
  const reg = admin(s, 'admin.regenerarToken', { id: 'pry-a' })
  ok(reg.ok && reg.token !== antes, 'regenerar link')
  s.limpiarCache()
  ok(!s.llamar({ accion: 'verProyecto', token: antes }).ok, 'el link viejo deja de funcionar')
  ok(s.llamar({ accion: 'verProyecto', token: reg.token }).ok, 'el link nuevo funciona')

  ok(admin(s, 'admin.eliminarReunion', { id: 'reu-a1' }).ok, 'eliminar reunión')
  const despues = admin(s, 'admin.todo')
  ok(!despues.tareas.some((t) => t.reunion_id === 'reu-a1'), 'sus tareas se eliminan con ella')
  ok(despues.tareas.some((t) => t.id === 'tar-b1'), 'las de otros proyectos siguen')
}

console.log('Pagos')
{
  const s = nuevo()
  const todo = admin(s, 'admin.todo')
  ok(todo.pagos.length === 5 && todo.pagos[0].valor === 1500000 && todo.pagos[0].fecha === '2026-10-01', 'el admin ve los pagos con valor y fecha')

  const nuevoPago = admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-a', fecha: '2026-10-24', valor: '$ 250.000', concepto: 'Abono', medio: 'Transferencia' } })
  ok(nuevoPago.ok && nuevoPago.registro.valor === 250000 && nuevoPago.registro.id.startsWith('pag-'), 'registrar un pago parcial (valor con formato)')
  ok(!admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-a', fecha: '2026-10-24', valor: 0 } }).ok, 'pago en cero rechazado')
  ok(!admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-a', valor: 1000 } }).ok, 'pago sin fecha rechazado')
  ok(!admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-a', fecha: '24/10/2026', valor: 1000 } }).ok, 'fecha con formato raro rechazada')
  ok(!admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-x', fecha: '2026-10-24', valor: 1000 } }).ok, 'pago de un proyecto inexistente rechazado')
  const ed = admin(s, 'admin.guardarPago', { pago: { id: 'pag-a2', valor: 600000 } })
  ok(ed.ok && ed.registro.valor === 600000 && ed.registro.fecha === '2026-10-20', 'editar el valor sin perder la fecha')
  ok(admin(s, 'admin.eliminarPago', { id: 'pag-a2' }).ok && admin(s, 'admin.todo').pagos.length === 5, 'eliminar un pago')

  const invitado = JSON.stringify(s.llamar({ accion: 'verProyecto', token: TOKEN_DEMO_A }))
  ok(!invitado.includes('pag-') && !invitado.includes('1500000') && !invitado.includes('Anticipo'), 'el link de invitado no trae ningún pago')
  ok(!JSON.stringify(s.llamar({ accion: 'portafolio' })).includes('pag-'), 'el portafolio no trae pagos')
  ok(!s.llamar({ accion: 'admin.guardarPago', token: TOKEN_DEMO_A, pago: { proyecto_id: 'pry-a', fecha: '2026-10-24', valor: 1 } }).ok, 'un invitado no puede registrar pagos')
}

console.log('Sheet creado antes de los pagos')
{
  const viejo = pestanasDemo()
  delete viejo.PAGOS
  const s = crearServidor(codigo, viejo, { ADMIN_CLAVE: CLAVE_DEMO })
  const r = admin(s, 'admin.todo')
  ok(r.ok && Array.isArray(r.pagos) && r.pagos.length === 0, 'sin pestaña PAGOS el panel sigue cargando')
  ok(s.hojas.PAGOS && s.hojas.PAGOS.datos[0][0] === 'id', 'crea la pestaña PAGOS sola')
  ok(admin(s, 'admin.guardarPago', { pago: { proyecto_id: 'pry-a', fecha: '2026-10-24', valor: 1000 } }).ok, 'y ya se pueden registrar pagos')
}

console.log('Links al azar')
{
  const s = nuevo()
  for (let i = 0; i < 50; i++) s.llamar({ accion: 'verProyecto', token: 'z'.repeat(32) })
  ok(s.llamar({ accion: 'verProyecto', token: TOKEN_DEMO_A }).ok, 'muchos links inválidos no bloquean a los invitados legítimos')
}

console.log('Instalación')
{
  const s = crearServidor(codigo, { PROYECTOS: pestanasDemo().PROYECTOS }, { ADMIN_CLAVE: CLAVE_DEMO })
  s.configurarHojas()
  ok(['ENLACES', 'REUNIONES', 'TAREAS', 'PAGOS', 'REGISTRO'].every((h) => s.hojas[h]), 'crea las pestañas que faltan')
  const col = s.hojas.PROYECTOS.datos[0].indexOf('token')
  const c = s.hojas.PROYECTOS.datos[3]
  ok(typeof c[col] === 'string' && c[col].length === 32, 'le pone link al proyecto que no tenía')
}

console.log(`\n${total - fallas} de ${total} pruebas pasaron`)
process.exit(fallas ? 1 : 0)
