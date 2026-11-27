// 2.9.3 contra el servidor real: imágenes fuera de los datos (/api/blob), ingreso liviano con el historial después,
// y tamaños de lo que viaja. Requiere el servidor en http://localhost:8080 con base de demostración recién creada.
import { readFileSync } from 'node:fs';
import { Store } from '../../src/core/store.js';
import { TABLES } from '../../src/core/schema.js';
const B = process.env.HUB_API || 'http://localhost:8080', ROOT = new URL('../../', import.meta.url).pathname;
let okN = 0, failN = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
const kb = n => (n / 1024).toFixed(1) + ' KB';
const raw = async (path, opt = {}) => { const r = await fetch(B + path, { ...opt, headers: { 'Accept-Encoding': 'br, gzip', ...(opt.headers || {}) } }); const buf = Buffer.from(await r.arrayBuffer()), wire = +(r.headers.get('content-length') || buf.length); return { r, buf, wire, j: /json/.test(r.headers.get('content-type') || '') ? JSON.parse(buf) : null }; };
const rpc = (name, args, tok, since) => raw('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ name, args, since }) });
const login = async ident => (await rpc('auth.login', { ident, password: 'demo1234' })).j;
const png = f => 'data:image/png;base64,' + readFileSync(ROOT + 'docs/img/' + f).toString('base64');

// Imágenes reales: banners de eventos y fotos de perfil (como en el Hub)
const adm = await login('roderick.grez@mayor.cl');
const banner = png('u-inicio.png'), poster = png('a-datos.png');
const ev = (await rpc('event.save', { title: 'Evento con imagen grande', kind: 'aviso', published: true, banner_img: banner, banner_alt: 'Pantalla de inicio', poster_img: poster, poster_alt: 'Datos' }, adm.token)).j?.result;
ok(!!ev?.id, `evento con banner (${kb(banner.length)}) y anuncio (${kb(poster.length)})`);
const people = ['camila.rojas@ejemplo.cl', 'marta.pizarro@ejemplo.cl', 'ignacio.vera@ejemplo.cl'];
for (const e of people) { const s = await login(e); await rpc('me.update', { photo: 'data:image/png;base64,' + readFileSync(ROOT + 'web/assets/icon-192.png').toString('base64') }, s.token); }

// Vista pública (pantalla de ingreso): sin imágenes adentro
const pub = await raw('/api/snapshot');
const pubTxt = JSON.stringify(pub.j);
ok(!pubTxt.includes('data:image/png;base64'), `la vista pública no trae imágenes adentro (${kb(pubTxt.length)} sin comprimir, ${kb(pub.wire)} comprimida)`);
const evPub = pub.j.tables.events.find(x => x.id === ev.id);
ok(/^\/api\/blob\/[\w-]{32}\.png$/.test(evPub?.banner_img) && /^\/api\/blob\//.test(evPub?.poster_img), 'el banner y el anuncio llegan como dirección /api/blob/…');
const img = await raw(evPub.banner_img);
ok(img.r.status === 200 && img.r.headers.get('content-type') === 'image/png' && img.buf.equals(Buffer.from(banner.split(',')[1], 'base64')), 'la imagen se descarga aparte, idéntica a la original');
ok(/immutable/.test(img.r.headers.get('cache-control')) && /private/.test(img.r.headers.get('cache-control')), 'la imagen queda en la caché del navegador (privada, sin volver a pedirla)');
ok(img.r.headers.get('x-content-type-options') === 'nosniff' && /default-src 'none'/.test(img.r.headers.get('content-security-policy') || ''), 'la imagen va con nosniff y una política de contenido cerrada');
ok((await raw('/api/blob/' + 'A'.repeat(32) + '.png')).r.status === 404, 'una dirección inventada responde 404');
ok((await raw('/api/blob/..%2F..%2F.env')).r.status === 404, 'no se puede salir de las imágenes con «..»');

// Fotos de perfil: solo para quien puede verlas
const cam = await login('camila.rojas@ejemplo.cl');
const camUser = cam.snap.tables?.users?.find(u => u.id === cam.snap.uid);
ok(/^\/api\/blob\//.test(camUser?.photo || ''), 'la foto propia llega como dirección');
ok(!JSON.stringify(cam.snap).includes('data:image/png;base64'), 'la vista de la usuaria no trae imágenes adentro');
const others = (cam.snap.tables.users || []).filter(u => u.id !== cam.snap.uid && u.photo);
ok(!others.length, 'la usuaria no recibe direcciones de fotos de otras personas');

// Ingreso del equipo: liviano primero, historial después
const t0 = performance.now(), adm2 = await rpc('auth.login', { ident: 'roderick.grez@mayor.cl', password: 'demo1234' }), tLogin = performance.now() - t0;
const lite = adm2.j.snap;
ok(lite.partial === true, `al entrar, el equipo recibe una vista liviana primero (${kb(adm2.buf.length)}, ${kb(adm2.wire)} comprimida)`);
const liteDb = new Store(lite.tables), cut = Date.now() - 3 * 864e5;
ok(liteDb.all('visits').every(v => +new Date(v.in_at) > cut || !v.out_at) && !liteDb.all('audit_log').length, 'la vista liviana trae solo los últimos días y nada de auditoría');
const hist = await raw('/api/snapshot', { headers: { Authorization: 'Bearer ' + adm2.j.token, 'X-Hub-Since': lite.tag } });
ok(!!hist.j.delta && !hist.j.partial, `el historial llega en un segundo pedido, como diferencia (${kb(hist.wire)} comprimido)`);
liteDb.patch(hist.j.delta);
const full = (await raw('/api/snapshot', { headers: { Authorization: 'Bearer ' + adm2.j.token } })).j, fullDb = new Store(full.tables);
const canon = (db, t) => db.all(t).map(r => JSON.stringify(r)).sort().join('\n');
const bad = Object.keys(TABLES).filter(t => canon(liteDb, t) !== canon(fullDb, t));
ok(!bad.length, 'vista liviana + historial = vista completa' + (bad.length ? ' (difieren: ' + bad.join(', ') + ')' : ''));
const fullRaw = await raw('/api/snapshot', { headers: { Authorization: 'Bearer ' + adm2.j.token } });
console.log(`\nComprimido, por la red · pública ${kb(pub.wire)} · equipo: liviana ${kb(adm2.wire)} + historial ${kb(hist.wire)} (completa ${kb(fullRaw.wire)}) · ingreso ${tLogin | 0} ms en local`);
console.log(`${okN} correctas, ${failN} fallas`);
