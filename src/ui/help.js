// Ayuda: guía breve de cada pantalla, recorrido guiado y preguntas frecuentes (usuarios y personal).
// Las preguntas frecuentes están en faq-data.js; `npm run docs:faq` genera con ellas docs/preguntas-frecuentes.pdf.
import { FAQ_USER, FAQ_STAFF, fillRules as fillWith } from './faq-data.js';
import { S, db, me, myRoles, screens, actions, go, modal, closeModal, esc, icon, btn, field, val, UI } from './kit.js';

const fillRules = txt => fillWith(txt, k => db()?.cfg(k));
export { FAQ_USER, FAQ_STAFF };

// ---------------------------------------------------------------- Guías por pantalla
// steps: [selector o null, texto]. Si el selector no está en la pantalla, el paso se muestra sin resaltar nada.
export const GUIDES = {
  'u-login': { title: 'Ingresar', steps: [
    ['[data-i="l_keep"]', 'Deja marcado «Mantener la sesión iniciada» en tu teléfono para no ingresar cada vez. No lo marques en equipos compartidos.'],
    ['[data-i="l_ident"]', 'Escribe tu correo, tu RUT o tu ID del Hub.'],
    ['[data-i="l_pass"]', 'Escribe tu contraseña. Si la olvidaste, pide un código al correo.'],
    ['[data-a="go"][data-v="u-reg"]', '¿Primera vez? Crea tu cuenta: te registras una sola vez.']] },
  'u-reg': { title: 'Crear cuenta', steps: [
    ['[data-i="r_doc"]', 'Escribe tu RUT con guion (12.345.678-5). Si eres extranjero, elige pasaporte.'],
    ['[data-i="r_birth"]', 'Tu fecha de nacimiento. Si eres menor de 18, un adulto con perfil en el Hub deberá autorizarte.'],
    ['[data-i="r_pass2"]', 'Repite la contraseña. Al final te llegará un código al correo para activar la cuenta.']] },
  'u-inicio': { title: 'Inicio', steps: [
    ['.bnwrap', 'Eventos y avisos del Hub. Pasan solos; toca uno para ver el detalle.'],
    ['.card.qr .code', 'Tu código QR. Muéstralo en recepción al entrar y al salir.'],
    ['.qra', 'Cuando tengas una reserva, toca «Entrar a tu reserva» y escanea el QR del espacio. Al terminar, toca «Terminar» y acércate a recepción en los próximos minutos para que escaneen tu QR.'],
    ['[data-a="go"][data-v="u-activas"]', 'Tu próxima reserva o certificación aparece aquí.'],
    ['.tabs', 'Abajo cambias entre Inicio, Reservar, Mis reservas y Perfil.']] },
  'u-reservar': { title: 'Reservar', steps: [
    ['.list', 'Elige qué quieres reservar: sala, sala gaming, laboratorio, certificación o evento.'],
    [null, 'El cowork no necesita reserva: entra con tu QR y usa cualquier puesto libre.']] },
  'u-sala': { title: 'Reservar una sala', steps: [
    ['.hs', 'Elige el día.'],
    ['.chips', 'Toca uno o varios bloques seguidos. Los grises ya están ocupados.'],
    ['[data-a="bk-guest"]', 'Agrega a quienes vienen contigo con su ID o RUT (deben tener perfil).'],
    ['[data-a="bk-room"]', 'Confirma. La reserva queda en Mis reservas.']] },
  'u-gaming': { title: 'Reservar la sala gaming', steps: [
    ['.hs', 'Elige el día.'],
    ['.chips', 'Toca los bloques que quieras.'],
    ['.seats', 'Elige un computador libre o la sala completa para tu grupo.'],
    ['[data-a="bk-gaming"]', 'Confirma la reserva.']] },
  'u-lab': { title: 'Reservar un laboratorio', steps: [
    ['.hs', 'Elige el laboratorio.'],
    [null, 'Necesitas la certificación del laboratorio. Si no la tienes, inscríbete en Certificaciones.'],
    ['.file, input[type=file]', 'Sube el archivo de tu trabajo. El encargado lo revisa antes de confirmar.'],
    ['[data-a="bk-lab"]', 'Indica la duración, elige la hora y confirma. Se descuenta de tus horas del mes.']] },
  'u-cert': { title: 'Certificaciones', steps: [
    [null, 'Cada laboratorio pide su certificación. Se imparte una vez por semana en el Hub.'],
    ['[data-a="cert-enroll"]', 'Toca Inscribirme en una sesión con cupos. Las sesiones llenas no se pueden elegir.'],
    [null, 'Tu inscripción aparece en Mis reservas y en Tu próxima reserva.']] },
  'u-eventos': { title: 'Eventos', steps: [
    ['.list', 'Charlas, talleres y ferias. Toca uno para ver el detalle e inscribirte.'],
    [null, 'El día del evento, marca tu asistencia desde Inicio.']] },
  'u-activas': { title: 'Mis reservas', steps: [
    ['main .card', 'Tus reservas y certificaciones activas, de la más cercana a la más lejana.'],
    ['[data-a="res-cancel-ask"]', 'Cancela con al menos {cancel_notice_min} minutos de aviso para que se te devuelvan las horas.'],
    [null, 'Si llegas más de {tolerance_min} minutos tarde, la reserva se libera.']] },
  'u-perfil': { title: 'Perfil', steps: [
    ['[data-a="profile-edit"]', 'Actualiza tu correo, teléfono o foto.'],
    ['[data-a="go"][data-v="u-horas"]', 'Revisa cuántas horas de laboratorio te quedan este mes.'],
    ['[data-a="logout"]', 'Cierra tu sesión si usas un equipo compartido.']] },
  'u-entrar': { title: 'Entrar a tu reserva', steps: [
    ['.card', 'Revisa los datos de tu reserva.'],
    ['[data-a="space-cam"]', 'Abre la cámara y apunta al QR que está en la entrada del espacio. Así empieza tu tiempo.'],
    ['[data-i="sp_code"]', 'Si la cámara no funciona, escribe el código que aparece bajo el QR.']] },
  'u-horas': { title: 'Mis horas', steps: [[null, 'Cada laboratorio tiene horas al mes por persona. Se reinician el día 1 y no se acumulan.']] },
  'u-notif': { title: 'Notificaciones', steps: [[null, 'Avisos de tus reservas, cancelaciones, archivos revisados y autorizaciones de menores.']] },
  'u-hist': { title: 'Historial', steps: [[null, 'Tus reservas y visitas anteriores.']] },
  'u-config': { title: 'Configuración', steps: [[null, 'Idioma, apariencia, contraseña y privacidad de tus datos.']] },
  // ---- Personal
  'a-panel': { title: 'Panel', steps: [
    ['.side', 'El menú muestra solo las secciones de tu credencial.'],
    ['main .card', 'Personas dentro, ocupación por piso y lo que pasa hoy.'],
    ['[data-a="to-user"]', 'Para reservar para ti, cambia a la app de usuario.']] },
  'a-scan': { title: 'Recepción y QR', steps: [
    ['[data-i="scan"]', 'Escanea el QR o escribe el RUT o ID. El sistema marca entrada o salida solo.'],
    ['[data-a="scan-find"]', '«Buscar reserva actual» muestra sus reservas de hoy sin marcar entrada ni salida, con los botones Iniciar y Terminar.'],
    [null, 'Si la persona tocó «Terminar» y la escaneas dentro del plazo, se registra su término y queda en el cowork. Si no lo tocó (o venció el plazo), el escaneo registra su salida del Hub y cierra la reserva.'],
    ['[data-v="a-reg"]', 'Si la persona no tiene perfil, toca «Registrar usuario nuevo».'],
    [null, 'Sin internet las marcas quedan guardadas y se envían al volver la conexión.']] },
  'a-husr': { title: 'Usuarios', steps: [
    ['[data-i="usr_q"]', 'Busca por nombre, RUT, ID o correo.'],
    [null, 'En la ficha: historial, observaciones, penalizaciones, reserva asistida y, para administración, borrar datos.']] },
  'a-rev': { title: 'Revisión de archivos', steps: [
    [null, 'Revisa los archivos de los trabajos de tus laboratorios. Al aprobar, la reserva queda confirmada.'],
    [null, 'Si lo rechazas, escribe el motivo: le llega a la persona.']] },
  'a-solic': { title: 'Solicitudes', steps: [[null, 'Reservas de hoy y futuras en tus espacios. Puedes confirmar, cancelar o anotar observaciones.']] },
  'a-cert': { title: 'Certificaciones', steps: [
    [null, 'Crea o edita la certificación de cada laboratorio: día, hora, cupos e instructor.'],
    [null, 'Después de la sesión, marca a cada inscrito como aprobado, reprobado o ausente.']] },
  'a-fallas': { title: 'Fallas de máquinas', steps: [[null, 'Reportes de los usuarios. Marca cada falla como en revisión o resuelta.']] },
  'a-eventos': { title: 'Eventos y banners', steps: [
    ['.list', 'Los banners se muestran en este orden. Usa las flechas para moverlos.'],
    ['[data-a="ev-bydate"]', 'O ordénalos por fecha: los más cercanos primero.'],
    [null, 'Los terminados aparecen en amarillo y ya no se muestran. Los que están en curso siguen visibles.'],
    ['[data-a="ev-save"]', 'Completa título, fechas, cupos e imágenes y guarda. Marca Publicado para mostrarlo.']] },
  'a-esp': { title: 'Espacios', steps: [
    [null, 'Tipo, aforo, horas al mes, archivos que se piden y encargados de cada espacio.'],
    [null, 'Un espacio con historial no se borra: se desactiva y se conserva para las estadísticas.'],
    [null, 'En cada espacio está su QR: descarga el cartel, imprímelo y pégalo en la entrada.']] },
  'a-agenda': { title: 'Agenda y bloqueos', steps: [
    ['.hs', 'Elige el espacio (o todo el Hub) y el día.'],
    ['.chips', 'Toca las horas que quieres bloquear o liberar.'],
    ['.blist', 'Revisa la lista de horas bloqueadas.'],
    ['[data-a="ag-save"]', 'Guarda los cambios y confirma. Las reservas afectadas se cancelan con aviso.']] },
  'a-plano': { title: 'Plano', steps: [
    [null, 'Dibuja zonas, únelas y vincúlalas con un espacio: se completan nombre, tipo y aforo.'],
    ['[data-a="fl-add"]', 'Agrega o elimina pisos. Eliminar un piso desactiva sus espacios.']] },
  'a-datos': { title: 'Datos', steps: [[null, 'Visitas, reservas y perfiles por periodo. Descarga los datos en CSV.'], ['.bartog', 'Toca una variable para ocultarla y comparar mejor las demás: la escala se ajusta sola.']] },
  'a-emp': { title: 'Empleados', steps: [[null, 'Asigna credenciales (administración, encargado, recepción, analista) y los laboratorios de cada encargado.']] },
  'a-reglas': { title: 'Reglas', steps: [[null, 'Horarios, bloques, tolerancia, saldo, aforo por piso, edades permitidas y correo.']] },
};
const generic = k => ({ title: (typeof document !== 'undefined' && document.querySelector('main h1')?.textContent.trim()) || 'Esta pantalla', steps: [[null, k.startsWith('a-') ? 'Usa el menú de la izquierda para moverte entre secciones. En Ayuda encontrarás las preguntas frecuentes del personal.' : 'Usa las pestañas de abajo para moverte. En Ayuda encontrarás las preguntas frecuentes.']] });
export const guideFor = k => GUIDES[k] || GUIDES[k?.replace(/^a-(espd)$/, 'a-esp')] || generic(k);

