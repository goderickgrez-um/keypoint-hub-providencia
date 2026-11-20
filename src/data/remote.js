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
async function http(path, opt = {}) {
  let r; busy = true;
  try { r = await fetch(base() + path, opt); } catch { busy = false; const e = new Error('Sin conexión con el servidor.'); e.offline = true; throw e; }
  busy = false;
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) { const e = new Error(j?.error || 'Algo salió mal. Intenta de nuevo.'); e.user = !!j?.error; if (r.status === 401) { token = null; store(null); } throw e; }
  return j ?? r;
}

function apply(j) {
  if (j.same) return false;
  App.db.load(j.tables); App.occ = j.occ; App.uid = j.uid || null; tag = j.tag || '';
  return true;
}

export const remote = {
  remembered,
  async init(cb) { onChange = cb; token = store(); await this.refresh();
    setInterval(async () => { if (document.hidden || busy) return; if (await this.refresh().catch(() => false)) onChange(); }, 15000); },
  /** Pide los datos solo si cambiaron. Devuelve true cuando hubo cambios. */
  async refresh() { const j = await http('/api/snapshot' + (tag ? '?since=' + tag : ''), { headers: headers() }); return apply(j); },
  async call(name, args) {
    const j = await http('/api/rpc', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name, args }) });
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
