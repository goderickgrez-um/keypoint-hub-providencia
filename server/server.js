// Servidor del Hub: sirve la app (web/), expone la API y guarda todo en PostgreSQL.
// Arranque: npm start   (lee la configuración del archivo .env)
import http from 'node:http';
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants as Z } from 'node:zlib';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Store } from '../src/core/store.js';
import { pkOf } from '../src/core/schema.js';
import { call, snapshot, tick } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import { loadAll, persist, createSchema, isEmpty, pool, MAIL_SECRET, ROOT as root } from './db.mjs';
import { mailFooter, unsubToken } from '../src/core/legal.js';
import { DEFAULTS } from '../src/core/catalog.js';

// ---- Configuración (.env)
const PORT = +process.env.PORT || 8080, SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex'), UPLOADS = resolve(process.env.UPLOADS_DIR || join(root, 'uploads'));
const APP_VERSION = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
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
// Una sesión «mantenida» no vence: se cierra al tocar Cerrar sesión en ese dispositivo o al cambiar la contraseña.
const sign = (uid, sid, remember) => { const body = b64(JSON.stringify({ uid, sid, iat: Date.now(), exp: remember ? 0 : Date.now() + HOURS * 36e5 })); return body + '.' + createHmac('sha256', SECRET).update(body).digest('base64url'); };
const verify = tok => tokenInfo(tok)?.uid ?? null;
function tokenInfo(tok) {
  const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
  const good = createHmac('sha256', SECRET).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString()); const u = db.get('users', p.uid); // la sesión se cierra si la cuenta se borró o cambió su contraseña después de entrar
  const s = p.sid && db.get('sessions', p.sid);
  if (p.sid && (!s || s.revoked_at || s.user_id !== p.uid)) return null;
  return (!p.exp || p.exp > Date.now()) && u && !u.deleted_at && !u.closed_at && !(u.sessions_after && +new Date(u.sessions_after) > (p.iat || 0) + 999) ? p : null;
}
const bearer = req => (req.headers.authorization || '').replace(/^Bearer /, '');
const uidOf = req => verify(bearer(req));

// ---- Límite de intentos de ingreso por IP
// Detrás de Tailscale Funnel todas las conexiones llegan desde el propio equipo; la dirección real va en X-Forwarded-For.
const ipOf = req => { const a = req.socket.remoteAddress || ''; const loop = /^(::1|127\.|::ffff:127\.)/.test(a); return (loop && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || a; };
const fails = new Map(), hits = new Map(), WIN = 15 * 60000;
const recent = (m, k, win = WIN) => { const now = Date.now(), t = (m.get(k) || []).filter(x => now - x < win); m.set(k, t); return t; };
const LOOP = ip => /^(::1|127\.|::ffff:127\.)/.test(ip); // sin dirección real: no se limita por dirección, solo por cuenta
// Límites de intentos fallidos en 15 minutos: 30 por dirección, 8 por cuenta desde una misma dirección y 50 por cuenta en total.
// Así nadie puede dejar bloqueada la cuenta de otra persona con pocos intentos desde su equipo, y un ataque repartido sigue limitado.
const blocked = (ip, who) => (!LOOP(ip) && recent(fails, 'ip:' + ip).length >= 30) || (who && (recent(fails, 'id:' + who + '@' + ip).length >= 8 || recent(fails, 'id:' + who).length >= 50));
const failed = (ip, who) => { recent(fails, 'ip:' + ip).push(Date.now()); if (who) { recent(fails, 'id:' + who + '@' + ip).push(Date.now()); recent(fails, 'id:' + who).push(Date.now()); } };
const flooding = ip => { if (LOOP(ip)) return false; const t = recent(hits, ip, 60000); t.push(Date.now()); return t.length > 600; };
setInterval(() => { for (const m of [fails, hits]) for (const [k] of m) if (!recent(m, k).length) m.delete(k); }, 10 * 60000);

// ---- Google: valida el token de ingreso
async function verifyGoogle(cred) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred)); const j = await r.json();
  if (!r.ok || j.aud !== db.cfg('google_client_id') || j.email_verified !== 'true') { const e = new Error('No se pudo validar la cuenta de Google'); e.user = true; throw e; }
  return j.email;
}

