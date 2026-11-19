# Genera un tríptico por cargo en docs/tripticos/*.html (carta horizontal, dos caras, plegado en tres).
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs', 'tripticos'); os.makedirs(OUT, exist_ok=True)

CSS = """
@page { size: 279.4mm 215.9mm; margin: 0; }
* { box-sizing: border-box; } body { margin: 0; font: 10.4pt/1.5 Inter, 'DejaVu Sans', sans-serif; color: #1D1D1F; }
.sheet { width: 279.4mm; height: 215.9mm; display: grid; grid-template-columns: repeat(3, 1fr); break-after: page; overflow: hidden; }
.p { padding: 13mm 11mm; display: flex; flex-direction: column; gap: 3mm; position: relative; }
.p + .p { border-left: .2mm dashed #D8D8DC; }
.cover { background: linear-gradient(160deg, #0E7C86, #2A7FA8); color: #fff; justify-content: space-between; border: 0 !important; }
.cover img { width: 30mm; } .cover h1 { font-size: 30pt; line-height: 1.05; letter-spacing: -.02em; margin: 0; } .cover p { margin: 0; opacity: .92; }
h2 { font-size: 15pt; margin: 0; color: #0E7C86; letter-spacing: -.01em; } h3 { font-size: 10.5pt; margin: 1mm 0 0; }
p { margin: 0; } ol, ul { margin: 0; padding-left: 5mm; } li { margin-bottom: 1.4mm; }
.step { display: grid; grid-template-columns: 7mm 1fr; gap: 2mm; align-items: start; } .step b.n { width: 6.5mm; height: 6.5mm; border-radius: 50%; background: #0E7C86; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9pt; }
.shot { width: 100%; border-radius: 2.5mm; border: .3mm solid #DAD5CA; display: block; } .shot.m { width: 48mm; align-self: center; }
.box { background: #EAF3F2; border-radius: 2.5mm; padding: 3mm; } .warn { background: #FFF4D6; } .sm { font-size: 8.4pt; color: #63636A; }
"""

def step(n, title, text): return f'<div class="step"><b class="n">{n}</b><div><b>{title}</b><br>{text}</div></div>'
def img(f, m=False): return f'<img class="shot{" m" if m else ""}" src="../img/{f}.png">'

def sheet(role, sub, back, flap, inside):
    cover = f'<div class="p cover"><div><img src="../../assets/logo.png"><p style="margin-top:6mm;font-size:10pt">Keypoint Hub Providencia</p></div><div><p style="font-size:11pt">Guía rápida</p><h1>{role}</h1><p style="margin-top:3mm;font-size:10.5pt">{sub}</p></div><p class="sm" style="color:#fff;opacity:.85">Equipo keypoint · Proyecto Capstone 2026</p></div>'
    return (f'<div class="sheet"><div class="p">{flap}</div><div class="p">{back}</div>{cover}</div>'
            f'<div class="sheet">{"".join(f"<div class=p>{x}</div>" for x in inside)}</div>')

BACK = lambda extra='': f'<h2>Ayuda</h2>{extra}<div class="box"><b>Horario del Hub</b><br>Lunes a jueves 8:30 a 18:00<br>Viernes 8:30 a 17:00</div><p class="sm">Manual completo: docs/manual.pdf en el repositorio del sistema. Soporte del equipo keypoint durante el piloto: respuesta dentro de 12 horas hábiles.</p>'

