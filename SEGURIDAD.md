# Revisión de seguridad · Keypoint Hub Providencia

Versión 2.6.0 · noviembre de 2026 · equipo keypoint

Este documento resume cómo se protege el sistema y qué quedó pendiente. Sigue como referencia el OWASP Top 10 (2021) y la Ley N.º 19.628, con la Ley N.º 21.719 en vista.

## 1. Base de datos

| Riesgo | Medida | Dónde |
|---|---|---|
| Inyección SQL | Todas las consultas usan parámetros (`$1, $2…`). Los nombres de tablas y columnas salen solo del modelo interno (`src/core/schema.js`), nunca de lo que escribe una persona. | `server/db.mjs` |
| Robo de la base o de un respaldo | Los datos personales que identifican a alguien se guardan cifrados con AES-256-GCM: documento (RUT o pasaporte), correo y teléfono, y en la cola de correos el destinatario y el texto. | `server/db.mjs` (`ENCRYPTED`) |
| Contraseñas | Nunca se guardan: se guarda una derivación PBKDF2-SHA256 con 120.000 iteraciones y sal por persona. La comparación se hace en tiempo constante. | `src/core/services.js` |
| Códigos del correo | Vencen (15 minutos por defecto, configurable). Al enviarse se borran del registro de correos. | `src/core/services.js`, `server/server.js` |
| Clave equivocada | Si la clave de cifrado no corresponde a la base, el servidor no arranca y lo dice (no sobrescribe ni pierde datos). | `server/db.mjs` |
| Borrado de datos personales | Administración puede borrar el historial, el perfil o ambos (derecho de supresión). Exige su contraseña, una segunda confirmación y queda en la auditoría. Al borrar, también se eliminan del disco los archivos subidos. | `src/core/services.js` (`user.erase`) |
| Datos de versiones anteriores | Al iniciar, el servidor cifra solo los datos que estaban sin cifrar y agrega las columnas nuevas sin borrar nada. | `server/db.mjs`, `src/core/schema.js` |

**La clave de cifrado.** Se toma de `DATA_KEY` en `.env` o, si no existe, del archivo `.data-key` que el servidor crea la primera vez. Ese archivo:

- **no se sube a GitHub** (está en `.gitignore`);
- **debe respaldarse junto con la base**: sin la clave, los RUT, correos y teléfonos no se pueden leer.

## 2. Aplicación web y servidor

| Riesgo (OWASP) | Medida |
|---|---|
| A01 Control de acceso | Cada operación revisa la credencial en el servidor, no en la pantalla. El servidor envía a cada persona solo lo que puede ver: un usuario ve sus datos, un encargado solo los de sus laboratorios, el analista ve identificadores anónimos. Los usuarios no ven quién creó un bloqueo, y la ruta `/api/health` ya no informa cuántas personas hay registradas. |
| A02 Fallas criptográficas | Conexión HTTPS (Tailscale Funnel), sesiones firmadas con HMAC-SHA256 que vencen en 12 horas, cifrado de datos personales en la base. |
| A03 Inyección | Consultas parametrizadas. Todo texto que viene de personas se escapa antes de mostrarse. Las imágenes solo se aceptan como PNG, JPG, WebP o GIF (y PDF para diplomas) y con tamaño máximo. Solo se aceptan claves de configuración conocidas, números dentro de rango y colores con formato `#RRGGBB` (también en el plano). |
| A04 Diseño inseguro | Las reservas se procesan de a una para que dos personas no tomen el mismo horario; la base además lo impide con una restricción. |
| A05 Configuración | Cabeceras de seguridad: política de contenido (CSP) sin scripts en línea, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. La versión de GitHub Pages lleva la misma política en la página y solo permite conectarse al servidor indicado en `config.web.js`. |
| A07 Autenticación | Tras 8 intentos fallidos sobre una misma cuenta desde una misma dirección, esa dirección queda bloqueada para la cuenta por 15 minutos; con 50 intentos fallidos en total (desde cualquier dirección) se bloquea la cuenta (también para códigos del correo y para la contraseña que confirma un borrado). Así un tercero no puede dejar bloqueada la cuenta de administración con pocos intentos (corrección 2.6.0). También hay límite de 30 intentos por dirección cuando se conoce la dirección real. Al cambiar la contraseña se cierran las sesiones abiertas en otros dispositivos; una cuenta borrada pierde su sesión de inmediato. «Mantener la sesión» guarda en el dispositivo una sesión sin vencimiento, registrada en la tabla `sessions`: cerrar sesión la revoca en el servidor, y desde el perfil se pueden cerrar las de los otros dispositivos. No se recomienda en equipos compartidos (la casilla lo advierte). |
| A08 Integridad | Las bibliotecas van incluidas en el proyecto (no se cargan de servidores externos), salvo el botón opcional de Google. |
| A09 Registro | Las acciones del equipo quedan en la auditoría (Sistema › Auditoría). |
| QR de los espacios | Cada QR lleva una clave aleatoria de 8 caracteres que solo ve el equipo. Confirmar la llegada exige además estar registrado dentro del Hub. Si un QR se copia, se renueva y el anterior deja de servir. |
| Archivos subidos | Solo formatos de los laboratorios, tamaño máximo controlado mientras se recibe, 40 archivos por hora por persona, y solo los descargan el dueño, los encargados de ese laboratorio y administración. |

## 3. Pendiente o fuera de alcance

- **Doble factor para administración.**
- **Respaldos cifrados y fuera del equipo**: `pg_dump` genera un archivo que debe guardarse en un lugar seguro; los datos personales ya van cifrados dentro.
- **Revisión externa**: no se ha hecho una prueba de penetración por terceros.
- **Equipo del servidor**: la seguridad final depende del Acer (contraseña de Windows, actualizaciones, cifrado del disco con BitLocker).

## 4. Accesibilidad

La versión 2.3.0 se revisó por primera vez con axe-core (WCAG 2.0/2.1 nivel A y AA) en 34 pantallas en modo claro y oscuro, más el ingreso y el registro, sin observaciones; la revisión se repitió en las versiones 2.4.0, 2.5.0 y 2.5.1, incluidas las pantallas nuevas. Las ventanas reciben el foco al abrirse, lo mantienen dentro con la tecla Tab y lo devuelven al cerrarse; los campos tienen etiqueta y textos de ayuda asociados; los cambios de agenda se anuncian a lectores de pantalla. Falta una prueba con personas usuarias de lectores de pantalla.

## 5. Qué hacer si se filtran datos

Ver el plan en el informe (sección 4.5): contener (cambiar `SESSION_SECRET` cierra todas las sesiones), evaluar con la auditoría, avisar a la asesoría jurídica del Hub, corregir y documentar. Si se sospecha que la clave de cifrado se filtró, se debe generar una nueva y volver a cifrar los datos (pedir apoyo al equipo keypoint).
