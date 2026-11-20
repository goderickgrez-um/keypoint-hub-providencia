# Genera un tríptico por cargo en docs/tripticos/*.html (carta horizontal, dos caras, plegado en tres).
# Pensados para impresora láser en blanco y negro: solo negro sobre blanco, sin fondos ni grises,
# íconos de línea y bordes en vez de rellenos. Luego: node tools/docs/print.cjs para los PDF.
# Imprimir a doble cara, volteando por el borde corto, al 100 % (sin «ajustar a la página»).
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs', 'tripticos'); os.makedirs(OUT, exist_ok=True)
VERSION = json.load(open(os.path.join(ROOT, 'package.json'), encoding='utf-8'))['version']
APP_URL = 'https://goderickgrez-um.github.io/keypoint-hub-providencia/'

CSS = """
@page { size: 279.4mm 215.9mm; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 10.2pt/1.45 Inter, 'DejaVu Sans', Arial, sans-serif; color: #000; background: #fff; }
.sheet { width: 279.4mm; height: 215.9mm; display: grid; grid-template-columns: repeat(3, 1fr); break-after: page; overflow: hidden; position: relative; }
.fold { position: absolute; width: 0; border-left: .25mm solid #000; height: 5mm; } .fold.t { top: 0; } .fold.b { bottom: 0; }
.p { padding: 12mm 10mm 11mm; display: flex; flex-direction: column; gap: 3.2mm; min-width: 0; }
h2 { font-size: 13.5pt; margin: 0 0 .5mm; letter-spacing: -.01em; display: flex; align-items: center; gap: 2.2mm; padding-bottom: 1.6mm; border-bottom: .5mm solid #000; }
h2 .n { font-size: 9pt; font-weight: 700; border: .45mm solid #000; border-radius: 50%; width: 6.4mm; height: 6.4mm; display: inline-flex; align-items: center; justify-content: center; flex: none; }
h3 { font-size: 9.8pt; margin: 1mm 0 0; }
p { margin: 0; } ul { margin: 0; padding-left: 4.2mm; } li { margin-bottom: 1.1mm; }
.ic { width: 4.6mm; height: 4.6mm; fill: none; stroke: #000; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.step { display: grid; grid-template-columns: 6.4mm 1fr; gap: 2.2mm; align-items: start; }
.step .k { width: 6.2mm; height: 6.2mm; border-radius: 50%; background: #000; color: #fff; font-weight: 700; font-size: 8.6pt; display: flex; align-items: center; justify-content: center; }
.box { border: .35mm solid #000; border-radius: 2mm; padding: 2.4mm 2.8mm; }
.box.key { border-width: .35mm .35mm .35mm 1.6mm; }
.feat { display: grid; grid-template-columns: 5mm 1fr; gap: 2mm; align-items: start; margin-bottom: 1.6mm; }
.btnlike { display: inline-block; border: .35mm solid #000; border-radius: 1.4mm; padding: 0 1.4mm; font-weight: 600; font-size: 8.6pt; white-space: nowrap; }
.sm { font-size: 8pt; } .mono { font-family: 'DejaVu Sans Mono', Consolas, monospace; font-size: 7.6pt; word-break: break-all; }
.cover { justify-content: space-between; }
.cover .brand { display: flex; align-items: center; gap: 3mm; } .cover .brand img { width: 16mm; }
.cover h1 { font-size: 30pt; line-height: 1.02; letter-spacing: -.025em; margin: 2mm 0 0; }
.cover .kicker { font-size: 9pt; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; }
.cover .rule { border-top: 1.2mm solid #000; width: 22mm; margin: 4mm 0 3mm; }
.cover .big img { width: 46mm; display: block; margin: 0 auto; }
.qr { width: 30mm; height: 30mm; border: .35mm solid #000; padding: 1.5mm; } .qr svg { width: 100%; height: 100%; display: block; }
.phone { width: 34mm; border: .5mm solid #000; border-radius: 4.5mm; padding: 3mm 2.4mm 4mm; margin: 0 auto; display: flex; flex-direction: column; gap: 1.6mm; align-items: center; font-size: 7pt; }
.phone .scr { width: 100%; border: .25mm solid #000; border-radius: 1.4mm; padding: 1.6mm; display: flex; flex-direction: column; align-items: center; gap: 1.2mm; }
.phone .q { width: 13mm; height: 13mm; } .phone .q svg { width: 100%; height: 100%; }
.phone .b { width: 100%; text-align: center; border: .3mm solid #000; border-radius: 1.2mm; padding: .6mm 0; font-weight: 700; }
.phone .b.solid { background: #000; color: #fff; }
.tip { margin-top: auto; border-top: .25mm solid #000; padding-top: 2mm; font-size: 8.8pt; display: grid; grid-template-columns: 5mm 1fr; gap: 2mm; }
.foot { margin-top: auto; font-size: 7.4pt; border-top: .25mm solid #000; padding-top: 1.6mm; }
"""

