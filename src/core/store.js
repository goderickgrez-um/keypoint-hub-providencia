// Almacén relacional en memoria. Las mismas tablas viven en el navegador (modo demo)
// y en el servidor (respaldadas por PostgreSQL). Cada cambio queda en un registro
// para poder persistirlo o deshacerlo si la operación falla.
import { TABLES, blank, pkOf } from './schema.js';
import { DEFAULTS } from './catalog.js';

export class Store {
  constructor(data = {}) { this.load(data); }

  load(data = {}) {
    this.d = {}; this.seq = {}; this.log = []; this.undo = []; this.ix = {}; this.rev = (this.rev || 0) + 1; // rev cambia con cada cambio: sirve para recordar cálculos
    for (const t in TABLES) this.d[t] = (data[t] || []).map(r => ({ ...r }));
    return this;
  }
  dump() { return this.d; }
  /** Aplica cambios recibidos del servidor sin registrarlos: { tabla: { put: [filas], del: [ids] } } o { tabla: { all: [filas] } }. */
  patch(delta) {
    for (const t in delta) {
      if (!TABLES[t]) continue;
      const x = delta[t], pk = pkOf(t);
      if (x.all) { this.d[t] = x.all.map(r => ({ ...r })); delete this.ix[t]; delete this.seq[t]; continue; }
      if (x.del?.length) { const gone = new Set(x.del); this.d[t] = this.d[t].filter(r => !gone.has(r[pk])); }
      if (x.put?.length) { const at = new Map(this.d[t].map((r, i) => [r[pk], i]));
        for (const r of x.put) { const i = at.get(r[pk]); if (i == null) { at.set(r[pk], this.d[t].length); this.d[t].push({ ...r }); } else this.d[t][i] = { ...r }; } }
      delete this.ix[t]; delete this.seq[t];
    }
    this.log = []; this.undo = []; this.rev++;
    return this;
  }

  all(t) { return this.d[t]; }
  /** Búsqueda por llave primaria con índice (O(1)); el índice se arma la primera vez que se usa. */
  get(t, id) {
    let m = this.ix[t];
    if (!m) { const pk = pkOf(t); m = this.ix[t] = new Map(); for (const r of this.d[t]) m.set(r[pk], r); }
    return m.get(id) || null;
  }
  find(t, fn) { return this.d[t].find(fn) || null; }
  where(t, fn) { return this.d[t].filter(fn); }

  nextId(t) {
    if (this.seq[t] == null) { let m = 0; for (const r of this.d[t]) { const v = t === 'users' ? +String(r.id).slice(4) || 0 : +r.id || 0; if (v > m) m = v; } this.seq[t] = m; }
    const n = ++this.seq[t];
    return t === 'users' ? 'HUB-' + String(n).padStart(5, '0') : n;
  }

  insert(t, row) {
    const pk = pkOf(t), r = { ...blank(t), ...row };
    if (r[pk] == null) r[pk] = this.nextId(t);
    if ('created_at' in r && !r.created_at) r.created_at = new Date().toISOString();
    this.d[t].push(r); this.ix[t]?.set(r[pk], r);
    this.log.push({ op: 'insert', t, row: r }); this.rev++;
    this.undo.push(() => { const i = this.d[t].indexOf(r); if (i >= 0) this.d[t].splice(i, 1); this.ix[t]?.delete(r[pk]); });
    return r;
  }
  update(t, id, patch) {
    const r = this.get(t, id); if (!r) return null;
    const prev = { ...r };
    Object.assign(r, patch);
    this.log.push({ op: 'update', t, id, patch }); this.rev++;
    this.undo.push(() => Object.assign(r, prev));
    return r;
  }
  remove(t, id) {
    const r = this.get(t, id); if (!r) return;
    const i = this.d[t].indexOf(r); this.d[t].splice(i, 1); this.ix[t]?.delete(id);
    this.log.push({ op: 'delete', t, id }); this.rev++;
    this.undo.push(() => { this.d[t].splice(i, 0, r); this.ix[t]?.set(id, r); });
  }

  /** Entrega los cambios acumulados y limpia el registro (operación confirmada). */
  take() { const l = this.log; this.log = []; this.undo = []; return l; }
  /** Deshace los cambios de la operación en curso. */
  rollback() { while (this.undo.length) this.undo.pop()(); this.log = []; this.rev++; }

  cfg(key) { const r = this.get('config', key); return r && r.value != null ? r.value : DEFAULTS[key]; }
  setCfg(key, value) { return this.get('config', key) ? this.update('config', key, { value }) : this.insert('config', { key, value }); }
}
