# Keypoint Hub Providencia

Sistema de registro de entradas y reservas de espacios del **Hub Providencia**: credencial QR, recepción (también sin internet), salas de reuniones, sala gaming, laboratorios con revisión de archivos, certificaciones, penalizaciones, eventos, plano editable y panel de datos.

Proyecto Capstone del equipo **keypoint**: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez. Docente: Ricardo Andrés Sepúlveda. Todos los derechos reservados al equipo keypoint.

## Novedades de la versión 1.3

- **Ayuda en cada pantalla**: botón (?) con una guía breve y un recorrido guiado que resalta cada parte. La primera vez, Inicio y Panel invitan a hacer el recorrido.
- **Preguntas frecuentes** con buscador: para usuarios (Perfil › Configuración, o desde el ingreso sin sesión) y para el personal (menú › Ayuda y preguntas). El mismo contenido está en `docs/preguntas-frecuentes.pdf` (se regenera con `npm run docs:faq`; el contenido vive en `src/ui/faq-data.js`).
- **Banners**: pasan solos cada 5 segundos; se detienen cuando la persona los desliza o usa las flechas, se pausan con el puntero encima y tienen botón de pausa y reanudar. Si el sistema pide reducir el movimiento, no avanzan solos.
- **Eventos y banners**: orden manual con flechas y botón «Ordenar por fecha: más cercanos primero». Los vencidos aparecen en amarillo como «Terminado»; los que ya empezaron siguen visibles hasta su término (o hasta el final del día si no tienen término).
- **Cupos**: cupos, aforos y capacidades nunca pueden ser negativos (se valida en el servidor y en los formularios).

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
