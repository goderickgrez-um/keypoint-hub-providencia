// Servidor del Hub: sirve la app (web/), expone la API y guarda todo en PostgreSQL.
// Arranque: npm start   (lee la configuración del archivo .env)
import http from 'node:http';
import { createReadStream, createWriteStream, existsSync, readFileSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Store } from '../src/core/store.js';
import { call, snapshot, tick } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import { loadAll, persist, createSchema, isEmpty, pool, ROOT as root } from './db.mjs';

// ---- Configuración (.env)
const PORT = +process.env.PORT || 8080, SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex'), UPLOADS = resolve(process.env.UPLOADS_DIR || join(root, 'uploads'));
const WEB = join(root, 'web') + sep, MAX_UPLOAD = (+process.env.MAX_UPLOAD_MB || 4096) * 1048576, HOURS = 12;
if (!process.env.SESSION_SECRET) console.warn('Aviso: SESSION_SECRET no está definido; las sesiones se cierran al reiniciar el servidor.');
mkdirSync(UPLOADS, { recursive: true });

// ---- Datos en memoria, respaldados por PostgreSQL
await createSchema();
if (await isEmpty()) console.warn('La base está vacía. Ejecuta: npm run db:init -- --demo   (o --clean)');
let db; try { db = new Store(await loadAll()); } catch (e) { console.error('\n' + e.message + '\n'); process.exit(1); }
// Migración: versiones anteriores guardaban un solo encargado por espacio en spaces.manager_id.
if (!db.all('space_managers').length && db.all('spaces').some(s => s.manager_id)) {
  for (const s of db.all('spaces')) if (s.manager_id) { db.insert('space_managers', { space_id: s.id, user_id: s.manager_id }); db.update('spaces', s.id, { manager_id: null }); }
  await persist(db.take()); console.log('Encargados de laboratorio migrados al nuevo formato.');
}
let queue = Promise.resolve(), VERSION = 0;
/** Ejecuta las operaciones de a una, para que dos reservas simultáneas no tomen el mismo horario. */
const serial = fn => (queue = queue.then(fn, fn));
async function commit(fn) {
  return serial(async () => {
    try { const r = await fn(), log = db.take(); await persist(log); if (log.length) VERSION++; return r; }
    catch (e) { db.rollback(); throw e; }
  });
}

// ---- Sesiones firmadas
const b64 = s => Buffer.from(s).toString('base64url');
const sign = uid => { const body = b64(JSON.stringify({ uid, iat: Date.now(), exp: Date.now() + HOURS * 36e5 })); return body + '.' + createHmac('sha256', SECRET).update(body).digest('base64url'); };
function verify(tok) {
  const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
  const good = createHmac('sha256', SECRET).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString()); const u = db.get('users', p.uid); // la sesión se cierra si la cuenta se borró o cambió su contraseña después de entrar
  return p.exp > Date.now() && u && !u.deleted_at && !(u.sessions_after && +new Date(u.sessions_after) > (p.iat || 0) + 999) ? p.uid : null;
}
const uidOf = req => verify((req.headers.authorization || '').replace(/^Bearer /, ''));

// ---- Límite de intentos de ingreso por IP
// Detrás de Tailscale Funnel todas las conexiones llegan desde el propio equipo; la dirección real va en X-Forwarded-For.
const ipOf = req => { const a = req.socket.remoteAddress || ''; const loop = /^(::1|127\.|::ffff:127\.)/.test(a); return (loop && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || a; };
const fails = new Map(), hits = new Map(), WIN = 15 * 60000;
const recent = (m, k, win = WIN) => { const now = Date.now(), t = (m.get(k) || []).filter(x => now - x < win); m.set(k, t); return t; };
const LOOP = ip => /^(::1|127\.|::ffff:127\.)/.test(ip); // sin dirección real: no se limita por dirección, solo por cuenta
const blocked = (ip, who) => (!LOOP(ip) && recent(fails, 'ip:' + ip).length >= 30) || (who && recent(fails, 'id:' + who).length >= 8);
const failed = (ip, who) => { recent(fails, 'ip:' + ip).push(Date.now()); if (who) recent(fails, 'id:' + who).push(Date.now()); };
const flooding = ip => { if (LOOP(ip)) return false; const t = recent(hits, ip, 60000); t.push(Date.now()); return t.length > 600; };
setInterval(() => { for (const m of [fails, hits]) for (const [k] of m) if (!recent(m, k).length) m.delete(k); }, 10 * 60000);

// ---- Google: valida el token de ingreso
async function verifyGoogle(cred) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred)); const j = await r.json();
  if (!r.ok || j.aud !== db.cfg('google_client_id') || j.email_verified !== 'true') { const e = new Error('No se pudo validar la cuenta de Google'); e.user = true; throw e; }
  return j.email;
}