R = {}
R['usuario'] = sheet('Usuarios', 'Regístrate una vez, entra con tu QR y reserva desde el teléfono.',
  BACK('<p>¿Dudas o no usas celular? Acércate al mesón de recepción: te registran, te avisan de tus notificaciones y pueden reservar por ti.</p>'),
  '<h2>Lo que puedes hacer</h2><ul><li>Entrar y salir del Hub con tu código QR.</li><li>Usar el cowork libremente, sin reserva.</li><li>Reservar salas de reuniones y la sala gaming.</li><li>Reservar máquinas de los laboratorios con tus horas del mes.</li><li>Inscribirte en certificaciones y eventos.</li></ul>' + img('u-reservar', True),
  ['<h2>1. Crea tu cuenta</h2>' + step(1, 'Crear cuenta', 'Completa tus datos y crea una contraseña.') + step(2, 'Confirma tu correo', 'Escribe el código de 6 dígitos que te llega.') + step(3, 'Menores de 18', 'Un adulto con perfil en el Hub debe autorizarte desde su app.') + img('u-inicio', True),
   '<h2>2. Reserva</h2>' + step(1, 'Salas', 'Elige día y bloques de 50 min. Suma a tus asistentes con su ID o RUT.') + step(2, 'Sala gaming', 'Elige un PC libre en la grilla o la sala completa.') + step(3, 'Laboratorios', 'Necesitas la certificación. Sube tu archivo, indica cuánto demora y elige la hora.') + '<div class="box">Tienes 48 h al mes por laboratorio. Puedes tener hasta 3 reservas activas.</div>',
   '<h2>3. Ten en cuenta</h2><ul><li>Cancela con al menos 15 minutos de aviso o pierdes las horas.</li><li>Si no llegas en 15 minutos, la reserva se libera.</li><li>Marca <b>Terminé</b> al acabar: se descuenta el tiempo real.</li><li>Si una máquina falla, repórtala desde tu Historial.</li><li>En Configuración eliges tema claro u oscuro, idioma y texto grande.</li></ul>' + img('u-lab', True)])
R['recepcion'] = sheet('Recepción', 'Entradas, salidas y registros asistidos en el mesón.', BACK('<div class="box warn"><b>Sin internet</b><br>Sigue escaneando. Los registros se guardan en el equipo y se envían solos al volver la conexión.</div>'),
  '<h2>Antes de empezar</h2><ul><li>Abre <b>recepcion.html</b> en Chrome o Edge e instálala como app.</li><li>Conecta el lector USB: funciona como teclado.</li><li>Entra con tu cuenta del equipo.</li></ul>' + img('a-scan-m', True),
  ['<h2>1. Escanear</h2>' + step(1, 'Lee el código', 'El cursor ya está en el campo. Lector USB, cámara o RUT escrito y Enter.') + step(2, 'Registro automático', 'Primera lectura: entrada. Siguiente: salida.') + step(3, 'Revisa el color', 'Verde: entrada. Azul: salida. Rojo: acceso restringido.') + img('a-scan'),
   '<h2>2. Personas nuevas</h2>' + step(1, 'Registrar usuario nuevo', 'Pide la cédula para confirmar la identidad. Correo y celular son opcionales.') + step(2, 'Entrega el QR', 'La persona lo fotografía, o entra siempre con su RUT.') + step(3, 'Menores de 18', 'Escanea el QR del adulto responsable; él confirma desde su app.') + '<div class="box">Si alguien no usa correo ni celular, sus avisos aparecen en la ficha al escanearlo.</div>',
   '<h2>3. Otras tareas</h2><ul><li><b>Actualizar sus datos:</b> corregir información o cambiar un RUT provisorio por el definitivo.</li><li><b>Reserva asistida:</b> reserva a nombre de la persona, con sus mismas reglas.</li><li><b>Próximas reservas:</b> agenda del día y siguientes.</li><li>Quien no marque salida se cierra solo al terminar el horario.</li></ul>' + img('a-prox')])
R['encargado'] = sheet('Encargados de laboratorio', 'Revisión de archivos, certificaciones y horas de tu laboratorio.', BACK(),
  '<h2>Tu laboratorio</h2><p>Las reservas se confirman solas cuando la persona está certificada, tiene saldo y el horario está libre. Tu tarea es revisar el archivo.</p><ul><li>Saldo: 48 h al mes por persona.</li><li>30 min entre trabajos.</li><li>Tú tienes 6 h extra al mes.</li></ul>' + img('a-solic'),
  ['<h2>1. Revisar archivos</h2>' + step(1, 'Descarga', 'Toca el nombre del archivo para bajarlo.') + step(2, 'Decide', '<b>Aprobar</b>, <b>Observar</b> (la reserva sigue) o <b>Rechazar</b> (se liberan las horas).') + step(3, 'Escribe la observación', 'Llega al perfil y al correo del usuario.') + '<p class="sm">Amarillo: en espera · Verde: aprobado · Rojo: rechazado</p>' + img('a-rev'),
   '<h2>2. Certificaciones</h2>' + step(1, 'Elige la sesión', 'Martes láser, miércoles resina, jueves filamento, viernes textil, 12:00.') + step(2, 'Marca resultados', 'Aprobado, reprobado o ausente, y guarda.') + step(3, 'Diplomas y niveles', 'Sube el diploma o crea niveles como FDM 1 a FDM 5.') + img('a-cert'),
   '<h2>3. Horas y agenda</h2><ul><li><b>Usuarios › Penalizar horas</b> o <b>Premiar con horas</b> en tu laboratorio.</li><li>Las penalizaciones se pueden perdonar.</li><li><b>Agenda:</b> bloquea horas por mantención; las reservas afectadas se cancelan con aviso.</li><li><b>Fallas:</b> revisa reportes por máquina y márcalos resueltos.</li><li>Solo tú puedes borrar los archivos de tu laboratorio.</li></ul>' + img('a-fallas')])
