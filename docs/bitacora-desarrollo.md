# Bitácora de desarrollo · Keypoint Hub Providencia

**Proyecto Capstone · Equipo keypoint**  
Constanza Martinez · Maite Martinez · Cesar Aravena · Diego Donoso · Roderick Grez  
Docente: Ricardo Andrés Sepúlveda  
Periodo: octubre a noviembre de 2026 · Versión del sistema documentada: **2.5.1**

---

## 1. Resumen

Keypoint Hub Providencia es el sistema web de registro de entradas y reservas del Hub Providencia, un espacio de cowork municipal de dos pisos. Reemplaza el registro con formularios de Google y planillas por una credencial QR personal, reservas desde el teléfono para salas, sala gaming y laboratorios, certificaciones para el uso de máquinas y un panel de datos para la administración.

Esta bitácora reconstruye, a partir del historial completo de la conversación de trabajo y del repositorio, qué se pidió en cada etapa, qué se decidió, qué se entregó y qué problemas aparecieron. Las fechas exactas se conocen desde el 19 de noviembre de 2026 (historial de Git); las etapas anteriores se ubican por mes.

**Estado al cierre de esta bitácora (versión 2.5.1):**

| Indicador | Valor |
|---|---|
| Pantallas | 44 (19 de usuario y 25 del personal) |
| Tablas de la base de datos | 29 |
| Operaciones del servidor | 59, con permisos revisados en el servidor |
| Idiomas | Español, inglés y portugués (la ayuda y las preguntas frecuentes, solo en español) |
| Puesta en marcha | App en GitHub Pages; servidor Node.js y PostgreSQL en el notebook Acer Nitro 5, publicado con Tailscale Funnel |
| Documentos | Informe Capstone, manual de uso, cinco trípticos, preguntas frecuentes, guía de seguridad, registro de versiones y esta bitácora |

---

## 2. Equipo y roles

| Integrante | Rol en el proyecto |
|---|---|
| Roderick Grez | Desarrollo de la aplicación; diseño junto con Cesar y Constanza |
| Diego Donoso | Logística; presentaciones y propuestas |
| Cesar Aravena | Control de calidad (QA) y mediación con el Hub; diseño; presentaciones |
| Constanza Martinez | Área de negocios, equipo y toma de requerimientos; diseño |
| Maite Martinez | Apoyo en varias áreas; presentaciones y propuestas |

Las decisiones se tomaron en conjunto. El desarrollo se hizo en sesiones de trabajo con un asistente de programación basado en inteligencia artificial (Claude, de Anthropic), dirigido por Roderick Grez, quien probó cada versión, la publicó en GitHub y la instaló en el servidor.

---

## 3. Forma de trabajo

Cada versión siguió el mismo ciclo:

1. **Solicitud**: lista de mejoras, normalmente a partir de las pruebas y de los comentarios de usuarios, docentes y otros equipos.
2. **Aclaración**: antes de construir, preguntas sobre los puntos ambiguos (por ejemplo, qué significa «borrar datos» o qué pasa si alguien no pasa por recepción).
3. **Desarrollo** sobre una copia del repositorio.
4. **Verificación** automática: pruebas del núcleo, pruebas en el navegador (modo demostración y servidor real con PostgreSQL), actualización de una base de la versión anterior y revisión de accesibilidad (WCAG 2 A/AA, en modo claro y oscuro).
5. **Entrega** en un archivo comprimido, sin claves ni datos privados, con los pasos para actualizar.
6. **Puesta en marcha**: Roderick sube los cambios a GitHub y reinicia el servidor del Acer; la base se actualiza sola al iniciar.

---

## 4. Línea de tiempo

