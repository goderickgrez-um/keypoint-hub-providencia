// 2.9 contra el servidor real con PostgreSQL (base de prueba que viene de 2.8): migración, términos, contacto,
// pie de los correos, cabeceras de baja, /api/baja y texto alternativo. Requiere HUB_DIR, DATABASE_URL y DATA_KEY.
import { spawn, execSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
const DIR = process.env.HUB_DIR, B = 'http://localhost:8080', MAILS = '/tmp/hubmail';
let okN = 0, failN = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
const sql = q => execSync(`psql "${process.env.DATABASE_URL}" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const W = ms => new Promise(r => setTimeout(r, ms));
let srv;
const env = { ...process.env, PORT: '8080', UPLOADS_DIR: '/tmp/hubup', MAIL_TEST_DIR: MAILS, PUBLIC_APP_URL: 'https://goderickgrez-um.github.io/keypoint-hub-providencia/', PUBLIC_API_URL: 'https://hub.ejemplo.ts.net' };
const start = async () => { srv = spawn('node', ['server/server.js'], { cwd: DIR, env, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 60; i++) { try { const h = await (await fetch(B + '/api/health')).json(); if (h.ok !== false) return h; } catch { /* aún no */ } await W(250); } throw new Error('El servidor no inició: ' + log); };
const stop = () => new Promise(r => { srv.on('exit', r); srv.kill(); });
const rpc = async (name, args, tok) => { const r = await fetch(B + '/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ name, args }) }); return { s: r.status, j: await r.json() }; };
const snap = async tok => (await (await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + tok } })).json());
const login = async ident => (await rpc('auth.login', { ident, password: 'demo1234' })).j.token;
const dv = n => { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
const mails = () => { try { return readdirSync(MAILS).map(f => JSON.parse(readFileSync(MAILS + '/' + f, 'utf8'))); } catch { return []; } };
const waitMail = async (pred, ms = 6000) => { for (let i = 0; i < ms / 200; i++) { const m = mails().filter(pred); if (m.length) return m.at(-1); await W(200); } return null; };
rmSync(MAILS, { recursive: true, force: true });

const h = await start();
ok(h.version === '2.9.0', 'servidor 2.9.0 sobre la base de 2.8: ' + h.version);
for (const [t, c] of [['users', 'terms_version'], ['users', 'terms_at'], ['users', 'email_notices'], ['events', 'banner_alt'], ['events', 'poster_alt'], ['outbox', 'kind'], ['outbox', 'user_id']])
  ok(sql(`select count(*) from information_schema.columns where table_name='${t}' and column_name='${c}'`) === '1', `migración: columna ${t}.${c}`);
const adm = await login('roderick.grez@mayor.cl'), cam = await login('camila.rojas@ejemplo.cl');
const s0 = await snap(cam), me0 = s0.tables.users.find(u => u.id === s0.uid);
ok(!me0.terms_version, 'las cuentas anteriores aún no aceptan los términos (la app se los pedirá)');
ok(me0.email_notices !== false, 'avisos por correo activados por defecto');
ok((await rpc('me.acceptTerms', { version: '0.1' }, cam)).s === 400, 'aceptar una versión que no es la vigente se rechaza');
ok((await rpc('me.acceptTerms', { version: '1.0' }, cam)).s === 200, 'aceptación guardada');
ok(sql(`select terms_version from users where id='${s0.uid}'`) === '1.0' && sql(`select terms_at is not null from users where id='${s0.uid}'`) === 't', 'PostgreSQL guarda versión y fecha de aceptación');

// ---- Registro: casilla obligatoria
const n = 17000000 + Math.floor(Math.random() * 900000), person = o => ({ name: 'Prueba Servidor', doc_number: `${n}-${dv(n)}`, email: `srv29.${n}@ejemplo.cl`, phone: '+56 9 1234 5678', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1991-02-03', consent_data: true, consent_image: true, consent_belongings: true, password: 'clave-segura-1', ...o });
const r0 = await rpc('auth.register', person({}));
ok(r0.s === 400 && /Términos/.test(r0.j.error), 'registro sin aceptar los términos: rechazado');
const r1 = await rpc('auth.register', person({ consent_terms: true }));
ok(r1.s === 200 && sql(`select terms_version from users where id='${r1.j.result.id}'`) === '1.0', 'registro con la casilla marcada guarda la versión');

// ---- Contacto del Hub
ok((await rpc('config.set', { key: 'hub_contact', value: { owner: 'Hub', email: 'x' } }, adm)).s === 400, 'contacto con correo inválido: rechazado');
const contact = { owner: 'Hub Providencia · Municipalidad de Providencia', phone: '+56 2 2345 6789', email: 'keypoint.systems.um@gmail.com', address: 'Av. Providencia 1234', hours: 'Lunes a viernes, 9:00 a 18:00' };
ok((await rpc('config.set', { key: 'hub_contact', value: contact }, cam)).s === 400, 'una persona usuaria no puede cambiar el contacto');
ok((await rpc('config.set', { key: 'hub_contact', value: contact }, adm)).s === 200, 'administración guarda el contacto');
ok((await snap(null)).tables?.config?.find(c => c.key === 'hub_contact')?.value?.address === contact.address, 'el contacto se ve sin iniciar sesión (pie, ayuda, políticas)');

// ---- Correos: pie, baja y cabeceras
const camEmail = 'camila.rojas@ejemplo.cl', sp = (await snap(adm)).tables.spaces.find(s => s.monthly_hours > 0);
await rpc('hours.adjust', { user_id: s0.uid, space_id: sp.id, hours: 1, kind: 'premio', reason: 'Prueba 2.9' }, adm);
const av = await waitMail(m => m.to?.[0]?.address === camEmail && /Prueba 2\.9/.test(m.text));
ok(!!av, 'el aviso sale por correo');
const link = av?.text.match(/https:\/\/goderickgrez-um\.github\.io\/keypoint-hub-providencia\/#baja=([^.\s]+)\.([\w-]+)/);
ok(!!link && link[1] === s0.uid, 'el aviso trae el enlace personal de baja a la app');
ok(/keypoint\.systems\.um@gmail\.com/.test(av?.text) && /\+56 2 2345 6789/.test(av?.text) && /Av\. Providencia 1234/.test(av?.text), 'el pie trae el contacto configurado');
ok(/Keypoint Hub Providencia 2\.9\.0 · Diseñada por KeyPoint Systems con herramientas de IA/.test(av?.text), 'el pie trae versión y créditos');
const hd = av?.headers || {};
ok(/<https:\/\/hub\.ejemplo\.ts\.net\/api\/baja\?u=[\w-]+&t=[\w-]+>/.test(hd['list-unsubscribe'] || hd['List-Unsubscribe'] || '') && /mailto:keypoint\.systems\.um@gmail\.com/.test(hd['list-unsubscribe'] || hd['List-Unsubscribe'] || ''), 'cabecera List-Unsubscribe (https y mailto)');
ok((hd['list-unsubscribe-post'] || hd['List-Unsubscribe-Post']) === 'List-Unsubscribe=One-Click', 'cabecera List-Unsubscribe-Post (baja de un clic)');
ok(sql(`select kind from outbox where subject like '%' order by id desc limit 1`) !== '' && sql(`select count(*) from outbox where kind='aviso'`) !== '0', 'outbox guarda el tipo de correo');
ok(sql(`select body from outbox order by id desc limit 1`).startsWith('enc:v1:'), 'el cuerpo sigue cifrado en la base');
await rpc('auth.code', { ident: camEmail });
const code = await waitMail(m => m.to?.[0]?.address === camEmail && /código/i.test(m.subject));
ok(!!code && /necesario para tu cuenta/.test(code.text) && !/baja/.test(code.text) && !(code.headers || {})['list-unsubscribe'], 'el correo con código no trae baja (es de cuenta)');

// ---- /api/baja
const [, uid, tk] = link || [];
ok((await fetch(`${B}/api/baja?u=${uid}&t=xx${tk}`)).status === 400, '/api/baja con firma alterada: 400');
const g = await fetch(`${B}/api/baja?u=${uid}&t=${tk}`), gh = await g.text();
ok(g.status === 200 && /<form method="post"/.test(gh) && /Dejar de recibir avisos/.test(gh), 'GET /api/baja muestra la confirmación (no da de baja solo por abrirlo)');
ok(sql(`select coalesce(email_notices::text,'t') from users where id='${uid}'`) !== 'false', 'abrir el enlace no cambia nada');
ok(/default-src 'none'/.test(g.headers.get('content-security-policy') || ''), 'la página de baja tiene su propia CSP estricta');
const pst = await fetch(`${B}/api/baja?u=${uid}&t=${tk}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
ok(pst.status === 200 && /Listo/.test(await pst.text()) && sql(`select email_notices from users where id='${uid}'`) === 'f', 'POST /api/baja (un clic) da de baja');
ok(sql(`select count(*) from audit_log where action='se da de baja de los avisos por correo' and entity_id='${uid}'`) !== '0', 'la baja queda en la auditoría');
const before = mails().length;
await rpc('hours.adjust', { user_id: s0.uid, space_id: sp.id, hours: 1, kind: 'premio', reason: 'Tras la baja' }, adm); await W(1500);
ok(mails().length === before && !mails().some(m => /Tras la baja/.test(m.text)), 'tras la baja el aviso no sale por correo');
ok((await snap(cam)).tables.notifications.some(x => /Tras la baja/.test(x.text)), '…pero llega a la app');
ok((await rpc('mail.unsubscribe', { u: uid, t: tk })).s === 200, 'la app (GitHub Pages) también puede dar de baja por la API');
ok((await rpc('me.update', { email_notices: true }, cam)).s === 200 && sql(`select email_notices from users where id='${uid}'`) === 't', 'vuelve a activarlos desde Configuración');

// ---- Texto alternativo
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
ok((await rpc('event.save', { title: 'Banner 2.9', kind: 'aviso', banner_img: img }, adm)).s === 400, 'banner sin texto alternativo: rechazado');
const ev = await rpc('event.save', { title: 'Banner 2.9', kind: 'aviso', banner_img: img, banner_alt: 'Mesa de trabajo con laptops' }, adm);
ok(ev.s === 200 && sql(`select banner_alt from events where id='${ev.j.result.id}'`) === 'Mesa de trabajo con laptops', 'texto alternativo guardado en PostgreSQL');

// ---- Persistencia tras reiniciar
await stop(); await start();
const s2 = await snap(null);
ok(s2.tables.config.find(c => c.key === 'hub_contact')?.value?.hours === contact.hours, 'tras reiniciar: el contacto sigue');
ok((await snap(adm)).tables.events.find(e => e.id === ev.j.result.id)?.banner_alt === 'Mesa de trabajo con laptops', 'tras reiniciar: el texto alternativo sigue');
await stop();
console.log(`\n${okN} correctas, ${failN} fallas`);
