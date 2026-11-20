// Pantallas de la app de usuarios.
import * as R from '../core/rules.js';
import * as Q from '../core/queries.js';
import { ACTIVITIES, OCCUPATIONS, GENDERS, DOC_TYPES, FAILURES, ACTIVE, WEEKDAYS } from '../core/catalog.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../core/seed.js';
import { t, LANGS, getLang, setLang } from './i18n.js';
import { themePref, setThemePref, a11y, setA11y } from './theme.js';
import { openCamera } from './camera.js';
import { fileInput, App, S, db, me, myRoles, screens, actions, go, run, toast, modal, closeModal, esc, icon, field, area, select, check, btn, seg, pill, empty, back, meter, avatar, stPill, qrSvg, openDays, dayChips, fDay, fDate, fTime, fDT, fRange, fmtN, val, fill, readImage, download, memo } from './kit.js';

const cfg = k => db().cfg(k);
const T = d => +new Date(d);
export const logoSrc = () => cfg('logo') || window.HUB_LOGO || 'assets/logo.png';
/** Persona para quien se reserva: uno mismo, o el usuario atendido en recepción (reserva asistida). */
const target = () => (S.assist ? db().get('users', S.assist) : me());
const spaceIcon = { sala: 'door', gaming: 'game', lab: 'flask', cowork: 'users', auditorio: 'star', residencia: 'home' };
const resName = r => { const sp = db().get('spaces', r.space_id), e = db().get('resources', r.resource_id); return esc(sp?.name || '') + (e ? ' · ' + esc(e.name) : ''); };
const notice = (text, tone = 'tone') => `<div class="card ${tone} sm">${text}</div>`;
const demoCode = () => (S.demoCode ? notice(`<span class="demo">DEMO</span> ${t('En el sistema real este código llega por correo. Tu código es')} <b>${S.demoCode}</b>`, 'warn') : '');

// ============================================================ Ingreso y registro
screens['u-login'] = { open: true, render() {
  const code = S.loginMode === 'code', gid = cfg('google_client_id');
  return `<div class="login stack">
    <div class="stack c" style="align-items:center;gap:6px"><img class="logo" src="${logoSrc()}" alt=""><h1>${esc(cfg('system_name'))}</h1><p class="mu">${esc(cfg('tagline'))}</p></div>
    <div class="card stack">
      ${field('l_ident', 'RUT o correo', { attrs: 'autocomplete="username" data-enter="login"' })}
      ${code ? (S.codeSent ? field('l_code', 'Código de 6 dígitos', { attrs: 'inputmode="numeric" autocomplete="one-time-code" data-enter="login"' }) : '') : field('l_pass', 'Contraseña', { type: 'password', attrs: 'autocomplete="current-password" data-enter="login"' })}
      ${demoCode()}
      ${btn(code && !S.codeSent ? 'Enviar código a mi correo' : 'Entrar', 'login', { cls: 'block' })}
      ${gid ? '<div id="gsi" class="c"></div>' : ''}
      <div class="row between w"><button class="btn s plain" data-a="login-mode">${t(code ? 'Entrar con contraseña' : 'Entrar con un código')}</button>${btn('Crear cuenta', 'go', { v: 'u-reg', cls: 's sec' })}</div>
    </div>
    ${App.mode === 'demo' ? `<div class="card stack"><div class="row between"><h3>${t('Cuentas de demostración')}</h3><span class="demo">DEMO</span></div><p class="sm mu">${t('Datos de ejemplo guardados en este navegador. Contraseña de todas las cuentas:')} <b>${DEMO_PASSWORD}</b></p>
      <div class="chips">${DEMO_ACCOUNTS.map(a => `<button class="chip" data-a="demo-login" data-v="${a.ident}">${t(a.label)}</button>`).join('')}</div>
      <button class="btn s plain" data-a="demo-reset">${t('Restablecer datos de ejemplo')}</button></div>` : ''}
    <div class="c">${seg('lang', getLang(), Object.entries(LANGS))}</div></div>`;
} };
actions.lang = v => { setLang(v); if (me()) run('me.update', { lang: v }); else go(S.k); };
actions['login-mode'] = () => { S.loginMode = S.loginMode === 'code' ? 'pass' : 'code'; S.codeSent = false; S.demoCode = null; go(S.k); };
actions['demo-login'] = v => { fill({ l_ident: v, l_pass: DEMO_PASSWORD }); S.loginMode = 'pass'; actions.login(); };
actions['demo-reset'] = () => App.data.reset();
const enter = r => { if (!r?.session) return; S.demoCode = null; S.codeSent = false; S.f = {}; S.staff = myRoles().length > 0; go(S.staff ? 'a-panel' : 'u-inicio'); };
actions.login = async () => {
  const ident = val('l_ident').trim(); if (!ident) return toast(t('Escribe tu RUT o correo'));
  if (S.loginMode === 'code') {
    if (!S.codeSent) { const r = await run('auth.code', { ident }); if (r) { S.codeSent = true; S.demoCode = r.demo_code; S.codeMin = r.minutes; toast(t('Si el correo está registrado, te enviamos un código. Vence en {0} minutos', r.minutes)); } return; }
    return enter(await run('auth.codeLogin', { ident, code: val('l_code') }));
  }
  const r = await run('auth.login', { ident, password: val('l_pass') });
  if (r?.need === 'correo') { S.verify = r.id; S.demoCode = r.demo_code; S.codeMin = r.minutes; return go('u-verif'); }
  enter(r);
};
actions.logout = async () => { await App.data.logout(); S.staff = false; S.assist = null; S.f = {}; go('u-login'); };

const CONSENTS = [['c_data', 'Declaro haber leído y aceptado el tratamiento de mis datos personales conforme a la Ley N.º 19.628.'],
  ['c_image', 'Autorizo el uso de mi imagen o voz para fines institucionales de la Municipalidad de Providencia, sin fines de lucro.'],
  ['c_things', 'Acepto que la Municipalidad de Providencia no asume responsabilidad por la pérdida, robo, hurto o deterioro de objetos personales dentro de sus instalaciones.']];