| Etapa | Fecha | Versión | Hito |
|---|---|---|---|
| Levantamiento e informe | octubre 2026 | 0.1 | Informe Capstone completado |
| Mockup | octubre 2026 | 0.2 | Interfaz en modo oscuro y luego claro |
| Primer front end | octubre 2026 | 0.3 | Pantallas de usuario y administración |
| Preguntas a la administración | oct.–nov. 2026 | — | Respuestas del Hub y formulario actual de inscripción |
| Entrega completa | noviembre 2026 | 1.0.0 | App, base de datos, servidor, manual, trípticos e informe ampliado |
| Cerrar sesión | noviembre 2026 | 1.0.1 | Ajuste de perfil |
| Puesta en marcha real | noviembre 2026 | 2.0.0 | GitHub Pages + Acer Nitro 5 + Tailscale Funnel |
| Primeras pruebas | noviembre 2026 | 2.1.1 | Arreglos de uso en teléfono |
| Seguridad y encargados | 19 nov. 2026 | 2.2.0 | Cifrado, encargados por laboratorio |
| Borrado, espacios, agenda | 19 nov. 2026 | 2.3.0 / 2.3.1 | Derecho de supresión, pisos, agenda por lote |
| Ayuda y banners | 19 nov. 2026 | 2.4.0 | Ayuda por pantalla, preguntas frecuentes |
| Reserva en dos pasos | 20 nov. 2026 | 2.5.0 | QR de espacios, pasantía, sesión por dispositivo |
| Término con recepción | 20 nov. 2026 | 2.5.1 | Ajuste de «Terminar», versión única, trípticos B/N |
| Video comercial | 21 nov. 2026 | — | Tomas reales de la app, gráficos y maqueta de 56 s |
| Idiomas, manual y QA | 22 nov. 2026 | 2.6.0 | Ayudas en inglés y portugués, manual actualizado, informe de QA |
| Formulario de registro configurable | 23 nov. 2026 | 2.8.0 | Campos del perfil configurables (etapa 1) y preguntas agregadas con su análisis en Datos (etapa 2) |
| Cuentas, datos y certificaciones | 22 nov. 2026 | 2.7.0 | Eliminar y restablecer cuenta, pedir eliminación de datos, periodo de certificaciones, arreglo de listas en ventanas |

---

## 5. Detalle por etapa

### 5.1 Levantamiento de requerimientos e informe (versión 0.1)

**Solicitud.** A partir de las notas de la visita al Hub: corregir y completar el informe Capstone y plantear todas las preguntas necesarias sobre objetivo, alcance, reglas e infraestructura.

**Lo que se definió:**

- La web app con códigos QR es la solución principal; el tótem y la app móvil quedan como alternativas consideradas y descartadas.
- Piloto real con entre 1.000 y 5.000 usuarios, funcionamiento permanente y análisis de datos para la administración.
- Prioridades del prototipo: registro de usuarios, QR, reservas de salas y equipos gaming por hora, laboratorios con archivo adjunto y, más adelante, validación del RUT con una API externa.
- Laboratorios: horas mensuales definidas por la administración, reserva automática si la persona está certificada y tiene saldo, revisión del archivo por el encargado y fichas técnicas configurables de cada máquina.
- Penalización por inasistencia o cancelación tardía configurable por tipo de laboratorio; bloques de reserva configurables; certificaciones agendadas en el mismo sistema.
- Registro asistido en el mesón para personas mayores o sin celular; escaneo con celular, cámara o lector USB.
- Hospedaje a cargo del Hub, con cifrado y seguridad de los datos; importación de históricos de Power BI y Google Forms.
- Redacción natural, a nivel de estudiantes de último año de ingeniería.

**Segunda ronda.** Cuota mensual tentativa de 48 horas por laboratorio; el QR lleva solo el ID del perfil, por ser más simple y seguro; los cambios al informe quedan para la entrega siguiente.

**Entregable.** Informe Capstone completado y reescrito con coherencia entre secciones.

### 5.2 Mockup de la interfaz (versión 0.2)

**Solicitud.** Una interfaz elegante y tecnológica que transmita juventud, innovación, creatividad, calidez, seguridad y solidez; sin colores demasiado vivos ni pastel; adaptable a teléfono y computador, con arquitectura por capas.

**Resultado.** Mockup en modo oscuro; luego se pidió conservarlo y agregar el modo claro, con tema según el dispositivo por defecto.

### 5.3 Primer front end (versión 0.3)

**Solicitud.** Construir el front end listo para conectar la base de datos, con las pantallas de usuario (ingreso, inicio con banners, QR y ocupación, reserva de PC gaming en grilla tipo cine 3×2, laboratorios con estimación y saldo, certificaciones, reservas activas, historial, horas, perfil y configuración) y de administración (panel con mapa de calor, reservas actuales, detalle de uso, próximas reservas, lector QR, revisión de archivos, solicitudes, espacios, agenda, apariencia, datos e historial de usuarios).

