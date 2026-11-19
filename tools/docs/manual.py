# Genera docs/manual.html (luego se imprime a PDF con tools/docs/print.cjs).
import os, html
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG = 'img/'

CSS = """
@page { size: Letter; margin: 18mm 18mm 20mm; }
body { font: 10.5pt/1.5 Inter, 'DejaVu Sans', sans-serif; color: #1D1D1F; margin: 0; }
h1 { font-size: 26pt; letter-spacing: -.02em; margin: 0 0 4mm; line-height: 1.1; }
h2 { font-size: 17pt; margin: 0 0 3mm; letter-spacing: -.01em; color: #0E7C86; break-after: avoid; }
h3 { font-size: 12pt; margin: 6mm 0 2mm; break-after: avoid; }
p, li { margin: 0 0 2mm; } ul, ol { padding-left: 6mm; margin: 0 0 3mm; }
.chap { break-before: page; } .muted { color: #63636A; } .sm { font-size: 9pt; }
.cover { height: 235mm; display: flex; flex-direction: column; justify-content: space-between; }
.cover img.logo { width: 34mm; } .cover .t { font-size: 34pt; font-weight: 700; letter-spacing: -.025em; line-height: 1.05; }
.box { background: #EAF3F2; border-radius: 3mm; padding: 3mm 4mm; margin: 3mm 0; break-inside: avoid; }
.warn { background: #FFF4D6; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 2mm 0 4mm; break-inside: avoid; }
th, td { text-align: left; padding: 1.6mm 2mm; border-bottom: .3mm solid #DAD5CA; vertical-align: top; } th { color: #63636A; font-weight: 600; }
.shots { display: flex; gap: 4mm; margin: 3mm 0; break-inside: avoid; align-items: flex-start; }
.shots figure { margin: 0; flex: 1; } .shots img { width: 100%; border-radius: 2mm; border: .3mm solid #DAD5CA; display: block; }
.shots.m figure { flex: 0 0 52mm; } figcaption { font-size: 8.5pt; color: #63636A; margin-top: 1mm; }
.wide img { width: 100%; border-radius: 2mm; border: .3mm solid #DAD5CA; } .wide { margin: 3mm 0; break-inside: avoid; }
.toc li { margin: 0 0 1.2mm; } code { font-family: 'DejaVu Sans Mono', monospace; font-size: 9pt; background: #F1F1F3; padding: .3mm 1mm; border-radius: 1mm; }
"""

def shots(*items, mobile=False):
    return f'<div class="shots{" m" if mobile else ""}">' + ''.join(f'<figure><img src="{IMG}{f}.png"><figcaption>{c}</figcaption></figure>' for f, c in items) + '</div>'
def wide(f, c): return f'<div class="wide"><img src="{IMG}{f}.png"><div class="sm muted">{c}</div></div>'
def tbl(head, rows): return '<table><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table>'

