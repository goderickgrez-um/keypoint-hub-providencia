# Pruebas de QA · Keypoint Hub Providencia

Scripts usados para el informe de QA (`docs/informe-qa.pdf`). Requieren Node 20+ y Playwright con Chromium (`npm i -D playwright axe-core` en una carpeta de pruebas).

> **Solo contra una base de prueba.** `seguridad.mjs` y `carga.mjs` inician sesión con las cuentas de ejemplo (`node server/init-db.mjs --demo`), registran entradas e intentan contraseñas incorrectas. Nunca contra la base del Hub.

| Script | Qué revisa | Cómo se ejecuta |
|---|---|---|
| `node tools/test-core.mjs` | Reglas del núcleo (reservas, dos pasos, pasantía, borrado, edades, pisos…) | sin servidor |
| `mensajes.mjs` | Qué mensajes de error tienen traducción al inglés y portugués | `node tools/qa/mensajes.mjs` |
| `idiomas.cjs` | Textos que siguen en español en la app de usuarios en inglés y portugués, ayudas incluidas | demo servida en `HUB_URL` (por defecto `http://localhost:8765/`) |
| `accesibilidad.cjs` | axe-core (WCAG 2 A y AA) en tema claro y oscuro, todas las pantallas por rol | demo en `HUB_URL` |
| `responsive.cjs` | Desborde horizontal en 320, 375, 768, 1024 y 1920 px; `LX=en` o `LX=pt` revisa la app de usuarios en ese idioma | demo en `HUB_URL` |
| `seguridad.mjs` | Permisos por credencial, datos filtrados, tokens alterados, CORS, rutas, subidas, CSP, intentos fallidos, inyección SQL | servidor con base de prueba en `HUB_API` (por defecto `http://localhost:8080`) |
| `funciones-2.7.cjs` | Listas dentro de ventanas, eliminar y restablecer cuenta, pedir eliminación de datos, periodo de certificaciones (navegador, con axe) | demo en `HUB_URL` |
| `cuentas.mjs` | Lo mismo contra el servidor real: sesiones, códigos por correo, correos automáticos, permisos de penalización y sesiones dentro del periodo | servidor con base de prueba **recién creada** en `HUB_API`; lee los códigos con `psql` usando `DATABASE_URL` |
| `carga.mjs` | 50 sesiones simultáneas pidiendo datos, escaneos de recepción y datos de administración | servidor con base de prueba en `HUB_API` |

Para servir la demo: copia `web/` a una carpeta de pruebas, cambia su `config.js` por `window.HUB_CONFIG = null;` y ejecuta `python -m http.server 8765` dentro de ella.