**Ampliaciones pedidas al revisar la lista:**

- Reserva de sala de reuniones con asistentes y registro de usuario nuevo.
- Fichas técnicas de máquinas configurables, con valores promedio mientras el Hub entrega los datos.
- «CNC» corregido a cortadora láser (certificación los martes a las 12:00).
- Para administración: registro de usuarios, entrada y salida asistida, gestión de certificaciones con lista de verificación, registro de empleados (solo administración) e importación de históricos con alta automática de quienes asistieron más de cuatro veces.
- Dos apps en una: usuarios y personal, con acceso por credenciales combinables (un encargado puede ser también administrador y analista).
- Bloques de 50 minutos combinables, con 10 minutos entre bloques; reserva mínima de 50 minutos y máxima de 12 horas; tolerancia de 15 minutos.
- Horario: lunes a jueves de 8:30 a 18:00 y viernes de 8:30 a 17:00, configurable.
- Ocupación por zona según reservas con asistencia; observaciones de los encargados sobre los trabajos; reservas asistidas en recepción.
- Material de marca: el logo «HUB Providencia, vida buena».

### 5.4 Preguntas a la administración del Hub

**Solicitud.** Reunir todas las preguntas pendientes sobre infraestructura, espacios, perfiles y objetivos para asegurar una implementación pronta.

**Resultado.** Cuestionario para el Hub. Sus respuestas (archivo `hub-provi.txt`) y el formulario de inscripción que usaban (Google Forms) se incorporaron a la entrega siguiente.

### 5.5 Primera entrega completa (versión 1.0.0)

**Solicitud.** Entrega completa para publicar en GitHub: informe ampliado, manual de uso, un tríptico por cargo, base de datos completa, app web de usuarios y versión de escritorio para recepción; diseño profesional inspirado en los sitios de Apple.

**Decisiones de esa ronda:**

- Fecha adelantada: debía quedar lista para las primeras pruebas del piloto a la semana siguiente.
- La demostración corre en el notebook Acer Nitro 5 (Ryzen 7, 16 GB) y en GitHub Pages, con datos de ejemplo.
- Quien no tenga cuenta de Google entra con contraseña y confirma su correo con un código.
- App instalable desde Chrome o Edge para recepción (Windows 11).
- Saldo de horas por laboratorio; se guarda la fecha de nacimiento.
- Idiomas: español, inglés y portugués (criollo haitiano pospuesto por falta de revisión).
- Acento verde azulado del logo, sin exceso de espacio en blanco; colores configurables por elemento para tema claro y oscuro, con fondo en degradado.

**Entregables.** Aplicación (usuarios y personal), modo demostración con 160 personas de ejemplo, servidor Node.js, base PostgreSQL, informe ampliado, manual, cinco trípticos y una guía de instalación.

**Versión 1.0.1.** Botón para cerrar sesión en el perfil del usuario y del personal.

### 5.6 Puesta en marcha real (versión 2.0.0)

**Solicitud.** Conectar la base de datos para la primera prueba: la base en el Acer Nitro 5 de la casa de Roderick y la app publicada aparte, con pasos para alguien con conocimientos básicos.

**Solución.** App en GitHub Pages que se conecta al servidor del Acer a través de Tailscale Funnel (dirección pública con HTTPS); `config.web.js` indica la dirección del servidor.

**Problemas y soluciones:**

| Problema | Causa | Solución |
|---|---|---|
| GitHub Actions no publicaba la página | Pages no estaba activado con Actions | Activarlo y volver a ejecutar |
| `init-db` fallaba con la contraseña | No leía `.env` en Windows | Lectura de `.env` y rutas compatibles con Windows |
| «Funnel is not enabled» | Faltaban permisos en Tailscale | Activar MagicDNS, HTTPS y Funnel |
| GitHub mostraba la demo y no el sistema real | Formato de `config.web.js` | La app acepta ambos formatos |
| Lentitud | Datos completos en cada consulta | Compresión y envío solo de lo que cambió |

Al cierre: «el sistema está funcionando de maravilla».

### 5.7 Primeras pruebas de uso (versión 2.1.1)