/** Formulario de registro. Recepción usa el mismo en modo asistido (sin contraseña, correo opcional). */
export function regForm(assisted) {
  const years = R.age(val('r_birth') || null), minor = years != null && years < 18, type = val('r_type', 'rut');
  return `<div class="card stack"><h3>${t('Identificación')}</h3><div class="form">
      ${select('r_type', 'Documento', Object.entries(DOC_TYPES), { live: true })}${field('r_doc', type === 'pasaporte' ? 'Número de pasaporte' : 'RUT', { ph: type === 'pasaporte' ? '' : '12.345.678-5', hint: type === 'pasaporte' ? 'Tal como aparece en el pasaporte, con letras y números.' : 'Con o sin puntos y con guion antes del dígito verificador: 12.345.678-5 o 12345678-5. Si termina en K, escribe K.', live: true, attrs: 'autocomplete="off" autocapitalize="characters" spellcheck="false"' })}
      ${field('r_name', 'Nombre completo', { cls: 'full', attrs: 'autocomplete="name"' })}
      ${field('r_birth', 'Fecha de nacimiento', { type: 'date', live: true, hint: t('Edad permitida: de {0} a {1} años.', db().cfg('min_age') || 4, db().cfg('max_age') || 95), attrs: `min="${R.dayKey(new Date(new Date().getFullYear() - (db().cfg('max_age') || 95) - 1, new Date().getMonth(), new Date().getDate() + 1))}" max="${R.dayKey(new Date(new Date().getFullYear() - (db().cfg('min_age') || 4), new Date().getMonth(), new Date().getDate()))}"` })}${select('r_gender', 'Género', GENDERS, { blank: 'Elige una opción' })}</div>
      ${val('r_doc') && type !== 'pasaporte' && !R.rutOk(val('r_doc')) ? `<p class="sm" role="alert" style="color:var(--bad)">${t('El dígito verificador no coincide con el RUT.')}</p>` : ''}
      ${years != null && (years < (db().cfg('min_age') || 4) || years > (db().cfg('max_age') || 95)) ? `<p class="sm" role="alert" style="color:var(--bad)">${t('La edad debe estar entre {0} y {1} años', db().cfg('min_age') || 4, db().cfg('max_age') || 95)}</p>` : ''}
      ${check('r_mob', 'Tengo movilidad reducida')}</div>
    <div class="card stack"><h3>${t('Contacto')}</h3><div class="form">
      ${field('r_email', assisted ? 'Correo (opcional)' : 'Correo', { type: 'email', attrs: 'autocomplete="email"' })}${field('r_phone', assisted ? 'Celular (opcional)' : 'Celular', { type: 'tel', ph: '+56 9 1234 5678' })}
      ${field('r_comuna', 'Comuna')}${select('r_activity', '¿Qué actividad realizas en Providencia?', ACTIVITIES, { blank: 'Elige una opción' })}
      ${select('r_occ', '¿A qué te dedicas?', OCCUPATIONS, { blank: 'Elige una opción', cls: 'full' })}
      ${assisted ? '' : field('r_pass', 'Crea una contraseña (mínimo 8 caracteres)', { type: 'password', attrs: 'autocomplete="new-password"' }) + field('r_pass2', 'Confirmar contraseña', { type: 'password', attrs: 'autocomplete="new-password"' })}</div>
      <label class="f">${t('Foto de perfil (opcional)')}${fileInput('reg-photo', 'image/*')}</label>${S.regPhoto ? `<img class="av" src="${S.regPhoto}" alt="">` : ''}</div>
    ${minor ? `<div class="card warn stack"><h3>${t('Autorización de un adulto')}</h3><p class="sm">${t('Las personas menores de 18 años necesitan que un adulto con perfil en el Hub autorice su registro. Escanea el QR de su credencial o escribe su ID.')}</p>
      <div class="row">${field('r_guardian', 'ID o RUT del adulto', { cls: 'sp' })}<button class="icb" style="margin-top:18px" data-a="scan-into" data-v="r_guardian" aria-label="${t('Escanear QR')}">${icon('cam')}</button></div></div>` : ''}
    <div class="card stack"><h3>${t('Declaraciones')}</h3><p class="sm mu">${t('Aceptarlas es requisito para participar en actividades y usar las dependencias municipales.')}</p>${CONSENTS.map(([k, x]) => check(k, x)).join('')}</div>
    ${btn(assisted ? 'Registrar usuario' : 'Crear cuenta', 'register', { cls: 'block', v: assisted ? 1 : 0 })}`;
}
screens['u-reg'] = { open: true, render: () => `${back('u-login')}<h1>${t('Crear cuenta')}</h1><p class="mu">${t('Te registras una sola vez. Después entras al Hub mostrando tu código QR.')}</p>${regForm(false)}` };
actions['file:reg-photo'] = async f => { S.regPhoto = await readImage(f, 320); go(S.k); };
actions['scan-into'] = k => openCamera(code => { S.f[k] = code; go(S.k); });
actions.register = async assisted => {
  if (assisted !== '1' && val('r_pass') !== val('r_pass2')) return toast(t('Las contraseñas no coinciden'));
  const r = await run('auth.register', { assisted: assisted === '1', doc_type: val('r_type', 'rut'), doc_number: val('r_doc'), name: val('r_name'), birth_date: val('r_birth'), gender: val('r_gender'), reduced_mobility: val('r_mob'),
    email: val('r_email'), phone: val('r_phone'), comuna: val('r_comuna'), activity: val('r_activity'), occupation: val('r_occ'), password: val('r_pass'), photo: S.regPhoto || null, guardian: val('r_guardian') || null,
    consent_data: val('c_data'), consent_image: val('c_image'), consent_belongings: val('c_things'), lang: getLang() });
  if (!r) return;
  S.f = {}; S.regPhoto = null;
  if (assisted === '1') { S.newUser = r.id; return go('a-reg'); }
  if (r.status === 'pendiente_correo') { S.verify = r.id; S.demoCode = r.demo_code; S.codeMin = r.minutes; return go('u-verif'); }
  enter(r);
};
screens['u-verif'] = { open: true, render: () => `<div class="login stack">${back('u-login')}<h1>${t('Confirma tu correo')}</h1><p class="mu">${t('Te enviamos un código de 6 dígitos. Escríbelo para activar tu cuenta.')}</p>
  <div class="card stack">${demoCode()}${S.verify ? '' : field('v_ident', 'RUT o correo')}${field('v_code', 'Código de 6 dígitos', { attrs: 'inputmode="numeric" autocomplete="one-time-code" maxlength="7" data-enter="verify"' })}
    <p class="sm mu">${t('El código vence en {0} minutos. Si no llega, revisa la carpeta de spam.', S.codeMin || db().cfg('code_minutes') || 15)}</p>
    ${btn('Confirmar correo', 'verify', { cls: 'block' })}${btn('Reenviar código', 'resend', { cls: 'block plain' })}</div></div>` };
actions.resend = async () => { const r = await run('auth.code', S.verify ? { id: S.verify } : { ident: val('v_ident') }); if (r) { S.codeMin = r.minutes; if (r.demo_code) S.demoCode = r.demo_code; toast(t('Te reenviamos el código. Usa el del correo más reciente o cualquiera vigente')); } };
actions.verify = async () => enter(await run('auth.verify', { id: S.verify, ident: val('v_ident'), code: val('v_code') }));

/** Pantalla de espera para perfiles de menores sin autorización. */
export function pendingScreen(u) {
  const g = u.guardian_id && db().get('users', u.guardian_id);
  return `<h1>${t('Falta la autorización de un adulto')}</h1>
    ${g || u.guardian_id ? notice(`${icon('clock')} ${t('Esperando la confirmación de {0}. Le llegó un aviso a su perfil del Hub.', `<b>${esc(g?.name || t('la persona indicada'))}</b>`)}`, 'warn') : notice(t('Pide a un adulto con perfil en el Hub que autorice tu registro. Quedará como responsable de tu permanencia en el Hub.'), 'warn')}
    <div class="card stack"><div class="row">${field('g_code', g ? 'Pedir a otro adulto (ID o RUT)' : 'ID o RUT del adulto', { cls: 'sp' })}<button class="icb" style="margin-top:18px" data-a="scan-into" data-v="g_code" aria-label="${t('Escanear QR')}">${icon('cam')}</button></div>
    ${btn('Pedir autorización', 'guardian-ask', { cls: 'block' })}</div>${btn('Cerrar sesión', 'logout', { cls: 'plain block' })}`;
}
actions['guardian-ask'] = async () => { const r = await run('auth.guardian', { id: me().id, code: val('g_code') }); if (r) { S.f = {}; toast(t('Solicitud enviada a {0}', r.adult)); } };
actions['guardian-answer'] = v => { const [id, ok] = v.split(':'); closeModalQuiet(); run('me.guardianAnswer', { id: +id, accept: ok === '1' }, ok === '1' ? 'Perfil autorizado' : 'Solicitud rechazada'); };
const closeModalQuiet = () => { S.modal = null; };

// ============================================================ Inicio
const occ = () => App.occ || memo('occ', () => Q.occupancy(db()));
export const occupancyCard = () => { const o = occ(); return `<div class="card stack">${Object.entries(o.floors).map(([f, v]) => meter(t('Piso {0}', f), v.n, v.cap)).join('')}
  <details><summary>${t('Ver por espacio')}</summary><div class="stack" style="margin-top:6px">${o.spaces.filter(s => s.cap && s.kind !== 'residencia').map(s => meter(s.name, s.n, s.cap)).join('')}</div></details>
  <p class="sm mu">${t('Una zona con reserva figura ocupada cuando la persona registra su entrada.')}</p></div>`; };
