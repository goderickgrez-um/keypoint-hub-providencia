// Conexión con PostgreSQL: carga todas las tablas en memoria y guarda cada cambio en una transacción.
import pg from 'pg';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
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

// ---- Cifrado de columnas con datos personales (AES-256-GCM). La clave vive fuera de la base:
// en DATA_KEY (.env) o, si no está, en el archivo .data-key que se crea solo. Sin la clave los datos no se pueden leer:
// respáldala junto con la base.
export const ENCRYPTED = { users: ['doc_number', 'email', 'phone'], outbox: ['to_email', 'body'] };
const keyFile = ROOT + '.data-key';
let KEY = process.env.DATA_KEY;
if (!KEY && existsSync(keyFile)) KEY = readFileSync(keyFile, 'utf8').trim();
if (!KEY) { KEY = randomBytes(32).toString('hex'); writeFileSync(keyFile, KEY + '\n', { mode: 0o600 }); console.warn('Se creó la clave de cifrado en ' + keyFile + '. RESPÁLDALA junto con la base de datos: sin ella no se pueden leer los datos personales.'); }
const K = Buffer.from(KEY, 'hex'); if (K.length !== 32) throw new Error('DATA_KEY debe tener 64 caracteres hexadecimales');
const isEnc = v => typeof v === 'string' && v.startsWith('enc:v1:');
export function encrypt(v) {
  if (v == null || v === '' || isEnc(v)) return v;
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', K, iv), ct = Buffer.concat([c.update(String(v), 'utf8'), c.final()]);
  return `enc:v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
}
export function decrypt(v) {
  if (!isEnc(v)) return v;
  const [, , iv, tag, ct] = v.split(':'), d = createDecipheriv('aes-256-gcm', K, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64')); return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}
const enc = (t, c, v) => (v != null && typeOf(t, c) === 'jsonb' ? JSON.stringify(v) : ENCRYPTED[t]?.includes(c) ? encrypt(v) : v);

export async function createSchema() { await pool.query(toSQL()); }
export async function loadAll() {
  const out = {};
  let plain = 0;
  for (const t of ORDER) {
    out[t] = (await pool.query(`select * from ${t} order by ${pkOf(t)}`)).rows;
    for (const c of ENCRYPTED[t] || []) for (const r of out[t]) { if (r[c] != null && !isEnc(r[c])) plain++; try { r[c] = decrypt(r[c]); } catch { throw new Error('No se pueden leer los datos cifrados: la clave de cifrado (.data-key o DATA_KEY en .env) no corresponde a esta base de datos. Restaura el archivo .data-key respaldado y vuelve a iniciar.'); } }
  }
  if (plain) { // datos de versiones anteriores sin cifrar: se cifran ahora
    const log = []; for (const t in ENCRYPTED) for (const r of out[t]) { const patch = {}; for (const c of ENCRYPTED[t]) if (r[c] != null) patch[c] = r[c]; log.push({ op: 'update', t, id: r[pkOf(t)], patch }); }
    await persist(log); console.log(`Se cifraron ${plain} datos personales que estaban sin cifrar.`);
  }
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
