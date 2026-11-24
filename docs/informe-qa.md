# Informe de QA · Keypoint Hub Providencia 2.6.0 a 2.9.0

Equipo keypoint · Hub Providencia · 22 de noviembre de 2026. Aseguramiento de calidad y mediación con el Hub: Cesar Aravena. Pruebas automatizadas ejecutadas sobre la versión 2.6.0, que incluye las ayudas en inglés y portugués. La sección 8 agrega las pruebas de la versión 2.7.0 y la sección 9, las de la 2.8.0 (formulario de registro configurable).

## 1. Resumen

| Área | Pruebas | Resultado |
|---|---|---|
| Reglas del núcleo | Más de 110 verificaciones | Todas correctas |
| Funcionamiento por rol en el navegador (modo demostración) | 87 verificaciones y recorrido de 39 pantallas | Todas correctas, sin errores de JavaScript |
| Servidor real con PostgreSQL | 29 verificaciones y migración desde 2.5.1 | Todas correctas |
| Seguridad | 34 verificaciones | Todas correctas, tras corregir D4 |
| Accesibilidad (WCAG 2 A y AA, axe-core) | 98 revisiones: 49 pantallas en tema claro y oscuro | Sin infracciones, tras corregir D1 |
| Pantallas de distintos tamaños | 259 combinaciones de pantalla, ancho e idioma | Sin desbordes, tras corregir D2 y D3 |
| Idiomas (inglés y portugués) | App de usuarios completa, ayudas y notificaciones | Sin textos del sistema en español, tras corregir D5 |
| Rendimiento y carga | 50 sesiones simultáneas | 0 errores; p95 de 282 ms |

Se encontraron **6 defectos**, todos corregidos y verificados de nuevo en esta misma versión. Ninguno afectaba datos guardados.

## 2. Defectos encontrados y corregidos

| N.º | Gravedad | Dónde | Qué pasaba | Corrección |
|---|---|---|---|---|
| D1 | Media (accesibilidad) | Cabecera, todas las pantallas del teléfono | La etiqueta DEMO tenía un contraste de 3,05:1 (mínimo 4,5:1) porque heredaba la transparencia del lema. La misma regla impedía ocultarla en pantallas angostas, como pedía el diseño. | La regla del lema ya no alcanza a la etiqueta: contraste de 5,5:1. La etiqueta se deja visible en todos los tamaños para que siempre se note el modo demostración. |
| D2 | Baja | Datos (analista y administración) | En los gráficos, el botón de una variable con nombre largo («Labores del hogar, cesantes, jubilados…») desbordaba la pantalla a 1366 px. | Los nombres largos se parten en dos líneas. |
| D3 | Baja | Mis reservas, en teléfonos de 320 px | La etiqueta «Archivo en revisión» sobresalía 5 px y aparecía una barra horizontal. | En pantallas de 360 px o menos, las etiquetas se parten en dos líneas. |
| D4 | Media (seguridad) | Ingreso | 8 contraseñas incorrectas desde cualquier equipo bloqueaban la cuenta 15 minutos: cualquiera podía dejar fuera a administración a propósito. | Límite de 8 intentos por cuenta desde una misma dirección, 50 por cuenta en total y 30 por dirección. Verificado: tras el ataque desde otra dirección, administración sigue entrando. |
| D5 | Media (idiomas) | App de usuarios en inglés y portugués | Las guías de cada pantalla, el recorrido guiado, las preguntas frecuentes, las notificaciones, el aviso de sesión y algunas ayudas del registro seguían en español. | Traducidas: 16 guías, 25 preguntas frecuentes, 34 textos fijos y 18 mensajes con datos variables, por idioma. |
| D6 | Baja | Ventana de ayuda en inglés | El botón «Guided tour» se partía en dos líneas. | Los botones de la ventana toman su ancho natural y bajan de línea si no caben. |

Además se actualizó una prueba que había quedado antigua: esperaba 4 pasos en el recorrido de Inicio y desde la versión 2.5.0 son 5. No era un defecto.

