# Genera docs/manual.html (luego se imprime a PDF con tools/docs/print.cjs).
import os, html, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VER = json.load(open(os.path.join(ROOT, 'package.json')))['version']
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
<div class="sm muted"><p>Versión {VER} · noviembre de 2026 · documento para el piloto.</p><p>Equipo keypoint: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez. Docente: Ricardo Andrés Sepúlveda. Proyecto Capstone.</p></div></section>

<section class="chap"><h2>Contenido</h2><ol class="toc">
<li>Qué es el sistema y cómo se organiza</li><li>Usuarios del Hub</li><li>Reserva en dos pasos: entrar y terminar</li><li>Recepción</li><li>Encargados de laboratorio y sala gaming</li><li>Administración</li><li>Analista de datos</li><li>Reglas por defecto</li><li>Ayuda, idiomas y problemas comunes</li></ol>

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
<p><b>Mantener la sesión iniciada.</b> La casilla viene marcada: en el teléfono propio la sesión queda abierta hasta tocar «Cerrar sesión» o cambiar la contraseña. En equipos compartidos hay que desmarcarla; así la sesión termina al cerrar la pestaña. Cada dispositivo tiene su propia sesión, y desde el perfil se puede cerrar la sesión en los demás.</p>
{shots(('login', 'Pantalla de ingreso.'), ('u-reg', 'Crear cuenta: el RUT se acepta con o sin puntos.'), mobile=True)}
<div class="box warn"><b>Modo demostración.</b> La versión publicada en GitHub Pages guarda datos de ejemplo en el navegador y muestra la etiqueta DEMO. Cada computador tiene su propia copia. La versión con servidor guarda todo en la base de datos del Hub.</div></section>

