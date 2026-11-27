# Registro de versiones · Keypoint Hub Providencia

La versión vigente está en `package.json` y es la única fuente: la app la muestra en Configuración › Acerca de, el servidor la escribe al iniciar y la entrega en `/api/health`.

Se sigue el versionado semántico (`MAYOR.MENOR.PARCHE`):

- **MAYOR**: cambia la forma de operar el sistema (por ejemplo, pasar del modo demostración a un servidor real).
- **MENOR**: funciones nuevas que no rompen lo anterior.
- **PARCHE**: correcciones y ajustes pequeños.

**Corrección de la numeración (noviembre de 2026).** Durante el desarrollo se usaron dos series a la vez: el repositorio de GitHub llegó a «v2.2», mientras que las entregas siguientes se nombraron 1.2, 1.3 y 1.4 en la conversación de trabajo. Desde la 2.5.1 hay una sola serie, que continúa la del repositorio. Equivalencias:

| Nombre usado antes | Versión correcta |
|---|---|
| Entrega «v1.1» (seguridad y encargados por laboratorio) = commit «v2.2» | 2.2.0 |
| «v1.2» | 2.3.0 |
| Arreglo del puerto en uso (sin nombre) | 2.3.1 |
| «v1.3» | 2.4.0 |
| «v1.4» | 2.5.0 |

## [2.9.3] · 26 de noviembre de 2026
### Rendimiento (modo con servidor)
- **Imágenes fuera de los datos.** Las fotos de perfil, los banners, las imágenes de los anuncios y los diplomas iban dentro de los datos, y cada ingreso los bajaba por Tailscale (hasta varios MB). Ahora los datos llevan una dirección `/api/blob/<firma>` y el navegador baja cada imagen aparte, una sola vez, y la guarda en su caché. La firma es un HMAC del contenido con una clave del servidor: no se puede adivinar, y solo la conoce quien ya podía ver esa fila. Con tres eventos con imagen y tres fotos de ejemplo, la pantalla de ingreso pasó de 131 KB a 5 KB; la vista de una usuaria, de 167 KB a 13 KB, y la del equipo, de 228 KB a 74 KB.
- **Pantalla de ingreso al instante.** La vista pública (nombre del Hub, contacto, formulario y eventos, sin datos personales) se guarda en el dispositivo; el ingreso se dibuja sin esperar al servidor y se actualiza por detrás. La primera visita muestra «Conectando con el Hub…» y, con sesión guardada, «Cargando tus datos…», en vez de una pantalla en blanco.
- **Ingreso del equipo en dos pasos.** Primero llegan los datos de los últimos dos días (26 KB comprimidos en vez de 74 KB); el historial de 100 días y la auditoría llegan enseguida como diferencia. Datos, Auditoría y Detalle de uso avisan «Cargando el historial…» mientras tanto.
- **Respuesta inmediata.** Una barra arriba (y «Guardando…» para lectores de pantalla) aparece cuando una acción tarda más de 150 ms. Activar o desactivar los avisos por correo y cambiar el idioma responden al tocar; si el servidor rechaza el cambio, se deshace con un aviso.
- Pruebas nuevas: `tools/qa/carga-inicial.mjs` (servidor) y `tools/qa/carga-rapida.cjs` (navegador con red lenta simulada).

## [2.9.2] · 24 de noviembre de 2026
### Agregado
- **Diagnóstico de conexión** (Reglas › Conexión con el servidor): mide la ida y vuelta, cuánto tarda el servidor y cuánto la red, con un veredicto (red, computador del servidor o todo bien), y muestra el tiempo de las últimas acciones. El servidor informa su tiempo en la cabecera `Server-Timing`.
- El servidor anota en su ventana los pedidos que tardan más de 400 ms (`[lento] …`; umbral configurable con `SLOW_MS`).
### Rendimiento
- Respuestas comprimidas con brotli cuando el navegador lo acepta (por HTTPS, como Tailscale Funnel): el ingreso del equipo pasa de 88 KB a 72 KB.
- La consulta periódica envía la vista que ya tiene en una cabecera y usa siempre la misma dirección, así el navegador reutiliza el permiso CORS y no hace un pedido previo extra cada 15 segundos.