// ---- Correo saliente (nodemailer). Sin SMTP_PASS los correos quedan en la tabla outbox.
let mailer = null;
let sending = false;
async function sendMail() {
  if (sending) return; sending = true;
  try {
  if (!process.env.SMTP_PASS) return;
  const m = db.cfg('mail'); if (!m?.user) return;
  if (!mailer) { const nm = (await import('nodemailer')).default; mailer = nm.createTransport({ host: m.host, port: m.port, secure: +m.port === 465, auth: { user: m.user, pass: process.env.SMTP_PASS } }); }
  for (const o of db.where('outbox', o => !o.sent_at).slice(0, 20)) {
    try { await mailer.sendMail({ from: `"${m.from || 'Hub Providencia'}" <${m.user}>`, to: o.to_email, subject: o.subject, text: o.body }); await commit(() => db.update('outbox', o.id, { sent_at: new Date().toISOString(), body: /código/i.test(o.subject) ? '[código enviado]' : o.body, subject: o.subject.replace(/\d{6}/, '••••••') })); }
    catch (e) { console.error('Correo no enviado:', e.message); break; }
  }
  } finally { sending = false; }
}

// ---- Tareas periódicas
setInterval(() => { commit(() => tick({ db, now: new Date() })).catch(e => console.error('tick', e)); sendMail().catch(() => {}); }, 60000);
setInterval(() => { // borra del disco los archivos que ya no se necesitan
  for (const f of db.where('files', f => f.status === 'eliminado' && f.storage)) { try { unlinkSync(join(UPLOADS, f.storage)); } catch { /* ya no existe */ } commit(() => db.update('files', f.id, { storage: null })).catch(() => {}); }
}, 10 * 60000);

// ---- HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000', 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', 'Cross-Origin-Resource-Policy': 'cross-origin' };
// Política de contenido: solo scripts propios (y el botón de Google), sin scripts en línea ni marcos de otros sitios.
const CSP = "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; worker-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
// Permite que la app publicada en GitHub Pages (otro dominio) use esta API.
const originOf = s => { try { return new URL(s.trim()).origin.toLowerCase(); } catch { return ''; } };
const ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map(originOf).filter(Boolean), warned = new Set();
function cors(req, res) {
  const o = req.headers.origin; if (!o) return;
  if (!ORIGINS.includes(o.toLowerCase())) {
    if (!warned.has(o) && !o.includes('localhost') && originOf(o) !== originOf('http://' + req.headers.host)) { warned.add(o); console.warn(`\nSe rechazó una conexión desde ${o}\n  Si es tu app de GitHub, escribe en .env:  ALLOWED_ORIGIN=${o}\n  y vuelve a abrir iniciar-hub.bat\n`); }
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Max-Age', '86400');
}
const gz = req => /\bgzip\b/.test(req?.headers['accept-encoding'] || '');
const json = (res, code, body) => {
  let out = Buffer.from(JSON.stringify(body)); const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC };
  if (out.length > 1024 && gz(res.req)) { out = gzipSync(out, { level: 6 }); h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding, Origin'; }
  res.writeHead(code, h); res.end(out);
};
/** Datos de la sesión más una huella: si nada cambió desde la última consulta, se responde solo "sin cambios". */
const views = new Map();
function view(ctx, uid, since) {
  const key = uid || '-', c = views.get(key);
  if (!(c && c.v === VERSION && Date.now() - c.at < 30000)) {
    const s = { ...snapshot(ctx), uid }, cut = Date.now() - 100 * 864e5, t = s.tables;
    if (t.visits) t.visits = t.visits.filter(v => +new Date(v.in_at) > cut);
    if (t.reservations) t.reservations = t.reservations.filter(r => +new Date(r.end_at) > cut);
    if (t.audit_log) t.audit_log = t.audit_log.slice(-300);
    if (views.size > 500) views.clear();
    views.set(key, { v: VERSION, at: Date.now(), s, tag: createHash('sha1').update(JSON.stringify(s)).digest('base64url').slice(0, 16) });
  }
  const { s, tag } = views.get(key);
  return since === tag ? { same: true, tag } : { ...s, tag };
}
const readBody = req => new Promise((ok, ko) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > 30 * 1048576) { ko(Object.assign(new Error('Solicitud demasiado grande'), { user: true })); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch).toString('utf8'))); req.on('error', ko); });