<section class="chap"><h2>2. Usuarios del Hub</h2>
<h3>Crear la cuenta</h3>
<ol><li>Toca <b>Crear cuenta</b> y completa los datos del formulario: documento (RUT, RUT provisorio o pasaporte), nombre, fecha de nacimiento, género, correo, celular, comuna, actividad en Providencia, ocupación y movilidad reducida.</li>
<li>Crea una contraseña de al menos 8 caracteres, acepta las tres declaraciones y marca la casilla <b>Acepto los Términos y condiciones y la Política de privacidad</b>. La casilla viene sin marcar; los botones de al lado abren cada documento en una ventana sin perder lo escrito. El registro acepta personas de 4 a 95 años (rango ajustable en Reglas).</li>
<li>Escribe el código que llega al correo para activar la cuenta.</li></ol>
<p><b>Menores de 18 años.</b> El formulario pide el ID o RUT de un adulto con perfil en el Hub (también se puede escanear su QR). El adulto recibe el aviso en su inicio y confirma con «Sí, autorizo». Al aceptar queda como responsable ante accidentes, pérdida de equipos o mala conducta del menor. Si responde «No», el menor recibe el aviso y puede pedirla a otra persona.</p>
<h3>Inicio y credencial</h3>
<p>El inicio muestra los banners de eventos, la credencial QR, la próxima reserva, la ocupación del Hub por piso y los cierres próximos. Los banners avanzan solos cada 5 segundos y se detienen cuando la persona desliza uno o usa las flechas; el botón de pausa los vuelve a activar. Durante un evento aparece el botón <b>Marcar asistencia</b> sobre el QR.</p>
<p>Bajo el QR aparecen los botones del día: <b>Entrar a tu reserva</b> y <b>Terminar</b> (capítulo 3) y, para quien tenga pasantía asignada, <b>Entrar en oficina de pasantía</b>.</p>
{shots(('u-inicio', 'Inicio: invitación al recorrido, banners y QR.'), ('u-reservar', 'Menú de reservas.'), ('u-perfil', 'Perfil.'), mobile=True)}
<div class="box">El QR contiene solo el ID del perfil (por ejemplo HUB-00007). Se puede mostrar desde el teléfono o una captura; quien no tenga teléfono dice su RUT en el mesón.</div>
<h3>Reservar</h3>
<ul><li><b>Sala de reuniones:</b> elige sala, día y uno o más bloques seguidos. Agrega a cada asistente con su ID o RUT; todos deben tener perfil.</li>
<li><b>Sala gaming:</b> elige un computador en la grilla (libre u ocupado) o la sala completa para un grupo.</li>
<li><b>Laboratorios:</b> requiere la certificación del laboratorio. Sube el archivo, indica el tiempo que entrega tu programa y elige máquina y hora. La reserva se redondea a horas completas y se confirma de inmediato; el encargado revisa el archivo.</li></ul>
{shots(('u-gaming', 'PC gaming: día, bloques y equipo.'), ('u-sala', 'Sala de reuniones con asistentes.'), ('u-lab', 'Laboratorio con saldo y archivo.'), mobile=True)}
<h3>Mis reservas, historial y fallas</h3>
<p>En <b>Mis reservas</b> están las reservas y certificaciones activas, de la más cercana a la más lejana, y desde ahí se cancelan. El inicio y el término de cada reserva se hacen con los botones bajo el QR (capítulo 3). En <b>Historial</b> se puede <b>Reportar una falla</b> de la máquina usada, eligiendo uno de los seis tipos más comunes u «Otra», con una descripción de hasta 1.000 caracteres.</p>
<h3>Certificaciones, horas y perfil</h3>
<p>En Reservar › Certificaciones se ven las sesiones semanales y sus cupos. Cada certificación indica el periodo en que se imparte («Empieza el…», «Hasta el…»); terminado el periodo deja de mostrarse. Las sesiones llenas aparecen como «Llena» y, cuando todas las del periodo están llenas, la certificación dice «Sin cupos» y no se puede elegir. La inscripción aparece en Mis reservas y en «Tu próxima reserva». En Perfil están los datos, certificaciones (cada una con <b>Descargar diploma</b> en PDF), uso de horas por laboratorio, observaciones de los encargados (se pueden borrar), penalizaciones vigentes, el historial y el estado de la sesión. En Configuración se elige tema (según el dispositivo, claro u oscuro), idioma (español, inglés o portugués), texto grande y mayor contraste.</p>
{shots(('u-cert', 'Certificaciones.'), ('u-activas', 'Mis reservas.'), ('u-config', 'Configuración.'), mobile=True)}
{shots(('u-diploma', 'Certificaciones con su diploma.'), ('u-sesion', 'Sesión guardada y cierre en otros dispositivos.'), ('u-lab', 'Laboratorio con saldo y archivo.'), mobile=True)}
<h3>Completar el perfil</h3>
<p>Si el Hub agrega preguntas obligatorias al formulario de registro, la app las pide al entrar en <b>Completa tu perfil</b>. Con «Guardar» queda listo; con «Ahora no» se sigue usando la app y se vuelve a pedir la próxima vez. Las respuestas se ven y se cambian en Perfil › <b>Editar mis datos</b>. Quien se registra después ve esas preguntas en «Más información».</p>
{shots(('u-completar', 'Completa tu perfil.'), ('u-reg-mas', 'Registro: «Más información».'), ('u-perfil-respuestas', 'Respuestas en el perfil.'), mobile=True)}
<h3>Privacidad y mis datos</h3>
<p>En Perfil › Configuración › <b>Privacidad y mis datos</b> hay tres opciones:</p>
<ul><li><b>Pedir una copia de mis datos:</b> avisa a administración.</li>
<li><b>Pedir la eliminación de mis datos:</b> la solicitud queda en revisión. Cuando administración la ejecuta, se borran el historial de visitas, los archivos, las observaciones y los avisos, y la comuna, actividad, ocupación, género, movilidad reducida, celular, foto y respuestas a las preguntas agregadas al formulario. Se conservan la cuenta, las certificaciones, las horas, las reservas y las penalizaciones. Llega un correo automático.</li>
<li><b>Eliminar mi cuenta:</b> con la contraseña, la cuenta queda inactiva: no se puede entrar ni usar el QR, y se cancelan las reservas e inscripciones futuras (las horas se devuelven). Llega un correo con los detalles.</li></ul>
<p><b>Restablecer la cuenta.</b> Si la persona vuelve a registrarse con el mismo RUT, el sistema le ofrece restablecer la cuenta y envía un código al correo que tenía (se muestra oculto, por ejemplo p•••@ejemplo.cl). Con el código recupera su ID, su QR, sus certificaciones, sus horas y su historial, con los datos nuevos del formulario; si cambió de correo, lo confirma con otro código. Sin acceso a ese correo, recepción la restablece revisando el carnet.</p>
{shots(('u-priv', 'Privacidad y mis datos.'), ('u-eliminar', 'Eliminar mi cuenta.'), ('u-priv-pedida', 'Solicitud de eliminación en revisión.'), mobile=True)}
{shots(('u-restablecer', 'Registro con el RUT de una cuenta eliminada.'), ('u-reopen', 'Código para restablecer.'), mobile=True)}
<h3>Textos legales, contacto y avisos por correo</h3>
<p>Al pie de cada pantalla están <b>Privacidad</b>, <b>Términos</b> y <b>Contacto</b>, el teléfono y el correo del Hub, la versión de la app y el crédito «Diseñada por KeyPoint Systems con herramientas de IA». La Política de privacidad explica qué datos se piden, para qué, quién los ve, cuánto tiempo se guardan y cómo pedir una copia o su eliminación; los Términos, las reglas de uso. Ambos están en los tres idiomas. Si el Hub publica una versión nueva, la app la pide al entrar, con la misma casilla.</p>
<p>Los <b>avisos por correo</b> (reservas, eventos, horas y archivos) terminan con un enlace para dejar de recibirlos; también se desactivan en Configuración › Avisos por correo. Los avisos siguen apareciendo en la app. Los códigos de acceso y los mensajes necesarios para la cuenta llegan siempre.</p>
<p>La app no usa cookies, analítica ni rastreo, por eso no muestra un aviso de cookies. Si el Hub activó el ingreso con Google, el servicio de Google se carga solo al tocar «Continuar con Google».</p>
{shots(('u-reg-terminos', 'Registro: casilla de términos sin marcar.'), ('u-privacidad', 'Política de privacidad.'), ('u-config-avisos', 'Configuración: avisos por correo y textos legales.'), mobile=True)}
{shots(('u-contacto', 'Contacto del Hub.'), ('u-pie', 'Pie de página con versión y créditos.'), mobile=True)}</section>