IC = {
 'qr': '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v.01M17 20h3v-3M14 20v.01"/>',
 'cal': '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 'flask': '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/>',
 'award': '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2.4.6 4 2.2 4 5.2"/>',
 'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 'map': '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/>',
 'door': '<path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M13 12v.01"/>',
 'game': '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4M15.5 11v.01M18 13v.01"/>',
 'star': '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>',
 'shield': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
 'chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 'file': '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>',
 'alert': '<path d="M12 3l10 18H2zM12 10v5M12 18v.01"/>',
 'offline': '<path d="M3 3l18 18M5 12.5a10 10 0 0 1 4-2.6M19 12.5a10 10 0 0 0-5.5-3M8.5 16a5 5 0 0 1 7 0M12 19.5v.01"/>',
 'down': '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 'cam': '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
}
def ic(n): return f'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">{IC[n]}</svg>'
def step(n, title, text): return f'<div class="step"><span class="k">{n}</span><div><b>{title}</b><br>{text}</div></div>'
def feat(i, text): return f'<div class="feat">{ic(i)}<div>{text}</div></div>'
def tip(t, i='help'): return f'<div class="tip">{ic(i)}<div><b>Dato útil.</b> {t}</div></div>'
def h2(n, t): return f'<h2><span class="n">{n}</span>{t}</h2>' if n else f'<h2>{t}</h2>'
def b(t): return f'<span class="btnlike">{t}</span>'

def cover(role, sub):
    return (f'<div class="p cover"><div class="brand"><img src="../../assets/logo-bn.png" alt=""><div><b>Keypoint Hub Providencia</b><br><span class="sm">Sistema de registro y reservas</span></div></div>'
            f'<div><div class="kicker">Guía rápida</div><h1>{role}</h1><div class="rule"></div><p style="font-size:10.5pt">{sub}</p></div>'
            f'<div class="big"><img src="../../assets/logo-bn.png" alt=""></div>'
            f'<p class="sm">Equipo keypoint · Proyecto Capstone 2026<br>Versión {VERSION} · noviembre de 2026</p></div>')

def back(extra=''):
    return (f'{h2("", "Ayuda")}{extra}'
            f'{feat("help", "En cada pantalla, el botón <b>(?)</b> explica qué hacer y ofrece un recorrido guiado.")}'
            f'{feat("search", "<b>Preguntas frecuentes</b> con buscador dentro de la app. También en el documento <i>preguntas-frecuentes.pdf</i>.")}'
            f'<div class="box"><b>Horario del Hub</b><br>Lunes a jueves, 8:30 a 18:00<br>Viernes, 8:30 a 17:00</div>'
            f'<div style="display:flex;gap:3mm;align-items:center"><div class="qr" data-qr="{APP_URL}"></div><div class="sm"><b>Abre la app</b><br>Escanea el código con la cámara del teléfono.<br><span class="mono">{APP_URL}</span></div></div>'
            f'<p class="foot">Hub Providencia · Municipalidad de Providencia · Sistema desarrollado por el equipo keypoint. Soporte durante el piloto: respuesta dentro de 12 horas hábiles.</p>')

def phone(lines):
    return '<div class="phone"><div class="scr">' + ''.join(lines) + '</div></div>'