## [2.9.1] · 24 de noviembre de 2026
### Rendimiento (modo con servidor)
- **Solo viajan los cambios.** Antes, cada acción devolvía todos los datos de la sesión (1,1 MB para el equipo, 88 KB comprimidos) y cada consulta periódica los volvía a bajar si algo había cambiado. Ahora el servidor recuerda la última vista enviada a cada sesión y responde solo las filas nuevas, cambiadas o borradas (alrededor de 1 a 2 KB por acción). La comparación se hace sobre lo que cada persona puede ver, así que es exacta aunque cambie su alcance. Si el servidor no reconoce la vista del navegador (por ejemplo, tras reiniciarse), envía los datos completos como antes.
- **Reglas y Apariencia guardan en una sola llamada** (`config.setMany`), en vez de unas 20 seguidas. Además ahora es todo o nada: si un dato es inválido no se guarda ninguno.
- Medición con un teléfono simulado (CPU 4 veces más lenta) y red de 150 ms / 3 Mbps: guardar Reglas pasó de 12,6 s a 0,3 s; escanear en recepción, de 0,9 s a 0,25 s. El ingreso sigue cargando los datos completos una vez (0,9 s).
- Prueba nueva: `tools/qa/sincronizacion.mjs` (los datos armados con cambios son idénticos a una carga completa, para cuatro roles y siete tipos de acción).
### Corregido
- Publicación en GitHub Pages: el flujo ahora tiene dos trabajos (`build` y `deploy`) y reintenta una vez, por una falla intermitente de GitHub al buscar el sitio recién subido.

