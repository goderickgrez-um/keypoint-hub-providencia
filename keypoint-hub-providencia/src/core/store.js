// Almacén relacional en memoria. Las mismas tablas viven en el navegador (modo demo)
// y en el servidor (respaldadas por PostgreSQL). Cada cambio queda en un registro
// para poder persistirlo o deshacerlo si la operación falla.
import { TABLES, blank, pkOf } from './schema.js';
import { DEFAULTS } from './catalog.js';

export class Store {
  constructor(data = {}) { this.load(data); }

  load(data = {}) {
    this.d = {}; this.seq = {}; this.log = []; this.undo = [];
    for (const t in TABLES) this.d[t] = (data[t] || []).map(r => ({ ...r }));
    return this;
  }
  dump() { return this.d; }

  all(t) { return this.d[t]; }
  get(t, id) { const pk = pkOf(t); return this.d[t].find(r => r[pk] === id) || null; }
  find(t, fn) { return this.d[t].find(fn) || null; }
  where(t, fn) { return this.d[t].filter(fn); }

  nextId(t) {
    if (t === 'users') {
      const n = Math.max(0, ...this.d.users.map(u => +String(u.id).slice(4) || 0), this.seq.users || 0) + 1;
      this.seq.users = n; return 'HUB-' + String(n).padStart(5, '0');
    }
    const n = Math.max(0, this.seq[t] || 0, ...(this.seq[t] ? [] : this.d[t].map(r => r.id || 0))) + 1;
    this.seq[t] = n; return n;
  }

  insert(t, row) {
    const pk = pkOf(t), r = { ...blank(t), ...row };
    if (r[pk] == null) r[pk] = this.nextId(t);
    if ('created_at' in r && !r.created_at) r.created_at = new Date().toISOString();
    this.d[t].push(r);
    this.log.push({ op: 'insert', t, row: r });
    this.undo.push(() => { const i = this.d[t].indexOf(r); if (i >= 0) this.d[t].splice(i, 1); });
    return r;
  }
  update(t, id, patch) {
    const r = this.get(t, id); if (!r) return null;
    const prev = { ...r };
    Object.assign(r, patch);
    this.log.push({ op: 'update', t, id, patch });
    this.undo.push(() => Object.assign(r, prev));
    return r;
  }
  remove(t, id) {
    const r = this.get(t, id); if (!r) return;
    const i = this.d[t].indexOf(r); this.d[t].splice(i, 1);
    this.log.push({ op: 'delete', t, id });
    this.undo.push(() => this.d[t].splice(i, 0, r));
  }

  /** Entrega los cambios acumulados y limpia el registro (operación confirmada). */
  take() { const l = this.log; this.log = []; this.undo = []; return l; }
  /** Deshace los cambios de la operación en curso. */
  rollback() { while (this.undo.length) this.undo.pop()(); this.log = []; }

  cfg(key) { const r = this.get('config', key); return r && r.value != null ? r.value : DEFAULTS[key]; }
  setCfg(key, value) { return this.get('config', key) ? this.update('config', key, { value }) : this.insert('config', { key, value }); }
}
