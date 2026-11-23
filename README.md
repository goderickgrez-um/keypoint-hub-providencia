# Keypoint Hub Providencia

Sistema de registro de entradas y reservas de espacios del **Hub Providencia**: credencial QR, recepción (también sin internet), salas de reuniones, sala gaming, laboratorios con revisión de archivos, certificaciones, penalizaciones, eventos, plano editable y panel de datos.

Proyecto Capstone del equipo **keypoint**: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez. Docente: Ricardo Andrés Sepúlveda. Todos los derechos reservados al equipo keypoint.

## Versión

Versión actual: **2.8.0** (23 de noviembre de 2026). Los cambios de cada versión están en [CHANGELOG.md](CHANGELOG.md) y la historia completa del desarrollo en [docs/bitacora-desarrollo.pdf](docs/bitacora-desarrollo.pdf). La versión se cambia solo en `package.json`.

## Dos formas de usarlo

| | Demo en línea (GitHub Pages) | Sistema real (servidor) |
|---|---|---|
| Para qué | Mostrar el producto | Operar el Hub |
| Datos | De ejemplo, guardados en cada navegador | PostgreSQL en el servidor del Hub |
| Requisitos | Ninguno | Node.js 20+ y PostgreSQL 16 (o Docker) |
| Correos | Simulados (el código aparece en pantalla) | Reales, con la cuenta configurada |

Cuentas de la demo (contraseña `demo1234`): `camila.rojas@ejemplo.cl` (usuario), `marta.pizarro@ejemplo.cl` (recepción), `tomas.fuentes@ejemplo.cl` y `valentina.soto@ejemplo.cl` (encargados), `ignacio.vera@ejemplo.cl` (analista), `roderick.grez@mayor.cl` (administración).

Las instrucciones paso a paso están en **LEEME.txt**.

## Estructura

```
src/core/      Reglas del negocio, modelo de datos y datos de ejemplo (compartido navegador/servidor)
src/ui/        Pantallas de usuarios (user.js), del equipo (staff.js, admin.js), plano, estilos e idiomas
src/data/      Modo demo (local.js, IndexedDB) y modo servidor (remote.js, API)
server/        Servidor Node.js, conexión a PostgreSQL y carga inicial
database/      schema.sql y seed.sql (generados con npm run db:build)
web/           Sitio listo para publicar (generado con npm run build)
dist/          Demo en un solo archivo HTML
docs/          Informe, manual de uso, preguntas frecuentes (es, en, pt), informe de QA, trípticos y capturas
tools/         Construcción, pruebas (tools/qa) y generación de documentos
```

## Seguridad

Ver **SEGURIDAD.md**. Los datos personales se guardan cifrados con la clave del archivo `.data-key` (o `DATA_KEY` en `.env`), que no se sube a GitHub y debe respaldarse.

## Comandos

```
npm install            dependencias
npm test               pruebas de las reglas
npm run build          genera web/ y dist/
npm run db:build       genera database/schema.sql y seed.sql
npm run db:init -- --demo    crea tablas y carga datos de ejemplo
npm run db:init -- --clean   crea tablas con la configuración del Hub y la cuenta de administración
npm start              inicia el servidor en http://localhost:8080
```
