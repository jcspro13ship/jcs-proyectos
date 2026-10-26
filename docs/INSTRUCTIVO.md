# Panel de Proyectos — Instalación

JCS Consultoría Empresarial

Este paso a paso conecta la página con el Google Sheet. Se hace una sola vez y toma unos 15 minutos.

## 1. Crear el Google Sheet
1. Entra a Google Drive y elige **Nuevo → Subir archivo**. Sube `privado/Panel_Proyectos_JCS.xlsx`.
2. Abre el archivo y elige **Archivo → Guardar como Hoja de cálculo de Google**.
3. Ponle de nombre **JCS — Panel de Proyectos**.
4. **No lo compartas con nadie.** Los invitados ven sus tareas desde el link de su proyecto, nunca desde el Sheet.

## 2. Pegar el script
1. En el Sheet, abre **Extensiones → Apps Script**.
2. Borra el código que aparece y pega todo el contenido de `apps-script/Code.gs`. Guarda.
3. En la barra de arriba, elige la función **configurarHojas** y presiona **▶ Ejecutar**.
4. La primera vez Google pide permisos. Acéptalos: son permisos sobre tu propio Sheet.

   Esta función le crea un link secreto (token) a cada proyecto.

## 3. Poner tu clave de administrador
1. En Apps Script, abre **⚙ Configuración del proyecto → Propiedades del script → Agregar propiedad**.
2. En el nombre escribe `ADMIN_CLAVE`.
3. En el valor escribe la clave que usarás para entrar al panel. Usa una clave larga y que no uses en otro lado.
4. Guarda.

## 4. Publicar el script
1. Abre **Implementar → Nueva implementación**.
2. En el tipo, elige **Aplicación web**.
3. En **Ejecutar como**, elige **Yo**.
4. En **Quién tiene acceso**, elige **Cualquier persona**.

   Esto no hace público el Sheet. Solo permite que la página le haga preguntas al script, y el script responde según las reglas: portafolio, link de proyecto o clave.
5. Copia la URL que termina en `/exec` y pásasela a Claude.

## 5. Cuando cambies el script
Ve a **Implementar → Administrar implementaciones → ✏ → Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

## Uso diario
- **Después de una reunión:** en el panel (`#/admin`) abre el proyecto y usa **+ Nueva reunión**. Ahí cargas la fecha, los asistentes y todas las tareas de una vez.
- **Compartir:** en el proyecto usa **Copiar link** o **Enviar por WhatsApp**. Ese link muestra solo ese proyecto.
- **Si un link se filtró:** usa **Regenerar link**. El link anterior deja de funcionar y tienes que enviar el nuevo.
- **Portafolio:** en los datos del proyecto marca **Publicar en portafolio** y escribe el nombre y el resumen públicos.

## Seguridad: qué ve cada quien
| Quién | Qué ve |
|---|---|
| Cualquier persona (portafolio) | Nombre público, rubro, resumen, año y link al sitio, solo de los proyectos que tú publiques |
| Invitado con link | Nombre del proyecto, sus reuniones y sus tareas. Puede cambiar el estado de esas tareas y nada más |
| Tú, con la clave | Todo |

Las pruebas automáticas (`npm test`) comprueban estas reglas sobre el mismo `Code.gs` que se pega en Apps Script.