**Tareas incluidas:**

- [x] Botón X en los banners y cierre con el botón «atrás» del teléfono.
- [x] Mostrar que el archivo del laboratorio ya se subió.
- [x] Confirmar contraseña al cambiarla.
- [x] Rueda de colores completa para el tema.
- [x] Fecha de nacimiento editable desde el teléfono.
- [x] El teclado ya no salta a letras al escribir el RUT (registro y búsqueda de usuarios).

### 5.8 Optimización, seguridad y encargados (versión 2.2.0)

Lista de mejoras sugeridas por docentes y otros equipos tras ver la demo.

**Tareas incluidas:**

- [x] Optimización del sistema.
- [x] Seguridad de la base: consultas parametrizadas contra inyección y cifrado de RUT, correo y teléfono.
- [x] Seguridad de la página según estándares actuales (CSP, cabeceras, límites de intentos).
- [x] Encargado de laboratorio asociado a uno o más laboratorios; solo ve los datos de los suyos.
- [x] Lista de laboratorios con confirmación al dar la credencial de encargado.
- [x] Quien entra sin reserva queda registrado en el cowork (zona por defecto, editable).
- [x] Duración y registro correcto de los códigos del correo.

También se explicó cómo reiniciar la base de demostración: `npm run db:init -- --demo --reset`.

### 5.9 Datos, espacios y agenda (versiones 2.3.0 y 2.3.1)

**Tareas incluidas:**

- [x] Borrar el historial de una persona, su perfil o ambos, con la contraseña de administración y una confirmación.
- [x] Edad permitida de 4 a 95 años.
- [x] Formato del RUT explicado al crear un usuario.
- [x] Plano: al vincular un espacio se completan solos nombre, tipo y aforo.
- [x] Eliminar espacios con confirmación.
- [x] Certificaciones inscritas en Mis reservas y en «Tu próxima reserva».
- [x] Confirmado: una sesión de certificación llena no se puede elegir.
- [x] Todos los banners publicados en el inicio.
- [x] Agregar y eliminar pisos.
- [x] Laboratorio que exige certificación: la certificación se crea sola.
- [x] Agenda: guardar cambios, lista «Horas bloqueadas:» y confirmación.
- [x] Textos explicativos al crear espacios.
- [x] Optimización, seguridad y accesibilidad.

**Decisiones tomadas con el equipo:**

- «Borrar datos» elimina el historial y conserva la cuenta; «borrar perfil» elimina la cuenta y deja el historial anónimo para las estadísticas; «ambos» elimina todo.
- Un espacio con historial se desactiva (cancelando sus reservas futuras con aviso); si nunca se usó, se borra.
- La certificación automática pide día y hora al crear el laboratorio.
- Eliminar un piso desactiva sus espacios.

**Causa del problema de banners:** el carrusel no tenía controles en el computador y omitía los eventos sin imagen.

**Versión 2.3.1.** Al actualizar apareció «EADDRINUSE: address already in use :::8080»: el servidor anterior seguía abierto. El servidor ahora lo explica y dice cómo cerrarlo.

### 5.10 Ayuda y banners (versión 2.4.0)

**Tareas incluidas:**

- [x] Botón de ayuda según la pantalla, con recorridos guiados breves.
- [x] Preguntas frecuentes para usuarios (reservar, certificarse, inscribir a un menor, etc.) y para el personal, con documento descargable.
- [x] Banners que avanzan solos cada 5 segundos y se detienen cuando la persona los desliza.
- [x] Orden manual de eventos y botón «Ordenar por fecha: más cercanos primero».
- [x] Eventos terminados en amarillo con la etiqueta «Terminado»; los ya iniciados siguen visibles.
- [x] Cupos de espacios, eventos y laboratorios nunca negativos.

### 5.11 Comentarios de usuarios: reserva en dos pasos (versión 2.5.0)

**Tareas incluidas:**