## 3. Alcance y entorno

- **Versión probada:** 2.6.0 (app web, servidor y base de datos).
- **Navegador:** Chromium 1243 (motor de Chrome y Edge) controlado con Playwright.
- **Servidor:** Node.js 22 y PostgreSQL 16 con columnas cifradas, igual que en el Acer.
- **Datos:** los de ejemplo (`init-db.mjs --demo`): 160 usuarios, 725 reservas y 2836 visitas.
- **Credenciales probadas:** persona usuaria (también menor de edad), recepción, encargado de laboratorio, administración y analista.

## 4. Resultados por área

### 4.1 Reglas del núcleo
`node tools/test-core.mjs`: más de 110 verificaciones sobre reservas y bloques, saldo de horas, reserva en dos pasos (entrar, terminar, plazo vencido, salida sin terminar), pasantía con aforo, borrado de datos y perfiles, edades de 4 a 95 años, pisos, agenda, eventos y estadísticas. Todas correctas.

### 4.2 Funcionamiento en el navegador
- **Pruebas por versión:** 87 verificaciones de las funciones agregadas desde la 1.2 (banners automáticos, orden de eventos, ayuda y recorrido, QR de espacios, búsqueda de certificados, ocultar variables, pasantía, reserva en dos pasos desde la pantalla, «Buscar reserva actual», sesión guardada, diploma en PDF). Todas correctas.
- **Recorrido de humo:** 39 pantallas de los cinco roles. Sin errores de JavaScript.

### 4.3 Servidor real y base de datos
- **Migración:** la base se creó con la versión 2.5.1 y se abrió con el servidor 2.6.0. Arrancó sin errores, informó la versión 2.6.0 y conservó los datos (160 usuarios).
- **Sesiones y dos pasos con el servidor:** 17 verificaciones (sesión por dispositivo, cierre de sesión, cambio de contraseña, entrar y terminar una reserva con la interfaz). Todas correctas.
- **API:** 8 verificaciones de archivos, borrado con contraseña y permisos. Todas correctas.
- **App publicada en modo real:** sin cuentas de demostración, encargado ve solo sus laboratorios, código por correo y sin bloqueos de la política de seguridad (CSP).

### 4.4 Seguridad
34 verificaciones, todas correctas:

- Una persona usuaria no puede ejecutar acciones del personal (10 acciones probadas). Recepción no puede cambiar reglas, borrar ni eliminar espacios.
- Una persona usuaria no recibe las claves de los QR, los datos de contacto de otras personas (salvo su adulto responsable o sus menores a cargo), las sesiones, los códigos ni la auditoría. Sin sesión no se recibe ningún dato de personas. La analista no ve RUT ni correos.
- Se rechazan los tokens alterados o inventados.
- Solo GitHub Pages queda autorizado como origen externo (CORS).
- Las rutas con `..` no exponen archivos del servidor. Se rechazan las subidas sin sesión o de formatos no aceptados.
- La página lleva política de seguridad de contenido (sin `unsafe-eval`) y `nosniff`.
- Hay bloqueo por intentos fallidos (ver D4). La inyección SQL en el ingreso no entra.

### 4.5 Accesibilidad
axe-core (WCAG 2 A y AA) en 49 pantallas de los cinco roles, en tema claro y oscuro: 98 revisiones sin infracciones. Incluye las pantallas nuevas («Entrar a tu reserva», Ayuda y preguntas frecuentes, Ayuda para el personal). Las pruebas por versión vuelven a revisar las pantallas después de cada acción.

### 4.6 Tamaños de pantalla
Se buscó desborde horizontal en 39 pantallas a 320, 375, 768, 1024 y 1920 px (195 combinaciones). También se revisaron las 16 pantallas de usuarios en inglés y en portugués a 320 y 375 px (64 combinaciones). Sin desbordes después de corregir D2 y D3.