## [2.9.0] · 24 de noviembre de 2026
### Agregado
- **Política de privacidad y Términos y condiciones** dentro de la app, en español, inglés y portugués (versión 1.0). Se arman con el contacto del Hub y las preguntas que realmente pide el formulario. Citan la Ley 19.628 vigente y la Ley 21.719, que rige desde el 15 de octubre de 2027. Son un **borrador**: debe revisarlos la Municipalidad. `npm run docs:legal` genera `docs/politica-privacidad.md` y `docs/terminos-condiciones.md`.
- **Casilla sin marcar para aceptar los términos** al crear una cuenta (también en el registro asistido de recepción), con botones para leer cada documento en una ventana sin perder lo escrito. Se guardan la versión aceptada y la fecha. A las cuentas que aún no aceptan la versión vigente se les pide al entrar.
- **Contacto del Hub configurable** (Reglas › Contacto del Hub): responsable, teléfono, correo, dirección y horario. Aparece en el pie, en la ayuda, en una pantalla de contacto, al final de cada correo y en la política. Viene con el correo keypoint.systems.um@gmail.com y un teléfono de ejemplo (+56 2 2345 6789, inventado).
- **Pie de página** en todas las pantallas (ingreso, app de usuarios y panel del equipo): Privacidad, Términos, Contacto, teléfono y correo, nombre del sistema, versión y «Diseñada por KeyPoint Systems con herramientas de IA».
- **Enlace de baja en los avisos por correo.** Los avisos (reservas, eventos, horas, archivos) terminan con un enlace firmado para dejar de recibirlos y llevan las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` (baja de un clic en Gmail y Outlook). Los correos de cuenta (códigos, verificación, restablecimiento, eliminación de datos, autorización de menores) se envían siempre. Nueva opción «Avisos por correo» en Configuración, pantalla de confirmación en la app y página `/api/baja` en el servidor. Variables nuevas: `PUBLIC_APP_URL` y `PUBLIC_API_URL`.
- **Texto alternativo de los banners**: al subir el banner o la imagen del anuncio de un evento aparece el campo, que es obligatorio. La app lo usa en lugar del título.
- **Vista previa de cada correo** en Reglas › Últimos correos, con su pie y su tipo (aviso o cuenta).
- **Auditoría de SDK, analítica y rastreo** (`docs/auditoria-terceros.md`): sin analítica, sin cookies y sin rastreo, por eso no hay banner de cookies.
### Accesibilidad (navegación con teclado)
- Botón «Saltar al contenido» al comienzo de cada pantalla.
- Al cambiar de pantalla el foco va al título; las pestañas y el menú marcan la sección actual (`aria-current`).
- El menú lateral del teléfono recibe el foco al abrirse y se cierra con Esc.
- Editor del plano: cada zona se alcanza con Tab; Enter la selecciona, las flechas la mueven y Mayús + flechas cambian su tamaño.
### Cambiado
- El servicio de Google se carga solo al tocar «Continuar con Google» (antes, al abrir la pantalla de ingreso), con un aviso de que usa sus propias cookies.
- nodemailer 10.6.1 y esbuild 0.28.2 (`npm audit`: 0 vulnerabilidades).
- Preguntas frecuentes nuevas para usuarios (políticas, cookies, avisos por correo, términos, contacto) y para el equipo (contacto, texto alternativo, bajas), en los tres idiomas donde corresponde.

## [2.8.0] · 23 de noviembre de 2026
### Agregado
- **Formulario de registro configurable** (Sistema › Formulario de registro, solo administración).
  - **Etapa 1, campos del perfil:** celular, comuna, actividad, ocupación, género y movilidad reducida se pueden mostrar u ocultar y marcar obligatorios u opcionales. Las opciones de actividad, ocupación y género se editan, ordenan y traducen al inglés y portugués. Si se cambia el nombre de una opción, se actualiza en los perfiles que la tenían. Ocultar un campo no borra lo que ya estaba guardado.
  - **Etapa 2, preguntas agregadas:** de una opción, varias opciones, sí o no, número (con mínimo y máximo), fecha, texto, teléfono o correo, con ayuda y traducción opcionales, obligatorias u opcionales y en el orden que se elija. Aparecen en el registro («Más información»), en el perfil y en «Actualizar datos» de recepción.
  - **Análisis en Datos:** una tarjeta por pregunta con cuántas personas respondieron. Las de opciones y sí o no se cuentan por respuesta, los números se agrupan en rangos con promedio, mínimo y máximo, y las fechas se agrupan por mes. Se pueden ocultar variables como en los demás gráficos. Texto, teléfono y correo no se grafican ni llegan a la analista.
  - **Completar perfil:** si una pregunta o un campo pasa a ser obligatorio, a quienes ya están registrados se les pide al entrar a la app. Pueden postergarlo en la sesión con «Ahora no». La ficha de recepción indica «Perfil incompleto».
  - Quitar una pregunta u opción que ya tiene respuestas la **archiva**: no se ofrece, pero se conservan sus respuestas y se puede restaurar.
  - Descarga completa de respuestas para administración. La descarga de la analista suma solo las preguntas analizables.
  - El texto de Privacidad y el de Datos listan solo las variables que realmente se usan.
- Demo: tres preguntas de ejemplo con respuestas (nivel educacional, cómo conoció el Hub, primera vez en un cowork).
- Pruebas: `tools/test-form.mjs` (con `npm test`), `tools/qa/formulario.cjs` y `tools/qa/formulario.mjs`.
### Cambiado
- Las respuestas a las preguntas agregadas se guardan **cifradas** en PostgreSQL (columna `users.extra`, AES-256-GCM, como el RUT y el correo).
- «Borrar los datos personales» también borra estas respuestas. «Borrar perfil» conserva solo las respuestas anónimas que sirven para Datos.
### Corregido
- En las ventanas, «Traducciones» y otras secciones desplegables no se abrían al tocarlas.

## [2.7.0] · 22 de noviembre de 2026
### Agregado
- **Eliminar mi cuenta** (Privacidad y mis datos): con la contraseña, la cuenta queda inactiva, no puede ingresar ni usar su QR, y se cancelan sus reservas e inscripciones futuras con devolución de horas. Llega un correo.
- **Restablecer una cuenta eliminada:** quien se registra con el RUT de una cuenta eliminada puede restablecerla con un código enviado al correo anterior (se muestra oculto). Recupera ID, QR, certificaciones, horas e historial con los datos nuevos; un correo nuevo se confirma con otro código. Sin acceso a ese correo, recepción la restablece revisando el carnet (desde el registro asistido o desde la ficha).
- **Pedir la eliminación de mis datos** reemplaza a «Pedir la eliminación de mi cuenta». La solicitud aparece en Usuarios; administración la ejecuta («datos personales») o la descarta. Se borran visitas, archivos, observaciones, avisos y los datos opcionales del perfil; se conservan cuenta, certificaciones, horas, reservas y penalizaciones. Correo automático al terminar.
- **Periodo de las certificaciones:** fechas «Desde» y «Hasta»; las sesiones semanales se crean solo dentro del periodo. «Lugar de las sesiones» y «Bloquear ese lugar durante las sesiones»: las reservas que ya chocaban se cancelan con aviso y devolución de horas. Al cambiar día u hora, las sesiones sin inscritos se rehacen. Las personas usuarias ven el periodo y «Sin cupos» cuando todas las sesiones del periodo están llenas.
- Recepción ve «Cuenta eliminada» al escanear a una persona que eliminó su cuenta.
- Ayudas, preguntas frecuentes y manual actualizados en español, inglés y portugués. Pruebas nuevas en `tools/qa/` (`funciones-2.7.cjs`, `cuentas.mjs`).
### Corregido
- **Listas dentro de ventanas:** al elegir otro laboratorio en «Penalizar horas», el cuadro volvía a la primera opción, aunque se aplicaba la elegida. Afectaba a todas las listas, casillas y campos de las ventanas al redibujarse (por ejemplo, «Unidad» al restringir el acceso).
### Confirmado (sin cambios)
- Al salir de la oficina de pasantía, la persona queda en el cowork, sin plazo, hasta marcar su salida en recepción.
- Administración penaliza horas en cualquier laboratorio y restringe el acceso; cada encargado penaliza solo en sus laboratorios y no puede restringir.

## [2.6.0] · 22 de noviembre de 2026
### Agregado
- Ayudas de la app de usuarios en **inglés y portugués**: guía de cada pantalla, recorrido guiado, invitación al recorrido y preguntas frecuentes. Las pantallas del equipo del Hub siguen en español.
- Notificaciones, aviso de sesión, ayudas del registro y mensajes del servidor con datos variables se muestran en el idioma elegido.
- Preguntas frecuentes impresas en inglés y portugués: `docs/faq-en.pdf` y `docs/faq-pt.pdf` (`npm run docs:faq`).
- Manual de uso actualizado (`docs/manual.pdf`): reserva en dos pasos, «Buscar reserva actual», pasantía, QR de espacios, sesión, diploma, ayuda e idiomas, con capturas nuevas.
- Informe de QA (`docs/informe-qa.pdf`) y scripts de prueba en `tools/qa/`.
### Corregido
- La etiqueta DEMO tenía contraste insuficiente (3,05:1) y no respetaba la regla para pantallas angostas. Ahora tiene 5,5:1 y queda siempre visible.
- Datos: los nombres largos de variables desbordaban la pantalla.
- Teléfonos de 320 px: las etiquetas largas desbordaban la pantalla en Mis reservas.
- Seguridad: 8 intentos fallidos desde cualquier equipo bloqueaban la cuenta. Ahora el límite es de 8 por cuenta desde una misma dirección y de 50 por cuenta en total, así nadie puede dejar fuera a administración a propósito.
- Ventana de ayuda: el botón «Recorrido guiado» se partía en dos líneas en inglés.

## [2.5.1] · 20 de noviembre de 2026
### Cambiado
- «Terminar» ya no cierra la reserva por sí solo: queda **pendiente** hasta que recepción escanee el QR de la persona dentro del plazo (5 minutos por defecto). En ese momento se registra el término a la hora en que tocó «Terminar» y la persona queda en el cowork.
- Si no pasa por recepción a tiempo, el término **no se toma en cuenta**: la reserva sigue en curso y la persona recibe el aviso «Expiró el plazo para pasar por recepción», con el recordatorio de acercarse cada vez que toque «Terminar».
- Si la persona registra su salida del Hub en recepción sin un término registrado, su reserva termina en ese momento.
### Agregado
- Versión única tomada de `package.json` (app, servidor y `/api/health`).
- `CHANGELOG.md` y bitácora de desarrollo (`docs/bitacora-desarrollo.md` y `.pdf`).
- Trípticos por cargo rediseñados para impresión láser en blanco y negro, con el contenido de la versión actual.

## [2.5.0] · 20 de noviembre de 2026
### Agregado
- Confirmación de reserva en dos pasos: la persona marca su entrada en recepción y luego escanea el QR del espacio desde «Entrar a tu reserva» (también puede escribir el código). Se puede desactivar en Reglas.
- QR por espacio con cartel para imprimir, renovación de la clave y dirección pública configurable.
- Recepción: «Buscar reserva actual» y botones Iniciar y Terminar (en el escaneo y en la ficha de la persona).
- Pasantía: administración la asigna en la ficha; oficina configurable con aforo; botón bajo el QR para entrar y salir.
- Mantener la sesión por dispositivo (tabla `sessions`), aviso en el perfil y cierre de los otros dispositivos.
- Diploma de certificación descargable en PDF desde el perfil.
- Gráficos de Datos con variables ocultables y escala ajustada.
- Buscador de personas certificadas y cuadro ajustable.
### Cambiado
- Los eventos terminados pasan solos al final de la lista de banners.

## [2.4.0] · 19 de noviembre de 2026
### Agregado
- Botón de ayuda en cada pantalla, recorridos guiados e invitación al primer ingreso.
- Preguntas frecuentes para usuarios y personal, con buscador; documento `docs/preguntas-frecuentes.pdf`.
- Banners que avanzan solos cada 5 segundos, con pausa, flechas y puntos; se detienen cuando la persona los desliza.
- Orden manual de eventos y botón «Ordenar por fecha: más cercanos primero».
### Corregido
- Un evento ya iniciado y sin hora de término dejaba de verse en el inicio.
- Cupos, aforos y capacidades negativas.

## [2.3.1] · 19 de noviembre de 2026
### Corregido
- Mensaje claro cuando el puerto 8080 ya está en uso (el Hub abierto en otra ventana).

## [2.3.0] · 19 de noviembre de 2026
### Agregado
- Borrado del historial, del perfil o de ambos, con contraseña de administración y doble confirmación.
- Edad permitida de 4 a 95 años; formato del RUT explicado en el registro.
- Plano: autocompletar al vincular un espacio; agregar y eliminar pisos.
- Eliminar espacios (se desactivan si tienen historial); certificación creada al crear un laboratorio que la exige.
- Agenda con selección de varias horas, lista «Horas bloqueadas:», guardar y confirmar.
- Certificaciones inscritas en Mis reservas y en «Tu próxima reserva»; sesiones llenas no seleccionables.
### Seguridad
- Comparación de contraseñas en tiempo constante, cierre de otras sesiones al cambiar la contraseña, validación de reglas y colores del plano, menos datos expuestos.
- Revisión de accesibilidad WCAG 2 A/AA.

## [2.2.0] · 19 de noviembre de 2026
### Agregado
- Encargados con uno o varios laboratorios asignados (lista con confirmación); cada uno ve solo los datos de sus laboratorios.
- Zona por defecto para quien entra sin reserva (cowork, configurable).
- Códigos de correo reutilizables mientras estén vigentes (15 minutos, configurable).
### Seguridad
- Cifrado AES-256-GCM de RUT, correo y teléfono en la base; migración automática de datos anteriores.
- Política de contenido (CSP), cabeceras de seguridad, límites de intentos por cuenta y por dirección, validación de archivos.
### Rendimiento
- Índices en memoria, compresión y envío de datos solo cuando cambian.

## [2.1.1] · noviembre de 2026
### Agregado y corregido (primeras pruebas)
- Botón X para cerrar banners y cierre con el botón «atrás» del teléfono.
- El archivo subido se muestra al reservar un laboratorio.
- Confirmar contraseña al cambiarla.
- Rueda de colores para el tema.
- Fecha de nacimiento editable en teléfonos.
- Teclado del RUT que ya no salta a letras en cada número.

## [2.0.0] · noviembre de 2026
### Cambiado
- Puesta en marcha real: app en GitHub Pages; servidor Node.js y base PostgreSQL en el notebook Acer Nitro 5, publicados con Tailscale Funnel.
### Corregido
- Lectura de `.env` y rutas en Windows, publicación con GitHub Actions, activación de Funnel, la página que seguía mostrando la demo y la lentitud inicial.

## [1.0.1] · noviembre de 2026
- Cerrar sesión desde el perfil del usuario y del personal.

## [1.0.0] · noviembre de 2026
### Primera entrega completa
- App web de usuarios y de personal (recepción instalable desde Chrome o Edge), modo demostración con datos de ejemplo, servidor y base de datos.
- Informe ampliado, manual de uso y cinco trípticos por cargo.
- Diseño inspirado en Apple, con el acento verde azulado del logo y colores configurables por administración; español, inglés y portugués.

## [0.x] · octubre de 2026
- 0.1: informe Capstone corregido y completado.
- 0.2: mockup de la interfaz (oscuro y claro).
- 0.3: primer front end con las pantallas de usuario y administración.
