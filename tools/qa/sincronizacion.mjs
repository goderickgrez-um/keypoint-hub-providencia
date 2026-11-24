// Sincronización por cambios (2.9.1) contra el servidor real: después de cada acción, los datos que arma el
// navegador aplicando solo los cambios deben ser idénticos a pedir todo de nuevo. Mide también cuánto viaja.
// Requiere el servidor en http://localhost:8080 con una base de demostración recién creada (init-db --demo --reset).
import { Store } from '../../src/core/store.js';
import { TABLES, pkOf } from '../../src/core/schema.js';
const B = process.env.HUB_API || 'http://localhost:8080';
let okN = 0, failN = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
const kb = n => (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';

/** Cliente mínimo igual al del navegador (src/data/remote.js): guarda la vista y aplica cambios. */
class Client {
  constructor(name) { this.name = name; this.db = new Store(); this.tag = ''; this.tok = null; this.bytes = 0; }
  async req(path, opt = {}) { const r = await fetch(B + path, { ...opt, headers: { ...(opt.headers || {}), ...(this.tok ? { Authorization: 'Bearer ' + this.tok } : {}) } }); const txt = await r.text(); this.last = txt.length; this.bytes += txt.length; const j = JSON.parse(txt); if (!r.ok) throw Object.assign(new Error(j.error), { status: r.status }); return j; }
  apply(j) { if (j.same) { this.tag = j.tag || this.tag; return 'same'; } if (j.delta) this.db.patch(j.delta); else this.db.load(j.tables); this.uid = j.uid; this.tag = j.tag; return j.delta ? 'delta' : 'full'; }
  async call(name, args) { const j = await this.req('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, args, since: this.tag || undefined }) }); if (j.token) this.tok = j.token; this.kind = j.snap ? this.apply(j.snap) : '-'; return j.result; }
  async poll() { const j = await this.req('/api/snapshot' + (this.tag ? '?since=' + this.tag : '')); return (this.kind = this.apply(j)); }
  async fresh() { const r = await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + this.tok } }); const j = await r.json(); return new Store(j.tables); }
}
const canon = (db, t) => { const pk = pkOf(t); return db.all(t).map(r => JSON.stringify(r)).sort().join('\n') + '|' + db.all(t).length + '|' + pk; };
async function same(c, label) {
  const f = await c.fresh(), bad = Object.keys(TABLES).filter(t => canon(c.db, t) !== canon(f, t));
  ok(!bad.length, `${c.name} · ${label}: datos idénticos a una carga completa${bad.length ? ' (difieren: ' + bad.join(', ') + ')' : ''}`);
}
const login = async (c, ident) => { await c.call('auth.login', { ident, password: 'demo1234' }); };

const adm = new Client('administración'), rec = new Client('recepción'), cam = new Client('Camila'), ana = new Client('analista');
await login(adm, 'roderick.grez@mayor.cl'); const full = adm.last; ok(adm.kind === 'full', `al entrar llegan los datos completos (${kb(full)})`);
await login(rec, 'marta.pizarro@ejemplo.cl'); await login(cam, 'camila.rojas@ejemplo.cl'); await login(ana, 'ignacio.vera@ejemplo.cl');
const camId = cam.uid, sp = adm.db.find('spaces', s => s.monthly_hours > 0);
for (const c of [adm, rec, cam, ana]) await c.poll();
ok([adm, rec, cam, ana].every(c => c.kind === 'same'), 'sin cambios, la consulta periódica responde «sin cambios»');

// Acciones de distintos tipos, revisando a todos después de cada una
const steps = [
  ['recepción escanea a Camila', () => rec.call('access.scan', { code: camId })],
  ['administración ajusta horas', () => adm.call('hours.adjust', { user_id: camId, space_id: sp.id, hours: 1, kind: 'premio', reason: 'Sincronización' })],
  ['Camila cambia sus avisos por correo', () => cam.call('me.update', { email_notices: false })],
  ['administración guarda Reglas en una llamada', () => adm.call('config.setMany', { values: [['two_step', true], ['finish_window_min', 7], ['hub_contact', { owner: 'Hub Providencia', phone: '+56 2 2345 6789', email: 'keypoint.systems.um@gmail.com' }]] })],
  ['administración crea un evento', () => adm.call('event.save', { title: 'Evento sincronización', kind: 'aviso', published: true })],
  ['administración borra ese evento', async () => { const e = adm.db.find('events', x => x.title === 'Evento sincronización'); return adm.call('event.remove', { id: e.id }); }],
];
for (const [label, fn] of steps) {
  for (const c of [adm, rec, cam, ana]) c.kind = null;
  try { await fn(); } catch (e) { ok(false, `${label}: ${e.message}`); continue; }
  const actor = [adm, rec, cam, ana].find(c => c.kind), got = actor.kind, size = actor.last; // quien actuó recibe los cambios en la misma respuesta
  for (const c of [adm, rec, cam, ana]) await c.poll();
  ok(got === 'delta' && size < 20480, `${label}: ${actor.name} recibe en la misma respuesta solo los cambios (${kb(size)})`); // su siguiente consulta suele decir «sin cambios» (salvo que una tarea periódica haya cambiado algo)
  for (const c of [adm, rec, cam, ana]) await same(c, label);
}
ok(rec.last < full / 10, `respuesta de una acción del equipo: ${kb(rec.last)} (antes ${kb(full)})`);

// Reglas en una llamada: todo o nada
{ const before = adm.db.cfg('finish_window_min'); let err = null;
  try { await adm.call('config.setMany', { values: [['finish_window_min', 12], ['hub_contact', { owner: 'Hub', email: 'sin-arroba' }]] }); } catch (e) { err = e; }
  await adm.poll(); ok(err?.status === 400 && adm.db.cfg('finish_window_min') === before, 'Reglas con un dato inválido no guarda nada (antes quedaban guardadas las primeras)'); }

// Cambios de alcance: lo que se ve cambia aunque la fila tocada sea otra
const ev = await adm.call('event.save', { title: 'Visible y oculto', kind: 'aviso', published: true }); await cam.poll(); ok(!!cam.db.get('events', ev.id), 'un evento publicado aparece para la usuaria con el delta');
await adm.call('event.save', { id: ev.id, title: 'Visible y oculto', kind: 'aviso', published: false }); await cam.poll(); ok(!cam.db.get('events', ev.id), '…y desaparece al despublicarlo'); await same(cam, 'evento despublicado');

// Etiqueta desconocida (servidor reiniciado o vista olvidada): datos completos
const cam2 = new Client('Camila (otro dispositivo)'); cam2.tok = cam.tok; cam2.tag = '999999'; await cam2.poll(); ok(cam2.kind === 'full', 'con una etiqueta que el servidor no recuerda, llegan los datos completos');
await same(cam2, 'tras etiqueta desconocida');
// Cerrar sesión: vista pública
await cam.call('auth.logout', {}); cam.tok = null; cam.tag = ''; await cam.poll(); ok(cam.kind === 'full' && !cam.db.all('users').length, 'al cerrar sesión llega la vista pública completa');

console.log(`\nDatos recibidos en toda la prueba: administración ${kb(adm.bytes)}, recepción ${kb(rec.bytes)}, Camila ${kb(cam.bytes)}, analista ${kb(ana.bytes)}`);
console.log(`${okN} correctas, ${failN} fallas`);