### 4.7 Idiomas
- Se recorrieron en inglés y portugués todas las pantallas de usuarios, con la ayuda, el recorrido y las ventanas de confirmación abiertos. Solo quedan en español los datos que ingresa el equipo del Hub: nombres de espacios y eventos, observaciones y motivos.
- **Mensajes del servidor:** hay 116 mensajes de error (107 fijos y 9 con datos variables). Todos los que puede ver una persona usuaria tienen traducción. Los 47 restantes son exclusivos de acciones del personal, cuya app queda en español por diseño.
- Las preguntas frecuentes de usuarios también se generaron impresas: `docs/faq-en.pdf` y `docs/faq-pt.pdf`.

### 4.8 Rendimiento y carga
| Medición | Resultado |
|---|---|
| 50 sesiones simultáneas pidiendo sus datos (980 pedidos) | 304 pedidos por segundo, p50 152 ms, p95 282 ms, 0 errores |
| Escaneo en recepción (40 personas seguidas) | p50 44 ms, p95 56 ms |
| Datos completos de administración | p50 25 ms, p95 43 ms |
| Núcleo: estadísticas de 90 días | 8 ms |

## 5. Lo que no se pudo verificar aquí

Estas pruebas necesitan equipos reales o el Hub. Quedan en la lista de la sección 6.

- **Firefox y Safari:** solo había Chromium (motor de Chrome y Edge). Falta probar Safari en iPhone y Firefox.
- **Dispositivos reales:** la cámara del teléfono leyendo un QR impreso y el lector USB del mesón. En las pruebas se escribió el código.
- **Correo real:** el envío de códigos por SMTP (en las pruebas, el correo queda en la bandeja de salida).
- **Producción:** el Acer con Tailscale Funnel y la app en GitHub Pages apuntando a ese servidor.
- **Lectores de pantalla:** NVDA y VoiceOver. axe-core revisa reglas automáticas, no reemplaza la prueba con personas.
- **Carga mayor:** más de 50 sesiones simultáneas y archivos cercanos al máximo de 4 GB.
- **Formato de las fechas:** dentro del texto de algunas notificaciones, las fechas usan el formato chileno también en inglés y portugués.

## 6. Lista para la prueba en el Hub

- [ ] Instalar la 2.6.0 en el Acer sin borrar `.data-key` ni `.env`. Abrir `/api/health` y comprobar que dice 2.6.0.
- [ ] Imprimir el QR de un laboratorio y de una sala, pegarlos y leerlos con Android y con iPhone desde «Entrar a tu reserva».
- [ ] Terminar una reserva y pasar por recepción antes del plazo. Debe aparecer «Término registrado: queda en el cowork».
- [ ] Terminar una reserva y no pasar por recepción. Tras 5 minutos debe llegar el aviso, y la reserva debe seguir en curso.
- [ ] Salir del Hub sin tocar «Terminar». El escaneo de salida debe cerrar la reserva.
- [ ] Leer QR con el lector USB en «Recepción y QR», con y sin «Registro automático».
- [ ] Recibir un código por correo real y entrar con él.
- [ ] Cambiar el idioma a inglés y a portugués en un teléfono y recorrer la ayuda de Inicio.
- [ ] Probar en Safari (iPhone) y Firefox: ingreso, reserva, ayuda y diploma.
- [ ] Recorrer Inicio con VoiceOver o TalkBack.
- [ ] Descargar el diploma de una certificación aprobada y abrirlo en el teléfono.
- [ ] 2.7.0: con una cuenta de prueba, «Eliminar mi cuenta», recibir el correo real, registrarse de nuevo con el mismo RUT y restablecerla con el código.
- [ ] 2.7.0: «Pedir la eliminación de mis datos», ejecutarla en Usuarios y confirmar que llega el correo.
- [ ] 2.7.0: definir el periodo de una certificación real con «Bloquear ese lugar» y revisar la agenda del laboratorio.
- [ ] 2.8.0: acordar con el Hub las preguntas del formulario, cargarlas en Sistema › Formulario de registro y revisar la vista previa en un teléfono.
- [ ] 2.8.0: con una cuenta de prueba ya registrada, comprobar que al entrar aparece «Completa tu perfil» si se agregó una pregunta obligatoria.
- [ ] 2.8.0: revisar en Datos el análisis de las preguntas después de una semana de registros reales.

