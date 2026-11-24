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
async function http(path, opt = {}) {
  let r; busy = true; const t0 = performance.now();
  try { r = await fetch(base() + path, opt); } catch { busy = false; const e = new Error('Sin conexión con el servidor.'); e.offline = true; throw e; }
  busy = false;
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  const srv = +(/dur=([\d.]+)/.exec(r.headers.get('server-timing') || '')?.[1] ?? NaN);
  net.push({ path: path.split('?')[0], name: opt.rpc || '', total: performance.now() - t0, server: srv, at: Date.now() }); if (net.length > 40) net.shift();
  if (!r.ok) { const e = new Error(j?.error || 'Algo salió mal. Intenta de nuevo.'); e.user = !!j?.error; if (r.status === 401) { token = null; store(null); } throw e; }
  return j ?? r;
}

/** Aplica la respuesta del servidor: sin cambios, solo las filas que cambiaron (delta) o los datos completos. */
function apply(j) {
  if (j.occ) App.occ = j.occ;
  if (j.same) { tag = j.tag || tag; return false; }
  if (j.delta) App.db.patch(j.delta); else App.db.load(j.tables);
  App.uid = j.uid || null; tag = j.tag || '';
  return true;
}

export const remote = {
  remembered,
  async init(cb) { onChange = cb; token = store(); await this.refresh();
    setInterval(async () => { if (document.hidden || busy) return; if (await this.refresh().catch(() => false)) onChange(); }, 15000); },
  /** Pide los datos solo si cambiaron. Devuelve true cuando hubo cambios. */
  async refresh() { const j = await http('/api/snapshot', { headers: headers(tag ? { 'X-Hub-Since': tag } : {}) }); return apply(j); },
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
