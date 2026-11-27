# Auditoría de SDK, analítica y rastreo

Keypoint Hub Providencia 2.9.0 · revisión del 24 de noviembre de 2026 · KeyPoint Systems

Esta auditoría revisa qué código y qué servicios de terceros usa la app, qué datos guarda en el dispositivo de cada persona y si hace falta un banner de cookies. Se hizo leyendo el código fuente, el paquete publicado (`web/`), las cabeceras del servidor y las dependencias de npm.

## Resumen

- **No hay analítica, publicidad ni rastreo.** El código no incluye Google Analytics, Tag Manager, Meta Pixel, Hotjar, Clarity, Sentry ni otro servicio parecido. La app no envía datos de uso a nadie.
- **No hay cookies.** Ni la app ni el servidor crean cookies. La sesión viaja en una cabecera `Authorization` firmada, no en una cookie.
- **No hace falta un banner de cookies.** La app solo guarda en el navegador lo necesario para funcionar (sesión, idioma, guías vistas y acciones pendientes sin conexión). Ese almacenamiento estrictamente necesario no requiere consentimiento. La política de privacidad lo explica en su sección «Almacenamiento en tu dispositivo».
- **Google solo se carga si la persona lo elige.** Desde 2.9.0 el botón «Continuar con Google» carga el servicio de Google recién al tocarlo, y la pantalla avisa que Google usa sus propias cookies. Antes se cargaba al abrir la pantalla de ingreso.
- **Dependencias sin vulnerabilidades conocidas.** `npm audit` informa 0 vulnerabilidades. En esta versión se actualizaron nodemailer (a 10.6.1) y esbuild (a 0.28.2).

## 1. Dependencias de npm

| Paquete | Versión | Dónde corre | Para qué | Licencia |
|---|---|---|---|---|
| `pg` | 8.23.1 | Servidor | Conexión con PostgreSQL | MIT |
| `nodemailer` | 10.6.1 | Servidor | Envío de correos por SMTP (Gmail) | MIT-0 |
| `esbuild` | 0.28.2 | Solo desarrollo | Arma `web/app.js`; no se publica | MIT |

`pg` trae 13 paquetes auxiliares propios (pg-pool, pg-protocol, pg-types, postgres-date, etc.). Ninguno hace llamadas de red fuera de la conexión a la base. Comando usado: `npm audit` → *found 0 vulnerabilities*.

## 2. Bibliotecas incluidas en la app (`vendor/`)

| Biblioteca | Para qué | Licencia | Llamadas de red |
|---|---|---|---|
| jsQR | Leer códigos QR con la cámara en recepción | Apache-2.0 | Ninguna |
| qrcode-generator (Kazuhiko Arase) | Dibujar el QR de cada persona y de cada espacio | MIT | Ninguna |

Ambas se sirven desde el mismo origen que la app (`vendor.js`); no se cargan de una CDN.

## 3. Servicios externos

| Servicio | Quién lo usa | Qué recibe | Cuándo |
|---|---|---|---|
| GitHub Pages | Navegador | La petición de los archivos de la app (dirección IP, navegador) | Al abrir la app publicada |
| Tailscale Funnel | Navegador → servidor del Hub | El tráfico cifrado hacia el servidor (TLS) | Cada vez que la app pide o guarda datos |
| Gmail (SMTP de Google) | Servidor | Destinatario, asunto y texto de cada correo | Al enviar códigos, confirmaciones y avisos |
| Google Identity Services (`accounts.google.com`) | Navegador | Lo que Google recibe al iniciar sesión con Google, incluidas sus cookies | Solo si el Hub configuró un ID de cliente **y** la persona toca «Continuar con Google» |
| `oauth2.googleapis.com/tokeninfo` | Servidor | El token de Google de esa persona, para comprobarlo | Solo al ingresar con Google |

No hay fuentes, imágenes ni scripts de otros dominios. La política de seguridad de contenido (CSP) del servidor y de `index.html` solo permite `'self'` y `accounts.google.com`, así que un script de terceros agregado por error no se ejecutaría.

El ID de cliente de Microsoft que aparece en Reglas está reservado para una versión futura: no se usa ni se carga ningún SDK de Microsoft.

## 4. Lo que la app guarda en el dispositivo

| Clave | Dónde | Contenido | Cuándo se borra |
|---|---|---|---|
| `hub-token`, `hub-uid` | localStorage (o sessionStorage si no se marca «Mantener la sesión») | Sesión firmada y número de usuario | Al cerrar sesión o vencer (12 h) |
| `hub-lang` | localStorage | Idioma elegido | Al cambiarlo |
| `hub-tour-*` | localStorage | Guías de pantalla ya vistas | Al borrar los datos del navegador |
| `hub-queue` | localStorage | Acciones hechas sin conexión (recepción) | Al volver la conexión y enviarlas |
| `hub-public-v1` | localStorage | Vista pública del Hub (nombre, contacto, formulario, eventos publicados) para mostrar el ingreso al instante; sin datos personales | Se reemplaza en cada visita |
| `keypoint-hub` | IndexedDB | Solo en la demo: los datos de ejemplo | Al reiniciar la demo |
| Caché del service worker | Cache Storage | Archivos de la app para abrirla sin conexión | Con cada versión nueva |

Todo es necesario para que la app funcione o es una preferencia que la persona eligió. Nada se usa para identificarla entre sitios ni para medir su comportamiento.

## 5. Correos

- Cada correo termina con el contacto del Hub, la versión de la app y el crédito de KeyPoint Systems.
- Los **avisos** (reservas, eventos, horas, archivos) llevan un enlace personal firmado (HMAC-SHA-256) para dejar de recibirlos, y las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` para el botón «Cancelar suscripción» de Gmail y Outlook.
- Los **correos de cuenta** (códigos de acceso, verificación, restablecimiento, eliminación de datos, autorización de menores) se envían siempre y lo dicen en su pie.
- Los correos no llevan imágenes remotas, píxeles de seguimiento ni enlaces con parámetros de rastreo.

## 6. Recomendaciones

1. **Revisión legal.** La Política de privacidad y los Términos son un borrador. Debe revisarlos la Municipalidad antes de publicar, en especial el responsable del tratamiento, los plazos de conservación y la base legal.
2. **Ley 21.719.** Entra en vigencia el 15 de octubre de 2027 (Ley 21.855 la aplazó). Antes de esa fecha conviene designar quién atenderá las solicitudes de derechos y registrar los tratamientos.
3. **Si algún día se agrega analítica**, usar una herramienta sin cookies y alojada por el Hub, actualizar esta auditoría y la política, y recién entonces evaluar si hace falta un banner.
4. **Contacto real.** El teléfono que trae la app es de ejemplo: reemplazarlo en Reglas › Contacto del Hub.
5. **Repetir esta revisión** con cada versión que agregue una dependencia o un servicio externo (`npm audit` y `npm ls --omit=dev`).
