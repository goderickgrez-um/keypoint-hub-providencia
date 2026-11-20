// Punto de entrada: elige el modo de datos, dibuja la pantalla y reparte los eventos.
import { App, S, UI, db, me, myRoles, screens, actions, go, toast, closeModal, esc, icon, val } from './kit.js';
import { t, setLang, getLang } from './i18n.js';
import { applyTheme } from './theme.js';
import { local } from '../data/local.js';
import { remote } from '../data/remote.js';
import { logoSrc, pendingScreen } from './user.js';
import { NAV, flushQueue } from './staff.js';
import { bindPlan } from './plan.js';
import './admin.js';

const TABS = [['u-inicio', 'home', 'Inicio'], ['u-reservar', 'cal', 'Reservar'], ['u-activas', 'list', 'Mis reservas'], ['u-perfil', 'user', 'Perfil']];
const can = rs => !rs || myRoles().some(r => r === 'admin' || rs.includes(r));

function nav(k) {
  return NAV.map(([group, items]) => { const ok = items.filter(([key]) => can(screens[key]?.roles)); return ok.length ? `<h4>${group}</h4>${ok.map(([key, label, ic]) => `<button class="${k === key ? 'on' : ''}" data-a="go" data-v="${key}">${icon(ic)}${label}</button>`).join('')}` : ''; }).join('')
    + `<h4>Cambiar de app</h4><button data-a="to-user">${icon('user')}App de usuario</button><button data-a="logout">${icon('out')}Cerrar sesión</button>`;
}