def sheet(role, sub, flap, backx, inside):
    folds = ''.join(f'<span class="fold {e}" style="left:{x}mm"></span>' for x in (93.13, 186.27) for e in ('t', 'b'))
    return (f'<div class="sheet">{folds}<div class="p">{flap}</div><div class="p">{back(backx)}</div>{cover(role, sub)}</div>'
            f'<div class="sheet">{folds}{"".join(f"<div class=p>{x}</div>" for x in inside)}</div>')

QRBOX = '<div class="q" data-qr="HUB-00000"></div>'
R = {}

# ---------------------------------------------------------------- Usuarios
R['usuario'] = sheet('Usuarios', 'Regístrate una vez, entra con tu QR y reserva desde el teléfono.',
  h2('', 'Lo que puedes hacer')
  + feat('qr', 'Entrar y salir del Hub con tu <b>código QR</b>.')
  + feat('users', 'Usar el <b>cowork</b> libremente, sin reserva.')
  + feat('door', 'Reservar <b>salas de reuniones</b> y la <b>sala gaming</b>.')
  + feat('flask', 'Reservar máquinas de los <b>laboratorios</b> con tus horas del mes.')
  + feat('award', 'Inscribirte en <b>certificaciones</b> y descargar tu <b>diploma</b>.')
  + feat('star', 'Inscribirte en <b>eventos</b>, charlas y ferias.')
  + phone(['<b>Inicio</b>', QRBOX, '<span>HUB-00000</span>', '<span class="b solid">Entrar a tu reserva</span>', '<span class="b">Terminar</span>'])
  + '<p class="sm">¿Tienes pasantía? Bajo tu QR verás ' + b('Entrar en oficina de pasantía') + '.</p>',
  '<p>¿No usas celular o tienes dudas? En el mesón de recepción te registran, reservan por ti y te cuentan tus avisos.</p>',
  [h2(1, 'Crea tu cuenta')
   + step(1, 'Crear cuenta', 'RUT con guion: <b>12.345.678-5</b> o 12345678-5 (si termina en K, escribe K). Edad permitida: de 4 a 95 años.')
   + step(2, 'Confirma tu correo', 'Escribe el código de 6 dígitos que te llega (vence en 15 minutos).')
   + step(3, 'Menores de 18', 'Escribe el ID o RUT de un adulto con perfil en el Hub: él autoriza desde su Inicio.')
   + step(4, 'Mantén la sesión', 'Al ingresar, deja marcado ' + b('Mantener la sesión iniciada') + ' en tu teléfono. No lo marques en equipos compartidos.') + tip('Tu QR lleva solo tu ID (HUB-00000): no muestra tu RUT ni tus datos.', 'qr'),
   h2(2, 'Reserva')
   + feat('door', '<b>Salas:</b> elige día y bloques de 50 minutos. Agrega a tus asistentes con su ID o RUT.')
   + feat('game', '<b>Sala gaming:</b> un computador libre o la sala completa para tu grupo.')
   + feat('flask', '<b>Laboratorios:</b> necesitas la certificación. Sube tu archivo, indica cuánto demora y elige la hora.')
   + feat('award', '<b>Certificaciones:</b> una sesión por certificación. Las sesiones llenas no se pueden elegir.')
   + '<div class="box"><b>Reglas</b><ul style="margin-top:1mm"><li>Hasta 3 reservas activas.</li><li>48 h al mes por laboratorio; se reinician el día 1.</li><li>Cancela con 15 minutos de aviso o pierdes las horas.</li></ul></div>' + tip('Revisa tus horas del mes en Perfil › Mis horas.', 'clock'),
   h2(3, 'El día de tu reserva')
   + step(1, 'Entra al Hub', 'Muestra tu QR en recepción.')
   + step(2, 'Entra a tu reserva', 'Toca ' + b('Entrar a tu reserva') + ' y escanea el QR que está en la puerta del espacio (o escribe su código). Puedes hacerlo desde 10 minutos antes; si no confirmas en 15 minutos, la reserva se libera.')
   + step(3, 'Termina', 'Toca ' + b('Terminar') + ' y <b>acércate a recepción en los próximos 5 minutos</b> para que escaneen tu QR. Así se registra tu salida del laboratorio y quedas en el cowork.')
   + '<div class="box key">' + ic('alert') + ' <b>Importante</b><br>Si no pasas por recepción a tiempo, el término no cuenta y tu reserva sigue en curso. Si te vas del Hub sin tocar «Terminar», tu reserva termina cuando registras tu salida.</div>' + tip('¿Una máquina falló? Repórtala desde tu reserva o desde tu Historial.', 'alert')])