// ---------------------------------------------------------------- Botón de ayuda y recorrido
export const helpButton = k => `<button class="icb" data-a="help" data-v="${k}" aria-label="Ayuda de esta pantalla" title="Ayuda">${icon('help')}</button>`;
actions.help = k => { const g = guideFor(k || S.k), staff = (k || S.k).startsWith('a-');
  modal({ html: `<h2 id="dlg-t" style="margin:0">${icon('help')} Ayuda: ${esc(g.title)}</h2>
    <ol class="steps">${g.steps.map(([, txt]) => `<li>${esc(fillRules(txt))}</li>`).join('')}</ol>
    <div class="row w">${g.steps.some(([sel]) => sel) ? btn('Recorrido guiado', 'tour-start', { v: k || S.k, cls: 'sp', icon: 'play' }) : ''}${btn('Preguntas frecuentes', 'go', { v: staff ? 'a-ayuda' : 'u-ayuda', cls: 'plain', icon: 'list' })}</div>` }); };
actions['tour-start'] = k => { closeModal(); S.tour = { k, i: 0 }; setTimeout(() => UI.render(), 0); };
actions['tour-step'] = d => { const g = guideFor(S.tour.k), i = S.tour.i + +d; if (i < 0) return; if (i >= g.steps.length) return actions['tour-end'](); S.tour.i = i; UI.render(); };
actions['tour-end'] = () => { S.tour = null; document.querySelector('.tour-hl')?.classList.remove('tour-hl'); try { localStorage.setItem('hub-tour-' + S.k, '1'); } catch { /* sin almacenamiento */ } UI.render(); };
/** Tarjeta del recorrido. Se agrega al final de la pantalla; placeTour() resalta el elemento. */
export function tourCard() {
  if (!S.tour || S.tour.k !== S.k || S.modal) return '';
  const g = guideFor(S.k), [, txt] = g.steps[S.tour.i], n = g.steps.length, last = S.tour.i === n - 1;
  return `<div class="tourcard" role="dialog" aria-label="Recorrido guiado" aria-live="polite"><p class="sm mu" style="margin:0">Paso ${S.tour.i + 1} de ${n} · ${esc(g.title)}</p><p style="margin:4px 0 10px">${esc(fillRules(txt))}</p>
    <div class="row">${S.tour.i ? btn('Atrás', 'tour-step', { v: -1, cls: 's plain' }) : ''}<span class="sp"></span>${btn('Salir', 'tour-end', { cls: 's plain' })}${btn(last ? 'Terminar' : 'Siguiente', 'tour-step', { v: 1, cls: 's', attrs: 'data-tour-next="1"' })}</div></div>`;
}
export function placeTour() {
  document.querySelectorAll('.tour-hl').forEach(x => x.classList.remove('tour-hl'));
  if (!S.tour || S.tour.k !== S.k || S.modal) return;
  const sel = guideFor(S.k).steps[S.tour.i][0], el = sel && [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null && !x.closest('.tourcard'));
  if (el) { el.classList.add('tour-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  document.querySelector('.tourcard [data-tour-next]')?.focus({ preventScroll: true });
}
/** Invitación al recorrido la primera vez que alguien ve una pantalla con guía (solo Inicio y Panel). */
export function firstVisit(k) {
  if (!['u-inicio', 'a-panel'].includes(k) || S.tour) return '';
  try { if (localStorage.getItem('hub-tour-' + k)) return ''; } catch { return ''; }
  return `<div class="card stack tourinv"><p style="margin:0"><b>¿Primera vez en el sistema?</b> Haz un recorrido de un minuto por esta pantalla.</p><div class="row">${btn('Ver recorrido', 'tour-start', { v: k, cls: 's sp' })}${btn('No, gracias', 'tour-end', { cls: 's plain' })}</div></div>`;
}

// ---------------------------------------------------------------- Pantallas de preguntas frecuentes
const faqList = (items, q) => {
  const n = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), words = n(q).split(/\s+/).filter(Boolean);
  const hits = items.filter(([topic, qq, a]) => words.every(w => n(topic + ' ' + qq + ' ' + a).includes(w)));
  if (!hits.length) return '<p class="mu">No encontramos preguntas con esas palabras. Prueba con otras o pregunta en recepción.</p>';
  const topics = [...new Set(hits.map(x => x[0]))];
  return topics.map(tp => `<h2>${esc(tp)}</h2><div class="faq">${hits.filter(x => x[0] === tp).map(([, qq, a]) => `<details${words.length ? ' open' : ''}><summary>${esc(qq)}</summary><p>${esc(fillRules(a))}</p></details>`).join('')}</div>`).join('');
};
screens['u-ayuda'] = { tab: 'u-perfil', open: true, render: () => `${me() ? '' : `<button class="btn plain s" data-a="go" data-v="u-login">${icon('back')} Volver</button>`}<h1>Ayuda y preguntas frecuentes</h1>
  <p class="mu">Respuestas rápidas sobre el uso del Hub. En cada pantalla, el botón ${icon('help')} explica qué hacer ahí.</p>
  <div class="form">${field('faq_q', 'Buscar en las preguntas', { cls: 'full', live: true, attrs: 'type="search" autocomplete="off"', ph: 'reserva, certificación, menor…' })}</div>${faqList(FAQ_USER, val('faq_q'))}` };
screens['a-ayuda'] = { roles: ['admin', 'encargado', 'recepcion', 'analista'], render() {
  const mine = myRoles(), all = S.faqAll || mine.includes('admin'), items = FAQ_STAFF.filter(x => all || x[3].some(r => mine.includes(r)));
  return `<h1>Ayuda para el personal</h1><p class="mu">Preguntas frecuentes del equipo del Hub. ${mine.includes('admin') ? '' : `Se muestran las de tu credencial. <button class="btn s plain" data-a="faq-all">${all ? 'Ver solo las mías' : 'Ver todas'}</button>`}</p>
    <div class="form">${field('faq_q', 'Buscar en las preguntas', { cls: 'full', live: true, attrs: 'type="search" autocomplete="off"', ph: 'bloquear horas, certificación, banner…' })}</div>${faqList(items, val('faq_q'))}
    <h2>Preguntas de los usuarios</h2><p class="sm mu">Las mismas que ven las personas en su app, para responder en recepción.</p>${faqList(FAQ_USER, val('faq_q'))}`;
} };
actions['faq-all'] = () => { S.faqAll = !S.faqAll; go(S.k); };