R['administracion'] = sheet('Administración', 'Configuración del Hub, personal, espacios y reglas.', BACK('<div class="box warn">Solo administración puede restringir el acceso al Hub, cambiar reglas globales y asignar credenciales.</div>'),
  '<h2>Tu panel</h2><p>Personas dentro, reservas del día, archivos por revisar, ocupación por piso, mapa de calor, próximas horas y plano en vivo.</p>' + img('a-panel'),
  ['<h2>1. Espacios</h2>' + step(1, 'Editar', 'Aforo, horas al mes, equipos, encargado, accesibilidad.') + step(2, 'Laboratorio nuevo', 'Crear espacio, agregar equipos, encargado y su certificación.') + step(3, 'Plano', 'Dibuja zonas con rectángulos y vincúlalas a cada espacio.') + img('a-plano'),
   '<h2>2. Personas</h2>' + step(1, 'Empleados', 'Agrega a alguien ya registrado y asigna sus credenciales.') + step(2, 'Restringir acceso', 'Desde Usuarios: horas, días o permanente.') + step(3, 'Eventos y banners', 'Imagen de banner, anuncio, fecha y cupos.') + img('a-emp'),
   '<h2>3. Reglas y apariencia</h2><ul><li><b>Reglas:</b> horario, aforo por piso, bloques, avisos, tolerancias, máximo de reservas, correo y Google.</li><li><b>Agenda:</b> feriados y cierres de todo el Hub.</li><li><b>Apariencia:</b> colores por elemento para tema claro y oscuro, logo, nombre y lema.</li><li><b>Auditoría:</b> quién hizo qué.</li></ul>' + img('a-apar')])
R['analista'] = sheet('Analista de datos', 'Indicadores del Hub sin datos personales identificables.', BACK('<div class="box">Datos usados: comuna, actividad en Providencia, ocupación, género, edad y movilidad reducida. Nunca nombres, RUT ni contacto.</div>'),
  '<h2>Qué ves</h2><ul><li>Visitas y personas distintas.</li><li>Uso por espacio y horas por laboratorio.</li><li>Mapa de calor por día y hora.</li><li>Perfil de usuarios.</li><li>Fallas de máquinas.</li></ul><p>Las personas aparecen como «Usuario 000xx».</p>',
  ['<h2>1. Elegir el periodo</h2>' + step(1, 'Rango', 'Semana, mes, 3 meses u otro periodo con fechas.') + step(2, 'Lee los indicadores', 'Visitas, usuarios, edad promedio, movilidad reducida, inasistencias.') + step(3, 'Ver la tabla', 'Cada gráfico tiene «Ver datos en tabla».') + img('a-datos'),
   '<h2>2. Descargar</h2>' + step(1, 'Descargar datos', 'Cuatro CSV: usuarios, visitas, reservas y fallas.') + step(2, 'Solo tu credencial', 'Es la única que puede descargar la base.') + '<div class="box">Los CSV usan punto y coma y se abren directo en Excel o Power BI.</div>',
   '<h2>3. Históricos</h2>' + step(1, 'Prepara el CSV', 'Columnas: fecha;espacio;visitas') + step(2, 'Importar', 'Elige el origen (Power BI, Google Forms o libro) y sube el archivo.') + step(3, 'Sin cuentas nuevas', 'Se carga solo como estadística.') + img('a-imp')])

for k, v in R.items():
    open(os.path.join(OUT, f'triptico-{k}.html'), 'w', encoding='utf-8').write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{v}</body></html>')
print('trípticos:', ', '.join(R))