## 7. Cómo repetir las pruebas

Los scripts están en `tools/qa/`, con instrucciones en `tools/qa/LEEME.md`. Las pruebas de seguridad y de carga deben ejecutarse contra una base de prueba, nunca contra la del Hub.

## 8. Pruebas de la versión 2.7.0

Funciones nuevas: eliminar y restablecer cuenta, pedir la eliminación de datos, periodo de certificaciones con lugar bloqueado y la corrección de las listas en ventanas.

| Área | Pruebas | Resultado |
|---|---|---|
| Reglas del núcleo | Pasantía (cowork sin plazo hasta la salida), eliminar y restablecer cuenta, recepción restablece, eliminación de datos, permisos de penalización, periodo, lugar bloqueado, cupos llenos | Todas correctas |
| Navegador (modo demostración) | 47 verificaciones con axe en las pantallas nuevas (`funciones-2.7.cjs`) | Todas correctas, sin errores de JavaScript |
| Servidor real con PostgreSQL | 30 verificaciones: códigos por correo, sesiones invalidadas, correos automáticos, permisos, sesiones dentro del periodo (`cuentas.mjs`) | Todas correctas |
| Migración | Base creada con la 2.6.0 y abierta con el servidor 2.7.0 | Columnas nuevas agregadas sin perder datos |
| Regresión | Pruebas por versión (87), recorrido de 39 pantallas, servidor (sesiones 17, API 8, app publicada), seguridad (34), carga | Todas correctas |
| Accesibilidad | 98 revisiones (49 pantallas, claro y oscuro) más las pantallas nuevas | Sin infracciones |
| Tamaños de pantalla | 195 combinaciones y la app de usuarios en inglés y portugués | Sin desbordes |
| Rendimiento | 50 sesiones simultáneas | 309 pedidos por segundo, p95 238 ms, 0 errores |

**Defecto corregido (D7, media):** en las ventanas, al cambiar una lista se redibujaba la ventana y sus listas, campos y casillas volvían al valor con que se abrieron. En «Penalizar horas», el cuadro mostraba el primer laboratorio aunque se aplicaba el elegido. Reproducido en la 2.6.0 y verificado corregido en la 2.7.0.

**Ajustes en las pruebas antiguas:** la ventana de borrado ahora tiene cuatro opciones (se agregó «datos personales»). Las pruebas de seguridad necesitan `ALLOWED_ORIGIN` con la dirección de GitHub Pages para verificar CORS, y el bloqueo por intentos fallidos se reinicia solo al reiniciar el servidor: conviene ejecutar `cuentas.mjs` con un servidor recién iniciado.

**No verificado:** el correo real de cuenta eliminada y de datos eliminados (en las pruebas quedan en la bandeja de salida) y el uso en el Acer.

## 9. Pruebas de la versión 2.8.0: formulario de registro configurable

Se probó cada etapa por separado y luego juntas.

| Etapa | Núcleo (`tools/test-form.mjs`) | Navegador (`tools/qa/formulario.cjs`) | Servidor con PostgreSQL (`tools/qa/formulario.mjs`) |
|---|---|---|---|
| 1 · Campos del perfil | 29 verificaciones | 21 verificaciones | 9 verificaciones |
| 2 · Preguntas agregadas y análisis | 48 verificaciones | 43 verificaciones | 19 verificaciones |

**Etapa 1.** Mostrar y ocultar campos, obligatorio u opcional, «Obligatorio» desactivado al ocultar, opciones nuevas con traducción, mover opciones sin perder lo escrito, cambio de nombre aplicado a los perfiles (31 en la demo, 39 en PostgreSQL), registro sin el campo oculto, opción que ya no existe rechazada por el servidor, quien la tenía la conserva, «Completa tu perfil» con solo los campos que faltan, Datos sin el campo oculto, traducción en inglés, permisos (solo administración).

