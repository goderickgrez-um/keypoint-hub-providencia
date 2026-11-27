// Modo real: los datos viven en PostgreSQL y se accede por la API del servidor (server/server.js).
// El navegador recibe solo lo que la sesión puede ver y lo guarda en el mismo almacén que usa la interfaz.
import { App } from '../ui/kit.js';

const base = () => (typeof window.HUB_CONFIG === 'string' ? window.HUB_CONFIG : window.HUB_CONFIG?.api || '').replace(/\/$/, '');
let token = null, onChange = () => {}, tag = '', busy = false;
/** La sesión vive en sessionStorage (se cierra con la pestaña) o, si la persona pidió mantenerla, en localStorage. */
const store = (v, keep) => { try {
  if (v === undefined) return localStorage.getItem('hub-token') || sessionStorage.getItem('hub-token');
  localStorage.removeItem('hub-token'); sessionStorage.removeItem('hub-token');
  if (v) (keep ? localStorage : sessionStorage).setItem('hub-token', v);
} catch { return null; } };
/** true si la sesión de este dispositivo quedó guardada. */
export const remembered = () => { try { return !!localStorage.getItem('hub-token'); } catch { return false; } };
const headers = extra => ({ ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra });
/** Últimos tiempos medidos (total en el navegador y lo que tardó el servidor), para el diagnóstico de conexión. */
export const net = [];
/** Indicador de trabajo: si una acción de la persona tarda más de 150 ms, se ve una barra arriba («Guardando…»). */
let waiting = 0, waitTimer = null;
const working = on => { waiting += on ? 1 : -1; const el = document.documentElement;
  if (waiting > 0 && !waitTimer && !el.dataset.busy) waitTimer = setTimeout(() => { waitTimer = null; if (waiting > 0) el.dataset.busy = '1'; }, 150);
  if (waiting <= 0) { waiting = 0; clearTimeout(waitTimer); waitTimer = null; delete el.dataset.busy; }
  let live = document.getElementById('busy-live'); if (!live) { live = Object.assign(document.createElement('div'), { id: 'busy-live', className: 'sr' }); live.setAttribute('role', 'status'); document.body.append(live); }
  live.textContent = waiting > 0 ? (App.t?.('Guardando…') || 'Guardando…') : ''; };
async function http(path, opt = {}) {
  let r; busy = true; const t0 = performance.now(), fg = !!opt.rpc; if (fg) working(true);
  try { r = await fetch(base() + path, opt); } catch { busy = false; if (fg) working(false); const e = new Error('Sin conexión con el servidor.'); e.offline = true; throw e; }
  busy = false; if (fg) working(false);
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  const srv = +(/dur=([\d.]+)/.exec(r.headers.get('server-timing') || '')?.[1] ?? NaN);
  net.push({ path: path.split('?')[0], name: opt.rpc || '', total: performance.now() - t0, server: srv, at: Date.now() }); if (net.length > 40) net.shift();
  if (!r.ok) { const e = new Error(j?.error || 'Algo salió mal. Intenta de nuevo.'); e.user = !!j?.error; if (r.status === 401) { token = null; store(null); } throw e; }
  return j ?? r;
}

/** Las imágenes y diplomas llegan como /api/blob/…: se completan con la dirección del servidor. */
const BLOB = { users: ['photo'], events: ['banner_img', 'poster_img'], user_certs: ['diploma'] };
const fixRows = (t, rows) => { const fs = BLOB[t]; if (!fs || !rows) return rows;
  for (const r of rows) for (const f of fs) if (typeof r[f] === 'string' && r[f].startsWith('/api/blob/')) r[f] = base() + r[f];
  return rows; };
