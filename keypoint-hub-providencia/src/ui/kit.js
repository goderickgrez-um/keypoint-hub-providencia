// Estado compartido de la interfaz y componentes reutilizables (devuelven HTML como texto).
import { Store } from '../core/store.js';
import * as R from '../core/rules.js';
import * as Q from '../core/queries.js';
import { t, locale } from './i18n.js';

/** App: datos y sesión. S: estado de pantalla (formularios, selección, ventana modal). */
export const App = { db: new Store(), mode: 'demo', uid: null, occ: null, data: null };
export const S = { f: {}, modal: null, toast: '', drawer: false, staff: false };
export const db = () => App.db;
export const me = () => (App.uid ? App.db.get('users', App.uid) : null);
export const myRoles = () => (App.uid ? Q.rolesOf(App.db, App.uid) : []);
export const can = (...r) => { const rs = myRoles(); return rs.includes('admin') || r.some(x => rs.includes(x)); };
export const manages = id => { const rs = myRoles(); return rs.includes('admin') || (rs.includes('encargado') && App.db.get('spaces', id)?.manager_id === App.uid); };
export const mySpaces = () => App.db.where('spaces', s => manages(s.id));

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = n => (Math.round(n * 10) / 10).toLocaleString(locale());
export const fDay = d => new Date(d).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
export const fDate = d => new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
export const fTime = d => R.hmOf(d);
export const fDT = d => `${fDay(d)}, ${fTime(d)}`;
export const fRange = (a, b) => `${fDay(a)} · ${fTime(a)} – ${fTime(b)}`;
export const val = (k, def = '') => (S.f[k] ?? def);
export const fill = o => Object.assign(S.f, o);

const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0"/>', qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v.01M17 20h3v-3M14 20v.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2.4.6 4 2.2 4 5.2"/>',
  file: '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18v.01"/>', out: '<path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/>', game: '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4M15.5 11v.01M18 13v.01"/>',
  door: '<path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M13 12v.01"/>', award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', offline: '<path d="M3 3l18 18M5 12.5a10 10 0 0 1 4-2.6M19 12.5a10 10 0 0 0-5.5-3M8.5 16a5 5 0 0 1 7 0M12 19.5v.01"/>',
  paint: '<circle cx="12" cy="12" r="9"/><path d="M7.5 11v.01M10 7.5v.01M15 7.5v.01M17 11v.01"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
};
export const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

