// Preguntas frecuentes del Hub (usuarios y personal). Sin dependencias: lo usan la app y tools/docs/faq.mjs.
/** Reemplaza {regla} por el valor configurado en Reglas (o el valor por defecto al generar el documento). */
export const fillRules = (txt, get) => txt.replace(/\{(\w+)\}/g, (_, k) => { const v = get(k); return v == null ? '' : String(v); });

// ---------------------------------------------------------------- Preguntas frecuentes
// [tema, pregunta, respuesta]. {regla} se reemplaza por el valor de Reglas.
export const FAQ_USER = [
  ['Primeros pasos', '¿Cómo me registro en el Hub?', 'Toca «Crear cuenta», completa tus datos (RUT con guion, fecha de nacimiento, correo) y acepta las condiciones. Te llega un código al correo para activar la cuenta. Te registras una sola vez; también puedes hacerlo en recepción.'],
  ['Primeros pasos', '¿Cómo entro y salgo del Hub?', 'Muestra el código QR de Inicio en recepción al entrar y al salir. Si no tienes el teléfono, recepción puede buscarte por RUT.'],
  ['Primeros pasos', 'Olvidé mi contraseña', 'En la pantalla de ingreso escribe tu correo y toca «Enviar código a mi correo» y usa el código que te llega (vence en {code_minutes} minutos). Luego cámbiala en Perfil › Configuración.'],
  ['Primeros pasos', '¿Necesito reservar el cowork?', 'No. El cowork es de uso libre: entra con tu QR y usa un puesto disponible.'],
  ['Menores de edad', '¿Cómo inscribo a un menor de edad?', 'La persona menor crea su cuenta como cualquiera. Al poner su fecha de nacimiento, el sistema pide el ID o el RUT (o el QR) de un adulto con perfil en el Hub. Al adulto le llega un aviso en su Inicio y debe tocar «Sí, autorizo». Desde ese momento el perfil del menor queda activo.'],
  ['Menores de edad', '¿Qué significa ser adulto responsable?', 'Quien autoriza queda como responsable de la permanencia del menor en el Hub, incluidos accidentes, pérdida de equipamiento o mala conducta. Si no quieres asumirlo, toca «No».'],
  ['Menores de edad', '¿Hay una edad mínima?', 'Sí. El registro acepta personas de {min_age} a {max_age} años.'],
  ['Reservas', '¿Cómo hago una reserva?', 'Ve a Reservar, elige el tipo de espacio, el día y uno o varios bloques seguidos. Si vienes con otras personas, agrégalas con su ID o RUT. Toca «Confirmar reserva». La verás en Mis reservas y en Inicio.'],
  ['Reservas', '¿Cuántas reservas puedo tener?', 'Hasta {max_active} reservas activas a la vez. Las salas y la sala gaming se reservan en bloques de {block_min} minutos con {block_gap_min} minutos de pausa.'],
  ['Reservas', '¿Cómo cancelo una reserva?', 'En Mis reservas toca «Cancelar reserva». Si cancelas con al menos {cancel_notice_min} minutos de aviso, se te devuelven las horas.'],
  ['Reservas', '¿Qué pasa si llego tarde?', 'Tienes {tolerance_min} minutos de tolerancia. Después la reserva se libera para otra persona.'],
  ['Laboratorios', '¿Cómo pido una certificación?', 'Ve a Reservar › Certificaciones, elige el laboratorio y toca «Inscribirme» en una sesión con cupos. Puedes tener una sesión por certificación. Asiste a la sesión; el encargado registra el resultado y, si apruebas, ya puedes reservar ese laboratorio.'],
  ['Laboratorios', 'La sesión dice «Llena»', 'No quedan cupos en esa sesión. Elige otra fecha; cada semana se abre una nueva.'],
  ['Laboratorios', '¿Cómo reservo un laboratorio?', 'Con la certificación aprobada, ve a Reservar › Laboratorios, sube el archivo de tu trabajo, indica cuánto dura y elige la hora. El encargado revisa el archivo y la reserva queda confirmada.'],
  ['Laboratorios', '¿Qué son mis horas del mes?', 'Cada laboratorio da un saldo de horas al mes por persona. Se reinicia el día 1 y no se acumula. Al terminar un trabajo se descuenta el tiempo real.'],
  ['Laboratorios', 'Una máquina falla', 'En tu reserva toca «Reportar una falla». El aviso llega al encargado del laboratorio.'],
  ['Eventos', '¿Cómo me inscribo en un evento?', 'Toca el banner en Inicio o ve a Reservar › Eventos y toca «Inscribirme». El día del evento marca tu asistencia desde Inicio.'],
  ['Eventos', 'Los banners se mueven solos', 'Pasan cada 5 segundos. Si deslizas uno o usas las flechas, se detienen. Con el botón de pausa puedes volver a activarlos.'],
  ['Cuenta y datos', '¿Qué hace el Hub con mis datos?', 'Los usa para registrar entradas y salidas, gestionar reservas y hacer estadísticas sin tu nombre ni tu RUT. No se comparten con terceros. En Perfil › Configuración › Privacidad y mis datos puedes pedir una copia o la eliminación de tu cuenta.'],
  ['Cuenta y datos', 'Mi acceso dice «restringido»', 'Tienes una penalización vigente. En Inicio ves hasta cuándo y el motivo. Si crees que es un error, habla con recepción.'],
];