<section class="chap"><h2>3. Reserva en dos pasos: entrar y terminar</h2>
<p>Con la confirmación en dos pasos (activada por defecto en Reglas), una reserva empieza cuando la persona está dentro del Hub y escanea el QR pegado en la entrada del espacio. Así el tiempo que se descuenta es el real y recepción sabe quién está en cada laboratorio o sala.</p>
<h3>Empezar la reserva</h3>
<ol><li>La persona registra su entrada al Hub en recepción, como siempre.</li>
<li>En su inicio toca <b>Entrar a tu reserva</b>. Se puede hacer desde 10 minutos antes de la hora reservada; si no se confirma dentro de la tolerancia (15 minutos), la reserva se libera.</li>
<li>Escanea el QR del espacio con la cámara o escribe el código que aparece bajo el QR. Aparece «Asistencia confirmada» y empieza a correr su tiempo.</li></ol>
{shots(('u-qra', 'Inicio con «Entrar a tu reserva».'), ('u-entrar', 'Escanear o escribir el código del espacio.'), ('u-encurso', 'Reserva en curso con «Terminar».'), mobile=True)}
<h3>Terminar la reserva</h3>
<ol><li>Al terminar, la persona toca <b>Terminar</b> y confirma.</li>
<li>Tiene 5 minutos (ajustable) para acercarse a recepción y que escaneen su QR. El inicio muestra la hora límite.</li>
<li>Si recepción la escanea dentro del plazo, se registra la salida del laboratorio, se descuenta el tiempo real hasta el momento en que tocó «Terminar» y la persona queda en el cowork.</li></ol>
{shots(('u-terminar', 'Confirmación de «Terminar».'), ('u-pendiente', 'Aviso con la hora límite para pasar por recepción.'), ('a-scan-m', 'Recepción: «Término registrado: queda en el cowork».'), mobile=True)}
{tbl(['Situación', 'Qué pasa'], [
 ['Toca «Terminar» y pasa por recepción a tiempo', 'Se cierra la reserva con el tiempo real y la persona sigue en el Hub, en el cowork.'],
 ['Toca «Terminar» y no pasa por recepción', 'El término no se toma en cuenta: la reserva sigue en curso y la persona recibe el aviso «Expiró el plazo para pasar por recepción». Cada vez que toque «Terminar» debe pasar por recepción.'],
 ['Sale del Hub sin tocar «Terminar»', 'El escaneo de salida en recepción registra la salida del Hub y cierra la reserva en ese momento.'],
 ['No puede usar el teléfono', 'Recepción usa «Buscar reserva actual» y los botones Iniciar y Terminar (capítulo 4).']])}
<div class="box"><b>QR de cada espacio.</b> Administración descarga el cartel desde el detalle del espacio y lo pega en la entrada. Si alguien copia el código o el cartel se daña, «Generar un QR nuevo» invalida el anterior.</div>
<h3>Oficina de pasantía</h3>
<p>Las personas con pasantía asignada ven <b>Entrar en oficina de pasantía</b> bajo su QR. Con la entrada al Hub ya registrada, tocan el botón y escanean el QR de la oficina; al irse, tocan «Salir de la oficina de pasantía» y quedan registradas en el cowork, sin plazo, hasta que marcan su salida en recepción. Si la oficina está llena (según su aforo), el sistema lo avisa.</p></section>

<section class="chap"><h2>4. Recepción</h2>
<p>Recepción usa la pantalla <b>Recepción y QR</b>, a la que también se llega con el botón QR arriba a la derecha. Se recomienda instalarla como app en el computador del mesón: en Chrome o Edge abrir <code>recepcion.html</code> y elegir «Instalar».</p>
{wide('a-scan', 'Recepción: lectura de código, ficha de la persona y últimos movimientos.')}
<h3>Registrar entradas y salidas</h3>
<ol><li>El cursor queda en el campo de código. El lector USB escribe el ID y presiona Enter solo; también se puede escribir el RUT o usar <b>Cámara</b>.</li>
<li>Con <b>Registro automático</b> activo, el primer escaneo del día marca la entrada y el siguiente la salida. Desactívalo para ver la ficha y confirmar con un botón.</li>
<li>La ficha muestra nombre, documento, correo, teléfono, reservas de hoy y avisos pendientes de la persona, para comunicárselos si no usa correo ni celular.</li></ol>
{tbl(['Resultado', 'Qué hacer'], [['Entrada o salida registrada (verde o azul)', 'Nada más.'], ['Acceso restringido (rojo)', 'Indicar a la persona la fecha de término que aparece; no se registra la entrada.'],
 ['Perfil pendiente', 'Falta confirmar el correo o la autorización del adulto responsable.'], ['Cuenta eliminada (rojo)', 'La persona eliminó su cuenta. Si quiere volver, revisar su carnet y tocar «Abrir en Usuarios» › «Restablecer cuenta».'], ['No encontramos ese código', 'Registrar a la persona con «Registrar usuario nuevo».']])}
