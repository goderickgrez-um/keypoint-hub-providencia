// Modo demo: la base de datos vive en este navegador (IndexedDB) y parte con datos de ejemplo.
// Cada dispositivo tiene su propia copia; para compartir datos entre equipos se usa el servidor (src/data/remote.js).
import { App } from '../ui/kit.js';
import { call, tick } from '../core/services.js';
import { seed } from '../core/seed.js';

const VERSION = 3;
let chan = null, timer = null;
const open = () => new Promise((ok, ko) => { const r = indexedDB.open('keypoint-hub', 1); r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); }; r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const tx = async (store, mode, fn) => { const d = await open(); return new Promise((ok, ko) => { const t = d.transaction(store, mode), rq = fn(t.objectStore(store)); t.oncomplete = () => ok(rq?.result); t.onerror = () => ko(t.error); }); };
const read = async () => { try { return await tx('kv', 'readonly', s => s.get('db')); } catch { return null; } };
function save() {
  clearTimeout(timer);
  timer = setTimeout(async () => { try { await tx('kv', 'readwrite', s => s.put({ ...App.db.dump(), __v: VERSION }, 'db')); chan?.postMessage('changed'); } catch { /* sin almacenamiento: la demo sigue en memoria */ } }, 250);
}
const session = v => { try { if (v === undefined) return sessionStorage.getItem('hub-uid'); v ? sessionStorage.setItem('hub-uid', v) : sessionStorage.removeItem('hub-uid'); } catch { return null; } };

export const local = {
  async init(onChange) {
    let data = await read();
    if (!data || data.__v !== VERSION) data = await seed(new Date());
    App.db.load(data);
    App.uid = session(); if (App.uid && !App.db.get('users', App.uid)) App.uid = null;
    await this.tick(); save();
    try { chan = new BroadcastChannel('keypoint-hub'); chan.onmessage = async () => { const d = await read(); if (d) { App.db.load(d); onChange(); } }; } catch { /* sin canal entre pestañas */ }
  },
  async call(name, args) {
    const ctx = { db: App.db, uid: App.uid, now: new Date(), demo: true };
    try { const r = await call(ctx, name, args); App.db.take(); save(); if (r.session) { App.uid = r.session; session(r.session); } return r; }
    catch (e) { App.db.rollback(); throw e; }
  },
  logout() { App.uid = null; session(null); },
  async tick() { try { tick({ db: App.db, now: new Date(), demo: true }); if (App.db.take().length) save(); } catch { App.db.rollback(); } },
  async putFile(file) { const key = 'f' + Date.now() + Math.random().toString(36).slice(2, 7); if (file.size <= 64 * 1048576) try { await tx('files', 'readwrite', s => s.put(file, key)); } catch { return null; } return key; },
  async getFile(key) { try { return (await tx('files', 'readonly', s => s.get(key))) || null; } catch { return null; } },
  async delFile(key) { try { await tx('files', 'readwrite', s => s.delete(key)); } catch { /* nada */ } },
  async reset() { try { await tx('kv', 'readwrite', s => s.delete('db')); } catch { /* nada */ } session(null); location.hash = ''; location.reload(); },
};