const avatarMini = () => { const u = me(); return u?.photo ? `<img src="${esc(u.photo)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : `<b>${esc((u?.name || '?')[0])}</b>`; };

/** Actualiza la pantalla cambiando solo lo que cambió. Así el campo que se está escribiendo no se reemplaza
 *  y el teclado del teléfono no salta de números a letras en cada tecla. */
function morph(root, html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const same = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.getAttribute('data-i') === b.getAttribute('data-i') && a.type === b.type));
  const patch = (cur, next) => {
    const a = [...cur.childNodes], b = [...next.childNodes];
    b.forEach((n, i) => {
      const o = a[i];
      if (!o) return cur.appendChild(n);
      if (!same(o, n)) return cur.replaceChild(n, o);
      if (n.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
      for (const { name } of [...o.attributes]) if (!n.hasAttribute(name) && !(name === 'open' && o.tagName === 'DETAILS')) o.removeAttribute(name);
      for (const { name, value } of [...n.attributes]) if (o.getAttribute(name) !== value) o.setAttribute(name, value);
      if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA') {
        if (o.type === 'checkbox' || o.type === 'radio') o.checked = n.hasAttribute('checked');
        else if (o.type !== 'file' && o !== document.activeElement) o.value = n.tagName === 'TEXTAREA' ? n.value : (n.getAttribute('value') ?? '');
        if (o.tagName === 'TEXTAREA') return;
      }
      patch(o, n);
      if (o.tagName === 'SELECT') { const s = n.querySelector('option[selected]'); o.value = s ? s.value : o.options[0]?.value ?? ''; }
    });
    for (let i = a.length - 1; i >= b.length; i--) a[i].remove();
  };
  patch(root, tpl.content);
}
let skipPop = false, lastModal = null, opener = null;

function render() {
  let k = location.hash.slice(1) || (App.uid ? (S.staff ? 'a-panel' : 'u-inicio') : 'u-login');
  if (!screens[k]) k = 'u-login';
  if (!App.uid && !screens[k].open) k = 'u-login';
  if (App.uid && ['u-login', 'u-reg', 'u-verif'].includes(k)) k = S.staff ? 'a-panel' : 'u-inicio';
  const scr = screens[k], staffScreen = k.startsWith('a-'), u = me();
  if (staffScreen && !myRoles().length) k = 'u-inicio';
  S.k = k;
  const focus = document.activeElement?.dataset?.i, pos = document.activeElement?.selectionStart;
  let body;
  try { body = staffScreen && !can(scr.roles) ? `<h1>Sin acceso</h1><p class="mu">Tu credencial no incluye esta sección.</p>` : u && u.status === 'pendiente_adulto' && !staffScreen ? pendingScreen(u) : scr.render(); }
  catch (e) { console.error(e); body = `<div class="card bad">${t('No se pudo mostrar esta pantalla.')} <button class="btn s plain" data-a="go" data-v="${staffScreen ? 'a-panel' : 'u-inicio'}">${t('Volver al inicio')}</button></div>`; }
  const unread = u ? db().where('notifications', n => n.user_id === u.id && !n.read_at).length : 0, demo = App.mode === 'demo' ? '<span class="demo">DEMO</span>' : '';
  const brand = `<div class="brand"><img class="logo" src="${logoSrc()}" alt=""><div><b>${esc(db().cfg('system_name'))}</b><span>${staffScreen ? 'keypoint system' : esc(db().cfg('tagline'))}</span></div>${demo}</div>`;
  let html;
  if (!App.uid || scr.open) html = `<main class="wrap">${body}</main>`;
  else if (staffScreen) html = `<header class="top"><button class="icb only-m" data-a="menu" aria-label="Menú">${icon('menu')}</button>${brand}${can(['recepcion']) ? `<button class="icb" data-a="go" data-v="a-scan" aria-label="Escanear QR">${icon('qr')}</button>` : ''}<button class="icb" data-a="go" data-v="a-perfil" aria-label="Mi perfil">${avatarMini()}</button></header>
      <div class="staff"><nav class="side">${nav(k)}</nav><main class="wrap">${body}</main></div>${S.drawer ? `<div class="scrim" data-a="menu"><nav class="side">${nav(k)}</nav></div>` : ''}`;
  else html = `<header class="top">${brand}${myRoles().length ? `<button class="icb" data-a="to-staff" aria-label="${t('Panel del equipo')}">${icon('gear')}</button>` : ''}<button class="icb" data-a="go" data-v="u-notif" aria-label="${t('Notificaciones')}">${icon('bell')}${unread ? '<span class="dot"></span>' : ''}</button></header>
      <main class="wrap">${body}</main><nav class="tabs">${TABS.map(([key, ic, label]) => `<button class="${(scr.tab || k) === key ? 'on' : ''}" data-a="go" data-v="${key}">${icon(ic)}${t(label)}</button>`).join('')}</nav>`;
  const root = document.getElementById('app');
  morph(root, html + (S.modal ? `<div class="modal" data-a="modal-bg"><div role="dialog" aria-modal="true" tabindex="-1"${/id="dlg-t"/.test(S.modal.html) ? ' aria-labelledby="dlg-t"' : ''}><button class="icb mx" data-a="modal-close" aria-label="${t('Cerrar')}">${icon('x')}</button>${S.modal.html}</div></div>` : '') + (S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''));
  if (!S.modal && history.state?.hubModal) { skipPop = true; history.back(); } // la ventana se cerró con un botón: quita su paso del historial
  // Accesibilidad: al abrir una ventana el foco entra en ella; al cerrarla vuelve a donde estaba
  if (S.modal && S.modal !== lastModal) { lastModal = S.modal; opener ||= document.activeElement; const d = root.querySelector('[role=dialog]'); (d.querySelector('input,select,textarea,button:not(.mx)') || d).focus(); return bindPlan(); }
  if (!S.modal && lastModal) { lastModal = null; if (opener?.isConnected) { opener.focus(); opener = null; return bindPlan(); } opener = null; }
  if (focus) { const el = root.querySelector(`[data-i="${focus}"]`); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch { /* no aplica */ } } }
  else if (!S.modal) root.querySelector('[data-af]')?.focus();
  bindPlan();
  if (k === 'u-login' && db().cfg('google_client_id')) google();
}
UI.render = render;

function google() {
  const id = db().cfg('google_client_id'), box = document.getElementById('gsi'); if (!box) return;
  const draw = () => { window.google.accounts.id.initialize({ client_id: id, callback: async r => { try { const x = await App.data.call('auth.google', { credential: r.credential }); if (x?.session) { S.staff = myRoles().length > 0; go(S.staff ? 'a-panel' : 'u-inicio'); } } catch (e) { toast(e.user ? t(e.message) : t('No se pudo entrar con Google')); } } }); window.google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', locale: getLang() }); };
  if (window.google?.accounts) return draw();
  if (!document.getElementById('gsi-js')) { const s = document.createElement('script'); s.id = 'gsi-js'; s.src = 'https://accounts.google.com/gsi/client'; s.onload = draw; document.head.append(s); }
}

actions.go = v => { S.drawer = false; S.modal = null; window.scrollTo(0, 0); go(v); };
actions.menu = () => { S.drawer = !S.drawer; render(); };
actions['to-staff'] = () => { S.staff = true; go('a-panel'); };
actions['to-user'] = () => { S.staff = false; S.drawer = false; go('u-inicio'); };
actions['modal-close'] = () => closeModal();
actions.reload = () => location.reload();
actions['modal-bg'] = (v, el, e) => { if (e.target === el) closeModal(); };

const root = document.getElementById('app');
root.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
  const ctl = e.target.closest('input, select, textarea, label'); if (ctl && ctl !== el && el.contains(ctl)) return;
  if (el.classList.contains('scrim') && e.target !== el) return;
  const fn = actions[el.dataset.a]; if (fn) { if (el.tagName !== 'INPUT') e.preventDefault(); fn(el.dataset.v, el, e); }
});
root.addEventListener('input', e => { const el = e.target, k = el.dataset.i; if (!k) return;
  S.f[k] = el.type === 'checkbox' ? el.checked : el.type === 'radio' ? (el.checked ? el.value : S.f[k]) : el.value;
  if (el.dataset.live || el.tagName === 'SELECT') { if (k.startsWith('pl_')) actions['plan-live'](); render(); } });
root.addEventListener('change', e => { const el = e.target, k = el.dataset.i;
  if (k && el.type === 'radio') S.f[k] = el.value;
  if (el.dataset.color) actions['th-color']?.(el.dataset.color, el.value);
  if (el.dataset.file && el.files?.[0]) { const f = el.files[0]; el.value = ''; (S.picked ||= {})[el.dataset.file] = { name: f.name, size: f.size }; actions['file:' + el.dataset.file]?.(f); } });
root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset?.enter) { e.preventDefault(); S.f[e.target.dataset.i] = e.target.value; actions[e.target.dataset.enter]?.(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.modal) closeModal();
  if (e.key === 'Tab' && S.modal) { const d = root.querySelector('[role=dialog]'), f = [...d.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]')].filter(x => x.offsetParent !== null); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } } });
// Puntos del carrusel de banners
root.addEventListener('scroll', e => { const el = e.target; if (el.id !== 'banners') return; const w = el.firstElementChild?.offsetWidth + 10 || 1, i = Math.round(el.scrollLeft / w);
  el.parentElement.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === Math.min(i, el.children.length - 1))); }, true);
window.addEventListener('hashchange', () => { S.drawer = false; render(); });
window.addEventListener('popstate', () => { if (skipPop) { skipPop = false; return; } S.modal = null; render(); });
window.addEventListener('online', () => { App.data.tick(); flushQueue(); });

(async () => {
  setLang(getLang()); applyTheme();
  if (!location.hash && document.body.dataset.start) location.hash = document.body.dataset.start; // recepcion.html abre en Recepción
  const api = typeof window.HUB_CONFIG === 'string' ? window.HUB_CONFIG : window.HUB_CONFIG?.api;
  if (typeof window.HUB_CONFIG === 'string') window.HUB_CONFIG = { api };
  App.mode = api != null && location.protocol !== 'file:' ? 'remote' : 'demo';
  App.data = App.mode === 'remote' ? remote : local;
  try { await App.data.init(render); }
  catch (e) { console.error(e);
    if (App.mode === 'remote') { document.getElementById('app').innerHTML = `<main class="wrap"><div class="login stack c" style="align-items:center"><img class="logo" src="${logoSrc()}" alt=""><h1>${t('El sistema no está disponible')}</h1><p class="mu">${t('No pudimos conectar con el servidor del Hub. Revisa tu conexión a internet o intenta de nuevo en unos minutos.')}</p><button class="btn" data-a="reload">${t('Reintentar')}</button><p class="sm mu">${esc(api)}</p></div></main>`; return; } }
  if (me()) { setLang(me().lang || getLang()); S.staff = location.hash.startsWith('#a-') && myRoles().length > 0; }
  applyTheme(); render();
  setInterval(async () => { if (S.modal || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || ed()) return; await App.data.tick(); render(); }, 30000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
const ed = () => S.plan?.drag;