export const FAQ_STAFF = [
  ['Recepción', '¿Cómo registro una entrada o salida?', 'En Recepción y QR escanea el QR de la persona o escribe su RUT o ID. El sistema decide si es entrada o salida.', ['recepcion']],
  ['Recepción', 'La persona no tiene perfil', 'En Recepción toca «Registrar usuario nuevo». Si es menor, pide el ID o RUT del adulto responsable: debe autorizar desde su propio perfil (o en recepción con su sesión).', ['recepcion']],
  ['Recepción', 'Se cortó internet', 'Sigue escaneando: las marcas quedan guardadas en el equipo y se envían solas al volver la conexión.', ['recepcion']],
  ['Recepción', '¿Puedo reservar por otra persona?', 'Sí: en Usuarios, abre su ficha y toca «Reserva asistida». La reserva queda a su nombre.', ['recepcion']],
  ['Laboratorios', '¿Cómo reviso un archivo?', 'En Revisión de archivos descárgalo, revísalo y apruébalo o recházalo con un motivo. Solo ves los archivos de tus laboratorios.', ['encargado']],
  ['Laboratorios', '¿Cómo califico una certificación?', 'En Certificaciones elige la sesión y marca a cada inscrito como aprobado, reprobado o ausente. Los aprobados ya pueden reservar.', ['encargado']],
  ['Laboratorios', 'Una máquina quedó fuera de servicio', 'En Espacios › equipos desactívala, y en Agenda bloquea las horas si hace falta. Las reservas afectadas se cancelan con aviso.', ['encargado']],
  ['Agenda', '¿Cómo bloqueo horas por feriado o mantención?', 'En Agenda y bloqueos elige el espacio o «Todo el Hub» y el día, toca las horas, revisa «Horas bloqueadas:» y toca «Guardar cambios». Para días completos o periodos largos usa la opción de abajo.', ['admin', 'encargado']],
  ['Eventos', '¿Cómo publico un banner?', 'En Eventos y banners crea el evento o aviso, sube la imagen (1200 × 400 px) y marca «Publicado». Ordena los banners con las flechas o por fecha.', ['admin']],
  ['Eventos', '¿Por qué un banner está en amarillo?', 'Ya terminó y no se muestra a los usuarios. Los eventos en curso siguen apareciendo hasta su término (o hasta el final del día si no tienen término).', ['admin']],
  ['Personas', '¿Cómo borro los datos de alguien?', 'En Usuarios abre su ficha y toca «Borrar datos o perfil». Elige historial, perfil o ambos, escribe tu contraseña de administración y confirma. No se puede deshacer.', ['admin']],
  ['Personas', '¿Cómo doy credenciales a un empleado?', 'La persona primero crea su perfil de usuario. Luego en Empleados agrégala, marca sus credenciales y, si es encargado, sus laboratorios.', ['admin']],
  ['Personas', '¿Cómo aplico una penalización?', 'En la ficha de la persona: «Restringir acceso» (administración) bloquea su entrada por un tiempo; «Penalizar horas» (encargados) descuenta horas de laboratorio. Ambas se pueden levantar o compensar.', ['admin', 'encargado']],
  ['Hub', '¿Cómo creo un laboratorio?', 'En Espacios crea el espacio, marca «Exige certificación» e indica el día y la hora de la sesión semanal: la certificación se crea sola.', ['admin']],
  ['Hub', '¿Cómo agrego un piso?', 'En Plano toca «Agregar piso», dibuja sus zonas y ajusta su aforo en Reglas.', ['admin']],
  ['Datos', '¿De dónde salen las estadísticas?', 'De las visitas, reservas y perfiles. El analista ve identificadores anónimos. Descarga CSV desde Datos.', ['admin', 'analista']],
  ['Sistema', 'El servidor no arranca: «puerto en uso»', 'El Hub ya está abierto en otra ventana. Ciérrala, o en PowerShell: netstat -ano | findstr :8080 y taskkill /PID <número> /F.', ['admin']],
  ['Sistema', '¿Qué debo respaldar?', 'La base de datos (pg_dump) y el archivo .data-key juntos. Sin la clave no se pueden leer RUT, correos ni teléfonos.', ['admin']],
];

