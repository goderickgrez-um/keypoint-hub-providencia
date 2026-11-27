// Política de privacidad, Términos y condiciones, contacto del Hub, pie de página y baja de los avisos por correo.
import { S, db, screens, actions, App, btn, esc, check, val, go, run, toast, modal, icon, me } from './kit.js';
import { t, getLang } from './i18n.js';
import { DEFAULTS } from '../core/catalog.js';
import * as FORM from '../core/form.js';
import * as LEGAL from '../core/legal.js';
import { regForm, fLabel, statVars } from './formui.js';

export const contact = () => ({ ...DEFAULTS.hub_contact, ...(db().cfg('hub_contact') || {}) });
const VER = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

/** Datos que alimentan los textos legales: el contacto y los campos que de verdad pide el formulario. */
function args() {
  const F = regForm(), lang = getLang(), profile = Object.entries(FORM.BASE).filter(([k]) => F.base[k].show).map(([, d]) => t(d.name).toLowerCase());
  return { contact: contact(), lang, profile: profile.join(', '), extra: FORM.liveFields(F).map(fLabel), stats: statVars() };
}
const para = p => (typeof p === 'string' ? `<p>${esc(p)}</p>` : `<ul>${p.ul.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
/** Documento legal en HTML. inModal: títulos un nivel más abajo. */
export function docHTML(kind, inModal = false) {
  const secs = kind === 'terminos' ? LEGAL.terms(args()) : LEGAL.privacy(args()), h1 = inModal ? 'h2' : 'h1', h2 = inModal ? 'h3' : 'h2';
  return `<article class="legal">${secs.map((s, i) => `${i ? `<${h2}>${esc(s.h)}</${h2}>` : `<${h1}${inModal ? ' id="dlg-t" style="margin:0"' : ''}>${esc(s.h)}</${h1}>`}${s.p.map(para).join('')}`).join('')}</article>`;
}
const backBtn = () => `<button class="btn plain s" data-a="legal-back">${icon('back')}${t('Volver')}</button>`;
screens['u-privacidad'] = { open: true, render: () => `${backBtn()}${docHTML('privacidad')}${btn('Ver los Términos y condiciones', 'legal', { v: 'u-terminos', cls: 'plain s' })}` };
screens['u-terminos'] = { open: true, render: () => `${backBtn()}${docHTML('terminos')}${btn('Ver la Política de privacidad', 'legal', { v: 'u-privacidad', cls: 'plain s' })}` };
screens['u-contacto'] = { open: true, render: () => `${backBtn()}<h1>${t('Contacto del Hub')}</h1>${contactCard()}` };
/** Tarjeta con los datos de contacto (ayuda, contacto). */
export function contactCard() {
  const c = contact();
  return `<div class="card stack"><h3>${esc(c.owner)}</h3><div class="list">
    ${c.phone ? `<a class="li" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}<span class="sp"><b>${t('Teléfono')}</b><span>${esc(c.phone)}</span></span></a>` : ''}
    ${c.email ? `<a class="li" href="mailto:${esc(c.email)}">${icon('mail')}<span class="sp"><b>${t('Correo')}</b><span>${esc(c.email)}</span></span></a>` : ''}
    ${c.address ? `<div class="li">${icon('map')}<span class="sp"><b>${t('Dirección')}</b><span>${esc(c.address)}</span></span></div>` : ''}
    ${c.hours ? `<div class="li">${icon('clock')}<span class="sp"><b>${t('Horario de atención')}</b><span>${esc(c.hours)}</span></span></div>` : ''}</div></div>`;
}
/** Abre un documento legal como pantalla (desde el pie) y recuerda de dónde se vino. */
actions.legal = v => { if (!['u-privacidad', 'u-terminos', 'u-contacto'].includes(S.k)) S.legalFrom = S.k; S.modal = null; window.scrollTo(0, 0); go(v); };
actions['legal-back'] = () => { const to = S.legalFrom || (App.uid ? (S.staff ? 'a-panel' : 'u-inicio') : 'u-login'); S.legalFrom = null; go(to); };
/** Documento en una ventana (desde el registro, para no perder lo escrito). */
actions['legal-open'] = v => modal({ html: `${docHTML(v, true)}<div class="row">${btn('Cerrar', 'modal-close', { cls: 'sp' })}</div>` });

/** Casilla de aceptación (sin marcar) con enlaces a los documentos. */
export const termsCheck = (key, assisted) => `<div class="stack" style="gap:6px">${check(key, assisted ? 'La persona leyó y aceptó los Términos y condiciones y la Política de privacidad.' : 'Acepto los Términos y condiciones y la Política de privacidad.')}
  <div class="row w" style="padding-left:30px">${btn('Leer los Términos y condiciones', 'legal-open', { v: 'terminos', cls: 's plain' })}${btn('Leer la Política de privacidad', 'legal-open', { v: 'privacidad', cls: 's plain' })}</div></div>`;

/** Pie de página: versión, créditos, enlaces y contacto. */
export function footer(staff = false) {
  const c = contact(), tr = x => (staff ? x : t(x));
  return `<footer class="foot"><nav aria-label="${tr('Información legal')}"><button class="lk" data-a="legal" data-v="u-privacidad">${tr('Privacidad')}</button><button class="lk" data-a="legal" data-v="u-terminos">${tr('Términos')}</button><button class="lk" data-a="legal" data-v="u-contacto">${tr('Contacto')}</button></nav>
    <p>${[c.phone && `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>`, c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`].filter(Boolean).join(' · ')}</p>
    <p>${esc(db().cfg('system_name') || 'Keypoint Hub Providencia')} · ${tr('versión')} ${esc(VER)} · ${tr('Diseñada por KeyPoint Systems con herramientas de IA')}</p></footer>`;
}

// ---- Baja de los avisos por correo (enlace firmado de cada correo: #baja=ID.firma)
screens['u-baja'] = { open: true, render() {
  if (S.bajaDone) return `<div class="login stack"><h1>${t('Listo')}</h1><p>${t('Ya no recibirás avisos por correo. Seguirás viéndolos en la app, y los códigos de acceso y los mensajes de tu cuenta llegarán igual.')}</p><p class="sm mu">${t('Puedes volver a activarlos en Perfil › Configuración.')}</p>${btn('Ir a la app', 'go', { v: App.uid ? 'u-inicio' : 'u-login', cls: 'block' })}</div>`;
  if (!S.baja) return `<div class="login stack"><h1>${t('Avisos por correo')}</h1><p>${t('El enlace no es válido o ya no está vigente.')}</p>${btn('Ir a la app', 'go', { v: 'u-login', cls: 'block' })}</div>`;
  return `<div class="login stack"><h1>${t('¿Dejar de recibir avisos por correo?')}</h1><p>${t('Dejarás de recibir por correo los avisos de reservas, eventos, horas y archivos. Seguirás viéndolos en la app.')}</p>
    <p class="sm mu">${t('Los códigos de acceso y los mensajes necesarios para tu cuenta se envían siempre.')}</p>${btn('Dejar de recibir avisos', 'baja-ok', { cls: 'block' })}${btn('Cancelar', 'go', { v: App.uid ? 'u-inicio' : 'u-login', cls: 'block plain' })}</div>`;
} };
actions['baja-ok'] = async () => { const r = await run('mail.unsubscribe', S.baja || {}); if (r) { S.bajaDone = true; S.baja = null; go('u-baja'); } };
/** Lee el enlace #baja=ID.firma y abre la confirmación. */
export function readBaja() {
  if (!location.hash.startsWith('#baja=')) return false;
  const [u, tk] = decodeURIComponent(location.hash.slice(6)).split('.');
  S.baja = u && tk ? { u, t: tk } : null; S.bajaDone = false;
  history.replaceState(null, '', location.pathname + location.search + '#u-baja');
  return true;
}
/** Avisos por correo (Configuración). */
export const noticesCard = () => { const u = me(); if (!u?.email) return '';
  return `<div class="card stack"><h3>${t('Avisos por correo')}</h3><label class="ck"><input type="checkbox" data-a="notices" ${u.email_notices !== false ? 'checked' : ''}><span>${t('Recibir por correo los avisos de reservas, eventos, horas y archivos')}</span></label>
    <p class="sm mu">${t('Los códigos de acceso y los mensajes necesarios para tu cuenta se envían siempre.')}</p></div>`; };
// Respuesta inmediata: el aviso sale al tocar; si el servidor no lo guarda, la casilla vuelve atrás y se explica por qué.
actions.notices = async (_, el) => { const on = el.checked; toast(t(on ? 'Recibirás los avisos por correo' : 'Ya no recibirás avisos por correo')); if (!(await run('me.update', { email_notices: on }))) el.checked = !on; };

/** Pide aceptar los términos vigentes a quien aceptó una versión anterior (o ninguna). */
export const needsTerms = u => !!u && u.terms_version !== LEGAL.LEGAL_VERSION;
export const termsUpdateCard = () => `<div class="card warn stack"><h3>${t('Términos y política de privacidad')}</h3><p class="sm">${t('Publicamos los Términos y condiciones y la Política de privacidad de la app (versión {0}). Léelos y acéptalos para seguir.', LEGAL.LEGAL_VERSION)}</p>${termsCheck('c_terms_up')}</div>`;
export const LEGAL_VERSION = LEGAL.LEGAL_VERSION;