<p>Si alguien no marca su salida, el sistema la cierra sola a la hora de cierre. Si la persona tiene una reserva para esa hora, su entrada la marca como asistida, aunque llegue hasta 15 minutos tarde.</p>
<h3>Buscar reserva actual</h3>
<p>El botón <b>Buscar reserva actual</b> muestra la ficha y las reservas de hoy de la persona sin registrar entrada ni salida. Junto a cada reserva aparecen <b>Iniciar</b> (dentro de su horario) y <b>Terminar</b> (si está en curso): sirven para quien no puede usar el teléfono, y desde el mesón el inicio y el término son inmediatos.</p>
{wide('a-scan-find', 'Buscar reserva actual: ficha, reservas de hoy y botones Iniciar y Terminar.')}
<p>Cuando la persona tocó «Terminar» en su teléfono y se la escanea dentro del plazo, el resultado es «Término registrado: queda en el cowork». Si no lo tocó, o ya venció el plazo, el escaneo registra su salida del Hub y cierra la reserva en curso.</p>
<h3>Sin internet</h3>
<p>La app de recepción sigue abierta sin conexión: los escaneos se guardan en el equipo y aparece un aviso con la cantidad pendiente. Al volver la conexión se envían solos (o con <b>Sincronizar</b>) y se actualizan las reservas de quienes entraron.</p>
<h3>Registro, actualización de datos y reserva asistida</h3>
<p>Si la ficha de una persona dice <b>Perfil incompleto</b>, el formulario pide un dato que aún no tiene: se le pedirá al entrar a la app, o recepción lo completa con «Actualizar datos», que incluye las preguntas agregadas.</p>
<p><b>Registrar usuario nuevo</b> usa el mismo formulario, con correo y celular opcionales y sin contraseña; al terminar muestra su QR. Si el RUT corresponde a una cuenta que la persona eliminó, el sistema ofrece restablecerla con los datos escritos, después de revisar el carnet. Desde la ficha, <b>Actualizar sus datos</b> permite corregir información o reemplazar un RUT provisorio por el definitivo, y <b>Reserva asistida</b> abre las mismas pantallas de reserva a nombre de la persona.</p>
{wide('a-prox', 'Próximas reservas del día y de los días siguientes.')}</section>

<section class="chap"><h2>5. Encargados de laboratorio y sala gaming</h2>
<p>Cada encargado tiene uno o más laboratorios asignados por administración en <b>Empleados</b> y ve solo los datos de esos laboratorios: su panel «Mis laboratorios», reservas, archivos, certificaciones, fallas y personas que los usan.</p>
<h3>Revisión de archivos</h3>
<p>La lista muestra nombre, peso, tiempo estimado, usuario y horario. El color del nombre indica el estado: amarillo en espera, verde aprobado, rojo rechazado. Al tocar el nombre se descarga el archivo.</p>
<ul><li><b>Aprobar:</b> confirma la reserva.</li><li><b>Observar:</b> abre un cuadro para escribir la observación; la reserva se mantiene.</li>
<li><b>Rechazar:</b> pide la observación, libera la reserva y devuelve las horas. El usuario recibe el texto en su perfil y su correo.</li>
<li>Solo el encargado puede borrar archivos. Los rechazados se borran solos a los 7 días; los aprobados se guardan al menos 30 días.</li></ul>
{wide('a-rev', 'Revisión de archivos.')}
<h3>Solicitudes</h3><p>Reservas presentes y futuras de los espacios a cargo. Permite cerrar una reserva con su tiempo real o cancelarla con aviso al usuario.</p>
<h3>Certificaciones</h3>
<p>Elige la certificación, la sesión y marca el resultado de cada inscrito (aprobado, reprobado, ausente) en la lista. También se puede certificar directamente con ID o RUT, subir el diploma y crear certificaciones nuevas o por niveles (por ejemplo FDM 1 a FDM 5), con día, hora, cupos, duración, vigencia, valor y quién la imparte. El cuadro de personas certificadas tiene un buscador por nombre, RUT o ID, muestra seis personas y se puede agrandar arrastrando su borde inferior.</p>
{wide('a-cert', 'Certificaciones: lista de la sesión, configuración y personas certificadas.')}
<p><b>Periodo y lugar.</b> En Configuración, «Desde» y «Hasta» definen el periodo en que se imparte: las sesiones semanales se crean solo entre esas fechas, así el calendario no se llena indefinidamente (sin fecha de término se crean las de las próximas 4 semanas). La certificación aparece para las personas usuarias apenas se guarda. «Lugar de las sesiones» permite usar otro espacio a cargo (por defecto, el mismo laboratorio) y, con «Bloquear ese lugar durante las sesiones», nadie puede reservarlo a esa hora: las reservas que ya chocaban se cancelan, se devuelven sus horas y se avisa a cada persona. Si se cambia el día o la hora, las sesiones sin inscritos se rehacen; las que tienen inscritos se mantienen y el sistema lo avisa. Encargados y administración pueden editarla aunque esté sin cupos.</p>
{wide('a-cert-periodo', 'Periodo en que se imparte, lugar de las sesiones y bloqueo.')}
<h3>Penalizaciones y premios</h3>
<p>En <b>Usuarios</b> busca a la persona y usa <b>Penalizar horas</b> o <b>Premiar con horas</b>, indicando laboratorio, horas y motivo. La persona recibe el aviso. Una penalización se puede perdonar con un toque. Administración puede penalizar en cualquier laboratorio; cada encargado, solo en los suyos. Las restricciones de acceso al Hub completo son solo de administración.</p>
{wide('a-husr', 'Ficha de una persona con saldo, penalizaciones y actividad.')}
<h3>Fallas de máquinas y agenda</h3><p>Fallas muestra los reportes por máquina y por tipo en la semana, el mes, tres meses u otro periodo, y permite marcarlos como resueltos. En Agenda y bloqueos se bloquean horas o días de los espacios a cargo; las reservas afectadas se cancelan con aviso y devolución de horas.</p></section>