**Etapa 2.** Ocho tipos de pregunta con sus validaciones (número fuera de rango, fecha inexistente, teléfono, correo, opción inválida, sí o no), obligatoria revisada antes de enviar y en el servidor, contacto opcional en el registro asistido, «Completa tu perfil» con «Ahora no» y vuelta a pedir al entrar de nuevo, respuestas en perfil, ficha y «Actualizar datos», análisis en Datos (conteos, varias opciones, sí o no, rangos con promedio, meses), texto libre excluido de Datos y de la descarga de la analista, descarga completa de administración, archivar y restaurar con respuestas conservadas, opción archivada que se sigue contando, tipo bloqueado si hay respuestas, orden.

**Servidor.** Base creada con la 2.7.0 y abierta con el servidor 2.8.0: se agregó la columna `users.extra` y el formulario partió con los valores por defecto. Las respuestas quedan cifradas en PostgreSQL (`enc:v1:…`, sin texto legible), se descifran bien después de reiniciar el servidor, la analista no recibe texto libre ni contacto, una persona usuaria no recibe respuestas ajenas y «Borrar los datos personales» las deja vacías.

**Accesibilidad y tamaños.** axe sin infracciones en Formulario de registro, ventanas de opciones y de pregunta, registro con preguntas, Completa tu perfil, Editar mis datos, Actualizar datos y Datos con preguntas. Sin desborde a 320 px (registro y completar perfil) ni a 375 px (Formulario de registro).

**Defecto corregido (D8, baja):** en las ventanas, las secciones desplegables («Traducciones») no se abrían porque el clic quedaba tomado por la ventana. No había desplegables en ventanas antes de esta versión.

**Prueba antigua ajustada:** «ordenar eventos por fecha» suponía que solo un evento estaba en curso. Según la hora del día, el evento de ejemplo «Semana del emprendimiento» también lo está, y el orden correcto lo pone primero. Se comprobó que la 2.7.0 falla igual a esa hora, así que no es un efecto de la 2.8.0. La prueba ahora acepta cualquier evento en curso al inicio.

**Regresión.** Se repitieron todas las pruebas anteriores sobre la 2.8.0:

| Prueba | Resultado |
|---|---|
| Núcleo (`npm test`: reglas y formulario) | Todas correctas |
| Pruebas por versión 1.2 a 1.4 (87) y 2.7 (47) | Todas correctas (ver el ajuste de «ordenar eventos») |
| Recorrido de 39 pantallas | Sin errores de JavaScript |
| Accesibilidad (98 revisiones, claro y oscuro) | Sin infracciones |
| Tamaños de pantalla (195 combinaciones, más inglés y portugués) | Sin desbordes |
| Idiomas | Solo quedan en español los datos que escribe el equipo |
| Servidor: sesiones (17), API (8), app publicada, cuentas 2.7 (30) | Todas correctas |
| Seguridad (34) | Todas correctas |
| Carga: 50 sesiones simultáneas | 0 errores; p95 de 288 ms |

**No verificado:** el uso real del formulario por personas del Hub, lectores de pantalla en los campos de varias opciones y la exportación abierta en Excel con caracteres especiales en los nombres de las preguntas.


## 10. Pruebas de la versión 2.9.0: textos legales, accesibilidad y correos

| Área | Núcleo (`tools/test-legal.mjs`) | Navegador (`tools/qa/legales.cjs`) | Servidor con PostgreSQL (`tools/qa/servidor-legal.mjs`) |
|---|---|---|---|
| Verificaciones | 43 | 71 | 42 |

**Términos y política.** La casilla aparece sin marcar; sin marcarla no se crea la cuenta (pantalla y servidor, también en el registro asistido); con ella se guardan versión y fecha. Las cuentas de una base 2.8.0 quedan sin aceptar y la app se los pide; aceptar una versión distinta de la vigente se rechaza. Los documentos tienen 12 y 9 secciones en los tres idiomas, citan las leyes 19.628 y 21.719, declaran que no hay cookies y traen el contacto y las preguntas reales del formulario. Se abren en una ventana desde el registro sin perder lo escrito.