# ---------------------------------------------------------------- Recepción
R['recepcion'] = sheet('Recepción', 'Entradas, salidas, reservas y registros asistidos en el mesón.',
  h2('', 'Antes de empezar')
  + feat('gear', 'Abre la app de recepción (instalada desde Chrome o Edge) y entra con tu cuenta del equipo.')
  + feat('qr', 'Conecta el lector USB: funciona como teclado. También sirve la cámara.')
  + feat('search', 'El cursor queda en el campo de código: lee el QR o escribe el RUT o ID y presiona Enter.')
  + '<div class="box key">' + ic('offline') + ' <b>Sin internet</b><br>Sigue escaneando. Los registros se guardan en el equipo y se envían solos al volver la conexión.</div>',
  '',
  [h2(1, 'Entradas y salidas')
   + step(1, 'Lee el código', 'Primera lectura del día: <b>entrada</b>. La siguiente: <b>salida</b>.')
   + step(2, 'Lee el resultado', 'El título dice «Entrada registrada», «Salida registrada», «Término registrado» o «Acceso restringido».')
   + step(3, 'Revisa los datos', 'Nombre, RUT, menores con su adulto responsable y avisos pendientes de la persona.')
   + '<p class="sm">Quien no marque su salida queda cerrado al terminar el horario.</p>' + tip('Lector USB, cámara o RUT escrito: los tres registran igual.', 'qr'),
   h2(2, 'Reservas en recepción')
   + step(1, 'Buscar reserva actual', b('Buscar reserva actual') + ' muestra sus reservas de hoy <b>sin marcar entrada ni salida</b>.')
   + step(2, 'Iniciar', b('Iniciar') + ' confirma su llegada al espacio (si no había entrado al Hub, se marca la entrada).')
   + step(3, 'Terminar', b('Terminar') + ' cierra la reserva con el tiempo real; la persona queda en el cowork.')
   + '<div class="box key"><b>Si tocó «Terminar» en su teléfono</b><br>Escanea su QR <b>dentro de 5 minutos</b>: se registra el término y queda en el cowork. Si el plazo venció, su reserva sigue en curso y el escaneo cuenta como salida del Hub.</div>' + tip('Una reserva se puede iniciar desde 10 minutos antes de su hora.', 'clock'),
   h2(3, 'Personas nuevas y otras tareas')
   + step(1, 'Registrar usuario nuevo', 'Pide la cédula. RUT con guion; edad de 4 a 95 años. Correo y celular son opcionales.')
   + step(2, 'Menores de 18', 'Pide el ID o RUT del adulto responsable: él confirma desde su app.')
   + feat('cal', '<b>Reserva asistida:</b> reserva a nombre de la persona, con sus mismas reglas.')
   + feat('user', '<b>Actualizar sus datos:</b> corrige información o cambia un RUT provisorio.')
   + feat('help', '<b>Ayuda y preguntas</b> del personal, en el menú.') + tip('Si la persona no tiene correo ni celular, sus avisos se le comunican en el mesón.', 'users')])