- [x] Botón «Entrar en oficina de pasantía» bajo el QR para quienes tienen pasantía.
- [x] Botón «Terminar» bajo el QR durante una reserva, con paso por recepción.
- [x] Buscador de personas certificadas y cuadro ajustable (6 filas por defecto, se arrastra para ver más).
- [x] Descargar el diploma de certificación desde el perfil.
- [x] Ocultar variables en los gráficos de barras para comparar las demás.
- [x] Mantener la sesión abierta en un dispositivo, con aviso en el perfil.
- [x] Confirmación de reserva en dos pasos con un QR generado para cada espacio.
- [x] Recepción: «Buscar reserva actual» con opciones de iniciar y terminar.
- [x] Banners terminados al final de la lista, de forma automática.

**Decisiones tomadas con el equipo:**

- La pasantía la asigna la administración; la oficina es un espacio configurable con aforo.
- «Terminar» exige pasar por recepción dentro de 5 minutos.
- «Terminar» aparece desde que empieza la reserva.
- La sesión mantenida dura hasta cerrar sesión en ese dispositivo o cambiar la contraseña.

### 5.12 Término confirmado por recepción (versión 2.5.1)

**Tareas incluidas:**

- [x] Si la persona toca «Terminar» y no pasa por recepción, el término no se toma en cuenta: la reserva sigue en curso y se le avisa que expiró el plazo, recordándole acercarse a recepción cada vez que toque «Terminar».
- [x] Si registra su salida del Hub en recepción sin haber terminado, su tiempo en el laboratorio termina en ese momento.
- [x] Bitácora de desarrollo (este documento).
- [x] Corrección del versionamiento: una sola serie, una sola fuente y registro de versiones.
- [x] Trípticos por cargo actualizados y pensados para impresión láser en blanco y negro.

**Corrección de versiones.** El repositorio usaba «v2.1.1» y «v2.2», mientras que las entregas siguientes se habían nombrado 1.2, 1.3 y 1.4. Se adoptó el versionado semántico continuando la serie del repositorio (ver anexo).

### 5.13 Material para el video comercial (21 de noviembre)

**Solicitud.** Cómo hacer un video comercial profesional del sistema y, después, dejar listas las tomas para incluirlas en él.

**Entrega.** Un kit con grabaciones reales de la app en modo demostración (cinco tomas de teléfono y cinco de computador, sin audio), las mismas tomas dentro de un marco de teléfono o ventana sobre el fondo de la marca, gráficos en PNG (intro, cierre con el QR de la app, títulos), una maqueta de 56 segundos con transiciones y la locución sugerida con tiempos (`locucion.srt`). Las tomas de ambiente, la voz y la música quedaron para el equipo.

### 5.14 Idiomas, manual y QA (versión 2.6.0, 22 de noviembre)

**Solicitud.** «Actualizar las ayudas para incluirlas en inglés y portugués, actualizar el manual de usuario y realizar pruebas de QA para el sistema.»

**Tareas incluidas:**

- [x] Guías de cada pantalla, recorrido guiado, invitación al recorrido y preguntas frecuentes de la app de usuarios en inglés y portugués. Las pantallas del equipo siguen en español, como el resto de su app.
- [x] Notificaciones, aviso de sesión, ayudas del registro y mensajes del servidor con datos variables traducidos al mostrarse.
- [x] Preguntas frecuentes impresas en inglés y portugués (`docs/faq-en.pdf`, `docs/faq-pt.pdf`).
- [x] Manual de uso actualizado a la versión vigente, con capturas nuevas y un capítulo sobre la reserva en dos pasos.
- [x] Pruebas de QA: núcleo, funcionamiento por rol, servidor con PostgreSQL y migración desde 2.5.1, seguridad, accesibilidad, tamaños de pantalla, idiomas y carga. Resultado en `docs/informe-qa.pdf`; scripts en `tools/qa/`.

**Defectos encontrados por QA y corregidos:** contraste de la etiqueta DEMO, dos desbordes horizontales (gráficos de Datos y etiquetas en teléfonos de 320 px), bloqueo de cuentas que un tercero podía provocar con 8 intentos fallidos, textos sin traducir y un botón de la ayuda que se partía en inglés.

### 5.15 Cuentas, datos y certificaciones (versión 2.7.0, 22 de noviembre)

**Solicitud.** Confirmar la lógica de pasantía y de penalizaciones, corregir la lista de laboratorios al penalizar, permitir que la persona elimine su cuenta y la restablezca con su RUT, cambiar «Pedir eliminación de mi cuenta» por «Pedir eliminación de mis datos», agregar el periodo de las certificaciones con bloqueo del laboratorio, y explicar cómo podría hacerse un formulario de registro configurable.

