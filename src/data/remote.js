// Modo real: los datos viven en PostgreSQL y se accede por la API del servidor (server/server.js).
// El navegador recibe solo lo que la sesión puede ver y lo guarda en el mismo almacén que usa la interfaz.
import { App } from '../ui/kit.js';

const base = (window.HUB_CONFIG?.api || '').replace(/\/$/, '');
let token = null, onChange = () => {};
const store = v => { try { if (v === undefined) return sessionStorage.getItem('hub-token'); v ? sessionStorage.setItem('hub-token', v) : sessionStorage.removeItem('hub-token'); } catch { return null; } };
const headers = extra => ({ ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra });
async function http(path, opt = {}) {
  let r;
  try { r = await fetch(base + path, opt); } catch { const e = new Error('Sin conexión con el servidor.'); e.offline = true; throw e; }
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) { const e = new Error(j?.error || 'Algo salió mal. Intenta de nuevo.'); e.user = !!j?.error; if (r.status === 401) { token = null; store(null); } throw e; }
  return j ?? r;
}

export const remote = {
  async init(cb) { onChange = cb; token = store(); await this.refresh(); setInterval(() => this.refresh().then(onChange).catch(() => {}), 20000); },
  async refresh() { const j = await http('/api/snapshot', { headers: headers() }); App.db.load(j.tables); App.occ = j.occ; App.uid = j.uid || null; },
  async call(name, args) {
    const j = await http('/api/rpc', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name, args }) });
    if (j.token) { token = j.token; store(token); }
    await this.refresh();
    return j.result;
  },
  logout() { token = null; store(null); return this.refresh(); },
  tick() { return this.refresh().catch(() => {}); },
  async putFile(file) { const j = await http('/api/files', { method: 'POST', headers: headers({ 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }), body: file }); return j.key; },
  async getFile(key) { const r = await http('/api/files/' + encodeURIComponent(key), { headers: headers() }); return r.blob(); },
  async delFile() { /* el servidor borra el archivo al eliminar el registro */ },
  async reset() { location.reload(); },
};