body = f"""
<section class="cover"><div><img class="logo" src="../assets/logo.png"><p class="muted" style="margin-top:8mm">Hub Providencia · Equipo keypoint</p>
<div class="t">Manual de uso<br>Keypoint Hub Providencia</div><p style="font-size:13pt;margin-top:5mm">Registro de entradas, reservas de espacios y laboratorios, y gestión del Hub.</p></div>
<div class="sm muted"><p>Versión 1.0 · noviembre de 2026 · documento para el piloto.</p><p>Equipo keypoint: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez. Docente: Ricardo Andrés Sepúlveda. Proyecto Capstone.</p></div></section>

<section class="chap"><h2>Contenido</h2><ol class="toc">
<li>Qué es el sistema y cómo se organiza</li><li>Usuarios del Hub</li><li>Recepción</li><li>Encargados de laboratorio y sala gaming</li><li>Administración</li><li>Analista de datos</li><li>Reglas por defecto</li><li>Preguntas frecuentes y problemas comunes</li></ol>

<h2 style="margin-top:8mm">1. Qué es el sistema y cómo se organiza</h2>
<p>Keypoint Hub Providencia reemplaza el libro de registro, los correos de reserva y las planillas por una sola aplicación web. Funciona en cualquier navegador, en teléfono o computador, y también puede instalarse como app.</p>
<p>Hay dos apps dentro del mismo sistema:</p>
<ul><li><b>App de usuarios.</b> Credencial con QR, reservas, certificaciones, horas de laboratorio, avisos y perfil.</li>
<li><b>App del equipo.</b> Recepción, revisión de archivos, certificaciones, espacios, agenda, datos y configuración. Cada persona ve solo las secciones de sus credenciales.</li></ul>
{tbl(['Credencial', 'Qué puede hacer'], [
 ['Recepción', 'Registrar entradas y salidas, registrar usuarios de forma asistida, actualizar datos, hacer reservas asistidas, ver la agenda.'],
 ['Encargado de laboratorio', 'Revisar archivos, gestionar certificaciones, penalizar o premiar horas, bloquear horarios y editar los laboratorios a su cargo.'],
 ['Administración', 'Todo lo anterior, más espacios, plano, eventos, apariencia, reglas, empleados, restricciones de acceso y auditoría.'],
 ['Analista de datos', 'Ver estadísticas sin nombres ni RUT, importar históricos y descargar los datos.']])}
<div class="box">Una misma persona puede tener varias credenciales, por ejemplo encargado y analista. Toda persona del equipo tiene además su perfil de usuario.</div>
<h3>Entrar al sistema</h3>
<p>Se entra con RUT o correo y contraseña, con un código de 6 dígitos que llega al correo, o con la cuenta de Google cuando administración lo habilite. Quien tiene credenciales del equipo pasa directo al panel; el botón de engranaje en la app de usuarios también lleva al panel, y «App de usuario» en el menú lateral vuelve.</p>
{shots(('login', 'Pantalla de ingreso.'), mobile=True)}
<div class="box warn"><b>Modo demostración.</b> La versión publicada en GitHub Pages guarda datos de ejemplo en el navegador y muestra la etiqueta DEMO. Cada computador tiene su propia copia. La versión con servidor guarda todo en la base de datos del Hub.</div></section>

<section class="chap"><h2>2. Usuarios del Hub</h2>
<h3>Crear la cuenta</h3>
<ol><li>Toca <b>Crear cuenta</b> y completa los datos del formulario: documento (RUT, RUT provisorio o pasaporte), nombre, fecha de nacimiento, género, correo, celular, comuna, actividad en Providencia, ocupación y movilidad reducida.</li>
<li>Crea una contraseña de al menos 8 caracteres y acepta las tres declaraciones.</li>
<li>Escribe el código que llega al correo para activar la cuenta.</li></ol>
<p><b>Menores de 18 años.</b> El formulario pide el ID o RUT de un adulto con perfil en el Hub (también se puede escanear su QR). El adulto recibe el aviso en su inicio y confirma con «Sí, autorizo». Al aceptar queda como responsable ante accidentes, pérdida de equipos o mala conducta del menor. Si responde «No», el menor recibe el aviso y puede pedirla a otra persona.</p>
<h3>Inicio y credencial</h3>
<p>El inicio muestra los banners de eventos, la credencial QR, la próxima reserva, la ocupación del Hub por piso y los cierres próximos. Durante un evento aparece el botón <b>Marcar asistencia</b> sobre el QR.</p>
{shots(('u-inicio', 'Inicio con autorización pendiente, banners y QR.'), ('u-reservar', 'Menú de reservas.'), ('u-perfil', 'Perfil.'), mobile=True)}
<div class="box">El QR contiene solo el ID del perfil (por ejemplo HUB-00007). Se puede mostrar desde el teléfono o una captura; quien no tenga teléfono dice su RUT en el mesón.</div>
<h3>Reservar</h3>
<ul><li><b>Sala de reuniones:</b> elige sala, día y uno o más bloques seguidos. Agrega a cada asistente con su ID o RUT; todos deben tener perfil.</li>
<li><b>Sala gaming:</b> elige un computador en la grilla (libre u ocupado) o la sala completa para un grupo.</li>
<li><b>Laboratorios:</b> requiere la certificación del laboratorio. Sube el archivo, indica el tiempo que entrega tu programa y elige máquina y hora. La reserva se redondea a horas completas y se confirma de inmediato; el encargado revisa el archivo.</li></ul>
{shots(('u-gaming', 'PC gaming: día, bloques y equipo.'), ('u-sala', 'Sala de reuniones con asistentes.'), ('u-lab', 'Laboratorio con saldo y archivo.'), mobile=True)}
<h3>Mis reservas, historial y fallas</h3>
<p>En <b>Mis reservas</b> se cancelan reservas y se marca <b>Terminé</b> para descontar el tiempo real. En <b>Historial</b> se puede <b>Reportar una falla</b> de la máquina usada, eligiendo uno de los seis tipos más comunes u «Otra», con una descripción de hasta 1.000 caracteres.</p>
<h3>Certificaciones, horas y perfil</h3>
<p>En Reservar › Certificaciones se ven las sesiones semanales y sus cupos. En Perfil están los datos, certificaciones, uso de horas por laboratorio, observaciones de los encargados (se pueden borrar), penalizaciones vigentes y el historial. En Configuración se elige tema (según el dispositivo, claro u oscuro), idioma (español, inglés o portugués), texto grande y mayor contraste.</p>
{shots(('u-cert', 'Certificaciones.'), ('u-activas', 'Mis reservas.'), ('u-config', 'Configuración.'), mobile=True)}</section>

<section class="chap"><h2>3. Recepción</h2>
<p>Recepción usa la pantalla <b>Recepción y QR</b>, a la que también se llega con el botón QR arriba a la derecha. Se recomienda instalarla como app en el computador del mesón: en Chrome o Edge abrir <code>recepcion.html</code> y elegir «Instalar».</p>
{wide('a-scan', 'Recepción: lectura de código, ficha de la persona y últimos movimientos.')}
<h3>Registrar entradas y salidas</h3>
<ol><li>El cursor queda en el campo de código. El lector USB escribe el ID y presiona Enter solo; también se puede escribir el RUT o usar <b>Cámara</b>.</li>
<li>Con <b>Registro automático</b> activo, el primer escaneo del día marca la entrada y el siguiente la salida. Desactívalo para ver la ficha y confirmar con un botón.</li>
<li>La ficha muestra nombre, documento, correo, teléfono, reservas de hoy y avisos pendientes de la persona, para comunicárselos si no usa correo ni celular.</li></ol>
{tbl(['Resultado', 'Qué hacer'], [['Entrada o salida registrada (verde o azul)', 'Nada más.'], ['Acceso restringido (rojo)', 'Indicar a la persona la fecha de término que aparece; no se registra la entrada.'],
 ['Perfil pendiente', 'Falta confirmar el correo o la autorización del adulto responsable.'], ['No encontramos ese código', 'Registrar a la persona con «Registrar usuario nuevo».']])}
<p>Si alguien no marca su salida, el sistema la cierra sola a la hora de cierre. Si la persona tiene una reserva para esa hora, su entrada la marca como asistida, aunque llegue hasta 15 minutos tarde.</p>
<h3>Sin internet</h3>
<p>La app de recepción sigue abierta sin conexión: los escaneos se guardan en el equipo y aparece un aviso con la cantidad pendiente. Al volver la conexión se envían solos (o con <b>Sincronizar</b>) y se actualizan las reservas de quienes entraron.</p>
<h3>Registro, actualización de datos y reserva asistida</h3>
<p><b>Registrar usuario nuevo</b> usa el mismo formulario, con correo y celular opcionales y sin contraseña; al terminar muestra su QR. Desde la ficha, <b>Actualizar sus datos</b> permite corregir información o reemplazar un RUT provisorio por el definitivo, y <b>Reserva asistida</b> abre las mismas pantallas de reserva a nombre de la persona.</p>
{wide('a-prox', 'Próximas reservas del día y de los días siguientes.')}</section>

<section class="chap"><h2>4. Encargados de laboratorio y sala gaming</h2>
<p>Cada encargado tiene uno o más laboratorios asignados por administración en <b>Empleados</b> y ve solo los datos de esos laboratorios: su panel «Mis laboratorios», reservas, archivos, certificaciones, fallas y personas que los usan.</p>
<h3>Revisión de archivos</h3>
<p>La lista muestra nombre, peso, tiempo estimado, usuario y horario. El color del nombre indica el estado: amarillo en espera, verde aprobado, rojo rechazado. Al tocar el nombre se descarga el archivo.</p>
<ul><li><b>Aprobar:</b> confirma la reserva.</li><li><b>Observar:</b> abre un cuadro para escribir la observación; la reserva se mantiene.</li>
<li><b>Rechazar:</b> pide la observación, libera la reserva y devuelve las horas. El usuario recibe el texto en su perfil y su correo.</li>
<li>Solo el encargado puede borrar archivos. Los rechazados se borran solos a los 7 días; los aprobados se guardan al menos 30 días.</li></ul>
{wide('a-rev', 'Revisión de archivos.')}
<h3>Solicitudes</h3><p>Reservas presentes y futuras de los espacios a cargo. Permite cerrar una reserva con su tiempo real o cancelarla con aviso al usuario.</p>
<h3>Certificaciones</h3>
<p>Elige la certificación, la sesión y marca el resultado de cada inscrito (aprobado, reprobado, ausente) en la lista. También se puede certificar directamente con ID o RUT, subir el diploma y crear certificaciones nuevas o por niveles (por ejemplo FDM 1 a FDM 5), con día, hora, cupos, duración, vigencia, valor y quién la imparte. Las sesiones bloquean el laboratorio mientras duran.</p>
{wide('a-cert', 'Certificaciones: lista de la sesión, configuración y personas certificadas.')}
<h3>Penalizaciones y premios</h3>
<p>En <b>Usuarios</b> busca a la persona y usa <b>Penalizar horas</b> o <b>Premiar con horas</b>, indicando laboratorio, horas y motivo. La persona recibe el aviso. Una penalización se puede perdonar con un toque. Las restricciones de acceso al Hub completo son solo de administración.</p>
{wide('a-husr', 'Ficha de una persona con saldo, penalizaciones y actividad.')}
<h3>Fallas de máquinas y agenda</h3><p>Fallas muestra los reportes por máquina y por tipo en la semana, el mes, tres meses u otro periodo, y permite marcarlos como resueltos. En Agenda y bloqueos se bloquean horas o días de los espacios a cargo; las reservas afectadas se cancelan con aviso y devolución de horas.</p></section>

<section class="chap"><h2>5. Administración</h2>
<h3>Panel</h3><p>Personas dentro del Hub, reservas y archivos pendientes, ocupación por piso y espacio, mapa de calor de los últimos 30 días, proyección de las próximas horas y plano en vivo.</p>
{wide('a-panel', 'Panel de administración.')}
<h3>Espacios y plano</h3>
<p>La lista muestra cada espacio con tipo, piso, aforo, accesibilidad y encargado; el botón <b>Editar</b> abre su detalle. Ahí se cambian aforo, horas mensuales por persona, minutos entre trabajos, espera antes de liberar, duración máxima, nivel de certificación, formatos de archivo, trabajos nocturnos, accesibilidad y se agregan equipos con sus especificaciones. Para abrir un laboratorio nuevo: <b>Crear espacio</b>, agregar sus equipos, crear su certificación y asignar su encargado en Empleados. Los cambios quedan en «Cambios recientes».</p>
<p><b>Editar el plano del Hub</b> abre un editor de rectángulos por piso: agregar, arrastrar, cambiar tamaño desde la esquina, traer al frente o enviar atrás, unir dos rectángulos del mismo color en una zona, y asignar nombre, tipo, aforo, colores y el espacio vinculado. El plano alimenta el plano en vivo y el mapa de calor de Datos.</p>
{shots(('a-esp', 'Espacios.'), ('a-plano', 'Editor del plano.'))}
<h3>Eventos y banners</h3><p>Crea eventos con fecha, cupos y lugar, o avisos sin fecha. Cada uno lleva una imagen de banner (1200 × 400 px) y una imagen de anuncio que se abre al tocarlo. Se puede descargar la lista de inscritos y asistentes.</p>
<h3>Apariencia, reglas y empleados</h3>
<ul><li><b>Apariencia:</b> colores de fondo (con degradado de dos colores), tarjetas, texto, acento, texto sobre el acento y barras, por separado para tema claro y oscuro. El tema claro solo ofrece fondos claros y el oscuro, fondos oscuros. Avisa cuando un texto queda con poco contraste. También logo, nombre y lema.</li>
<li><b>Reglas:</b> horario de atención, aforo por piso, bloques, avisos, tolerancias, reservas activas, horas extra del personal, archivos, cuenta de correo y cuentas de Google o Microsoft.</li>
<li><b>Empleados:</b> agrega a una persona ya registrada como usuario, con su cargo y credenciales. Al darle la credencial de encargado de laboratorio se abre una lista para marcar sus laboratorios (uno o más) y se pide confirmación. El botón <b>Laboratorios</b> permite cambiarlos después.</li>
<li><b>Reglas:</b> también define la zona donde queda registrada una persona que entra sin reserva (cowork por defecto) y la vigencia de los códigos del correo.</li>
<li><b>Restringir acceso:</b> desde Usuarios, por horas, días o de forma permanente. Recepción verá el aviso al escanear.</li>
<li><b>Auditoría:</b> registro de las acciones del equipo.</li></ul>
{shots(('a-apar', 'Apariencia.'), ('a-reglas', 'Reglas.'))}</section>

<section class="chap"><h2>6. Analista de datos</h2>
<p>La pantalla <b>Datos</b> resume el periodo elegido (semana, mes, 3 meses u otro): visitas, personas distintas, usuarios registrados, edad promedio, movilidad reducida e inasistencias; visitas por espacio, horas de uso por laboratorio, personas por día, mapa de calor por día y hora, uso por zona del plano, actividad en Providencia, género, ocupación, comuna y fallas de máquinas. Cada gráfico tiene su tabla de datos.</p>
<p>El analista ve a las personas como «Usuario 000xx», sin nombre, RUT ni contacto. <b>Descargar datos</b> entrega cuatro archivos CSV (usuarios, visitas, reservas y fallas), y es la única credencial con esa opción.</p>
{wide('a-datos', 'Datos del Hub.')}
<h3>Importar históricos</h3><p>Carga un CSV con las columnas <code>fecha;espacio;visitas</code> exportado desde Power BI, Google Forms o el libro. Se guarda solo como estadística y no crea cuentas: cada persona se registra por decisión propia.</p></section>

<section class="chap"><h2>7. Reglas por defecto</h2><p>Todas se cambian en Reglas o en el detalle de cada espacio.</p>
{tbl(['Regla', 'Valor'], [['Horario de atención', 'Lunes a jueves 8:30 a 18:00; viernes 8:30 a 17:00'], ['Aforo', 'Piso 1: 130 · Piso 2: 80 · Cowork 60 · Residencias 30 en 6 grupos de 5'],
 ['Equipos', '6 impresoras Ender 3, 2 Mars 4K, 1 cortadora láser, 9 máquinas de coser, 6 PC gaming'], ['Salas de reuniones', 'Sala 1: 8 personas · Sala 2: 10 personas'],
 ['Bloques de salas y gaming', '50 min con 10 min de pausa (50, 110, 170 min…)'], ['Laboratorios', 'Tiempo declarado redondeado hacia arriba a horas completas; 30 min entre trabajos'],
 ['Saldo de horas', '48 h al mes por laboratorio y sala gaming; se reinicia el día 1 y no se acumula; personal certificado +6 h'],
 ['Reservas activas por persona', '3'], ['Duración máxima', '12 h'], ['Cancelación sin perder horas', 'Hasta 15 minutos antes'], ['Espera antes de liberar', '15 minutos (inasistencia: no se devuelven las horas)'],
 ['Sala sin anfitrión', 'Se mantiene para los invitados'], ['Certificaciones', 'Láser martes, resina miércoles, filamento jueves, textil viernes; 12:00, 90 min, 6 cupos, sin costo'],
 ['Archivos', 'Hasta 4 GB; 3D: .stl .3mf .obj .ctb; láser: .svg .dxf .pdf .png .jpg; también .zip y .rar']])}</section>

<section class="chap"><h2>8. Preguntas frecuentes y problemas comunes</h2>
{tbl(['Situación', 'Qué hacer'], [
 ['No llegó el código al correo', 'Revisar spam. Si persiste, recepción puede actualizar el correo y la persona entra con «Entrar con un código».'],
 ['La persona olvidó la contraseña', 'Entrar con un código y crear una nueva en Configuración.'],
 ['La cámara no abre', 'Dar permiso de cámara al navegador o usar el lector USB o el RUT. La cámara requiere HTTPS.'],
 ['El lector USB no escribe', 'Hacer clic en el campo de código; el lector funciona como un teclado.'],
 ['Una reserva no aparece disponible', 'Revisar bloqueos de agenda, certificaciones en ese horario, saldo y el máximo de 3 reservas activas.'],
 ['Se cayó internet en recepción', 'Seguir escaneando: los registros se guardan y se envían al volver la conexión.'],
 ['Hay que cerrar el Hub un día', 'Agenda y bloqueos › Todo el Hub › Bloquear el día completo.'],
 ['Un menor quedó pendiente', 'El adulto debe aceptar desde su inicio. Desde el perfil del menor se puede pedir a otro adulto.']])}
<div class="box">Soporte del equipo keypoint durante el piloto: respuesta dentro de 12 horas hábiles.</div></section>
"""
open(os.path.join(ROOT, 'docs', 'manual.html'), 'w', encoding='utf-8').write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de uso · Keypoint Hub Providencia</title><style>{CSS}</style></head><body>{body}</body></html>')
print('docs/manual.html')