**Decisiones del equipo:** al restablecer se recupera todo con los datos nuevos; se verifica con un código al correo anterior o, sin acceso, en recepción con el carnet; la eliminación de datos la aprueba administración y borra historial y datos opcionales del perfil; los cupos siguen siendo por sesión; la certificación se ve apenas se guarda y el periodo limita las sesiones que se crean. El formulario configurable queda solo como propuesta.

**Tareas incluidas:**

- [x] Confirmado: al salir de la oficina de pasantía se queda en el cowork hasta marcar salida en recepción.
- [x] Confirmado: administración penaliza en cualquier laboratorio y restringe; el encargado solo penaliza en los suyos.
- [x] Corregido: las listas, campos y casillas de las ventanas volvían a su valor inicial al redibujarse.
- [x] Eliminar mi cuenta y restablecerla con el mismo RUT (código al correo anterior o recepción).
- [x] Pedir la eliminación de mis datos, con aprobación de administración y correo automático.
- [x] Periodo de las certificaciones, lugar de las sesiones y bloqueo con cancelación avisada de reservas que chocan.
- [x] Ayudas, preguntas frecuentes, traducciones y manual.
- [x] Pruebas: núcleo, navegador (demostración), servidor con PostgreSQL y migración desde 2.6.0, seguridad, accesibilidad, tamaños de pantalla e idiomas.

### 5.16 Formulario de registro configurable (versión 2.8.0, 23 de noviembre)

**Solicitud.** «Pasemos a la versión completa del sistema de alteración de campos: desarrolla la etapa 1 y confirma su funcionamiento, y haz también el desarrollo de la etapa dos de los nuevos campos con sus análisis. Asegúrate de hacer las pruebas correspondientes en ambos casos.»

**Diseño.** No se creó una base de datos aparte. La definición del formulario vive en la configuración (`reg_form`) y las respuestas en una columna nueva del perfil (`users.extra`), cifrada en PostgreSQL como el RUT y el correo. Un módulo común (`src/core/form.js`) valida las respuestas, calcula los campos que faltan y arma el análisis; lo usan igual el navegador y el servidor. Documento, nombre, correo, fecha de nacimiento, contraseña y declaraciones quedaron fijos porque de ellos dependen el ingreso, el QR, la regla de edad y los menores.

**Tareas incluidas:**

- [x] Etapa 1: mostrar u ocultar celular, comuna, actividad, ocupación, género y movilidad reducida; marcarlos obligatorios; editar, ordenar y traducir las opciones; el cambio de nombre de una opción se aplica a los perfiles que la tenían.
- [x] Etapa 2: preguntas de una opción, varias opciones, sí o no, número, fecha, texto, teléfono y correo, con ayuda, traducción, orden y obligatoriedad; archivar y restaurar sin perder respuestas.
- [x] Análisis en Datos por pregunta (conteos, rangos con promedio, meses), descarga para la analista sin datos privados y descarga completa para administración.
- [x] «Completa tu perfil» al entrar cuando falta un dato obligatorio; aviso «Perfil incompleto» en la ficha.
- [x] La analista no recibe texto libre, teléfonos ni correos agregados; el borrado de datos personales incluye las respuestas.
- [x] Ayudas, preguntas frecuentes y traducciones; manual con un apartado nuevo.
- [x] Pruebas por etapa: núcleo (`tools/test-form.mjs`), navegador (`tools/qa/formulario.cjs`) y servidor con PostgreSQL y migración desde 2.7.0 (`tools/qa/formulario.mjs`), más la repetición de todas las pruebas anteriores.

**Corrección encontrada en el camino:** dentro de las ventanas, las secciones desplegables («Traducciones») no se abrían porque el clic quedaba tomado por la ventana.

### 5.17 Textos legales, accesibilidad y correos (versión 2.9.0, 24 de noviembre)