<section class="chap"><h2>6. Administración</h2>
<h3>Panel</h3><p>Personas dentro del Hub, reservas y archivos pendientes, ocupación por piso y espacio, mapa de calor de los últimos 30 días, proyección de las próximas horas y plano en vivo.</p>
{wide('a-panel', 'Panel de administración.')}
<h3>Espacios y plano</h3>
<p>La lista muestra cada espacio con tipo, piso, aforo, accesibilidad y encargado; el botón <b>Editar</b> abre su detalle. Ahí se cambian aforo, horas mensuales por persona, minutos entre trabajos, espera antes de liberar, duración máxima, nivel de certificación, formatos de archivo, trabajos nocturnos, accesibilidad y se agregan equipos con sus especificaciones. Para abrir un laboratorio nuevo: <b>Crear espacio</b>, agregar sus equipos, crear su certificación y asignar su encargado en Empleados. Los cambios quedan en «Cambios recientes».</p>
<p><b>Editar el plano del Hub</b> abre un editor de rectángulos por piso: agregar, arrastrar, cambiar tamaño desde la esquina, traer al frente o enviar atrás, unir dos rectángulos del mismo color en una zona, y asignar nombre, tipo, aforo, colores y el espacio vinculado. El plano alimenta el plano en vivo y el mapa de calor de Datos.</p>
<p>Un espacio sin historial se puede eliminar; si ya tiene visitas o reservas, se desactiva y se conserva para las estadísticas. Al vincular una zona del plano con un espacio se completan solos su nombre, tipo y aforo. En el plano también se agregan pisos y se eliminan (eliminar un piso desactiva sus espacios y cancela con aviso sus reservas futuras).</p>
<p>En el detalle de cada espacio está su <b>QR</b>: «Descargar cartel para imprimir» genera una imagen lista para pegar en la entrada.</p>
{shots(('a-esp', 'Espacios.'), ('a-plano', 'Editor del plano.'))}
{wide('a-espd', 'Detalle de un laboratorio: equipos y su QR.')}
<h3>Eventos y banners</h3><p>Crea eventos con fecha, cupos y lugar, o avisos sin fecha. Cada uno lleva una imagen de banner (1200 × 400 px) y una imagen de anuncio que se abre al tocarlo. Al elegir cada imagen aparece su <b>texto alternativo</b>, obligatorio: una frase que describe lo que muestra la imagen («Personas mirando una impresora 3D»), para quienes usan lector de pantalla o cuando la imagen no carga. No repitas el título. Los banners se muestran en el orden de la lista: se mueven con las flechas o con <b>Ordenar por fecha</b>. Los eventos en curso siguen visibles; los terminados aparecen en amarillo con la etiqueta «terminado», pasan solos al final y ya no se muestran. Los cupos nunca bajan de cero. Se puede descargar la lista de inscritos y asistentes.</p>
{wide('a-eventos', 'Eventos y banners con su orden.')}
{wide('a-eventos-alt', 'Banner con su texto alternativo.')}
<h3>Agenda y bloqueos</h3><p>Elige el espacio (o todo el Hub) y el día, toca las horas que quieres bloquear o liberar y revisa la lista «Horas bloqueadas». Los cambios se aplican con <b>Guardar cambios</b> y una confirmación; las reservas afectadas se cancelan con aviso y devolución de horas.</p>
{wide('a-agenda', 'Agenda: horas marcadas y lista de horas bloqueadas antes de guardar.')}
<h3>Apariencia, reglas y empleados</h3>
<ul><li><b>Apariencia:</b> colores de fondo (con degradado de dos colores), tarjetas, texto, acento, texto sobre el acento y barras, por separado para tema claro y oscuro. El tema claro solo ofrece fondos claros y el oscuro, fondos oscuros. Avisa cuando un texto queda con poco contraste. También logo, nombre y lema.</li>
<li><b>Formulario de registro:</b> qué datos se piden al crear una cuenta y preguntas nuevas (ver más abajo).</li>
<li><b>Reglas:</b> horario de atención, aforo por piso, bloques, avisos, tolerancias, reservas activas, horas extra del personal, archivos, cuenta de correo y cuentas de Google o Microsoft.</li>
<li><b>Empleados:</b> agrega a una persona ya registrada como usuario, con su cargo y credenciales. Al darle la credencial de encargado de laboratorio se abre una lista para marcar sus laboratorios (uno o más) y se pide confirmación. El botón <b>Laboratorios</b> permite cambiarlos después.</li>
<li><b>Reglas:</b> también define la zona donde queda registrada una persona que entra sin reserva (cowork por defecto), la vigencia de los códigos del correo, la confirmación en dos pasos y el plazo para pasar por recepción tras «Terminar», la oficina de pasantía, las edades permitidas, el aforo de cada piso y la dirección pública de la app que llevan los QR.</li>
<li><b>Usuarios:</b> en la ficha de cada persona, administración puede asignar o quitar la pasantía y <b>Borrar datos o perfil</b>: «datos personales» es lo que pide la persona desde su app (conserva certificaciones, horas, reservas y penalizaciones, y le envía un correo), «historial» borra visitas, reservas y archivos, y «perfil» elimina la cuenta. Todas piden la contraseña de administración.</li>
<li><b>Solicitudes de eliminación de datos:</b> con la búsqueda vacía, Usuarios muestra las solicitudes pendientes. En la ficha, <b>Eliminar sus datos</b> la ejecuta y <b>Descartar solicitud</b> la cierra sin cambios.</li>
<li><b>Cuentas eliminadas por la persona:</b> la ficha lo indica y recepción ve «Cuenta eliminada» al escanear. Revisando el carnet, recepción o administración pueden <b>Restablecer cuenta</b>.</li>
<li><b>Restringir acceso:</b> desde Usuarios, por horas, días o de forma permanente. Recepción verá el aviso al escanear.</li>
<li><b>Auditoría:</b> registro de las acciones del equipo.</li>
<li><b>Contacto del Hub</b> (Reglas): responsable, teléfono, correo, dirección y horario. Se muestran en el pie de la app, en la ayuda, en la pantalla de contacto, al final de cada correo y en la Política de privacidad. El teléfono que trae de ejemplo es inventado: reemplázalo por el real.</li>
<li><b>Conexión con el servidor</b> (Reglas, solo con servidor): el botón <b>Medir la conexión</b> dice cuánto tarda cada pedido en ir y volver, cuánto es trabajo del servidor y cuánto es la red, y sugiere dónde buscar si la app se siente lenta.</li>
<li><b>Últimos correos</b> (Reglas, abajo): cada correo con su tipo (aviso o cuenta) y el botón <b>Ver</b>, que muestra el texto tal como sale, con su pie y el enlace de baja.</li></ul>
{shots(('a-apar', 'Apariencia.'), ('a-reglas-2', 'Reglas: dos pasos, pasantía y aforo por piso.'))}
{shots(('a-reglas-contacto', 'Reglas: contacto del Hub.'), ('a-correo-vista', 'Vista previa de un aviso con su pie y enlace de baja.'))}
{wide('a-husr-admin', 'Ficha de una persona vista por administración: pasantía, restricciones, borrado y reserva actual.')}
{wide('a-husr-solic', 'Solicitudes de eliminación de datos y su ejecución desde la ficha.')}
<h3>Formulario de registro</h3>
<p>En Sistema › <b>Formulario de registro</b> administración decide qué datos se piden al crear una cuenta. Documento, nombre, correo, fecha de nacimiento, contraseña y declaraciones son fijos: de ellos dependen el ingreso, el código QR, la regla de edad y los menores de edad.</p>
<p><b>Campos del perfil (etapa 1).</b> Celular, comuna, actividad en Providencia, ocupación, género y movilidad reducida se pueden mostrar u ocultar y marcar como obligatorios u opcionales. Con <b>Opciones</b> se editan, ordenan y traducen las opciones de actividad, ocupación y género. Los cambios se aplican con <b>Guardar campos del perfil</b>.</p>
<ul><li>Ocultar un campo no borra lo que ya estaba guardado: deja de pedirse y de graficarse, y vuelve con sus datos si se muestra de nuevo.</li>
<li>Si se cambia el nombre de una opción, los perfiles que la tenían pasan al nombre nuevo, así las estadísticas no se separan.</li>
<li>Una opción quitada de la lista ya no se ofrece, pero quien la tenía la conserva.</li></ul>
<p><b>Preguntas agregadas (etapa 2).</b> <b>Agregar pregunta</b> crea una pregunta de una opción, varias opciones, sí o no, número (con mínimo y máximo), fecha, texto, teléfono o correo. Cada una lleva una ayuda opcional, su traducción al inglés y portugués (sin traducción se muestra en español), la marca de obligatoria y su lugar en la lista (flechas).</p>
{tbl(['Tipo de pregunta', 'Dónde se ve', 'En Datos'], [
 ['Una opción, varias opciones, sí o no', 'Registro («Más información»), perfil, «Actualizar datos» y ficha', 'Barras por respuesta, con cuántas personas respondieron'],
 ['Número', 'Igual', 'Rangos, promedio, mínimo y máximo'],
 ['Fecha', 'Igual', 'Por mes'],
 ['Texto, teléfono, correo', 'Igual, pero solo el equipo lo ve en la ficha', 'No se grafica ni lo recibe la analista']])}
