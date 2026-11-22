# Informe de QA · Keypoint Hub Providencia 2.6.0

Equipo keypoint · Hub Providencia · 22 de noviembre de 2026. Aseguramiento de calidad y mediación con el Hub: Cesar Aravena. Pruebas automatizadas ejecutadas sobre la versión 2.6.0, que incluye las ayudas en inglés y portugués.

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

## 7. Cómo repetir las pruebas

Los scripts están en `tools/qa/`, con instrucciones en `tools/qa/LEEME.md`. Las pruebas de seguridad y de carga deben ejecutarse contra una base de prueba, nunca contra la del Hub.