async function api(req, res, path) {
  const uid = uidOf(req), ctx = { db, uid, now: new Date(), verifyGoogle };
  if (path === '/api/snapshot' && req.method === 'GET') return json(res, 200, view(ctx, uid, new URL(req.url, 'http://x').searchParams.get('since')));
  if (path === '/api/rpc' && req.method === 'POST') {
    let name, args; try { ({ name, args } = JSON.parse(await readBody(req) || '{}')); } catch { return json(res, 400, { error: 'Solicitud no válida' }); }
    const ip = ipOf(req), erase = name === 'user.erase', auth = String(name).startsWith('auth.') || erase, who = erase ? 'admin:' + uid : auth ? String(args?.ident || args?.id || '').toLowerCase().replace(/[.\s-]/g, '') : '';
    if (auth && blocked(ip, who)) return json(res, 429, { error: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.' });
    try {
      const result = await commit(() => call(ctx, name, args));
      const token = result?.session ? sign(result.session) : undefined;
      if (result) { delete result.demo_code; if (result.session) result.session = true; }
      if (erase && result?.storage) { for (const k of result.storage) try { unlinkSync(join(UPLOADS, basename(k))); } catch { /* ya no estaba */ } delete result.storage; }
      const nuid = token ? verify(token) : uid;
      const out = { result, token, snap: view({ db, uid: nuid, now: new Date() }, nuid) };
      json(res, 200, out);
      if (db.where('outbox', o => !o.sent_at).length) sendMail().catch(() => {}); // códigos y avisos salen de inmediato
      return;
    } catch (e) { if (!e.user) console.error(name, e); else if (auth) failed(ip, who); return json(res, e.user ? 400 : 500, { error: e.user ? e.message : 'Algo salió mal. Intenta de nuevo.' }); }
  }
  if (path === '/api/files' && req.method === 'POST') {
    if (!uid) return json(res, 401, { error: 'Inicia sesión para continuar' });
    const name = decodeURIComponent(req.headers['x-file-name'] || 'archivo'), key = Date.now() + '-' + randomBytes(6).toString('hex') + extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const ext = extname(name).toLowerCase(), okExt = new Set(db.all('spaces').flatMap(s => (s.accept || '').split(',')).filter(Boolean));
    if (!okExt.has(ext)) return json(res, 400, { error: 'Formato de archivo no aceptado' });
    if (+req.headers['content-length'] > MAX_UPLOAD) return json(res, 413, { error: 'El archivo supera el tamaño máximo' });
    if (recent(hits, 'up:' + uid, 36e5).push(Date.now()) > 40) return json(res, 429, { error: 'Demasiados archivos en una hora' });
    let n = 0; const dest = join(UPLOADS, key);
    try { await pipeline(req, async function* (src) { for await (const ch of src) { n += ch.length; if (n > MAX_UPLOAD) throw new Error('grande'); yield ch; } }, createWriteStream(dest)); }
    catch { try { unlinkSync(dest); } catch { /* nada */ } return json(res, 413, { error: 'El archivo supera el tamaño máximo' }); }
    return json(res, 200, { key });
  }
  const fm = /^\/api\/files\/([\w.-]+)$/.exec(path);
  if (fm && req.method === 'GET') {
    const f = db.find('files', x => x.storage === fm[1]);
    if (!uid || !f || !(f.user_id === uid || Q.rolesOf(db, uid).includes('admin') || Q.managersOf(db, f.space_id).includes(uid))) return json(res, 404, { error: 'No encontramos ese archivo' });
    const p = join(UPLOADS, f.storage); if (!existsSync(p)) return json(res, 404, { error: 'El archivo ya no está disponible' });
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': statSync(p).size, 'Content-Disposition': `attachment; filename="${encodeURIComponent(f.name)}"`, ...SEC });
    return createReadStream(p).pipe(res);
  }
  if (path === '/api/health') return json(res, 200, { ok: true });
  json(res, 404, { error: 'Ruta desconocida' });
}

const zcache = new Map();
function serve(req, res, path) {
  if (path === '/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end('window.HUB_CONFIG = { api: "" };'); }
  let p = normalize(join(WEB, decodeURIComponent(path === '/' ? '/index.html' : path)));
  if (!p.startsWith(WEB) || !existsSync(p) || statSync(p).isDirectory()) p = join(WEB, 'index.html');
  const h = { ...(p.endsWith('.html') ? { 'Content-Security-Policy': CSP } : {}), 'Content-Type': TYPES[extname(p)] || 'application/octet-stream', 'Cache-Control': p.endsWith('.html') || p.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600', ...SEC };
  if (gz(req) && /\.(js|css|html|svg|json|webmanifest)$/.test(p)) {
    const m = statSync(p).mtimeMs, c = zcache.get(p); let z = c?.m === m ? c.z : null;
    if (!z) { z = gzipSync(readFileSync(p), { level: 9 }); zcache.set(p, { m, z }); }
    res.writeHead(200, { ...h, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' }); return res.end(z);
  }
  res.writeHead(200, h);
  createReadStream(p).pipe(res);
}

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (flooding(ipOf(req))) { res.writeHead(429); return res.end(); }
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try { if (path.startsWith('/api/')) await api(req, res, path); else serve(req, res, path); }
  catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'Algo salió mal. Intenta de nuevo.' }); }
}).listen(PORT, () => console.log(`Keypoint Hub Providencia en http://localhost:${PORT}  (${db.all('users').length} usuarios)${ORIGINS.length ? '\nApp externa permitida: ' + ORIGINS.join(', ') : ''}\nDeja esta ventana abierta mientras el Hub use el sistema.`))
  .on('error', e => { if (e.code !== 'EADDRINUSE') throw e;
    console.error(`\nEl puerto ${PORT} ya está en uso: probablemente el Hub ya está abierto en otra ventana.\nCierra esa ventana (o en PowerShell: netstat -ano | findstr :${PORT}  y luego  taskkill /PID <número> /F) y vuelve a iniciar.\n`); process.exit(1); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
