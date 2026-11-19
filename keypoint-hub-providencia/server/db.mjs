// Conexión con PostgreSQL: carga todas las tablas en memoria y guarda cada cambio en una transacción.
import pg from 'pg';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Lee el archivo .env de la carpeta del proyecto (funciona en Windows y Linux).
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const envFile = ROOT + '.env';
if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.DATABASE_URL) console.warn('Aviso: no se encontró DATABASE_URL. Revisa que exista el archivo .env (no .env.txt) en ' + ROOT);
import { TABLES, COLS, pkOf, toSQL } from '../src/core/schema.js';

pg.types.setTypeParser(1082, v => v);                          // date → 'AAAA-MM-DD'
pg.types.setTypeParser(1184, v => new Date(v).toISOString());  // timestamptz → ISO
pg.types.setTypeParser(1700, v => parseFloat(v));              // numeric → número

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://hub:hub@localhost:5432/hub', max: 5 });
const ORDER = Object.keys(TABLES);
const typeOf = (t, c) => COLS[t].find(x => x.name === c)?.type;
const enc = (t, c, v) => (v != null && typeOf(t, c) === 'jsonb' ? JSON.stringify(v) : v);

export async function createSchema() { await pool.query(toSQL()); }
export async function loadAll() {
  const out = {};
  for (const t of ORDER) out[t] = (await pool.query(`select * from ${t} order by ${pkOf(t)}`)).rows;
  return out;
}
export async function isEmpty() { return (await pool.query('select count(*)::int n from users')).rows[0].n === 0; }

/** Aplica el registro de cambios del almacén en una sola transacción. */
export async function persist(log) {
  if (!log.length) return;
  const c = await pool.connect();
  try {
    await c.query('begin');
    for (const x of log) {
      const pk = pkOf(x.t);
      if (x.op === 'insert') { const cols = COLS[x.t].map(k => k.name).filter(k => x.row[k] !== undefined);
        await c.query(`insert into ${x.t} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, cols.map(k => enc(x.t, k, x.row[k]))); }
      else if (x.op === 'update') { const cols = Object.keys(x.patch).filter(k => COLS[x.t].some(z => z.name === k)); if (!cols.length) continue;
        await c.query(`update ${x.t} set ${cols.map((k, i) => `${k}=$${i + 1}`).join(',')} where ${pk}=$${cols.length + 1}`, [...cols.map(k => enc(x.t, k, x.patch[k])), x.id]); }
      else await c.query(`delete from ${x.t} where ${pk}=$1`, [x.id]);
    }
    await c.query('commit');
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}

/** Inserta un conjunto completo de tablas (datos de ejemplo o base limpia). */
export async function insertAll(data) {
  const log = []; for (const t of ORDER) for (const row of data[t] || []) log.push({ op: 'insert', t, row });
  await persist(log);
}
