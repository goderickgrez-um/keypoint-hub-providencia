// Servidor del Hub: sirve la app (web/), expone la API y guarda todo en PostgreSQL.
// Arranque: npm start   (lee la configuración del archivo .env)
import http from 'node:http';
import { createReadStream, createWriteStream, existsSync, readFileSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Store } from '../src/core/store.js';
import { call, snapshot, tick } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import { loadAll, persist, createSchema, isEmpty, pool } from './db.mjs';

// ---- Configuración (.env)
const root = new URL('..', import.meta.url).pathname;
if (existsSync(root + '.env')) for (const l of readFileSync(root + '.env', 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const PORT = +process.env.PORT || 8080, SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex'), UPLOADS = process.env.UPLOADS_DIR || root + 'uploads/';
const WEB = root + 'web/', MAX_UPLOAD = (+process.env.MAX_UPLOAD_MB || 4096) * 1048576, HOURS = 12;
if (!process.env.SESSION_SECRET) console.warn('Aviso: SESSION_SECRET no está definido; las sesiones se cierran al reiniciar el servidor.');
mkdirSync(UPLOADS, { recursive: true });

// ---- Datos en memoria, respaldados por PostgreSQL
await createSchema();
if (await isEmpty()) console.warn('La base está vacía. Ejecuta: npm run db:init -- --demo   (o --clean)');
const db = new Store(await loadAll());
let queue = Promise.resolve();
/** Ejecuta las operaciones de a una, para que dos reservas simultáneas no tomen el mismo horario. */
const serial = fn => (queue = queue.then(fn, fn));
async function commit(fn) {
  return serial(async () => {
    try { const r = await fn(); await persist(db.take()); return r; }
    catch (e) { db.rollback(); throw e; }
  });
}

// ---- Sesiones firmadas
const b64 = s => Buffer.from(s).toString('base64url');
const sign = uid => { const body = b64(JSON.stringify({ uid, exp: Date.now() + HOURS * 36e5 })); return body + '.' + createHmac('sha256', SECRET).update(body).digest('base64url'); };
function verify(tok) {
  const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
  const good = createHmac('sha256', SECRET).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() && db.get('users', p.uid) ? p.uid : null;
}
const uidOf = req => verify((req.headers.authorization || '').replace(/^Bearer /, ''));

// ---- Límite de intentos de ingreso por IP
const tries = new Map();
function limited(ip) { const now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 15 * 60000); t.push(now); tries.set(ip, t); return t.length > 20; }

// ---- Google: valida el token de ingreso
async function verifyGoogle(cred) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred)); const j = await r.json();
  if (!r.ok || j.aud !== db.cfg('google_client_id') || j.email_verified !== 'true') { const e = new Error('No se pudo validar la cuenta de Google'); e.user = true; throw e; }
  return j.email;
}

// ---- Correo saliente (nodemailer). Sin SMTP_PASS los correos quedan en la tabla outbox.
let mailer = null;
async function sendMail() {
  if (!process.env.SMTP_PASS) return;
  const m = db.cfg('mail'); if (!m?.user) return;
  if (!mailer) { const nm = (await import('nodemailer')).default; mailer = nm.createTransport({ host: m.host, port: m.port, secure: +m.port === 465, auth: { user: m.user, pass: process.env.SMTP_PASS } }); }
  for (const o of db.where('outbox', o => !o.sent_at).slice(0, 20)) {
    try { await mailer.sendMail({ from: `"${m.from || 'Hub Providencia'}" <${m.user}>`, to: o.to_email, subject: o.subject, text: o.body }); await commit(() => db.update('outbox', o.id, { sent_at: new Date().toISOString() })); }
    catch (e) { console.error('Correo no enviado:', e.message); break; }
  }
}

// ---- Tareas periódicas
setInterval(() => { commit(() => tick({ db, now: new Date() })).catch(e => console.error('tick', e)); sendMail().catch(() => {}); }, 60000);
setInterval(() => { // borra del disco los archivos que ya no se necesitan
  for (const f of db.where('files', f => f.status === 'eliminado' && f.storage)) { try { unlinkSync(join(UPLOADS, f.storage)); } catch { /* ya no existe */ } commit(() => db.update('files', f.id, { storage: null })).catch(() => {}); }
}, 10 * 60000);