// ---- Controles (ligados a S.f por data-i)
const a = o => (o.attrs ? ' ' + o.attrs : '') + (o.live ? ' data-live="1"' : '');
export const field = (k, label, o = {}) => `<label class="f ${o.cls || ''}">${t(label)}<input id="f-${k}" data-i="${k}" type="${o.type || 'text'}" value="${esc(val(k, o.value))}"${o.ph ? ` placeholder="${esc(t(o.ph))}"` : ''}${a(o)}></label>`;
export const area = (k, label, o = {}) => `<label class="f full">${t(label)}<textarea id="f-${k}" data-i="${k}"${o.max ? ` maxlength="${o.max}"` : ''}${a(o)}>${esc(val(k, o.value))}</textarea></label>`;
export const select = (k, label, opts, o = {}) => `<label class="f ${o.cls || ''}">${t(label)}<select id="f-${k}" data-i="${k}"${a({ ...o, live: o.live })}>${o.blank ? `<option value="">${t(o.blank)}</option>` : ''}${opts.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}"${String(val(k, o.value)) === String(v) ? ' selected' : ''}>${esc(o.raw ? l : t(l))}</option>`; }).join('')}</select></label>`;
export const check = (k, label, o = {}) => `<label class="ck ${o.cls || ''}"><input id="f-${k}" type="checkbox" data-i="${k}"${val(k, o.value) ? ' checked' : ''}${a(o)}><span>${o.raw ? label : t(label)}</span></label>`;
export const btn = (label, act, o = {}) => `<button class="btn ${o.cls || ''}" data-a="${act}"${o.v !== undefined ? ` data-v="${esc(o.v)}"` : ''}${o.off ? ' disabled' : ''}>${o.icon ? icon(o.icon) : ''}${o.raw ? label : t(label)}</button>`;
export const seg = (act, cur, opts) => `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" aria-selected="${String(cur) === String(v)}" class="${String(cur) === String(v) ? 'on' : ''}" data-a="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
export const pill = (text, tone = '') => `<span class="pill ${tone}">${esc(text)}</span>`;
export const empty = text => `<div class="card flat c mu">${t(text)}</div>`;
export const back = (to, label = 'Volver') => `<button class="back" data-a="go" data-v="${to}">${icon('back')}${t(label)}</button>`;
export const meter = (label, n, cap, right, plain) => { const p = cap ? Math.min(100, n / cap * 100) : 0; return `<div class="meter ${plain ? '' : p >= 100 ? 'full' : p >= 85 ? 'hot' : ''}"><div class="row between"><span>${esc(label)}</span><span class="mu sm">${right ?? `${fmtN(n)} / ${fmtN(cap)}`}</span></div><div class="trk" role="img" aria-label="${esc(label)}: ${Math.round(p)}%"><i style="width:${p}%"></i></div></div>`; };
export const stat = (label, value, sub) => `<div class="card stat"><span>${t(label)}</span><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
export const table = (head, rows, none = 'Aún no hay registros.') => rows.length ? `<div class="tbl"><table><thead><tr>${head.map(h => `<th>${t(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : empty(none);
export const avatar = (u, cls = '') => u?.photo ? `<img class="av ${cls}" src="${esc(u.photo)}" alt="">` : `<span class="av ${cls}" aria-hidden="true">${esc((u?.name || '?').trim()[0] || '?')}</span>`;
/** Selector de archivo con botón propio: muestra el nombre del archivo elegido en vez de «Ningún archivo seleccionado». */
export const fileInput = (key, accept, label) => { const f = S.picked?.[key];
  return `<span class="fp"><input type="file" accept="${esc(accept)}" data-file="${key}" aria-label="${esc(label || t('Elegir archivo'))}"><span class="btn s ${f ? '' : 'sec'}">${icon(f ? 'check' : 'file')}${f ? t('Cambiar archivo') : t('Elegir archivo')}</span>${f ? `<span class="sm"><b>${esc(f.name)}</b> · ${f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB'} · ${t('listo para subir')}</span>` : `<span class="sm mu">${t('Ningún archivo elegido')}</span>`}</span>`; };
export const swatches = (act, cur, colors) => `<div class="sw">${colors.map(c => `<button data-a="${act}" data-v="${c}" class="${String(cur).toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" aria-label="${c}" title="${c}"></button>`).join('')}</div>`;

export const ST = { confirmada: ['Confirmada', 'ok'], en_revision: ['Archivo en revisión', 'warn'], en_curso: ['En curso', 'info'], completada: ['Completada', ''], cancelada: ['Cancelada', ''], no_asistio: ['No asistió', 'bad'], rechazada: ['Rechazada', 'bad'] };
export const stPill = s => pill(t(ST[s]?.[0] || s), ST[s]?.[1]);
export function qrSvg(text) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); } catch { return `<b>${esc(text)}</b>`; } }

// ---- Fechas disponibles
/** Próximos días en que el Hub abre (sin feriados ni cierres de día completo). */
export function openDays(n = 10, from = new Date()) {
  const out = [], hours = db().cfg('hours');
  for (let i = 0; out.length < n && i < 40; i++) {
    const d = R.atMin(R.addDays(from, i), 0), h = R.hoursFor(hours, d);
    if (h && !db().find('blocks', b => b.space_id == null && +new Date(b.start_at) <= +R.atMin(d, h[0]) && +new Date(b.end_at) >= +R.atMin(d, h[1]))) out.push(d);
  }
  return out;
}
export const dayChips = (act, cur, days) => `<div class="hs">${days.map(d => `<button class="chip day ${R.dayKey(d) === cur ? 'on' : ''}" data-a="${act}" data-v="${R.dayKey(d)}"><small>${d.toLocaleDateString(locale(), { weekday: 'short' })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString(locale(), { month: 'short' })}</small></button>`).join('')}</div>`;

// ---- Gráficos (una sola serie, un solo tono; el texto usa los colores de texto)
const details = (head, rows) => `<details><summary>${t('Ver datos en tabla')}</summary>${table(head, rows)}</details>`;
export function barsH(items, o = {}) {
  if (!items.length) return empty('Sin datos en este periodo.');
  const max = Math.max(1, ...items.map(i => i.value));
  return `<div class="bars">${items.map(i => `<span class="lbl" title="${esc(i.label)}">${esc(i.label)}</span><span><i class="bar" style="display:block;width:${i.value / max * 100}%" title="${esc(i.label)}: ${fmtN(i.value)}${o.unit || ''}"></i></span><span class="b r">${fmtN(i.value)}${o.unit || ''}</span>`).join('')}</div>`;
}
export function colChart(items, o = {}) {
  if (!items.length) return empty('Sin datos en este periodo.');
  const W = 640, H = 190, L = 34, B = 22, top = 10, max = Math.max(1, ...items.map(i => i.value)), step = max <= 5 ? 1 : Math.ceil(max / 4 / 5) * 5, ymax = Math.ceil(max / step) * step;
  const bw = (W - L) / items.length, w = Math.min(18, bw * .62), y = v => top + (H - B - top) * (1 - v / ymax), every = Math.ceil(items.length / 12);
  let g = '';
  for (let v = 0; v <= ymax; v += step) g += `<line class="axis" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  items.forEach((it, i) => { const x = L + bw * i + (bw - w) / 2, h = Math.max(it.value ? 2 : 0, y(0) - y(it.value)); g += `<rect class="bar" x="${x}" y="${y(0) - h}" width="${w}" height="${h}" rx="${Math.min(4, w / 2, h)}"><title>${esc(it.label)}: ${fmtN(it.value)}${o.unit || ''}</title></rect>`; if (i % every === 0) g += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${esc(it.label)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${g}</svg>${details([o.x || 'Día', o.y || 'Valor'], items.map(i => [esc(i.label), fmtN(i.value)]))}`;
}
export function heatGrid(m) {
  const max = Math.max(1, ...m.flat()), days = [t('Lun'), t('Mar'), t('Mié'), t('Jue'), t('Vie')];
  return `<div class="heat"><span></span>${Array.from({ length: 11 }, (_, i) => `<span>${i + 8}</span>`).join('')}${m.map((row, d) => `<span>${days[d]}</span>` + row.map((v, h) => `<i style="opacity:${(.07 + .93 * v / max).toFixed(2)}" title="${days[d]} ${h + 8}:00 · ${fmtN(v)} ${t('personas en promedio')}"></i>`).join('')).join('')}</div>
  <div class="row sm mu" style="margin-top:6px"><span>${t('Menos')}</span><span style="flex:0 0 90px;height:8px;border-radius:4px;background:linear-gradient(90deg,color-mix(in srgb,var(--ac) 8%,transparent),var(--ac))"></span><span>${t('Más')}</span><span class="sp r">${t('Máximo')}: ${fmtN(max)}</span></div>
  ${details(['Día', ...Array.from({ length: 11 }, (_, i) => `${i + 8}:00`)], m.map((row, d) => [days[d], ...row.map(fmtN)]))}`;
}

// ---- Archivos e imágenes
export const readText = f => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsText(f); });
/** Reduce una imagen y la entrega como data URL JPEG, para guardarla en la base de datos. */
export const readImage = (f, max = 1200) => new Promise((ok, ko) => {
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .86)); };
  img.onerror = () => ko(new Error('No se pudo leer la imagen')); img.src = url;
});
export function download(name, content, type = 'text/csv;charset=utf-8') {
  const url = content instanceof Blob ? URL.createObjectURL(content) : typeof content === 'string' && content.startsWith('data:') ? content : URL.createObjectURL(new Blob(['﻿' + content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
}
export const csv = (head, rows) => [head, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

// ---- Pantallas, acciones y navegación (se registran desde user.js, staff.js y plan.js)
export const screens = {}, actions = {};
export const UI = { render() {} };
export const go = r => { if (location.hash.slice(1) === r) UI.render(); else location.hash = r; };
let toastTimer;
export function toast(msg) { S.toast = msg; UI.render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = ''; document.querySelector('.toast')?.remove(); }, 3400); }
/** Abre una ventana sobre la pantalla. Queda en el historial para cerrarla con el botón Atrás del teléfono. */
export const modal = m => { if (!S.modal) try { history.pushState({ hubModal: 1 }, ''); } catch { /* sin historial */ } S.modal = m; UI.render(); };
export const closeModal = () => { S.modal = null; if (history.state?.hubModal) history.back(); else UI.render(); };
/** Ejecuta un servicio. Devuelve su resultado o null si falló (el motivo se muestra en pantalla). */
export async function run(name, args, okMsg) {
  try { const r = await App.data.call(name, args); okMsg ? toast(t(okMsg)) : UI.render(); return r; }
  catch (e) { if (!e.user) console.error(e); toast(e.user ? t(e.message) : e.offline ? t('Sin conexión con el servidor.') : t('Algo salió mal. Intenta de nuevo.')); return null; }
}