<ul><li>Si una pregunta nueva es <b>obligatoria</b>, o un campo del perfil pasa a serlo, a quienes ya están registrados se les pide <b>Completa tu perfil</b> al entrar a la app. Pueden postergarlo con «Ahora no» y se les vuelve a pedir la próxima vez. La ficha en Usuarios muestra «Perfil incompleto».</li>
<li><b>Quitar</b> una pregunta u opción que ya tiene respuestas la archiva: no se ofrece, se conservan sus respuestas y se puede restaurar desde «Archivadas». Sin respuestas, se borra.</li>
<li>El tipo de una pregunta con respuestas no se puede cambiar: se archiva y se crea otra.</li>
<li><b>Descargar respuestas (CSV)</b> entrega todos los campos de cada persona, incluidas las preguntas privadas. La vista previa muestra los campos tal como los verá la persona.</li>
<li>Las respuestas se guardan cifradas en la base de datos, como el RUT y el correo. Al borrar los datos personales de alguien también se borran sus respuestas.</li></ul>
{wide('a-form', 'Formulario de registro: campos del perfil y preguntas agregadas.')}
{shots(('a-form-pregunta', 'Agregar una pregunta con opciones y traducción.'), ('a-form-opciones', 'Opciones de un campo del perfil.'))}</section>