**Solicitud.** «Agrega política de privacidad, términos y condiciones, banner de cookies si es necesario, enlace de baja en los correos, navegación con teclado, pon una casilla sin marcar para aceptar los términos y condiciones al crear un usuario, al pie de la página incluir la versión de la app y que fue diseñada por KeyPoint Systems con herramientas de IA, agrega texto alternativo a las imágenes (opción de ingreso del texto alternativo a las imágenes de los banners). Audita los SDK, analítica y el rastreo de ser necesario. Y por último también incluye los datos de contacto del Hub (configurable: por ahora un número de teléfono inventado y el correo keypoint.systems.um@gmail.com).»

**Decisiones.**

- Los textos legales se generan desde un módulo común (`src/core/legal.js`) con el contacto configurado y las preguntas que realmente pide el formulario, en los tres idiomas. Así no quedan desactualizados cuando el Hub cambia el formulario. Se revisó el marco vigente: la Ley 19.628 rige hoy y la Ley 21.719 entra en vigencia el 15 de octubre de 2027, tras el aplazamiento de la Ley 21.855. Quedan como borrador para la Municipalidad.
- **No se agregó banner de cookies**: la auditoría mostró que la app no usa cookies, analítica ni rastreo, y que lo que guarda en el navegador es estrictamente necesario. El único tercero que podía poner cookies sin que la persona lo pidiera era Google, que ahora se carga solo al tocar «Continuar con Google».
- La baja de los correos separa **avisos** (se pueden desactivar) de **correos de cuenta** (códigos, verificación, restablecimiento, eliminación de datos, autorización de menores), que se envían siempre. El enlace va firmado con HMAC-SHA-256 usando una clave derivada de la clave de cifrado, para no agregar otra clave que respaldar.

**Tareas incluidas:**

- [x] Política de privacidad y Términos en la app (es, en, pt), versión 1.0, con pantalla propia y ventana desde el registro.
- [x] Casilla sin marcar en el registro y en el registro asistido; versión y fecha guardadas; se pide a las cuentas que no han aceptado la versión vigente.
- [x] Contacto del Hub configurable en Reglas, con valores de ejemplo; pantalla de contacto y tarjeta al final de la ayuda.
- [x] Pie de página con enlaces, contacto, versión y crédito en todas las pantallas.
- [x] Avisos por correo con pie, enlace de baja, cabeceras `List-Unsubscribe` y página `/api/baja`; opción en Configuración; vista previa en Reglas.
- [x] Navegación con teclado: saltar al contenido, foco en el título, `aria-current`, Esc en el menú lateral, plano con flechas.
- [x] Texto alternativo obligatorio para el banner y la imagen del anuncio.
- [x] Auditoría de SDK, analítica y rastreo (`docs/auditoria-terceros.md`); nodemailer y esbuild actualizados.
- [x] Pruebas: núcleo (`tools/test-legal.mjs`), navegador (`tools/qa/legales.cjs`) y servidor con migración desde 2.8.0 (`tools/qa/servidor-legal.mjs`), más la repetición de todas las anteriores.

**Correcciones encontradas en el camino:** el título que recibía el foco al cambiar de pantalla lo perdía con el segundo dibujado (la actualización quitaba su `tabindex`); y en la demo, el enlace de baja abierto desde una ventana volvía a la pantalla anterior por el historial de la ventana.

---

## 6. Evolución técnica

| Aspecto | Primera entrega (1.0.0) | Versión 2.9.0 |
|---|---|---|
| Datos | Demostración en el navegador | PostgreSQL en el servidor; la demostración se mantiene |
| Lógica | Núcleo compartido entre navegador y servidor | El mismo núcleo, con permisos revisados en el servidor y vistas filtradas por rol |
| Datos personales | Texto plano | RUT, correo, teléfono y respuestas del formulario cifrados (AES-256-GCM) |
| Registro | Formulario fijo | Campos configurables y preguntas agregadas con su análisis en Datos |
| Sesiones | 12 horas, sin cierre remoto | Por dispositivo, revocables; cierre de otros dispositivos; se invalidan al cambiar la contraseña |
| Encargados | Un encargado por espacio | Varios laboratorios por encargado; cada uno ve solo los suyos |
| Asistencia | Al entrar al Hub | En dos pasos: entrada en recepción y QR del espacio; término confirmado por recepción |
| Ayuda | Manual y trípticos | Ayuda por pantalla, recorridos y preguntas frecuentes integradas, en español, inglés y portugués |
| Accesibilidad | Sin revisión formal | WCAG 2 A/AA revisado en todas las pantallas, claro y oscuro; navegación completa con teclado |
| Privacidad | Sin textos legales | Política y términos versionados, aceptación registrada, baja de avisos por correo, sin cookies ni rastreo |
| Versión | Sin registro | `package.json`, `CHANGELOG.md` y esta bitácora |

