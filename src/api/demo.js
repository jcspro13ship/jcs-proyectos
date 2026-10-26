// Datos ficticios para el modo prueba y las pruebas automáticas.
// Los datos reales de los clientes NO van aquí (el repo es público): viven
// solo en el Google Sheet privado.

export const CLAVE_DEMO = 'demo'

export const TOKEN_DEMO_A = 'demoA0000000000000000000000000001'
export const TOKEN_DEMO_B = 'demoB0000000000000000000000000002'

const P = ['id', 'nombre', 'cliente', 'contacto', 'rubro', 'linea', 'fase', 'estado',
  'valor_total', 'token', 'publicar',
  'nombre_publico', 'resumen_publico', 'url_publica', 'anio']

export function pestanasDemo() {
  return {
    PROYECTOS: [
      P,
      ['pry-a', 'Catálogo Demo A', 'Empresa Demo A SAS', 'Ana Pérez', 'Marroquinería', 'Catálogo',
        'Desarrollo', 'activo', 3000000, TOKEN_DEMO_A, true,
        'Catálogo digital A', 'Catálogo con carrito que arma el pedido por WhatsApp.', 'https://example.com', 2026],
      ['pry-b', 'ERP Demo B', 'Empresa Demo B SAS', 'Bruno Gómez', 'Distribución', 'ERP',
        'Montaje de datos', 'activo', 8000000, TOKEN_DEMO_B, false,
        '', '', '', 2026],
      ['pry-c', 'Proyecto Demo C', 'Cliente C', 'Carla Ruiz', 'Comercio', 'Otro',
        'Entregado', 'entregado', 1500000, '', true,
        'Tienda C', 'Sitio institucional sencillo.', 'https://example.org', 2025],
    ],
    ENLACES: [
      ['id', 'proyecto_id', 'etiqueta', 'url'],
      ['enl-1', 'pry-a', 'Sitio publicado', 'https://example.com'],
      ['enl-2', 'pry-a', 'Google Sheet', 'https://docs.google.com/'],
      ['enl-3', 'pry-b', 'Repositorio', 'https://github.com/'],
    ],
    REUNIONES: [
      ['id', 'proyecto_id', 'fecha', 'titulo', 'asistentes', 'resumen'],
      ['reu-a1', 'pry-a', '2026-10-10', 'Levantamiento inicial', 'Ana Pérez, Juan Carlos Santos', 'Se revisaron las fotos y las categorías.'],
      ['reu-a2', 'pry-a', '2026-10-15', 'Revisión del avance', 'Ana Pérez, Juan Carlos Santos', ''],
      ['reu-b1', 'pry-b', '2026-10-12', 'Arranque ERP', 'Bruno Gómez, Juan Carlos Santos', 'DATO PRIVADO DE B'],
    ],
    TAREAS: [
      ['id', 'proyecto_id', 'reunion_id', 'titulo', 'detalle', 'responsable', 'fecha_limite', 'estado', 'actualizado'],
      ['tar-a1', 'pry-a', 'reu-a1', 'Enviar fotos en alta', 'Carpeta compartida con las fotos de los 100 productos.', 'Ana Pérez', '2026-10-14', 'hecha', '2026-10-13'],
      ['tar-a2', 'pry-a', 'reu-a1', 'Definir categorías', '', 'Juan Carlos Santos', '2026-10-30', 'en curso', '2026-10-15'],
      ['tar-a3', 'pry-a', 'reu-a2', 'Confirmar número de WhatsApp', 'Número que recibe los pedidos.', 'Ana Pérez', '2026-10-01', 'pendiente', '2026-10-15'],
      ['tar-b1', 'pry-b', 'reu-b1', 'TAREA PRIVADA DE B', 'No debe verse desde el link de A', 'Bruno Gómez', '2026-11-01', 'pendiente', '2026-10-12'],
    ],
    PAGOS: [
      ['id', 'proyecto_id', 'fecha', 'valor', 'concepto', 'medio', 'nota'],
      ['pag-a1', 'pry-a', '2026-10-01', 1500000, 'Anticipo 50%', 'Transferencia', ''],
      ['pag-a2', 'pry-a', '2026-10-20', 500000, 'Abono', 'Link de pago', 'PAGO PRIVADO DE A'],
      ['pag-b1', 'pry-b', '2026-10-05', 4000000, 'Anticipo 50%', 'Transferencia', ''],
      ['pag-c1', 'pry-c', '2025-06-01', 750000, 'Anticipo 50%', 'Efectivo', ''],
      ['pag-c2', 'pry-c', '2025-07-15', 750000, 'Saldo final', 'Transferencia', ''],
    ],
    REGISTRO: [['fecha', 'quien', 'accion', 'detalle']],
  }
}