<section class="chap"><h2>7. Analista de datos</h2>
<p>La pantalla <b>Datos</b> resume el periodo elegido (semana, mes, 3 meses u otro): visitas, personas distintas, usuarios registrados, edad promedio, movilidad reducida e inasistencias; visitas por espacio, horas de uso por laboratorio, personas por día, mapa de calor por día y hora, uso por zona del plano, actividad en Providencia, género, ocupación, comuna y fallas de máquinas. Cada gráfico tiene su tabla de datos. En los gráficos de barras se puede tocar una variable para ocultarla (por ejemplo, el cowork) y comparar mejor las demás: la escala se ajusta sola, y «Mostrar todas» las vuelve a mostrar.</p>
<p>El analista ve a las personas como «Usuario 000xx», sin nombre, RUT ni contacto. <b>Descargar datos</b> entrega cuatro archivos CSV (usuarios, visitas, reservas y fallas), y es la única credencial con esa opción.</p>
{wide('a-datos', 'Datos del Hub.')}
<p><b>Preguntas agregadas al formulario.</b> Cada pregunta analizable tiene su tarjeta con cuántas personas respondieron. Las de opciones y sí o no se cuentan por respuesta (en las de varias opciones, cada persona suma en cada opción que eligió), los números se agrupan en rangos con promedio, mínimo y máximo, y las fechas se agrupan por mes. Las opciones archivadas aparecen marcadas. Los campos ocultos del perfil no se grafican. La descarga de datos agrega una columna por pregunta analizable.</p>
{wide('a-datos-preguntas', 'Preguntas agregadas al formulario en Datos.')}
<h3>Importar históricos</h3><p>Carga un CSV con las columnas <code>fecha;espacio;visitas</code> exportado desde Power BI, Google Forms o el libro. Se guarda solo como estadística y no crea cuentas: cada persona se registra por decisión propia.</p></section>

<section class="chap"><h2>8. Reglas por defecto</h2><p>Todas se cambian en Reglas o en el detalle de cada espacio.</p>
{tbl(['Regla', 'Valor'], [['Horario de atención', 'Lunes a jueves 8:30 a 18:00; viernes 8:30 a 17:00'], ['Aforo', 'Piso 1: 130 · Piso 2: 80 · Cowork 60 · Residencias 30 en 6 grupos de 5'],
 ['Equipos', '6 impresoras Ender 3, 2 Mars 4K, 1 cortadora láser, 9 máquinas de coser, 6 PC gaming'], ['Salas de reuniones', 'Sala 1: 8 personas · Sala 2: 10 personas'],
 ['Bloques de salas y gaming', '50 min con 10 min de pausa (50, 110, 170 min…)'], ['Laboratorios', 'Tiempo declarado redondeado hacia arriba a horas completas; 30 min entre trabajos'],
 ['Saldo de horas', '48 h al mes por laboratorio y sala gaming; se reinicia el día 1 y no se acumula; personal certificado +6 h'],
 ['Reservas activas por persona', '3'], ['Confirmación en dos pasos', 'Activada: la reserva empieza al escanear el QR del espacio (desde 10 min antes)'], ['Plazo para pasar por recepción tras «Terminar»', '5 minutos'], ['Edades para registrarse', '4 a 95 años; menores de 18 con adulto responsable'], ['Duración máxima', '12 h'], ['Cancelación sin perder horas', 'Hasta 15 minutos antes'], ['Espera antes de liberar', '15 minutos (inasistencia: no se devuelven las horas)'],
 ['Sala sin anfitrión', 'Se mantiene para los invitados'], ['Certificaciones', 'Láser martes, resina miércoles, filamento jueves, textil viernes; 12:00, 90 min, 6 cupos, sin costo'],
 ['Archivos', 'Hasta 4 GB; 3D: .stl .3mf .obj .ctb; láser: .svg .dxf .pdf .png .jpg; también .zip y .rar']])}</section>