**Contacto.** Solo administración lo cambia; se rechazan correo o teléfono inválidos y campos desconocidos; se ve sin iniciar sesión; el pie cambia al guardar; persiste al reiniciar el servidor.

**Correos.** Con `MAIL_TEST_DIR` se revisó el correo final que arma el servidor: el aviso trae el enlace personal a la app, el contacto, la versión y el crédito, más `List-Unsubscribe` (https y mailto) y `List-Unsubscribe-Post`. El código de acceso no trae baja. `/api/baja` con firma alterada responde 400; el GET solo muestra la confirmación; el POST (un clic) da de baja y queda en la auditoría. Después de la baja el aviso llega a la app pero no al correo, y se reactiva desde Configuración. El cuerpo sigue cifrado en la base.

**Teclado.** El primer Tab llega a «Saltar al contenido» y Enter lleva al contenido; al cambiar de pantalla el foco va al título; las ventanas retienen el foco y se cierran con Esc; el menú lateral recibe el foco y se cierra con Esc; en el plano, Enter selecciona una zona, las flechas la mueven 10 px y Mayús + flechas la agrandan, sin perder el foco.

**Texto alternativo.** Sin imagen no se pide; con imagen es obligatorio (pantalla y servidor); la persona usuaria ve el banner con ese texto; todas las imágenes del inicio tienen `alt`.

**Google.** No se carga ningún script de Google al abrir la app.

**Defectos corregidos (D9 y D10, bajos):** el título que recibía el foco al cambiar de pantalla lo perdía con el segundo dibujado (se quitaba su `tabindex`); y en la demo, el enlace de baja abierto desde la vista previa del correo volvía a la pantalla anterior por el historial de la ventana. Ambos se encontraron con las pruebas nuevas, antes de entregar.

**Prueba antigua ajustada:** en `v14`, «entrada de Camila» esperaba siempre una entrada. Según la hora, los datos de ejemplo dejan a Camila dentro del Hub (tiene una reserva en curso) y el escaneo registra correctamente su salida. Se aceptan ambos resultados.

**Prueba antigua ajustada (servidor):** `srv14` tenía la misma dependencia de la hora. Antes de iniciar el servidor se cierra la visita abierta de Camila en la base de prueba, y así la prueba vuelve a comprobar una entrada.

**Regresión.** Se repitieron todas las pruebas anteriores sobre la 2.9.0:

| Prueba | Resultado |
|---|---|
| Núcleo (`npm test`: reglas, formulario y legales) | Todas correctas |
| Pruebas por versión 1.2 a 1.4 (87), 2.7 (47 y 47) y 2.8 (63 y 63) | Todas correctas (con los ajustes de hora descritos) |
| Recorrido de 39 pantallas | Sin errores de JavaScript |
| Accesibilidad (104 revisiones, claro y oscuro, incluidas Política, Términos y Contacto) | Sin infracciones |
| Tamaños de pantalla (incluidas las pantallas nuevas, más inglés y portugués) | Sin desbordes |
| Idiomas | En inglés solo quedan en español los datos que escribe el equipo; en portugués, el detector marca palabras que existen en ambos idiomas (se revisaron: todo está en portugués) |
| Servidor: sesiones (17), API (8), app publicada sin errores ni bloqueos de CSP, cuentas 2.7 (30) | Todas correctas |
| Formulario contra el servidor (`formulario.mjs`) | 26 de 28: las 2 restantes comprueban la migración 2.7 → 2.8 (versión 2.8.0 y base sin preguntas) y no aplican a una base 2.9 recién creada; la migración 2.8 → 2.9 se probó con `servidor-legal.mjs` |
| Seguridad (34) | Todas correctas |
| Carga: 50 sesiones simultáneas (1000 pedidos), escaneos y datos de administración | 0 errores; p95 de 274 ms (sesiones), 46 ms (escaneos) y 35 ms (datos) |