/** Aplica la respuesta del servidor: sin cambios, solo las filas que cambiaron (delta) o los datos completos. */
function apply(j) {
  if (j.occ) App.occ = j.occ;
  if (j.same) { tag = j.tag || tag; return false; }
  if (j.delta) { for (const t in j.delta) { fixRows(t, j.delta[t].put); fixRows(t, j.delta[t].all); } App.db.patch(j.delta); }
  else { for (const t in j.tables) fixRows(t, j.tables[t]); App.db.load(j.tables); }
  App.uid = j.uid || null; tag = j.tag || ''; App.partial = !!j.partial;
  if (!App.uid && !j.delta) savePublic(j);
  if (App.partial) setTimeout(() => remote.refresh().then(ch => ch && onChange()).catch(() => {}), 0); // el historial llega enseguida
  return true;
}
// ---- Pantalla de ingreso al instante (2.9.3)
// La vista pública (nombre del Hub, contacto, formulario de registro, eventos publicados) no tiene datos personales.
// Se guarda en el dispositivo para dibujar el ingreso sin esperar al servidor; luego se actualiza por detrás.
const PUB = 'hub-public-v1';
function savePublic(j) { try { const txt = JSON.stringify({ tables: j.tables, occ: j.occ, v: 1 }); if (txt.length < 1.5e6) localStorage.setItem(PUB, txt); } catch { /* sin espacio o bloqueado */ } }
function loadPublic() { try { const j = JSON.parse(localStorage.getItem(PUB) || 'null'); if (j?.tables) { App.db.load(j.tables); App.occ = j.occ; App.uid = null; return true; } } catch { /* dañado */ } return false; }

export const remote = {
  remembered,
  async init(cb) { onChange = cb; token = store();
    const poll = () => setInterval(async () => { if (document.hidden || busy) return; if (await this.refresh().catch(() => false)) onChange(); }, 15000);
    // Sin sesión y con la vista pública guardada: el ingreso se dibuja ya y los datos se actualizan por detrás.
    if (!token && loadPublic()) { this.refresh().then(ch => ch && onChange()).catch(() => {}); poll(); return; }
    // Con sesión: la app muestra «Cargando tus datos…» mientras llega una vista liviana (el historial viene después).
    if (token) App.loading = true;
    try { await this.refresh(!!token); } finally { App.loading = false; }
    poll(); },
  /** Pide los datos solo si cambiaron. Devuelve true cuando hubo cambios. */
  async refresh(lite = false) { const tk = token, j = await http('/api/snapshot', { headers: headers(tag ? { 'X-Hub-Since': tag } : lite ? { 'X-Hub-Lite': '1' } : {}) });
    return tk === token ? apply(j) : false; }, // si la sesión cambió mientras llegaba (entró o salió), la respuesta ya no sirve
  /** Baja un archivo del servidor (diplomas) como Blob para descargarlo. */
  async blob(url) { const r = await fetch(url); if (!r.ok) throw new Error('No se pudo descargar el archivo.'); return r.blob(); },
  /** Diagnóstico: n consultas a /api/health; devuelve las medianas de ida y vuelta total y del servidor (ms). */
  async ping(n = 5) { const tot = [], srv = []; for (let i = 0; i < n; i++) { await http('/api/health', { headers: {} }); const x = net.at(-1); tot.push(x.total); srv.push(x.server || 0); }
    const med = a => a.sort((p, q) => p - q)[a.length >> 1]; return { total: med(tot), server: med(srv), n }; },
  net,
  async call(name, args) {
    const j = await http('/api/rpc', { method: 'POST', rpc: name, headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name, args, since: tag || undefined }) });
    if (j.token) { token = j.token; store(token, args && 'remember' in args ? !!args.remember : remembered()); }
    if (j.snap) apply(j.snap); else await this.refresh();
    return j.result;
  },
  async logout() { try { await http('/api/rpc', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name: 'auth.logout' }) }); } catch { /* sin conexión: se borra igual en este dispositivo */ }
    token = null; tag = ''; store(null); return this.refresh(); },
  tick() { /* la consulta periódica ya se hace en init */ },
  async putFile(file) { const j = await http('/api/files', { method: 'POST', headers: headers({ 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }), body: file }); return j.key; },
  async getFile(key) { const r = await http('/api/files/' + encodeURIComponent(key), { headers: headers() }); return r.blob(); },
  async delFile() { /* el servidor borra el archivo al eliminar el registro */ },
  async reset() { location.reload(); },
};