La base de datos pasó por varias versiones sin perder datos: al iniciar, el servidor crea las tablas y columnas nuevas, cifra lo que estaba sin cifrar y traslada los datos al nuevo formato (por ejemplo, los encargados a la tabla `space_managers`).

---

## 7. Verificación

- **Núcleo:** pruebas automáticas de reglas, reservas, reserva en dos pasos, plazo de recepción, pasantía, borrado de datos, eventos, cupos y permisos (`node tools/test-core.mjs`).
- **Navegador:** recorridos automáticos con Playwright en modo demostración y contra el servidor real con PostgreSQL, en computador y teléfono.
- **Actualización:** cada versión se probó sobre una base de la versión anterior.
- **Seguridad:** inyección SQL sin efecto, archivos no permitidos rechazados, bloqueo tras intentos fallidos, sesiones revocadas.
- **Accesibilidad:** axe-core sin observaciones en las pantallas principales, en modo claro y oscuro.
- **QA de la versión 2.6.0:** informe completo en `docs/informe-qa.pdf`, con los resultados por área, los defectos corregidos y lo que falta probar en el Hub.
- **Versión 2.7.0:** pruebas del núcleo, 47 verificaciones en el navegador y 30 contra el servidor real para las funciones nuevas; repetidas las de versiones anteriores, seguridad (34), accesibilidad (98 revisiones), tamaños de pantalla e idiomas. Detalle en la sección 8 de `docs/informe-qa.pdf`.
- **Versión 2.9.0:** 43 verificaciones del núcleo, 71 en el navegador y 42 contra el servidor real (con migración desde 2.8.0) para las funciones nuevas; repetidas todas las anteriores, accesibilidad (104 revisiones), tamaños, idiomas, seguridad y carga. Detalle en la sección 10 de `docs/informe-qa.pdf`.
- **Pendiente de verificación en terreno:** la instalación de cada versión en el Acer la hace Roderick; las pruebas con personas usuarias del Hub siguen en curso.

---

## 8. Pendientes y recomendaciones

1. Hacer en el Hub las pruebas que quedaron fuera del QA automático (lista en `docs/informe-qa.pdf`): Safari y Firefox, cámara y lector reales, correo real y producción.
2. Validación del RUT con una API externa (definida desde el inicio como etapa futura).
3. Doble factor para las cuentas de administración.
4. Respaldos cifrados fuera del equipo (la base y el archivo `.data-key` juntos).
5. Prueba con personas que usan lectores de pantalla.
6. Revisión de seguridad externa antes del uso definitivo.
7. Etiquetar las versiones en Git (`git tag v2.9.0`) al subir cada entrega.
8. Que la Municipalidad revise la Política de privacidad y los Términos, y reemplazar el teléfono de ejemplo del contacto por el real.
9. Revisar con el Hub qué preguntas agregar al formulario antes de abrir el registro masivo: cada pregunta obligatoria nueva se pide a todas las personas ya registradas.

---

## Anexo · Equivalencia de versiones

| Nombre usado en la conversación o en GitHub | Versión correcta |
|---|---|
| Informe, mockup y primer front end | 0.1 · 0.2 · 0.3 |
| Primera entrega completa | 1.0.0 |
| Cerrar sesión | 1.0.1 |
| Servidor real en el Acer (GitHub Pages + Tailscale) | 2.0.0 |
| Commit «actualización v2.1.1» | 2.1.1 |
| Commit «v2.2» (llamada «v1.1» en la conversación) | 2.2.0 |
| «v1.2» | 2.3.0 |
| Arreglo del puerto en uso | 2.3.1 |
| «v1.3» | 2.4.0 |
| «v1.4» | 2.5.0 |
| Término con recepción, bitácora y trípticos | 2.5.1 |
| Idiomas, manual y QA | 2.6.0 |
| Cuentas, datos y certificaciones | 2.7.0 |
| Esta entrega | 2.8.0 |