# ---------------------------------------------------------------- Encargados
R['encargado'] = sheet('Encargados de laboratorio', 'Archivos, certificaciones, horas y agenda de tus laboratorios.',
  h2('', 'Tu laboratorio')
  + '<p>Ves solo los datos de los laboratorios que administración te asignó. Las reservas se confirman solas cuando la persona está certificada, tiene saldo y el horario está libre; tu tarea es revisar el archivo.</p>'
  + '<div class="box"><b>Valores por defecto</b><ul style="margin-top:1mm"><li>48 h al mes por persona.</li><li>30 minutos entre trabajos.</li><li>6 h extra al mes para el personal.</li></ul></div>'
  + feat('qr', '<b>QR del laboratorio:</b> en Espacios › tu laboratorio, descarga el cartel, imprímelo y pégalo en la entrada. Si alguien lo copia, genera uno nuevo.'),
  '',
  [h2(1, 'Revisar archivos')
   + step(1, 'Descarga', 'Toca el nombre del archivo para bajarlo y revisarlo.')
   + step(2, 'Decide', b('Aprobar') + ', ' + b('Observar') + ' (la reserva sigue) o ' + b('Rechazar') + ' (se devuelven las horas).')
   + step(3, 'Escribe la observación', 'Llega al perfil y al correo de la persona.')
   + '<p class="sm">Cada archivo indica su estado en texto: en espera, aprobado, con observaciones o rechazado.</p>' + tip('Rechazar un archivo libera la reserva y devuelve las horas a la persona.', 'file'),
   h2(2, 'Certificaciones')
   + step(1, 'Elige la sesión', 'Martes láser, miércoles resina, jueves filamento y viernes textil, 12:00 (configurable).')
   + step(2, 'Marca resultados', 'Aprobado, reprobado o ausente, y guarda.')
   + feat('search', '<b>Personas certificadas:</b> buscador por nombre, ID o RUT. El cuadro muestra 6 filas; arrastra su esquina o toca «Mostrar todas».')
   + feat('down', '<b>Diplomas:</b> sube uno propio o la persona descarga el que genera el sistema en PDF.') + tip('Las sesiones de certificación se generan solas para las próximas cuatro semanas.', 'cal'),
   h2(3, 'Horas, agenda y fallas')
   + feat('clock', '<b>Usuarios › Penalizar horas</b> o <b>Premiar con horas</b> en tu laboratorio. Se pueden perdonar.')
   + feat('cal', '<b>Agenda:</b> toca las horas, revisa «Horas bloqueadas:», guarda y confirma. Las reservas afectadas se cancelan con aviso.')
   + feat('check', '<b>Reservas:</b> puedes iniciar o terminar una reserva de tu laboratorio desde la ficha de la persona.')
   + feat('alert', '<b>Fallas:</b> revisa los reportes por máquina y márcalos resueltos.') + tip('Solo el encargado del laboratorio puede borrar los archivos subidos.', 'lock')])

# ---------------------------------------------------------------- Administración
R['administracion'] = sheet('Administración', 'Espacios, personas, reglas y apariencia del Hub.',
  h2('', 'Tu panel')
  + '<p>Personas dentro, reservas del día, archivos por revisar, ocupación por piso, mapa de calor y plano en vivo.</p>'
  + '<div class="box key">' + ic('shield') + ' <b>Solo administración</b><br>Restringe el acceso al Hub, borra datos personales, cambia reglas globales y asigna credenciales.</div>'
  + feat('lock', '<b>Borrar datos de una persona</b> (ficha › Borrar datos o perfil): historial, perfil o ambos. Pide tu contraseña y una segunda confirmación; no se puede deshacer.'),
  '',
  [h2(1, 'Espacios y plano')
   + step(1, 'Crear espacio', 'Cada campo explica qué va. Un laboratorio que exige certificación la crea solo, con el día y la hora que indiques.')
   + step(2, 'QR de cada espacio', 'Descarga el cartel e imprímelo. En Reglas indica la dirección pública de la app.')
   + step(3, 'Eliminar', 'Si el espacio tiene historial se desactiva y sus reservas futuras se cancelan con aviso.')
   + feat('map', '<b>Plano:</b> al vincular una zona con un espacio se completan nombre, tipo y aforo. Agrega o elimina pisos.') + tip('Generar un QR nuevo invalida el cartel anterior: vuelve a imprimirlo.', 'qr'),
   h2(2, 'Personas')
   + step(1, 'Empleados', 'Agrega a alguien ya registrado y marca sus credenciales. Al dar «encargado», elige sus laboratorios.')
   + step(2, 'Pasantía', 'En la ficha, ' + b('Asignar pasantía') + '. La oficina y su aforo se eligen en Reglas.')
   + step(3, 'Restringir acceso', 'Por horas, días o permanente, con motivo.')
   + feat('star', '<b>Eventos y banners:</b> ordénalos con flechas o por fecha. Los terminados pasan solos al final.') + tip('Borrar el perfil deja el historial anónimo para las estadísticas; borrar ambos elimina todo.', 'lock'),
   h2(3, 'Reglas y apariencia')
   + '<ul><li><b>Horario</b>, aforo por piso, bloques, tolerancias y máximo de reservas.</li><li><b>Edades</b> permitidas (4 a 95 años).</li><li><b>Confirmación en dos pasos</b> y plazo para pasar por recepción tras «Terminar» (5 minutos).</li><li><b>Zona por defecto</b> para quien entra sin reserva (cowork).</li><li><b>Agenda:</b> feriados y cierres de todo el Hub.</li><li><b>Apariencia:</b> colores, logo, nombre y lema.</li><li><b>Auditoría:</b> quién hizo qué.</li></ul>' + tip('Mientras los QR de los espacios no estén pegados, desactiva la confirmación en dos pasos en Reglas.', 'alert')])