// ---- HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(self), microphone=()' };
// Permite que la app publicada en GitHub Pages (otro dominio) use esta API.
const ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
function cors(req, res) {
  const o = req.headers.origin; if (!o || !ORIGINS.includes(o)) return;
  res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Max-Age', '86400');
}
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, ko) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > 30 * 1048576) { ko(Object.assign(new Error('Solicitud demasiado grande'), { user: true })); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch).toString('utf8'))); req.on('error', ko); });

async function api(req, res, path) {
  const uid = uidOf(req), ctx = { db, uid, now: new Date(), verifyGoogle };
  if (path === '/api/snapshot' && req.method === 'GET') return json(res, 200, { ...snapshot(ctx), uid });
  if (path === '/api/rpc' && req.method === 'POST') {
    const { name, args } = JSON.parse(await readBody(req) || '{}');
    if (String(name).startsWith('auth.') && limited(req.socket.remoteAddress)) return json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    try {
      const result = await commit(() => call(ctx, name, args));
      const token = result?.session ? sign(result.session) : undefined;
      if (result) { delete result.demo_code; if (result.session) result.session = true; }
      return json(res, 200, { result, token });
    } catch (e) { if (!e.user) console.error(name, e); return json(res, e.user ? 400 : 500, { error: e.user ? e.message : 'Algo salió mal. Intenta de nuevo.' }); }
  }
  if (path === '/api/files' && req.method === 'POST') {
    if (!uid) return json(res, 401, { error: 'Inicia sesión para continuar' });
    const name = decodeURIComponent(req.headers['x-file-name'] || 'archivo'), key = Date.now() + '-' + randomBytes(6).toString('hex') + extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
    if (+req.headers['content-length'] > MAX_UPLOAD) return json(res, 413, { error: 'El archivo supera el tamaño máximo' });
    await pipeline(req, createWriteStream(join(UPLOADS, key)));
    return json(res, 200, { key });
  }
  const fm = /^\/api\/files\/([\w.-]+)$/.exec(path);
  if (fm && req.method === 'GET') {
    const f = db.find('files', x => x.storage === fm[1]);
    if (!uid || !f || !(f.user_id === uid || Q.rolesOf(db, uid).includes('admin') || db.get('spaces', f.space_id)?.manager_id === uid)) return json(res, 404, { error: 'No encontramos ese archivo' });
    const p = join(UPLOADS, f.storage); if (!existsSync(p)) return json(res, 404, { error: 'El archivo ya no está disponible' });
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': statSync(p).size, 'Content-Disposition': `attachment; filename="${encodeURIComponent(f.name)}"`, ...SEC });
    return createReadStream(p).pipe(res);
  }
  if (path === '/api/health') return json(res, 200, { ok: true, users: db.all('users').length });
  json(res, 404, { error: 'Ruta desconocida' });
}

function serve(req, res, path) {
  if (path === '/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end('window.HUB_CONFIG = { api: "" };'); }
  let p = normalize(join(WEB, decodeURIComponent(path === '/' ? '/index.html' : path)));
  if (!p.startsWith(WEB) || !existsSync(p) || statSync(p).isDirectory()) p = WEB + 'index.html';
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream', 'Cache-Control': p.endsWith('.html') || p.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600', ...SEC });
  createReadStream(p).pipe(res);
}

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try { if (path.startsWith('/api/')) await api(req, res, path); else serve(req, res, path); }
  catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'Algo salió mal. Intenta de nuevo.' }); }
}).listen(PORT, () => console.log(`Keypoint Hub Providencia en http://localhost:${PORT}  (${db.all('users').length} usuarios)${ORIGINS.length ? '\nApp externa permitida: ' + ORIGINS.join(', ') : ''}\nDeja esta ventana abierta mientras el Hub use el sistema.`));
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
