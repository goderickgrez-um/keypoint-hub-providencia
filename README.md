# Keypoint Hub Providencia

Sistema de registro de entradas y reservas de espacios del **Hub Providencia**: credencial QR, recepción (también sin internet), salas de reuniones, sala gaming, laboratorios con revisión de archivos, certificaciones, penalizaciones, eventos, plano editable y panel de datos.

Proyecto Capstone del equipo **keypoint**: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez. Docente: Ricardo Andrés Sepúlveda. Todos los derechos reservados al equipo keypoint.

## Novedades de la versión 1.2

- **Borrar datos de una persona** (Usuarios › ficha): solo el historial, solo el perfil (el historial queda anónimo para las estadísticas) o ambos. Pide la contraseña de administración y una segunda confirmación.
- **Edad permitida** de 4 a 95 años (se cambia en Reglas). El registro explica el formato del RUT.
- **Espacios**: textos explicativos, piso elegido de una lista, eliminar con confirmación (si tiene historial se desactiva y se cancelan sus reservas futuras con aviso). Un espacio que exige certificación crea su certificación con el día y la hora indicados.
- **Plano**: al vincular una zona con un espacio se completan nombre, tipo y aforo; se pueden agregar y eliminar pisos (eliminar desactiva sus espacios).
- **Agenda**: se marcan varias horas, se revisa la lista «Horas bloqueadas:» y se guardan todas con un botón y una confirmación. Se puede liberar parte de un bloqueo largo.
- **Usuarios**: todos los eventos y avisos publicados aparecen en el carrusel de inicio (con flechas); las certificaciones inscritas aparecen en Mis reservas y en «Tu próxima reserva»; una sesión llena se muestra como «Llena» y no se puede elegir.
- **Seguridad y accesibilidad**: ver SEGURIDAD.md. Revisión automática WCAG 2 A/AA (axe) sin observaciones en las pantallas principales, en modo claro y oscuro.

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
docs/          Informe, manual de uso, trípticos por cargo y capturas
tools/         Construcción, pruebas y generación de documentos
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