# ---------------------------------------------------------------- Analista
R['analista'] = sheet('Analista de datos', 'Indicadores del Hub, sin datos personales identificables.',
  h2('', 'Qué ves')
  + feat('chart', 'Visitas, personas distintas, uso por espacio y horas por laboratorio.')
  + feat('clock', 'Mapa de calor por día y hora.')
  + feat('users', 'Perfil de las personas: comuna, actividad, ocupación, género, edad y movilidad reducida.')
  + feat('alert', 'Fallas de máquinas.')
  + '<div class="box key">' + ic('shield') + ' <b>Datos anónimos</b><br>Nunca ves nombres, RUT ni contacto. Las personas aparecen como «Usuario 000xx».</div>',
  '',
  [h2(1, 'Elegir el periodo')
   + step(1, 'Rango', 'Semana, mes, 3 meses u otro periodo con fechas.')
   + step(2, 'Lee los indicadores', 'Visitas, usuarios, edad promedio, movilidad reducida e inasistencias.')
   + step(3, 'Ver la tabla', 'Cada gráfico tiene «Ver datos en tabla».') + tip('Ningún gráfico muestra datos de una persona identificable.', 'shield'),
   h2(2, 'Comparar y descargar')
   + step(1, 'Oculta una variable', 'Sobre cada gráfico de barras, toca una variable (por ejemplo, Cowork) para ocultarla. La escala se ajusta a las demás.')
   + step(2, 'Vuelve a verla', b('Mostrar todas') + ' la devuelve al gráfico.')
   + step(3, 'Descargar datos', 'Cuatro CSV: usuarios, visitas, reservas y fallas.')
   + '<p class="sm">Los CSV usan punto y coma y se abren directo en Excel o Power BI.</p>' + tip('Ocultar una variable cambia solo la vista, no los datos.', 'chart'),
   h2(3, 'Datos históricos')
   + step(1, 'Prepara el CSV', 'Columnas: <span class="mono">fecha;espacio;visitas</span>')
   + step(2, 'Importar', 'Elige el origen (Power BI, Google Forms o libro) y sube el archivo.')
   + step(3, 'Sin cuentas nuevas', 'Se carga solo como estadística.') + tip('Revisa el resultado en Datos eligiendo el periodo de las fechas importadas.', 'search')])

QRJS = """<script src="../../vendor/qrcode.js"></script><script>
document.querySelectorAll('[data-qr]').forEach(el => { const q = qrcode(0, 'M'); q.addData(el.dataset.qr); q.make();
  el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); });</script>"""
for k, v in R.items():
    open(os.path.join(OUT, f'triptico-{k}.html'), 'w', encoding='utf-8').write(
        f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tríptico {k} · Keypoint Hub Providencia</title><style>{CSS}</style></head><body>{v}{QRJS}</body></html>')
print('trípticos', VERSION, ', '.join(R))