const eventNow = () => db().find('events', e => e.published && e.kind === 'evento' && e.start_at && T(e.start_at) - 30 * 60000 <= Date.now() && Date.now() <= T(e.end_at || e.start_at) + 36e5);
screens['u-inicio'] = { tab: 'u-inicio', render() {
  const u = me(), now = new Date(), ban = Q.activeBan(db(), u.id), ev = eventNow();
  const asks = db().where('notifications', n => n.user_id === u.id && n.kind === 'tutor' && !n.read_at);
  const banners = db().where('events', e => e.published && (e.kind === 'aviso' || !e.start_at || T(e.end_at || e.start_at) > +now)).sort((a, b) => (a.start_at ? T(a.start_at) : 9e15) - (b.start_at ? T(b.start_at) : 9e15));
  const visit = db().find('visits', v => v.user_id === u.id && !v.out_at);
  const next = [...db().where('reservations', r => r.user_id === u.id && ACTIVE.includes(r.status) && T(r.end_at) > +now), ...myCerts(+now)].sort((a, b) => T(a.start_at) - T(b.start_at))[0];
  const closures = db().where('blocks', b => T(b.end_at) > +now && T(b.start_at) < +now + 7 * 864e5).sort((a, b) => T(a.start_at) - T(b.start_at));
  const went = ev && db().find('event_attendance', a => a.event_id === ev.id && a.user_id === u.id && a.status === 'asistio');
  return `${asks.map(n => { const m = db().get('users', n.data.minor_id); return `<div class="card warn stack"><h3>${icon('shield')} ${t('{0} pide tu autorización', esc(m?.name || ''))}</h3>
      <p class="sm">${t('Al aceptar quedarás como adulto responsable de esta persona menor de edad. Se te considerará responsable ante cualquier accidente, pérdida de equipamiento o mala conducta asociada a ella dentro del Hub.')}</p>
      <div class="row">${btn('Sí, autorizo', 'guardian-answer', { v: n.id + ':1', cls: 'sp' })}${btn('No', 'guardian-answer', { v: n.id + ':0', cls: 'plain' })}</div></div>`; }).join('')}
    ${ban ? notice(`${icon('lock')} <b>${t('Tu acceso al Hub está restringido')}</b> ${ban.until_at ? t('hasta el {0}.', fDT(ban.until_at)) : t('de forma permanente.')} ${ban.reason ? esc(ban.reason) : ''}`, 'bad') : ''}
    <div class="head"><h1>${t('Hola, {0}', esc(u.name.split(' ')[0]))}</h1></div>
    ${bannerStrip(banners)}
    ${ev ? (went ? notice(`${icon('check')} ${t('Asistencia registrada en {0}', esc(ev.title))}`, 'ok') : btn(`${icon('star')} ${t('Marcar asistencia')}: ${esc(ev.title)}`, 'event-checkin', { v: ev.id, cls: 'block sec', raw: true })) : ''}
    <div class="card qr"><div class="code">${qrSvg(u.id)}</div><div class="id">${u.id}</div><p class="sm mu">${t('Muestra este código en recepción al entrar y al salir.')}</p>
      ${visit ? pill(t('Dentro del Hub desde las {0}', fTime(visit.in_at)), 'ok') : pill(t('Fuera del Hub'))}</div>
    ${next ? `<button class="list li" data-a="go" data-v="u-activas"><span class="sp"><b>${t('Tu próxima reserva')}</b><span>${next.cert ? esc(next.cert.name) : resName(next)} · ${fRange(next.start_at, next.end_at)}</span></span>${next.cert ? pill(t('Certificación'), 'info') : stPill(next.status)}${icon('chev')}</button>` : ''}
    <h2>${t('El Hub ahora')}</h2>${occupancyCard()}
    ${closures.length ? `<h2>${t('Próximos cierres')}</h2><div class="list">${closures.map(b => `<div class="li"><span class="sp"><b>${esc(b.space_id ? db().get('spaces', b.space_id)?.name : t('Todo el Hub'))}</b><span>${fRange(b.start_at, b.end_at)}${b.reason ? ' · ' + esc(b.reason) : ''}</span></span></div>`).join('')}</div>` : ''}`;
} };
/** Carrusel de banners: todos los publicados, con flechas y puntos para verlos en el computador. */
function bannerStrip(list) {
  if (!list.length) return '';
  const one = e => `<button class="banner${e.banner_img ? '' : ' gen'}" data-a="event-open" data-v="${e.id}" aria-label="${esc(e.title)}">${e.banner_img ? `<img src="${esc(e.banner_img)}" alt="">` : `<b>${esc(e.title)}</b>`}${e.start_at ? `<span>${fDay(e.start_at)} · ${fTime(e.start_at)}</span>` : ''}</button>`;
  return `<section class="bnwrap" aria-label="${t('Eventos y avisos')}"><div class="banners" id="banners">${list.map(one).join('')}</div>
    ${list.length > 1 ? `<div class="bnnav"><button class="icb" data-a="bn-move" data-v="-1" aria-label="${t('Anterior')}">${icon('back')}</button><span class="dots" aria-hidden="true">${list.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span><span class="sm mu">${t('{0} publicados', list.length)}</span><button class="icb" data-a="bn-move" data-v="1" aria-label="${t('Siguiente')}">${icon('chev')}</button></div>` : ''}</section>`;
}
actions['bn-move'] = d => { const el = document.getElementById('banners'); if (!el) return; const w = el.firstElementChild?.offsetWidth + 10 || el.clientWidth, max = el.scrollWidth - el.clientWidth;
  const to = +d > 0 && el.scrollLeft >= max - 4 ? 0 : +d < 0 && el.scrollLeft <= 4 ? max : el.scrollLeft + +d * w; el.scrollTo({ left: to }); };
const seatsLeft = e => (e.seats ? e.seats - db().where('event_attendance', a => a.event_id === e.id).length : null);
actions['event-open'] = id => { const e = db().get('events', +id), mine = db().find('event_attendance', a => a.event_id === e.id && a.user_id === App.uid), left = seatsLeft(e);
  modal({ html: `${e.poster_img || e.banner_img ? `<img class="poster" src="${esc(e.poster_img || e.banner_img)}" alt="">` : ''}<h2 style="margin:0">${esc(e.title)}</h2>
    ${e.start_at ? `<p class="mu">${fRange(e.start_at, e.end_at || e.start_at)}${e.space_id ? ' · ' + esc(db().get('spaces', e.space_id)?.name) : ''}</p>` : ''}<p>${esc(e.description || '')}</p>
    ${e.kind === 'evento' ? `<div class="row between">${left != null ? pill(t('{0} cupos disponibles', Math.max(0, left)), left > 0 ? 'ok' : 'bad') : pill(t('Entrada liberada'), 'ok')}
      ${mine ? btn('Cancelar inscripción', 'event-signup', { v: e.id + ':0', cls: 's plain' }) : btn('Inscribirme', 'event-signup', { v: e.id + ':1', cls: 's', off: left != null && left <= 0 })}</div>` : ''}` }); };
actions['event-signup'] = v => { const [id, on] = v.split(':'); closeModalQuiet(); run('event.signup', { id: +id, cancel: on === '0' }, on === '1' ? 'Inscripción lista' : 'Inscripción cancelada'); };
actions['event-checkin'] = id => run('event.checkin', { id: +id }, 'Asistencia registrada');

// ============================================================ Reservar
const assistBar = () => (S.assist ? notice(`${icon('users')} ${t('Reservando para')} <b>${esc(target()?.name)}</b> (${S.assist}) <button class="btn s plain" data-a="assist-end" style="margin-left:8px">${t('Terminar')}</button>`, 'warn') : '');
actions['assist-end'] = () => { S.assist = null; S.bk = null; go('a-scan'); };
screens['u-reservar'] = { tab: 'u-reservar', render: () => `<h1>${t('Reservar')}</h1><div class="list">${[
  ['u-sala', 'door', 'Sala de reuniones', 'Para equipos de hasta 8 o 10 personas'], ['u-gaming', 'game', 'Sala gaming', 'Un computador o la sala completa para tu grupo'],
  ['u-lab', 'flask', 'Laboratorios', 'Impresión 3D, corte láser y textil'], ['u-cert', 'award', 'Certificaciones', 'Sesiones semanales para usar las máquinas'], ['u-eventos', 'star', 'Eventos', 'Charlas, talleres y ferias']]
  .map(([k, i, a, b]) => `<button class="li" data-a="go" data-v="${k}">${icon(i)}<span class="sp"><b>${t(a)}</b><span>${t(b)}</span></span>${icon('chev')}</button>`).join('')}</div>
  <p class="sm mu">${t('El cowork es de uso libre: no necesita reserva ni tiene límite de tiempo.')}</p>` };

/** Estado de la reserva en curso (se reinicia al cambiar de tipo de espacio). */
function bk(type, init) { if (S.bk?.type !== type) { S.bk = { type, day: R.dayKey(openDays(1)[0] || new Date()), sel: [], guests: [], ...init() }; } return S.bk; }
const dayOf = b => new Date(b.day + 'T00:00:00');
const slotsOf = b => R.slotsFor(cfg('hours'), dayOf(b), cfg('block_min'), cfg('block_gap_min'));
const windowOf = b => { if (!b.sel.length) return null; const st = R.atMin(dayOf(b), slotsOf(b)[b.sel[0]]); return [st, new Date(+st + R.blocksDur(b.sel.length, cfg('block_min'), cfg('block_gap_min')) * 60000)]; };
const freeAt = (sp, res, st, min) => +st > Date.now() - 60000 && !Q.unavailable(db(), sp, res, st, new Date(+st + min * 60000));
const slotChips = (b, isFree) => { const sl = slotsOf(b), w = windowOf(b);
  return `<div class="chips">${sl.map((m, i) => `<button class="chip ${b.sel.includes(i) ? 'on' : ''}" data-a="bk-slot" data-v="${i}" ${b.sel.includes(i) || isFree(R.atMin(dayOf(b), m)) ? '' : 'disabled'}>${R.hm(m)}</button>`).join('') || `<span class="mu">${t('El Hub no abre este día.')}</span>`}</div>
  <p class="sm mu">${w ? `<b>${fTime(w[0])} – ${fTime(w[1])}</b> · ${R.dur((w[1] - w[0]) / 60000)}. ` : ''}${t('Bloques de {0} min con {1} min de pausa. Toca bloques seguidos para alargar la reserva.', cfg('block_min'), cfg('block_gap_min'))}</p>`; };
actions['bk-day'] = v => { S.bk.day = v; S.bk.sel = []; S.bk.start = null; go(S.k); };
actions['bk-slot'] = v => { v = +v; let s = S.bk.sel; const a = s[0], z = s[s.length - 1];
  if (!s.length) s = [v]; else if (s.length === 1 && v === a) s = []; else if (v === z + 1) s = [...s, v]; else if (v === a - 1) s = [v, ...s]; else if (v === z) s = s.slice(0, -1); else if (v === a) s = s.slice(1); else s = [v];
  S.bk.sel = s; go(S.k); };
actions['bk-set'] = v => { const [k, x] = v.split('='); if (k === 'space') { S.bk.file = null; clearPick(); } S.bk[k] = isNaN(+x) ? x : +x; S.bk.sel = []; S.bk.start = null; S.bk.res = null; S.f.lab_res = 0; go(S.k); };
const guestBox = (b, cap) => `<div class="card stack"><h3>${t('Asistentes')} <span class="mu sm">${b.guests.length + 1} / ${cap}</span></h3><p class="sm mu">${t('Todas las personas deben tener perfil en el Hub. Agrégalas con su ID o RUT.')}</p>
  <div class="row">${field('bk_guest', 'ID o RUT', { cls: 'sp', attrs: 'data-enter="bk-guest"' })}<button class="icb" style="margin-top:18px" data-a="bk-guest" aria-label="${t('Agregar')}">${icon('plus')}</button></div>
  <div class="chips">${pill(target()?.name + ' · ' + t('anfitrión'), 'info')}${b.guests.map((g, i) => `<button class="pill" data-a="bk-unguest" data-v="${i}">${esc(Q.findUser(db(), g)?.name || g)} ✕</button>`).join('')}</div></div>`;
actions['bk-guest'] = () => { const g = val('bk_guest').trim(); if (!g) return; if (!S.bk.guests.includes(g)) S.bk.guests.push(g); S.f.bk_guest = ''; go(S.k); };
actions['bk-unguest'] = i => { S.bk.guests.splice(+i, 1); go(S.k); };
const balanceCard = sp => { const b = Q.balance(db(), target().id, sp.id, S.bk?.day ? dayOf(S.bk) : new Date()); return `<div class="card">${meter(t('Saldo de horas del mes'), Math.max(0, b.left), Math.max(1, b.quota), `${R.dur(Math.max(0, b.left))} ${t('de')} ${fmtN(b.quota / 60)} h`, true)}</div>`; };
async function confirmBooking(args, okRoute = 'u-activas') {
  const r = await run('res.create', { ...args, for_user: S.assist || undefined });
  if (!r) return;
  S.bk = null; S.f = {}; clearPick();
  if (S.assist) { S.assist = null; toast(t('Reserva asistida creada')); return go('a-prox'); }
  toast(t(r.status === 'en_revision' ? 'Reserva lista. El encargado revisará tu archivo' : 'Reserva confirmada')); go(okRoute);
}

screens['u-sala'] = { tab: 'u-reservar', render() {
  const rooms = db().where('spaces', s => s.kind === 'sala' && s.active), b = bk('sala', () => ({ space: rooms[0]?.id })), sp = db().get('spaces', b.space);
  if (!sp) return back('u-reservar') + empty('No hay salas disponibles.');
  return `${back(S.assist ? 'a-asist' : 'u-reservar')}${assistBar()}<h1>${t('Sala de reuniones')}</h1>
    ${seg('bk-set', 'space=' + b.space, rooms.map(r => ['space=' + r.id, `${r.name.replace('Sala de reuniones', t('Sala'))} · ${r.capacity}`]))}
    ${dayChips('bk-day', b.day, openDays(10))}${slotChips(b, st => freeAt(sp, null, st, cfg('block_min')))}
    <div class="card">${field('bk_title', 'Motivo de la reunión (opcional)')}</div>${guestBox(b, sp.capacity)}
    ${btn('Confirmar reserva', 'bk-room', { cls: 'block', off: !b.sel.length })}`;
} };
actions['bk-room'] = () => { const b = S.bk, w = windowOf(b); confirmBooking({ space_id: b.space, start: w[0], slots: b.sel.length, guests: b.guests, title: val('bk_title') }); };

screens['u-gaming'] = { tab: 'u-reservar', render() {
  const sp = db().find('spaces', s => s.kind === 'gaming' && s.active); if (!sp) return back('u-reservar') + empty('La sala gaming no está disponible.');
  const b = bk('gaming', () => ({ mode: 'pc', res: null })), pcs = db().where('resources', r => r.space_id === sp.id && r.active), w = windowOf(b), min = w ? (w[1] - w[0]) / 60000 : cfg('block_min');
  const group = b.mode === 'sala', free = pc => !w || freeAt(sp, pc, w[0], min);
  return `${back(S.assist ? 'a-asist' : 'u-reservar')}${assistBar()}<h1>${t('Sala gaming')}</h1>
    ${seg('bk-set', 'mode=' + b.mode, [['mode=pc', t('Un computador')], ['mode=sala', t('Sala completa (grupo)')]])}
    ${dayChips('bk-day', b.day, openDays(10))}${slotChips(b, st => group ? freeAt(sp, null, st, cfg('block_min')) : pcs.some(pc => freeAt(sp, pc, st, cfg('block_min'))))}
    ${group ? `<div class="card">${field('bk_title', 'Nombre del grupo o evento')}</div>${guestBox(b, sp.capacity)}` : `<p class="c sm mu">${t('Entrada de la sala')}</p>
      <div class="seats">${pcs.map(pc => `<button class="seat ${b.res === pc.id ? 'on' : ''}" data-a="bk-res" data-v="${pc.id}" ${free(pc) ? '' : 'disabled'}>${esc(pc.name)}<small>${t(free(pc) ? 'Libre' : 'Ocupado')}</small></button>`).join('')}</div>
      <p class="sm mu">${esc(pcs[0]?.specs || '')}</p>`}
    ${balanceCard(sp)}${btn(w ? `${t('Confirmar reserva')} · ${R.dur(min)}` : t('Confirmar reserva'), 'bk-gaming', { cls: 'block', raw: true, off: !w || (!group && !b.res) })}`;
} };
actions['bk-res'] = v => { S.bk.res = +v; go(S.k); };
actions['bk-gaming'] = () => { const b = S.bk, w = windowOf(b), sp = db().find('spaces', s => s.kind === 'gaming'); confirmBooking({ space_id: sp.id, resource_id: b.mode === 'sala' ? null : b.res, start: w[0], slots: b.sel.length, guests: b.mode === 'sala' ? b.guests : [], title: val('bk_title') }); };

screens['u-lab'] = { tab: 'u-reservar', render() {
  const labs = db().where('spaces', s => s.kind === 'lab' && s.active), b = bk('lab', () => ({ space: labs[0]?.id, res: 0, start: null })), sp = db().get('spaces', b.space), u = target();
  if (!sp) return back('u-reservar') + empty('No hay laboratorios disponibles.');
  const lvl = Q.certLevel(db(), u.id, sp.id), okCert = !sp.requires_cert || lvl >= (sp.min_level || 1), machines = db().where('resources', r => r.space_id === sp.id && r.active);
  const est = (+val('lab_h', 1)) * 60 + (+val('lab_m', 0)), min = R.roundUpHours(est || 60), h = R.hoursFor(cfg('hours'), dayOf(b));
  const want = +val('lab_res', 0), pickFree = st => (want ? [db().get('resources', want)] : machines).find(m => m && m.space_id === sp.id && freeAt(sp, m, st, min));
  const starts = []; if (h) for (let m = h[0]; m < h[1]; m += 30) starts.push(m);
  return `${back(S.assist ? 'a-asist' : 'u-reservar')}${assistBar()}<h1>${t('Laboratorios')}</h1>
    <div class="hs">${labs.map(l => `<button class="chip ${l.id === b.space ? 'on' : ''}" data-a="bk-set" data-v="space=${l.id}">${esc(l.name)}</button>`).join('')}</div>
    ${okCert ? notice(`${icon('award')} ${t('Tienes la certificación de este laboratorio.')}`, 'ok') : `<div class="card warn stack"><p>${icon('lock')} ${t('Para reservar aquí necesitas la certificación de este laboratorio.')}</p>${btn('Ver certificaciones', 'go', { v: 'u-cert', cls: 's' })}</div>`}
    ${balanceCard(sp)}
    ${okCert ? `<div class="card stack"><h3>${t('Tu trabajo')}</h3>
      ${sp.accept ? `<label class="f">${t('Archivo a imprimir o cortar')} (${esc(sp.accept.replace(/,/g, ' '))})${fileInput('lab-file', sp.accept)}</label>` : ''}
      <div class="form">${select('lab_h', '¿Cuánto demora? Horas', Array.from({ length: (sp.max_hours || cfg('max_hours')) + 1 }, (_, i) => [i, i + ' h']), { value: 1, live: true, raw: true })}${select('lab_m', 'Minutos', [0, 15, 30, 45].map(m => [m, m + ' min']), { value: 0, live: true, raw: true })}</div>
      <p class="sm mu">${t('Indica el tiempo que entrega tu programa de laminado o corte. Se reserva por horas completas: {0} → {1}.', R.dur(est || 0), `<b>${R.dur(min)}</b>`)} ${t('Al terminar se descuenta el tiempo real.')}</p></div>
    <div class="card stack"><h3>${t('Máquina y horario')}</h3>
      ${select('lab_res', 'Máquina', [[0, t('La primera disponible')], ...machines.map(m => [m.id, m.name + (m.model ? ' · ' + m.model : '')])], { value: 0, live: true, raw: true })}
      ${dayChips('bk-day', b.day, openDays(10))}
      <div class="chips">${starts.map(m => `<button class="chip ${b.start === m ? 'on' : ''}" data-a="bk-start" data-v="${m}" ${pickFree(R.atMin(dayOf(b), m)) ? '' : 'disabled'}>${R.hm(m)}</button>`).join('') || `<span class="mu">${t('El Hub no abre este día.')}</span>`}</div>
      ${b.start != null ? `<p class="sm"><b>${fDay(dayOf(b))} · ${R.hm(b.start)} – ${fTime(new Date(+R.atMin(dayOf(b), b.start) + min * 60000))}</b>${sp.gap_min ? ` · ${t('más {0} min de preparación entre trabajos', sp.gap_min)}` : ''}</p>` : ''}</div>
    ${btn(`${t('Reservar')} ${R.dur(min)}`, 'bk-lab', { cls: 'block', raw: true, off: b.start == null || !est || (sp.accept && !b.file) })}` : ''}`;
} };
actions['file:lab-file'] = f => { S.bk.file = f; go(S.k); };
const clearPick = () => { if (S.picked) delete S.picked['lab-file']; };
actions['bk-start'] = v => { S.bk.start = +v; go(S.k); };
actions['bk-lab'] = async () => {
  const b = S.bk, sp = db().get('spaces', b.space), est = (+val('lab_h', 1)) * 60 + (+val('lab_m', 0)), min = R.roundUpHours(est), st = R.atMin(dayOf(b), b.start), want = +val('lab_res', 0);
  const m = (want ? [db().get('resources', want)] : db().where('resources', r => r.space_id === sp.id && r.active)).find(x => x && x.space_id === sp.id && freeAt(sp, x, st, min));
  if (!m) return toast(t('Ese horario ya no está disponible'));
  let file; if (sp.accept && b.file) { toast(t('Subiendo archivo…')); file = { name: b.file.name, size: b.file.size, storage: await App.data.putFile(b.file).catch(() => null) }; }
  confirmBooking({ space_id: sp.id, resource_id: m.id, start: st, est_min: est, file });
};

screens['u-cert'] = { tab: 'u-reservar', render() {
  const u = me(), now = Date.now();
  return `${back('u-reservar')}<h1>${t('Certificaciones')}</h1><p class="mu">${t('Cada laboratorio pide su certificación. Se imparten en el Hub, una vez por semana.')}</p>
    ${db().where('certifications', c => c.active).map(c => { const sp = db().get('spaces', c.space_id), mine = db().find('user_certs', x => x.user_id === u.id && x.certification_id === c.id && (!x.expires_at || T(x.expires_at) > now));
      const ses = db().where('cert_sessions', s => s.certification_id === c.id && T(s.start_at) > now && s.status === 'abierta').sort((a, b) => T(a.start_at) - T(b.start_at)).slice(0, 3);
      return `<div class="card stack"><div class="row between w"><div><h3>${esc(c.name)}</h3><span class="sm mu">${esc(sp?.name)} · ${t(WEEKDAYS[c.weekday])} ${R.hm(c.time_min)} · ${R.dur(c.duration_min)}${c.cost ? ` · $${fmtN(c.cost)} (${t('se paga en recepción')})` : ` · ${t('Sin costo')}`}</span></div>
        ${mine ? pill(mine.expires_at ? t('Vigente hasta {0}', fDate(mine.expires_at)) : t('Certificado'), 'ok') : pill(t('Sin certificación'))}</div>
        ${mine?.diploma && c.diploma_download ? btn('Descargar diploma', 'diploma', { v: mine.id, cls: 's sec', icon: 'down' }) : ''}
        ${mine ? '' : `<div class="list">${ses.map(s => { const en = db().find('cert_enrollments', e => e.session_id === s.id && e.user_id === u.id), left = s.seats - db().where('cert_enrollments', e => e.session_id === s.id).length;
          const other = !en && db().find('cert_enrollments', e => e.user_id === u.id && e.status === 'inscrito' && ses.concat(db().where('cert_sessions', x => x.certification_id === c.id)).some(x => x.id === e.session_id));
          return `<div class="li${left <= 0 && !en ? ' off' : ''}"><span class="sp"><b>${fDT(s.start_at)}</b><span>${left <= 0 ? t('Sin cupos') : t('{0} cupos disponibles', left)}</span></span>${en ? pill(t('Inscrito'), 'ok') + btn('Cancelar inscripción', 'cert-enroll', { v: s.id + ':0', cls: 's plain' }) : left <= 0 ? pill(t('Llena'), 'bad') : btn('Inscribirme', 'cert-enroll', { v: s.id + ':1', cls: 's', off: !!other })}</div>`; }).join('') || `<div class="li mu">${t('No hay sesiones abiertas por ahora.')}</div>`}</div>`}</div>`; }).join('')}`;
} };
actions['cert-enroll'] = v => { const [id, on] = v.split(':'); S.modal = null; run('cert.enroll', { session_id: +id, cancel: on === '0' }, on === '1' ? 'Inscripción lista' : 'Inscripción cancelada'); };
actions.diploma = id => { const c = db().get('user_certs', +id); if (c?.diploma) download('diploma-' + c.id + (c.diploma.startsWith('data:application/pdf') ? '.pdf' : '.jpg'), c.diploma); };

screens['u-eventos'] = { tab: 'u-reservar', render() {
  const list = db().where('events', e => e.published && e.kind === 'evento' && T(e.end_at || e.start_at) > Date.now()).sort((a, b) => T(a.start_at) - T(b.start_at));
  return `${back('u-reservar')}<h1>${t('Eventos')}</h1>${list.length ? `<div class="list">${list.map(e => { const left = seatsLeft(e), mine = db().find('event_attendance', a => a.event_id === e.id && a.user_id === App.uid);
    return `<button class="li" data-a="event-open" data-v="${e.id}"><span class="sp"><b>${esc(e.title)}</b><span>${fRange(e.start_at, e.end_at || e.start_at)}</span></span>${mine ? pill(t('Inscrito'), 'ok') : left != null ? pill(t('{0} cupos disponibles', Math.max(0, left))) : ''}${icon('chev')}</button>`; }).join('')}</div>` : empty('No hay eventos programados.')}`;
} };

// ============================================================ Mis reservas
const resCard = (r, acts = '') => { const gs = db().where('reservation_guests', g => g.reservation_id === r.id), f = db().find('files', x => x.reservation_id === r.id), host = r.user_id !== App.uid ? db().get('users', r.user_id) : null;
  return `<div class="card stack"><div class="row between"><h3>${resName(r)}</h3>${stPill(r.status)}</div>
    <p class="sm mu">${fRange(r.start_at, r.end_at)}${r.title ? ' · ' + esc(r.title) : ''}${host ? ' · ' + t('Anfitrión') + ': ' + esc(host.name) : ''}${gs.length ? ` · ${gs.length + 1} ${t('personas')}` : ''}</p>
    ${f ? `<p class="sm">${icon('file')} ${esc(f.name)} · ${pill(t({ pendiente: 'En espera de revisión', aprobado: 'Aprobado', rechazado: 'Rechazado', observado: 'Con observaciones', eliminado: 'Archivo borrado' }[f.status]), { pendiente: 'warn', aprobado: 'ok', rechazado: 'bad', observado: 'warn' }[f.status] || '')}</p>` : ''}
    ${r.real_min != null && r.charged_min ? `<p class="sm mu">${t('Tiempo real descontado')}: ${R.dur(r.real_min)}</p>` : ''}${acts ? `<div class="row w">${acts}</div>` : ''}</div>`; };
/** Sesiones de certificación a las que estoy inscrito y que aún no terminan. */
const myCerts = now => db().where('cert_enrollments', e => e.user_id === App.uid && e.status === 'inscrito').map(e => { const s = db().get('cert_sessions', e.session_id), c = s && db().get('certifications', s.certification_id); return s && c && T(s.end_at) > now ? { ...s, cert: c, enrollment: e } : null; }).filter(Boolean);
const certCard = s => `<div class="card stack"><div class="row between"><h3>${icon('award')} ${esc(s.cert.name)}</h3>${pill(t('Certificación'), 'info')}</div>
  <p class="sm mu">${fRange(s.start_at, s.end_at)} · ${esc(db().get('spaces', s.cert.space_id)?.name || '')}${s.cert.cost ? ` · $${fmtN(s.cert.cost)} (${t('se paga en recepción')})` : ''}</p>
  <div class="row w">${btn('Cancelar inscripción', 'cert-cancel-ask', { v: s.id, cls: 's plain' })}</div></div>`;
actions['cert-cancel-ask'] = id => { const s = db().get('cert_sessions', +id), c = db().get('certifications', s.certification_id);
  modal({ html: `<h2 style="margin:0">${t('¿Cancelar tu inscripción?')}</h2><p>${esc(c.name)} · ${fDT(s.start_at)}</p><div class="row">${btn('Sí, cancelar', 'cert-enroll', { v: s.id + ':0', cls: 'danger sp' })}${btn('Volver', 'modal-close', { cls: 'plain' })}</div>` }); };
const myRes = fn => db().where('reservations', r => (r.user_id === App.uid || db().find('reservation_guests', g => g.reservation_id === r.id && g.user_id === App.uid)) && fn(r));
screens['u-activas'] = { tab: 'u-activas', render() {
  const now = Date.now(), list = [...myRes(r => ACTIVE.includes(r.status) && T(r.end_at) > now), ...myCerts(now)].sort((a, b) => T(a.start_at) - T(b.start_at));
  return `<div class="head"><h1>${t('Mis reservas')}</h1>${btn('Historial', 'go', { v: 'u-hist', cls: 's plain', icon: 'clock' })}</div>
    <p class="sm mu">${t('Puedes tener hasta {0} reservas activas. Cancela con al menos {1} minutos de aviso para recuperar tus horas; si no llegas en {2} minutos, la reserva se libera.', cfg('max_active'), cfg('cancel_notice_min'), cfg('tolerance_min'))}</p>
    ${list.map(r => r.cert ? certCard(r) : resCard(r, r.user_id !== App.uid ? '' : (T(r.start_at) <= now ? btn('Terminé', 'res-finish', { v: r.id, cls: 's', icon: 'check' }) : '') + btn('Cancelar reserva', 'res-cancel-ask', { v: r.id, cls: 's plain' }))).join('') || empty('No tienes reservas activas. Elige un espacio en Reservar.')}
    ${btn('Reservar un espacio', 'go', { v: 'u-reservar', cls: 'block sec', icon: 'plus' })}`;
} };
actions['res-cancel-ask'] = id => { const r = db().get('reservations', +id), late = T(r.start_at) - Date.now() < cfg('cancel_notice_min') * 60000 && r.charged_min > 0 && r.user_id === App.uid;
  modal({ html: `<h2 style="margin:0">${t('¿Cancelar esta reserva?')}</h2><p>${resName(r)} · ${fRange(r.start_at, r.end_at)}</p>${late ? notice(t('Faltan menos de {0} minutos: si cancelas ahora, las horas no se devuelven.', cfg('cancel_notice_min')), 'bad') : ''}
    <div class="row">${btn('Sí, cancelar', 'res-cancel', { v: id, cls: 'danger sp' })}${btn('Volver', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['res-cancel'] = id => { closeModalQuiet(); run('res.cancel', { id: +id }, 'Reserva cancelada'); };
actions['res-finish'] = async id => { const r = await run('res.finish', { id: +id }); if (r) toast(t('Listo. Se descontaron {0}', R.dur(r.real_min))); };

screens['u-hist'] = { tab: 'u-activas', render() {
  const now = Date.now(), list = myRes(r => !ACTIVE.includes(r.status) || T(r.end_at) <= now).sort((a, b) => T(b.start_at) - T(a.start_at)).slice(0, 40);
  return `${back('u-activas')}<h1>${t('Historial')}</h1>${list.map(r => resCard(r, r.user_id === App.uid && r.resource_id && ['completada', 'en_curso'].includes(r.status) ? (db().find('failure_reports', f => f.reservation_id === r.id) ? pill(t('Falla reportada'), 'warn') : btn('Reportar una falla', 'fail-ask', { v: r.id, cls: 's plain', icon: 'alert' })) : '')).join('') || empty('Aún no tienes reservas anteriores.')}`;
} };
actions['fail-ask'] = id => { fill({ fl_cat: '', fl_text: '' }); S.failFor = +id; failModal(); };
const failModal = () => modal({ html: `<h2 style="margin:0">${t('Reportar una falla')}</h2><p class="sm mu">${t('El reporte llega al encargado del laboratorio.')}</p>
  <div>${FAILURES.map(c => `<label class="ck"><input type="radio" name="fl" data-i="fl_cat" value="${esc(c)}" ${val('fl_cat') === c ? 'checked' : ''}><span>${t(c)}</span></label>`).join('')}</div>
  ${area('fl_text', 'Describe lo que pasó (máximo 1.000 caracteres)', { max: 1000 })}
  <div class="row">${btn('Enviar reporte', 'fail-send', { cls: 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` });
actions['fail-send'] = async () => { const r = await run('res.failure', { id: S.failFor, category: val('fl_cat'), description: val('fl_text') }); if (r) { closeModalQuiet(); toast(t('Reporte enviado. Gracias por avisar')); } };

screens['u-horas'] = { tab: 'u-perfil', render() {
  const u = me();
  return `${back('u-perfil')}<h1>${t('Mis horas')}</h1><p class="mu">${t('El saldo es mensual, por laboratorio. Se reinicia el día 1 y no se acumula.')}</p>
    ${db().where('spaces', s => s.active && s.monthly_hours > 0).map(sp => { const b = Q.balance(db(), u.id, sp.id), lvl = Q.certLevel(db(), u.id, sp.id);
      const adj = db().where('hour_adjustments', a => a.user_id === u.id && a.space_id === sp.id && !a.forgiven && (a.period === R.period(new Date()) || a.period == null));
      return `<div class="card stack"><div class="row between"><h3>${esc(sp.name)}</h3>${sp.requires_cert ? pill(t(lvl ? 'Certificado' : 'Sin certificación'), lvl ? 'ok' : '') : ''}</div>
        ${meter(t('Disponible'), Math.max(0, b.left), Math.max(1, b.quota), `${R.dur(Math.max(0, b.left))} ${t('de')} ${fmtN(b.quota / 60)} h`, true)}<p class="sm mu">${t('Usado este mes')}: ${R.dur(b.used)}</p>
        ${adj.map(a => `<p class="sm">${pill((a.minutes > 0 ? '+' : '') + R.dur(a.minutes), a.minutes < 0 ? 'bad' : 'ok')} ${esc(a.reason || t(a.kind === 'premio' ? 'Horas adicionales' : 'Penalización'))}${a.period == null ? ' · ' + t('todos los meses') : ''}</p>`).join('')}</div>`; }).join('')}`;
} };

// ============================================================ Perfil y configuración
screens['u-perfil'] = { tab: 'u-perfil', render() {
  const u = me(), ban = Q.activeBan(db(), u.id), certs = db().where('user_certs', c => c.user_id === u.id), obs = db().where('observations', o => o.user_id === u.id).sort((a, b) => T(b.created_at) - T(a.created_at));
  const kids = db().where('users', x => x.guardian_id === u.id), g = u.guardian_id && db().get('users', u.guardian_id), labs = db().where('spaces', s => s.active && s.monthly_hours > 0);
  const pens = db().where('hour_adjustments', a => a.user_id === u.id && a.minutes < 0 && !a.forgiven && a.period === R.period(new Date()));
  const row = (a, b) => `<div class="li"><span class="mu" style="flex:0 0 38%">${t(a)}</span><span class="sp">${b || '—'}</span></div>`;
  return `<div class="row">${avatar(u)}<div class="sp"><h1 style="font-size:1.4rem">${esc(u.name)}</h1><p class="mu">${u.id} · ${esc(R.fmtDoc(u.doc_number, u.doc_type))}</p></div></div>
    <label class="f">${t('Cambiar foto de perfil')}${fileInput('my-photo', 'image/*')}</label>
    ${ban ? notice(`${icon('lock')} <b>${t('Tu acceso al Hub está restringido')}</b> ${ban.until_at ? t('hasta el {0}.', fDT(ban.until_at)) : t('de forma permanente.')} ${ban.reason ? esc(ban.reason) : ''}`, 'bad') : ''}
    ${pens.length ? notice(`${icon('alert')} ${t('Tienes penalizaciones de horas este mes. Se reinician el día 1.')} ${pens.map(a => `<br>${esc(db().get('spaces', a.space_id)?.name)}: ${R.dur(a.minutes)}${a.reason ? ' · ' + esc(a.reason) : ''}`).join('')}`, 'warn') : ''}
    <h2>${t('Mis datos')}</h2><div class="list">${row('Correo', esc(u.email))}${row('Celular', esc(u.phone))}${row('Comuna', esc(u.comuna))}${row('Actividad en Providencia', esc(t(u.activity || '')))}${row('Ocupación', esc(t(u.occupation || '')))}${row('Género', esc(t(u.gender || '')))}
      ${row('Fecha de nacimiento', u.birth_date ? `${fDate(u.birth_date + 'T12:00:00')} · ${R.age(u.birth_date)} ${t('años')}` : '')}${row('Movilidad reducida', t(u.reduced_mobility ? 'Sí' : 'No'))}${g ? row('Adulto responsable', esc(g.name)) : ''}</div>
    ${btn('Editar mis datos y contacto', 'profile-edit', { cls: 'block sec', icon: 'edit' })}
    <h2>${t('Certificaciones')}</h2><div class="chips">${certs.map(c => pill(db().get('certifications', c.certification_id)?.name || '', 'ok')).join('') || `<span class="mu sm">${t('Aún no tienes certificaciones.')}</span>`}</div>
    <h2>${t('Uso de mis horas este mes')}</h2><div class="card stack">${labs.map(sp => { const b = Q.balance(db(), u.id, sp.id); return meter(sp.name, b.used, Math.max(1, b.quota), `${Math.round(b.used / Math.max(1, b.quota) * 100)} %`); }).join('')}</div>
    <h2>${t('Observaciones de mis trabajos')}</h2>${obs.length ? `<div class="list">${obs.map(o => `<div class="li"><span class="sp"><b>${esc(db().get('files', o.file_id)?.name || db().get('spaces', o.space_id)?.name)} ${pill(t(o.kind === 'rechazo' ? 'Rechazado' : 'Observación'), o.kind === 'rechazo' ? 'bad' : 'warn')}</b><span>${esc(o.text)}</span><span>${fDate(o.created_at)}</span></span><button class="icb" data-a="obs-del" data-v="${o.id}" aria-label="${t('Borrar observación')}">${icon('trash')}</button></div>`).join('')}</div>` : empty('No tienes observaciones.')}
    ${kids.length ? `<h2>${t('Menores a mi cargo')}</h2><div class="list">${kids.map(k => `<div class="li"><span class="sp"><b>${esc(k.name)}</b><span>${k.id}</span></span>${pill(t(k.status === 'activo' ? 'Autorizado' : 'Pendiente'), k.status === 'activo' ? 'ok' : 'warn')}</div>`).join('')}</div>` : ''}
    <div class="list" style="margin-top:8px">${[['u-hist', 'clock', 'Historial de reservas'], ['u-horas', 'chart', 'Mis horas'], ['u-config', 'gear', 'Configuración']].map(([k, i, l]) => `<button class="li" data-a="go" data-v="${k}">${icon(i)}<span class="sp"><b>${t(l)}</b></span>${icon('chev')}</button>`).join('')}</div>
    ${btn('Cerrar sesión', 'logout', { cls: 'block plain', icon: 'out' })}`;
} };
actions['file:my-photo'] = async f => run('me.update', { photo: await readImage(f, 320) }, 'Foto actualizada');
actions['obs-del'] = id => run('me.deleteObs', { id: +id }, 'Observación borrada');
actions['profile-edit'] = () => { const u = me(); fill({ p_name: u.name, p_email: u.email || '', p_phone: u.phone || '', p_comuna: u.comuna || '', p_activity: u.activity || '', p_occ: u.occupation || '', p_gender: u.gender || '', p_mob: u.reduced_mobility });
  modal({ html: `<h2 style="margin:0">${t('Editar mis datos')}</h2><div class="form">${field('p_name', 'Nombre completo', { cls: 'full' })}${field('p_email', 'Correo', { type: 'email' })}${field('p_phone', 'Celular', { type: 'tel' })}${field('p_comuna', 'Comuna')}
    ${select('p_activity', '¿Qué actividad realizas en Providencia?', ACTIVITIES)}${select('p_occ', '¿A qué te dedicas?', OCCUPATIONS, { cls: 'full' })}${select('p_gender', 'Género', GENDERS)}</div>${check('p_mob', 'Tengo movilidad reducida')}
    <div class="row">${btn('Guardar cambios', 'profile-save', { cls: 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['profile-save'] = async () => { const r = await run('me.update', { name: val('p_name'), email: val('p_email'), phone: val('p_phone'), comuna: val('p_comuna'), activity: val('p_activity'), occupation: val('p_occ'), gender: val('p_gender'), reduced_mobility: val('p_mob') }); if (r) { closeModalQuiet(); toast(t('Datos guardados')); } };

screens['u-config'] = { tab: 'u-perfil', render: () => `${back('u-perfil')}<h1>${t('Configuración')}</h1>
  <div class="card stack"><h3>${t('Tema')}</h3>${seg('theme', themePref(), [['auto', t('Según el dispositivo')], ['light', t('Claro')], ['dark', t('Oscuro')]])}
    <h3>${t('Idioma')}</h3>${seg('lang', getLang(), Object.entries(LANGS))}
    <h3>${t('Accesibilidad')}</h3><label class="ck"><input type="checkbox" data-a="a11y" data-v="big" ${a11y('big') ? 'checked' : ''}><span>${t('Texto más grande')}</span></label><label class="ck"><input type="checkbox" data-a="a11y" data-v="contrast" ${a11y('contrast') ? 'checked' : ''}><span>${t('Mayor contraste')}</span></label></div>
  <div class="card stack"><h3>${t('Contraseña')}</h3>${field('np', 'Nueva contraseña (mínimo 8 caracteres)', { type: 'password', attrs: 'autocomplete="new-password"' })}${field('np2', 'Confirmar contraseña', { type: 'password', attrs: 'autocomplete="new-password" data-enter="pass-save"' })}${btn('Guardar contraseña', 'pass-save', { cls: 's sec' })}</div>
  <div class="list">${[['u-perfil', 'user', 'Perfil y actualizar datos'], ['u-notif', 'bell', 'Notificaciones'], ['u-priv', 'shield', 'Privacidad y mis datos']].map(([k, i, l]) => `<button class="li" data-a="go" data-v="${k}">${icon(i)}<span class="sp"><b>${t(l)}</b></span>${icon('chev')}</button>`).join('')}</div>
  <div class="card"><h3>${t('Acerca de')}</h3><p class="sm mu">${esc(cfg('system_name'))} · ${t('versión')} 1.0. ${t('Desarrollado por el equipo keypoint: Constanza Martinez, Maite Martinez, Cesar Aravena, Diego Donoso y Roderick Grez.')}</p>
    <p class="sm mu">${t('Para instalar la app, abre el menú del navegador y elige «Instalar» o «Agregar a la pantalla de inicio».')}</p></div>
  ${btn('Cerrar sesión', 'logout', { cls: 'block plain', icon: 'out' })}` };
actions.theme = v => { setThemePref(v); go(S.k); };
actions.a11y = (k, el) => { setA11y(k, el.checked); };
actions['pass-save'] = async () => { if (val('np') !== val('np2')) return toast(t('Las contraseñas no coinciden')); const r = await run('me.password', { password: val('np') }); if (r) { S.f.np = S.f.np2 = ''; toast(t('Contraseña guardada')); } };

screens['u-notif'] = { tab: 'u-perfil', render() {
  const list = db().where('notifications', n => n.user_id === App.uid && n.kind !== 'tutor').sort((a, b) => T(b.created_at) - T(a.created_at)).slice(0, 40);
  if (list.some(n => !n.read_at)) setTimeout(() => App.data.call('me.readAll').catch(() => {}), 1500);
  return `${back('u-inicio')}<h1>${t('Notificaciones')}</h1>${list.length ? `<div class="list">${list.map(n => `<div class="li">${icon({ penalizacion: 'alert', observacion: 'file', revision: 'file', falla: 'alert' }[n.kind] || 'bell')}<span class="sp"><b>${esc(n.title)}${n.read_at ? '' : ' ' + pill(t('Nuevo'), 'info')}</b><span>${esc(n.text || '')}</span><span>${fDT(n.created_at)}</span></span></div>`).join('')}</div>` : empty('No tienes notificaciones.')}`;
} };
screens['u-priv'] = { tab: 'u-perfil', render: () => `${back('u-config')}<h1>${t('Privacidad y mis datos')}</h1>
  <div class="card stack"><p>${t('Hub Providencia es responsable de tus datos personales. Los usamos para registrar tus entradas y salidas, gestionar tus reservas y elaborar estadísticas del Hub. No se comparten con terceros.')}</p>
  <p class="sm mu">${t('Para las estadísticas se usan solo comuna, actividad en Providencia, ocupación, género, edad y movilidad reducida, sin tu nombre ni tu RUT.')}</p>
  ${btn('Pedir una copia de mis datos', 'data-req', { v: 'copia', cls: 'plain block' })}${btn('Pedir la eliminación de mi cuenta', 'data-req', { v: 'eliminación', cls: 'plain block' })}</div>` };
actions['data-req'] = k => run('me.dataRequest', { kind: k }, 'Solicitud enviada a la administración');
