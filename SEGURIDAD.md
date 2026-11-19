# Revisión de seguridad · Keypoint Hub Providencia

Versión 1.1 · noviembre de 2026 · equipo keypoint

Este documento resume cómo se protege el sistema y qué quedó pendiente. Sigue como referencia el OWASP Top 10 (2021) y la Ley N.º 19.628, con la Ley N.º 21.719 en vista.

## 1. Base de datos

| Riesgo | Medida | Dónde |
|---|---|---|
| Inyección SQL | Todas las consultas usan parámetros (`$1, $2…`). Los nombres de tablas y columnas salen solo del modelo interno (`src/core/schema.js`), nunca de lo que escribe una persona. | `server/db.mjs` |
| Robo de la base o de un respaldo | Los datos personales que identifican a alguien se guardan cifrados con AES-256-GCM: documento (RUT o pasaporte), correo y teléfono, y en la cola de correos el destinatario y el texto. | `server/db.mjs` (`ENCRYPTED`) |
| Contraseñas | Nunca se guardan: se guarda una derivación PBKDF2-SHA256 con 120.000 iteraciones y sal por persona. | `src/core/services.js` |
| Códigos del correo | Vencen (15 minutos por defecto, configurable). Al enviarse se borran del registro de correos. | `src/core/services.js`, `server/server.js` |
| Datos de versiones anteriores | Al iniciar, el servidor cifra solo los datos que estaban sin cifrar y agrega las columnas nuevas sin borrar nada. | `server/db.mjs`, `src/core/schema.js` |

**La clave de cifrado.** Se toma de `DATA_KEY` en `.env` o, si no existe, del archivo `.data-key` que el servidor crea la primera vez. Ese archivo:

- **no se sube a GitHub** (está en `.gitignore`);
- **debe respaldarse junto con la base**: sin la clave, los RUT, correos y teléfonos no se pueden leer.

## 2. Aplicación web y servidor

| Riesgo (OWASP) | Medida |
|---|---|
| A01 Control de acceso | Cada operación revisa la credencial en el servidor, no en la pantalla. El servidor envía a cada persona solo lo que puede ver: un usuario ve sus datos, un encargado solo los de sus laboratorios, el analista ve identificadores anónimos. |
| A02 Fallas criptográficas | Conexión HTTPS (Tailscale Funnel), sesiones firmadas con HMAC-SHA256 que vencen en 12 horas, cifrado de datos personales en la base. |
| A03 Inyección | Consultas parametrizadas. Todo texto que viene de personas se escapa antes de mostrarse. Las imágenes solo se aceptan como PNG, JPG, WebP o GIF (y PDF para diplomas) y con tamaño máximo. Solo se aceptan claves de configuración conocidas y colores con formato `#RRGGBB`. |
| A04 Diseño inseguro | Las reservas se procesan de a una para que dos personas no tomen el mismo horario; la base además lo impide con una restricción. |
| A05 Configuración | Cabeceras de seguridad: política de contenido (CSP) sin scripts en línea, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. La versión de GitHub Pages lleva la misma política en la página y solo permite conectarse al servidor indicado en `config.web.js`. |
| A07 Autenticación | Tras 8 intentos fallidos sobre una misma cuenta se bloquea 15 minutos (también para códigos del correo). También hay límite por dirección cuando se conoce la dirección real. |
| A08 Integridad | Las bibliotecas van incluidas en el proyecto (no se cargan de servidores externos), salvo el botón opcional de Google. |
| A09 Registro | Las acciones del equipo quedan en la auditoría (Sistema › Auditoría). |
| Archivos subidos | Solo formatos de los laboratorios, tamaño máximo controlado mientras se recibe, 40 archivos por hora por persona, y solo los descargan el dueño, los encargados de ese laboratorio y administración. |

## 3. Pendiente o fuera de alcance

- **Cerrar sesión en todos los dispositivos** al cambiar la contraseña: hoy la sesión anterior dura hasta 12 horas.
- **Doble factor para administración.**
- **Respaldos cifrados y fuera del equipo**: `pg_dump` genera un archivo que debe guardarse en un lugar seguro; los datos personales ya van cifrados dentro.
- **Revisión externa**: no se ha hecho una prueba de penetración por terceros.
- **Equipo del servidor**: la seguridad final depende del Acer (contraseña de Windows, actualizaciones, cifrado del disco con BitLocker).

## 4. Qué hacer si se filtran datos

Ver el plan en el informe (sección 4.5): contener (cambiar `SESSION_SECRET` cierra todas las sesiones), evaluar con la auditoría, avisar a la asesoría jurídica del Hub, corregir y documentar. Si se sospecha que la clave de cifrado se filtró, se debe generar una nueva y volver a cifrar los datos (pedir apoyo al equipo keypoint).