<section class="chap"><h2>9. Ayuda, idiomas y problemas comunes</h2>
<h3>Ayuda dentro de la app</h3>
<ul><li>Cada pantalla tiene el botón <b>?</b> arriba: explica en pocos pasos qué hacer ahí y ofrece un <b>Recorrido guiado</b> que resalta cada elemento.</li>
<li>La primera vez que alguien abre el inicio (o el panel del equipo) aparece la invitación «¿Primera vez en el sistema?».</li>
<li><b>Ayuda y preguntas frecuentes</b> (desde Perfil o desde la ayuda de cada pantalla) reúne las respuestas con buscador. El personal tiene además «Ayuda para el personal», filtrada por su credencial.</li>
<li>Los valores que aparecen en las respuestas (minutos de tolerancia, reservas activas, edades) se toman de las Reglas vigentes.</li></ul>
{shots(('u-help', 'Ayuda de la pantalla.'), ('u-tour', 'Recorrido guiado.'), ('u-ayuda', 'Preguntas frecuentes con buscador.'), mobile=True)}
<h3>Navegación con teclado</h3>
<p>Toda la app se usa sin mouse:</p>
{tbl(['Tecla', 'Qué hace'], [
 ['Tab / Mayús + Tab', 'Avanza o retrocede entre botones y campos. El primer Tab muestra <b>Saltar al contenido</b>, que lleva directo a la pantalla sin pasar por el encabezado.'],
 ['Enter o Espacio', 'Activa el botón o la opción con foco. Al cambiar de pantalla, el foco queda en su título.'],
 ['Esc', 'Cierra la ventana o el menú lateral abiertos, y el foco vuelve a donde estaba.'],
 ['Flechas (plano)', 'En el editor del plano, Tab llega a cada zona, Enter la selecciona, las flechas la mueven 10 px y Mayús + flechas cambian su tamaño.']])}
{shots(('u-saltar', '«Saltar al contenido» al presionar Tab.'), mobile=True)}
<h3>Idiomas</h3>
<p>La app de usuarios está en español, inglés y portugués, incluidas las ayudas, los recorridos, las preguntas frecuentes y las notificaciones. El idioma se elige en Configuración y queda guardado en la cuenta. Las pantallas del equipo del Hub quedan en español. Las preguntas frecuentes también están impresas en <code>docs/preguntas-frecuentes.pdf</code> (usuarios y personal), <code>docs/faq-en.pdf</code> y <code>docs/faq-pt.pdf</code>.</p>
<h3>Problemas comunes</h3>
{tbl(['Situación', 'Qué hacer'], [
 ['No llegó el código al correo', 'Revisar spam. Si persiste, recepción puede actualizar el correo y la persona entra con «Entrar con un código».'],
 ['La persona olvidó la contraseña', 'Entrar con un código y crear una nueva en Configuración.'],
 ['La cámara no abre', 'Dar permiso de cámara al navegador o usar el lector USB o el RUT. La cámara requiere HTTPS.'],
 ['El lector USB no escribe', 'Hacer clic en el campo de código; el lector funciona como un teclado.'],
 ['Una reserva no aparece disponible', 'Revisar bloqueos de agenda, certificaciones en ese horario, saldo y el máximo de 3 reservas activas.'],
 ['Se cayó internet en recepción', 'Seguir escaneando: los registros se guardan y se envían al volver la conexión.'],
 ['Hay que cerrar el Hub un día', 'Agenda y bloqueos › Todo el Hub › Bloquear el día completo.'],
 ['Un menor quedó pendiente', 'El adulto debe aceptar desde su inicio. Desde el perfil del menor se puede pedir a otro adulto.'],
 ['La persona tocó «Terminar» pero su reserva sigue en curso', 'No pasó por recepción dentro del plazo. Debe tocar «Terminar» otra vez y acercarse al mesón, o recepción la termina con «Buscar reserva actual».'],
 ['El QR de un espacio no funciona', 'Revisar que el cartel sea el último generado y que la persona tenga su entrada al Hub registrada. Si hace falta, escribir el código bajo el QR.'],
 ['Hay que cerrar la sesión en un equipo prestado', 'Desde otro dispositivo: Perfil › «Cerrar sesión en mis otros dispositivos», o cambiar la contraseña.']])}
<div class="box">Soporte del equipo keypoint durante el piloto: respuesta dentro de 12 horas hábiles.</div></section>
"""
open(os.path.join(ROOT, 'docs', 'manual.html'), 'w', encoding='utf-8').write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de uso · Keypoint Hub Providencia</title><style>{CSS}</style></head><body>{body}</body></html>')
print('docs/manual.html')