// ---- Correo saliente (nodemailer). Sin SMTP_PASS los correos quedan en la tabla outbox.
// Cada correo lleva un pie con el contacto del Hub, la versión y, en los avisos, el enlace de baja.
// MAIL_TEST_DIR (solo pruebas): en vez de enviarlos, los guarda como archivos .json en esa carpeta.
let mailer = null;
let sending = false;
const APP_URL = () => String(db.cfg('public_url') || process.env.PUBLIC_APP_URL || '').replace(/[#?].*$/, '');
const API_URL = () => String(process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
/** Arma el correo final: texto + pie y, en los avisos, las cabeceras de baja de un clic (RFC 8058). */
async function compose(o, m) {
  const contact = { ...DEFAULTS.hub_contact, ...(db.cfg('hub_contact') || {}) }, kind = o.kind || 'cuenta', headers = {}, links = {};
  if (kind === 'aviso' && o.user_id) {
    const tk = await unsubToken(MAIL_SECRET, o.user_id), q = `u=${encodeURIComponent(o.user_id)}&t=${tk}`;
    if (APP_URL()) links.unsubscribe = `${APP_URL()}#baja=${encodeURIComponent(o.user_id)}.${tk}`;
    else if (API_URL()) links.unsubscribe = `${API_URL()}/api/baja?${q}`;
    const lu = [API_URL() && `<${API_URL()}/api/baja?${q}>`, contact.email && `<mailto:${contact.email}?subject=${encodeURIComponent('Dejar de recibir avisos')}>`].filter(Boolean);
    if (lu.length) headers['List-Unsubscribe'] = lu.join(', ');
    if (API_URL()) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  return { from: `"${m.from || 'Hub Providencia'}" <${m.user}>`, to: o.to_email, subject: o.subject, text: o.body + '\n' + mailFooter({ kind, contact, version: APP_VERSION, links }), headers };
}
async function sendMail() {
  if (sending) return; sending = true;
  try {
  const TEST = process.env.MAIL_TEST_DIR;
  if (!process.env.SMTP_PASS && !TEST) return;
  const m = db.cfg('mail') || {}; if (!m.user && !TEST) return;
  if (!mailer) { const nm = (await import('nodemailer')).default; mailer = TEST ? nm.createTransport({ jsonTransport: true }) : nm.createTransport({ host: m.host, port: m.port, secure: +m.port === 465, auth: { user: m.user, pass: process.env.SMTP_PASS } }); }
  for (const o of db.where('outbox', o => !o.sent_at).slice(0, 20)) {
    try {
      const info = await mailer.sendMail(await compose(o, { ...m, user: m.user || 'hub@ejemplo.cl' }));
      if (TEST) { mkdirSync(TEST, { recursive: true }); writeFileSync(join(TEST, `${o.id}.json`), info.message); }
      await commit(() => db.update('outbox', o.id, { sent_at: new Date().toISOString(), body: /código/i.test(o.subject) ? '[código enviado]' : o.body, subject: o.subject.replace(/\d{6}/, '••••••') })); }
    catch (e) { console.error('Correo no enviado:', e.message); break; }
  }
  } finally { sending = false; }
}

/** Página simple de baja (cuando la app no tiene dirección pública o el programa de correo usa la baja de un clic). */
const bajaPage = (title, text, form = '') => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Hub Providencia</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:10vh auto;padding:0 16px;color:#1d2433;background:#fff}h1{font-size:1.4rem}button{font:inherit;padding:.7em 1.2em;border-radius:10px;border:0;background:#0b5cad;color:#fff;cursor:pointer}button:focus-visible{outline:3px solid #f5a623;outline-offset:2px}.mu{color:#5a6475;font-size:.9rem}</style>
<main><h1>${title}</h1><p>${text}</p>${form}<p class="mu">Keypoint Hub Providencia ${APP_VERSION}</p></main></html>`;
const bajaEsc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function baja(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, u = q.get('u') || '', t = q.get('t') || '';
  const send = (code, html) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'", ...SEC }); res.end(html); };
  const valid = u && t && db.get('users', u) && (await unsubToken(MAIL_SECRET, u)) === t;
  if (!valid) return send(400, bajaPage('Avisos por correo', 'El enlace no es válido o ya no está vigente.'));
  if (req.method === 'GET') return send(200, bajaPage('¿Dejar de recibir avisos por correo?', 'Dejarás de recibir por correo los avisos de reservas, eventos, horas y archivos. Seguirás viéndolos en la app. Los códigos de acceso y los mensajes necesarios para tu cuenta se envían siempre.',
    `<form method="post" action="/api/baja?u=${bajaEsc(encodeURIComponent(u))}&amp;t=${bajaEsc(t)}"><button type="submit">Dejar de recibir avisos</button></form>`));
  await commit(() => call({ db, uid: null, now: new Date(), mailSecret: MAIL_SECRET }, 'mail.unsubscribe', { u, t }));
  send(200, bajaPage('Listo', 'Ya no recibirás avisos por correo. Puedes volver a activarlos en la app: Perfil › Configuración › Avisos por correo.'));
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
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name, X-Hub-Since, X-Hub-Lite'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Expose-Headers', 'Server-Timing'); res.setHeader('Timing-Allow-Origin', o);
}
const gz = req => /\bgzip\b/.test(req?.headers['accept-encoding'] || '');
const br = req => /\bbr\b/.test(req?.headers['accept-encoding'] || '');
const SLOW_MS = +process.env.SLOW_MS || 400;
/** Respuesta JSON comprimida (brotli si el navegador lo acepta: ~20 % menos que gzip) con el tiempo que tardó el
 * servidor en la cabecera Server-Timing, para que la app distinga la demora de la red de la del servidor. */
const json = (res, code, body) => {
  let out = Buffer.from(JSON.stringify(body)); const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC };
  if (out.length > 1024 && br(res.req)) { out = brotliCompressSync(out, { params: { [Z.BROTLI_PARAM_QUALITY]: 6, [Z.BROTLI_PARAM_SIZE_HINT]: out.length } }); h['Content-Encoding'] = 'br'; h.Vary = 'Accept-Encoding, Origin'; }
  else if (out.length > 1024 && gz(res.req)) { out = gzipSync(out, { level: 6 }); h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding, Origin'; }
  const t0 = res.req?.t0, ms = t0 ? performance.now() - t0 : 0;
  if (t0) { h['Server-Timing'] = `app;dur=${ms.toFixed(1)}`; if (ms > SLOW_MS) console.warn(`[lento] ${res.req.method} ${res.req.url.split('?')[0]}${res.req.rpcName ? ' ' + res.req.rpcName : ''}: ${ms | 0} ms`); }
  h['Content-Length'] = out.length; res.writeHead(code, h); res.end(out);
};
/** Datos de la sesión. La primera vez se envían completos; después, solo las filas que cambiaron.
 * El servidor recuerda las últimas vistas que envió a cada sesión (como filas en texto) y compara la nueva
 * con la que tiene el navegador (since = número de vista). Así una acción típica viaja en unos pocos KB en vez de
 * repetir todos los datos (más de 1 MB para el equipo), y la comparación es exacta aunque cambie qué puede ver cada uno. */
const views = new Map(); let BUILD = 0;
const KEEP = 3; // vistas recordadas por sesión (varios dispositivos de la misma cuenta)
// ---- Imágenes y archivos grandes fuera de los datos (2.9.3)
// Las fotos, banners, anuncios y diplomas se guardan como data: URL en la base. Enviarlos dentro de los datos
// hacía que cada ingreso bajara varios MB por Tailscale. Ahora los datos llevan una dirección /api/blob/<firma>
// y el navegador baja cada imagen aparte, una vez, y la guarda en su caché. La firma es un HMAC del contenido
// con una clave del servidor: no se puede adivinar ni confirmar si existe una imagen conocida, y cambia si cambia
// la imagen. Solo la conoce quien recibió la fila en su vista (las mismas reglas de siempre).
const BLOB_FIELDS = { users: ['photo'], events: ['banner_img', 'poster_img'], user_certs: ['diploma'] };
const BLOB_KEY = createHmac('sha256', MAIL_SECRET).update('hub-blob').digest();
const blobs = new Map(), blobMemo = new Map(); let blobBytes = 0;
function blobRef(t, id, f, v) {
  if (typeof v !== 'string' || !v.startsWith('data:') || v.length < 4096) return v;
  const mk = `${t}:${id}:${f}`, memo = blobMemo.get(mk);
  if (memo && memo.v === v) return memo.ref;
  const m = /^data:([\w/+.-]+);base64,/.exec(v); if (!m) return v;
  const h = createHmac('sha256', BLOB_KEY).update(v).digest('base64url').slice(0, 32), ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' }[m[1]] || 'jpg';
  const ref = `/api/blob/${h}.${ext}`;
  if (!blobs.has(h)) { const buf = Buffer.from(v.slice(m[0].length), 'base64'); blobs.set(h, { mime: m[1], buf }); blobBytes += buf.length;
    while (blobBytes > 300e6 && blobs.size > 1) { const [k, x] = blobs.entries().next().value; blobs.delete(k); blobBytes -= x.buf.length; } }
  blobMemo.set(mk, { v, ref });
  return ref;
}
function blobify(t) {
  for (const k in BLOB_FIELDS) if (t[k]) t[k] = t[k].map(r => { let o = r; for (const f of BLOB_FIELDS[k]) { const v = blobRef(k, r[pkOf(k)], f, r[f]); if (v !== r[f]) { if (o === r) o = { ...r }; o[f] = v; } } return o; });
}
/** Vista liviana para la primera pantalla del equipo: el historial (visitas y reservas pasadas, auditoría) llega
 * enseguida en un segundo pedido, como diferencia sobre esta vista. */
const LITE_DAYS = 2;
function build(ctx, uid, lite = false) {
  const s = { ...snapshot(ctx), uid }, cut = Date.now() - (lite ? LITE_DAYS : 100) * 864e5, t = s.tables;
  if (t.visits) t.visits = t.visits.filter(v => +new Date(v.in_at) > cut || !v.out_at);
  if (t.reservations) t.reservations = t.reservations.filter(r => +new Date(r.end_at) > cut);
  if (t.audit_log) t.audit_log = lite ? [] : t.audit_log.slice(-300);
  blobify(t);
  if (lite) s.partial = true;
  const rows = {}; for (const k in t) { const pk = pkOf(k), m = new Map(); for (const r of t[k]) m.set(r[pk], JSON.stringify(r)); rows[k] = m; }
  return { id: ++BUILD, v: VERSION, at: Date.now(), lite, s, rows };
}
function view(ctx, uid, since, lite = false) {
  const key = uid || '-'; let list = views.get(key);
  lite = lite && !!uid && !since; // solo al entrar (sin vista previa) y con sesión
  if (!list || !(list[0].v === VERSION && Date.now() - list[0].at < 30000 && list[0].lite === lite)) {
    if (!list) { if (views.size >= 300) views.delete(views.keys().next().value); list = []; views.set(key, list); }
    list.unshift(build(ctx, uid, lite)); list.length = Math.min(list.length, KEEP);
  }
  const cur = list[0], { s } = cur, tag = String(cur.id);
  if (since === tag) return { same: true, tag, occ: s.occ };
  const old = since && list.find(x => String(x.id) === since);
  if (!old) return { ...s, tag };
  // (una vista liviana anterior sirve de base: la diferencia trae justo el historial que faltaba)
  const delta = {};
  for (const t in cur.rows) {
    const a = old.rows[t], b = cur.rows[t], put = [], del = [];
    if (!a) { delta[t] = { all: s.tables[t] }; continue; }
    for (const [id, j] of b) if (a.get(id) !== j) put.push(JSON.parse(j));
    for (const id of a.keys()) if (!b.has(id)) del.push(id);
    if (put.length || del.length) delta[t] = { put, del };
  }
  for (const t in old.rows) if (!cur.rows[t]) delta[t] = { all: [] };
  return Object.keys(delta).length ? { delta, occ: s.occ, uid: s.uid, tag } : { same: true, tag, occ: s.occ }; // las diferencias nunca son livianas
}
const readBody = req => new Promise((ok, ko) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > 30 * 1048576) { ko(Object.assign(new Error('Solicitud demasiado grande'), { user: true })); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch).toString('utf8'))); req.on('error', ko); });

async function api(req, res, path) {
  const uid = uidOf(req), ctx = { db, uid, now: new Date(), verifyGoogle, mailSecret: MAIL_SECRET };
  if (path === '/api/baja' && (req.method === 'GET' || req.method === 'POST')) return baja(req, res);
  // La vista que ya tiene el navegador llega en una cabecera (no en la dirección), así la consulta periódica usa siempre
  // la misma dirección y el navegador reutiliza el permiso CORS en vez de pedirlo de nuevo en cada consulta.
  if (path === '/api/snapshot' && req.method === 'GET') return json(res, 200, view(ctx, uid, req.headers['x-hub-since'] || new URL(req.url, 'http://x').searchParams.get('since'), req.headers['x-hub-lite'] === '1'));
  if (path === '/api/rpc' && req.method === 'POST') {
    let name, args, since; try { ({ name, args, since } = JSON.parse(await readBody(req) || '{}')); } catch { return json(res, 400, { error: 'Solicitud no válida' }); }
    req.rpcName = String(name || '').slice(0, 40);
    const ip = ipOf(req), erase = name === 'user.erase' || name === 'me.closeAccount', auth = String(name).startsWith('auth.') || erase, who = erase ? 'pass:' + uid : auth ? String(args?.ident || args?.id || args?.doc_number || '').toLowerCase().replace(/[.\s-]/g, '') : '';
    if (name === 'auth.logout') { const p = tokenInfo(bearer(req)); if (p?.sid) await commit(() => db.update('sessions', p.sid, { revoked_at: new Date().toISOString() })); return json(res, 200, { result: { ok: true } }); }
    if (auth && blocked(ip, who)) return json(res, 429, { error: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.' });
    try {
      const cur = tokenInfo(bearer(req)); let sid = null, keep = false;
      const result = await commit(async () => { const r = await call(ctx, name, args);
        if (r?.session) { // nueva sesión: desde el ingreso se abre un registro por dispositivo; al cambiar la contraseña se mantiene el de este dispositivo
          if (cur?.sid && cur.uid === r.session && !String(name).startsWith('auth.')) { sid = cur.sid; keep = !cur.exp; }
          else { keep = !!args?.remember; sid = db.insert('sessions', { user_id: r.session, device: String(req.headers['user-agent'] || '').slice(0, 160), remember: keep, created_at: new Date().toISOString() }).id; }
        }
        return r; });
      const token = result?.session ? sign(result.session, sid, keep) : undefined;
      if (result) { delete result.demo_code; if (result.session) result.session = true; }
      if (erase && result?.storage) { for (const k of result.storage) try { unlinkSync(join(UPLOADS, basename(k))); } catch { /* ya no estaba */ } delete result.storage; }
      const nuid = token ? verify(token) : uid;
      const out = { result, token, snap: view({ db, uid: nuid, now: new Date() }, nuid, token ? null : (typeof since === 'string' ? since : null), !!token) }; // al entrar: vista liviana
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
  if (path === '/api/health') return json(res, 200, { ok: true, version: APP_VERSION });
  if (path.startsWith('/api/blob/') && req.method === 'GET') {
    const b = blobs.get(path.slice(10).replace(/\.\w+$/, ''));
    if (!b) { res.writeHead(404, { 'Cache-Control': 'no-store', ...SEC }); return res.end(); }
    res.writeHead(200, { 'Content-Type': b.mime, 'Content-Length': b.buf.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Cross-Origin-Resource-Policy': 'cross-origin', ...SEC });
    return res.end(b.buf);
  }
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
  req.t0 = performance.now();
  const path = new URL(req.url, 'http://x').pathname;
  if (flooding(ipOf(req))) { res.writeHead(429); return res.end(); }
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try { if (path.startsWith('/api/')) await api(req, res, path); else serve(req, res, path); }
  catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'Algo salió mal. Intenta de nuevo.' }); }
}).listen(PORT, () => console.log(`Keypoint Hub Providencia ${APP_VERSION} en http://localhost:${PORT}  (${db.all('users').length} usuarios)${ORIGINS.length ? '\nApp externa permitida: ' + ORIGINS.join(', ') : ''}\nDeja esta ventana abierta mientras el Hub use el sistema.`))
  .on('error', e => { if (e.code !== 'EADDRINUSE') throw e;
    console.error(`\nEl puerto ${PORT} ya está en uso: probablemente el Hub ya está abierto en otra ventana.\nCierra esa ventana (o en PowerShell: netstat -ano | findstr :${PORT}  y luego  taskkill /PID <número> /F) y vuelve a iniciar.\n`); process.exit(1); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