**No verificado:** el envío real por Gmail (los correos se revisaron tal como los arma el servidor, sin pasar por SMTP) y cómo muestran Gmail y Outlook el botón «Cancelar suscripción», que depende de su reputación del remitente; lectores de pantalla reales (NVDA, VoiceOver) con el teclado; la revisión jurídica de los textos legales, que corresponde a la Municipalidad.

## 11. Pruebas de la versión 2.9.1: rendimiento con el servidor

**Medición (antes → después)** con el servidor real, PostgreSQL y datos de ejemplo; teléfono simulado con la CPU 4 veces más lenta y red de 150 ms y 3 Mbps:

| Acción | 2.9.0 | 2.9.1 |
|---|---|---|
| Guardar Reglas | 12,6 s | 0,34 s |
| Recepción escanea un RUT | 0,86 s | 0,25 s |
| Usuaria cambia una opción | 0,43 s | 0,38 s |
| Datos que devuelve una acción del equipo | 1,1 MB (88 KB comprimidos) | 1 a 2 KB |
| Ingreso (carga completa, una vez) | 0,9 s | 0,9 s |

**Exactitud** (`tools/qa/sincronizacion.mjs`, 40 verificaciones): administración, recepción, una usuaria y una analista quedan conectadas. Después de cada una de siete acciones (escaneo, ajuste de horas, cambio de perfil, Reglas, crear y borrar un evento, publicar y despublicar), los datos que arma cada una aplicando solo los cambios son idénticos, tabla por tabla, a pedir todo de nuevo. También se probó que una etiqueta desconocida recibe los datos completos, que cerrar sesión deja la vista pública y que Reglas con un dato inválido no guarda nada.

**Regresión:** sesiones (17), API (8), app publicada contra el servidor sin errores, cuentas (30), seguridad, carga (p95 de 67 ms en escaneos), pruebas 1.3, 1.4, 2.7 y 2.8 en el navegador, recorrido de pantallas, legales (71) y accesibilidad (104 revisiones): todo correcto. `formulario.mjs` sigue en 26 de 28 por las 2 verificaciones de la migración 2.7 → 2.8, que no aplican a una base nueva.

**No verificado:** la mejora sobre Tailscale Funnel real y con varios dispositivos del Hub a la vez. Los tiempos de arriba son de una red simulada.

## 12. Versión 2.9.2: diagnóstico de la lentitud en el Hub

Tras la 2.9.1 se informó que cada acción tardaba 4 a 5 s, contra 0,5 a 1 s con la 2.8.0. Se compararon ambas versiones con el mismo servidor, la misma base y la misma secuencia:

| Medición | 2.8.0 | 2.9.1 |
|---|---|---|
| Servidor: escaneo de recepción (mediana) | 25 ms | 4 ms |
| Servidor: cambio de una usuaria | 9 ms | 6 ms |
| Navegador: cambiar de pantalla (CPU ×4) | 113 ms | 114 ms |
| Navegador: escaneo completo (CPU ×4) | 166 ms | 104 ms |
| Pedidos al servidor por acción (ingreso, escaneo, cambio de opción) | 1 | 1 |

Ninguna parte del código es más lenta que en la 2.8.0, y cada acción sigue siendo un solo pedido. Una demora de 4 a 5 s por acción apunta a la red entre el dispositivo y el servidor (Tailscale Funnel, internet del Hub) o al computador del servidor (batería, ahorro de energía). Por eso la 2.9.2 agrega el diagnóstico de conexión en Reglas y el registro de pedidos lentos, que separan ambas causas en el lugar real.

Pruebas: con la red simulada a 0 ms y a 1 s de latencia, el diagnóstico mide correctamente la ida y vuelta y el tiempo del servidor. Las respuestas llegan con brotli y `Server-Timing`, sin errores de CSP. Repetidas: sincronización (40), sesiones (17), API (8), app contra el servidor, cuentas (30), seguridad, carga (p95 de 44 ms), recorrido de pantallas y legales (71). Todo correcto.
